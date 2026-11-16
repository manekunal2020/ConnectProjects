package com.connectprojects.backend.work;

import java.time.LocalDate;

public record TaskResponse(
        Long id,
        String title,
        String project,
        LocalDate due,
        String priority,
        String status,
        String assignee,
        Long assigneeId
) {
}
