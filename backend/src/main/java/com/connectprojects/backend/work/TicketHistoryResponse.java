package com.connectprojects.backend.work;

import java.time.Instant;

public record TicketHistoryResponse(Long id, String user, String action, String details, Instant timestamp) {
}
