package com.connectprojects.backend.work;

import java.time.Instant;
import java.util.List;

public record TicketResponse(
        Long id,
        String ticketNumber,
        String subject,
        String description,
        String category,
        String priority,
        String status,
        Long assigneeId,
        String assignee,
        String createdBy,
        Instant createdAt,
        Instant updatedAt,
        Instant firstResponseAt,
        Instant resolvedAt,
        Instant closedAt,
        int responseSlaHours,
        int resolutionSlaHours,
        Instant responseDueAt,
        Instant resolutionDueAt,
        List<TicketHistoryResponse> history
) {
}
