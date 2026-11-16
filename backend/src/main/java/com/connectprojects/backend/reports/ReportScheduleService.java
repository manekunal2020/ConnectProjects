package com.connectprojects.backend.reports;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.UserRole;
import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.CurrentUserService;
import com.connectprojects.backend.auth.EmailService;
import com.connectprojects.backend.work.TicketEntity;
import com.connectprojects.backend.work.TicketRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportScheduleService {
    private final ReportScheduleRepository schedules;
    private final ReportEmailDeliveryRepository deliveries;
    private final TicketRepository tickets;
    private final CurrentUserService currentUserService;
    private final EmailService emailService;

    public ReportScheduleService(
            ReportScheduleRepository schedules,
            ReportEmailDeliveryRepository deliveries,
            TicketRepository tickets,
            CurrentUserService currentUserService,
            EmailService emailService
    ) {
        this.schedules = schedules;
        this.deliveries = deliveries;
        this.tickets = tickets;
        this.currentUserService = currentUserService;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public List<ReportScheduleResponse> list(Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "reports.view");
        return schedules.findAllByCreatedBy_IdOrderByCreatedAtDesc(user.getId())
                .stream().map(ReportScheduleResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReportEmailDeliveryResponse> listDeliveries(Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "reports.view");
        return deliveries.findTop50ByCreatedBy_IdOrderBySentAtDesc(user.getId())
                .stream().map(ReportEmailDeliveryResponse::from).toList();
    }

    @Transactional
    public ReportScheduleResponse create(ReportScheduleRequest request, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "reports.schedule");
        emailService.requireConfigured();
        ZoneId zone;
        try {
            zone = ZoneId.of(request.timeZone());
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid time zone.");
        }
        if ("weekly".equals(request.frequency()) && (request.weekday() == null || request.weekday() < 0 || request.weekday() > 6)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid day of the week.");
        }
        if ("monthly".equals(request.frequency()) && (request.monthDay() == null || request.monthDay() < 1 || request.monthDay() > 28)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a day from 1 to 28.");
        }
        List<String> recipients = request.emails().stream()
                .map(email -> email.trim().toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
        ReportScheduleEntity schedule = new ReportScheduleEntity(
                user, recipients, request.frequency(), request.time(), zone.getId(), request.weekday(), request.monthDay());
        return ReportScheduleResponse.from(schedules.save(schedule));
    }

    @Transactional
    public void delete(Long id, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "reports.schedule");
        ReportScheduleEntity schedule = schedules.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Report schedule not found."));
        if (!schedule.getCreatedBy().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Report schedule not found.");
        }
        schedules.delete(schedule);
    }

    @Transactional
    public void sendDueReports() {
        Instant now = Instant.now();
        for (ReportScheduleEntity schedule : schedules.findAllByActiveTrue()) {
            try {
                ZoneId zone = ZoneId.of(schedule.getTimeZone());
                ZonedDateTime local = now.atZone(zone);
                if (!isDue(schedule, local)) continue;
                String period = periodKey(schedule, local.toLocalDate());
                if (period.equals(schedule.getLastSentPeriod())) continue;

                DateRange range = reportRange(schedule, local.toLocalDate());
                List<TicketEntity> allTickets = visibleTickets(schedule.getCreatedBy());
                List<TicketEntity> periodTickets = allTickets.stream()
                        .filter(ticket -> inRange(ticket.getCreatedAt(), range))
                        .toList();
                List<TicketEntity> resolved = allTickets.stream()
                        .filter(ticket -> ("Resolved".equals(ticket.getStatus()) || "Closed".equals(ticket.getStatus()))
                                && inRange(ticket.getResolvedAt() == null ? ticket.getClosedAt() : ticket.getResolvedAt(), range))
                        .toList();
                String report = formatReport(period, range, periodTickets, resolved, allTickets);
                String subject = "Connect Projects " + schedule.getFrequency() + " report — "
                        + range.displayStart() + " to " + range.displayEnd();
                List<String> recipients = schedule.getEmails();
                emailService.send(recipients, subject, report,
                        htmlReport(report, period, periodTickets, resolved, allTickets));
                for (String recipient : recipients) {
                    deliveries.save(new ReportEmailDeliveryEntity(
                            schedule.getCreatedBy(), schedule.getId(), recipient, schedule.getFrequency(), period, now));
                }
                schedule.markSent(period, now);
            } catch (RuntimeException exception) {
                System.err.println("Could not send scheduled report " + schedule.getId() + ": " + exception.getMessage());
            }
        }
    }

    private List<TicketEntity> visibleTickets(AppUser user) {
        return user.getRole() == UserRole.TEAM_MEMBER
                ? tickets.findAllByAssignee_IdOrderByCreatedAtDesc(user.getId())
                : tickets.findAllByOrderByCreatedAtDesc();
    }

    private boolean isDue(ReportScheduleEntity schedule, ZonedDateTime local) {
        if (local.toLocalTime().isBefore(schedule.getSendTime())) return false;
        if ("weekly".equals(schedule.getFrequency())) return local.getDayOfWeek().getValue() % 7 == schedule.getWeekday();
        return !"monthly".equals(schedule.getFrequency()) || local.getDayOfMonth() == schedule.getMonthDay();
    }

    private String periodKey(ReportScheduleEntity schedule, LocalDate date) {
        return switch (schedule.getFrequency()) {
            case "daily" -> date.toString();
            case "weekly" -> date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString();
            default -> YearMonth.from(date).toString();
        };
    }

    private DateRange reportRange(ReportScheduleEntity schedule, LocalDate today) {
        LocalDate start = switch (schedule.getFrequency()) {
            case "daily" -> today;
            case "weekly" -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            default -> today.withDayOfMonth(1);
        };
        LocalDate end = switch (schedule.getFrequency()) {
            case "daily" -> start.plusDays(1);
            case "weekly" -> start.plusWeeks(1);
            default -> YearMonth.from(today).plusMonths(1).atDay(1);
        };
        ZoneId zone = ZoneId.of(schedule.getTimeZone());
        return new DateRange(start.atStartOfDay(zone).toInstant(), end.atStartOfDay(zone).toInstant(), start, end.minusDays(1));
    }

    private boolean inRange(Instant value, DateRange range) {
        return value != null && !value.isBefore(range.start()) && value.isBefore(range.end());
    }

    private String formatReport(String period, DateRange range, List<TicketEntity> periodTickets,
                                List<TicketEntity> resolved, List<TicketEntity> allTickets) {
        long responseEligible = periodTickets.stream().filter(ticket -> ticket.getResponseDueAt() != null).count();
        long responseMet = periodTickets.stream().filter(ticket -> ticket.getResponseDueAt() != null
                && (ticket.getFirstResponseAt() == null ? Instant.now() : ticket.getFirstResponseAt()).compareTo(ticket.getResponseDueAt()) <= 0).count();
        long resolutionEligible = periodTickets.stream().filter(ticket -> ticket.getResolutionDueAt() != null).count();
        long resolutionMet = periodTickets.stream().filter(ticket -> ticket.getResolutionDueAt() != null
                && (ticket.getResolvedAt() != null ? ticket.getResolvedAt() : ticket.getClosedAt() != null ? ticket.getClosedAt() : Instant.now())
                .compareTo(ticket.getResolutionDueAt()) <= 0).count();
        Map<String, Long> productivity = resolved.stream().collect(Collectors.groupingBy(
                ticket -> ticket.getAssignee() == null ? "Unassigned" : ticket.getAssignee().getFullName(),
                Collectors.counting()
        ));
        long pending = allTickets.stream().filter(ticket -> !List.of("Resolved", "Closed").contains(ticket.getStatus())).count();
        return "Connect Projects " + period + " report\n"
                + "Period: " + range.displayStart() + " to " + range.displayEnd() + "\n"
                + "Tickets created: " + periodTickets.size() + "\n"
                + "Resolved or closed: " + resolved.size() + "\n"
                + "Current pending backlog: " + pending + "\n"
                + "First response SLA: " + rate(responseMet, responseEligible) + "\n"
                + "Resolution SLA: " + rate(resolutionMet, resolutionEligible) + "\n"
                + "Resolved by employee: " + productivity;
    }

    private String htmlReport(String text, String period, List<TicketEntity> created,
                              List<TicketEntity> resolved, List<TicketEntity> allTickets) {
        String safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>");
        return "<div style=\"font-family:Arial,sans-serif\"><h1>Connect Projects " + period + " report</h1><p>" + safe + "</p></div>";
    }

    private String rate(long compliant, long eligible) {
        return eligible == 0 ? "N/A" : Math.round(compliant * 100.0 / eligible) + "%";
    }

    private record DateRange(Instant start, Instant end, LocalDate displayStart, LocalDate displayEnd) {
    }
}
