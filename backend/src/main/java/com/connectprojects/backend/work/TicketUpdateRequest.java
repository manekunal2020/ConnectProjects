package com.connectprojects.backend.work;

import jakarta.validation.constraints.Size;

public record TicketUpdateRequest(
        @Size(max = 240) String subject,
        @Size(max = 5000) String description,
        @Size(max = 100) String category,
        @Size(max = 20) String priority,
        @Size(max = 30) String status
) {
}
