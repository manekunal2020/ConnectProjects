package com.connectprojects.backend.reports;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.UserRole;
import com.connectprojects.backend.auth.CurrentUserService;
import com.connectprojects.backend.auth.EmailService;
import com.connectprojects.backend.work.TicketRepository;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportScheduleServiceTest {
    @Mock private ReportScheduleRepository schedules;
    @Mock private ReportEmailDeliveryRepository deliveries;
    @Mock private TicketRepository tickets;
    @Mock private CurrentUserService currentUserService;
    @Mock private EmailService emailService;
    @Mock private Authentication authentication;

    private ReportScheduleService service;

    @BeforeEach
    void setUp() {
        service = new ReportScheduleService(schedules, deliveries, tickets, currentUserService, emailService);
    }

    @Test
    void deliveryHistoryIsLimitedToTheAuthenticatedUser() {
        AppUser user = mock(AppUser.class);
        when(user.getId()).thenReturn(17L);
        when(currentUserService.require(authentication, "reports.view")).thenReturn(user);
        Instant sentAt = Instant.parse("2026-11-16T08:30:00Z");
        when(deliveries.findTop50ByCreatedBy_IdOrderBySentAtDesc(17L)).thenReturn(List.of(
                new ReportEmailDeliveryEntity(user, 23L, "reports@example.com", "weekly", "2026-11-09", sentAt)
        ));

        List<ReportEmailDeliveryResponse> result = service.listDeliveries(authentication);

        assertEquals(1, result.size());
        assertEquals("reports@example.com", result.get(0).recipientEmail());
        assertEquals("2026-11-09", result.get(0).reportPeriod());
        assertEquals(sentAt, result.get(0).sentAt());
        verify(deliveries).findTop50ByCreatedBy_IdOrderBySentAtDesc(17L);
    }

    @Test
    void createsScheduleWithNormalizedMultipleRecipients() {
        AppUser user = mock(AppUser.class);
        when(currentUserService.require(authentication, "reports.schedule")).thenReturn(user);
        when(schedules.save(any(ReportScheduleEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        List<String> recipients = List.of("reports@example.com", "team@example.com");
        ReportScheduleRequest request = new ReportScheduleRequest(
                List.of("REPORTS@EXAMPLE.COM", "Team@Example.com", "reports@example.com"),
                "weekly",
                LocalTime.of(9, 0),
                "UTC",
                1,
                null
        );

        ReportScheduleResponse result = service.create(request, authentication);

        assertEquals(recipients, result.emails());
        assertEquals("reports@example.com", result.email());
    }

    @Test
    void sendsScheduledReportToAllRecipientsAndRecordsEachDelivery() {
        AppUser user = mock(AppUser.class);
        when(user.getRole()).thenReturn(UserRole.ADMIN);
        List<String> recipients = List.of("reports@example.com", "team@example.com");
        ReportScheduleEntity schedule = new ReportScheduleEntity(
                user, recipients, "daily", LocalTime.MIN, "UTC", null, null);
        when(schedules.findAllByActiveTrue()).thenReturn(List.of(schedule));
        when(tickets.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());

        service.sendDueReports();

        verify(emailService).send(eq(recipients), any(), any(), any());
        ArgumentCaptor<ReportEmailDeliveryEntity> deliveriesCaptor = ArgumentCaptor.forClass(ReportEmailDeliveryEntity.class);
        verify(deliveries, times(2)).save(deliveriesCaptor.capture());
        assertEquals(recipients, deliveriesCaptor.getAllValues().stream()
                .map(ReportEmailDeliveryEntity::getRecipientEmail)
                .toList());
    }
}
