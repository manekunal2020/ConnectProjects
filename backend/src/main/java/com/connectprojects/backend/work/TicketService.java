package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.AppUserRepository;
import com.connectprojects.backend.account.UserRole;
import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class TicketService {
    private static final Set<String> PRIORITIES = Set.of("Low", "Medium", "High", "Critical");
    private static final Set<String> STATUSES = Set.of("Open", "In Progress", "Pending");
    private final TicketRepository tickets;
    private final AppUserRepository users;
    private final CurrentUserService currentUserService;

    public TicketService(TicketRepository tickets, AppUserRepository users, CurrentUserService currentUserService) {
        this.tickets = tickets;
        this.users = users;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<TicketResponse> list(Authentication authentication, String permission) {
        AppUser user = currentUserService.require(authentication, permission);
        List<TicketEntity> rows = user.getRole() == UserRole.TEAM_MEMBER
                ? tickets.findAllByAssignee_IdOrderByCreatedAtDesc(user.getId())
                : tickets.findAllByOrderByCreatedAtDesc();
        return rows.stream().map(this::response).toList();
    }

    @Transactional
    public TicketResponse create(TicketCreateRequest request, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tickets.create");
        String priority = validPriority(request.priority());
        int responseHours = request.responseSlaHours() == null ? defaultSla(priority)[0] : request.responseSlaHours();
        int resolutionHours = request.resolutionSlaHours() == null ? defaultSla(priority)[1] : request.resolutionSlaHours();
        validateSla(responseHours);
        validateSla(resolutionHours);
        AppUser assignee = request.assigneeId() == null
                ? (user.getRole() == UserRole.TEAM_MEMBER ? user : null)
                : findAssignee(request.assigneeId(), authentication);
        TicketEntity ticket = new TicketEntity(
                "TKT-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(),
                request.subject().trim(),
                request.description() == null ? "" : request.description().trim(),
                request.category() == null || request.category().isBlank() ? "General" : request.category().trim(),
                priority,
                assignee,
                user,
                responseHours,
                resolutionHours
        );
        ticket.addHistory(user.getFullName(), "Created", "Ticket created.");
        return response(tickets.save(ticket));
    }

    @Transactional
    public TicketResponse update(Long id, TicketUpdateRequest request, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tickets.update");
        TicketEntity ticket = find(id);
        ensureAssignedToCurrentUser(ticket, user);
        if (request.subject() != null) {
            if (request.subject().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Ticket subject cannot be empty.");
            ticket.setSubject(request.subject().trim());
        }
        if (request.description() != null) ticket.setDescription(request.description().trim());
        if (request.category() != null) ticket.setCategory(request.category().trim());
        if (request.priority() != null) ticket.setPriority(validPriority(request.priority()));
        if (request.status() != null) {
            String nextStatus = request.status().trim();
            if (!STATUSES.contains(nextStatus)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Use the dedicated resolve or close action for completed tickets.");
            }
            if (!ticket.getStatus().equals(nextStatus)) {
                String previous = ticket.getStatus();
                ticket.setStatus(nextStatus);
                ticket.addHistory(user.getFullName(), "Status changed", previous + " → " + nextStatus);
            }
        }
        if (ticket.getFirstResponseAt() == null) ticket.setFirstResponseAt(Instant.now());
        return response(ticket);
    }

    @Transactional
    public TicketResponse assign(Long id, Long assigneeId, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tickets.assign");
        TicketEntity ticket = find(id);
        AppUser assignee = findUser(assigneeId);
        ticket.setAssignee(assignee);
        ticket.addHistory(user.getFullName(), "Assigned", "Assigned to " + assignee.getFullName() + ".");
        return response(ticket);
    }

    @Transactional
    public TicketResponse resolve(Long id, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tickets.resolve");
        TicketEntity ticket = find(id);
        ensureAssignedToCurrentUser(ticket, user);
        if ("Closed".equals(ticket.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Closed tickets cannot be resolved.");
        }
        Instant now = Instant.now();
        ticket.setStatus("Resolved");
        ticket.setResolvedAt(now);
        if (ticket.getFirstResponseAt() == null) ticket.setFirstResponseAt(now);
        ticket.addHistory(user.getFullName(), "Resolved", "Ticket resolved.");
        return response(ticket);
    }

    @Transactional
    public TicketResponse close(Long id, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tickets.close");
        TicketEntity ticket = find(id);
        ensureAssignedToCurrentUser(ticket, user);
        if (!"Resolved".equals(ticket.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only resolved tickets can be closed.");
        }
        Instant now = Instant.now();
        ticket.setStatus("Closed");
        ticket.setClosedAt(now);
        ticket.addHistory(user.getFullName(), "Closed", "Ticket closed.");
        return response(ticket);
    }

    @Transactional
    public void delete(Long id, Authentication authentication) {
        currentUserService.require(authentication, "tickets.delete");
        tickets.delete(find(id));
    }

    private TicketResponse response(TicketEntity ticket) {
        List<TicketHistoryResponse> history = ticket.getHistory().stream()
                .map(item -> new TicketHistoryResponse(item.getId(), item.getActorName(), item.getAction(), item.getDetails(), item.getCreatedAt()))
                .toList();
        return new TicketResponse(
                ticket.getId(),
                ticket.getTicketNumber(),
                ticket.getSubject(),
                ticket.getDescription(),
                ticket.getCategory(),
                ticket.getPriority(),
                ticket.getStatus(),
                ticket.getAssignee() == null ? null : ticket.getAssignee().getId(),
                ticket.getAssignee() == null ? "" : ticket.getAssignee().getFullName(),
                ticket.getCreatedBy() == null ? "" : ticket.getCreatedBy().getFullName(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getFirstResponseAt(),
                ticket.getResolvedAt(),
                ticket.getClosedAt(),
                ticket.getResponseSlaHours(),
                ticket.getResolutionSlaHours(),
                ticket.getResponseDueAt(),
                ticket.getResolutionDueAt(),
                history
        );
    }

    private void ensureAssignedToCurrentUser(TicketEntity ticket, AppUser user) {
        if (user.getRole() == UserRole.TEAM_MEMBER
                && (ticket.getAssignee() == null || !ticket.getAssignee().getId().equals(user.getId()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only update your assigned tickets.");
        }
    }

    private TicketEntity find(Long id) {
        return tickets.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Ticket not found."));
    }

    private AppUser findUser(Long id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected assignee was not found."));
    }

    private AppUser findAssignee(Long id, Authentication authentication) {
        currentUserService.require(authentication, "tickets.assign");
        return findUser(id);
    }

    private String validPriority(String value) {
        String priority = value == null || value.isBlank() ? "Medium" : value.trim();
        if (!PRIORITIES.contains(priority)) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose Low, Medium, High, or Critical priority.");
        return priority;
    }

    private int[] defaultSla(String priority) {
        return switch (priority) {
            case "Critical" -> new int[]{1, 4};
            case "High" -> new int[]{4, 8};
            case "Medium" -> new int[]{8, 24};
            default -> new int[]{24, 72};
        };
    }

    private void validateSla(int hours) {
        if (hours < 1 || hours > 720) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SLA hours must be between 1 and 720.");
        }
    }
}
