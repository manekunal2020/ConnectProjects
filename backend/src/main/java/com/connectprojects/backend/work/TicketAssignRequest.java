package com.connectprojects.backend.work;

import jakarta.validation.constraints.NotNull;

public record TicketAssignRequest(@NotNull Long assigneeId) {
}
