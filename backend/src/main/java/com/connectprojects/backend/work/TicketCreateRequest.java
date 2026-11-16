package com.connectprojects.backend.work;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TicketCreateRequest(
        @NotBlank @Size(max = 240) String subject,
        @Size(max = 5000) String description,
        @Size(max = 100) String category,
        @Size(max = 20) String priority,
        Long assigneeId,
        Integer responseSlaHours,
        Integer resolutionSlaHours
) {
}
