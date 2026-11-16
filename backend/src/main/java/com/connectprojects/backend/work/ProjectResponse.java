package com.connectprojects.backend.work;

import java.time.LocalDate;
import java.util.List;

public record ProjectResponse(
        Long id,
        String name,
        String description,
        String lead,
        String status,
        int progress,
        LocalDate due,
        long tasks,
        long done,
        ClientSummary client,
        UserSummary projectManager,
        List<UserSummary> teamLeaders,
        boolean active
) {
    public record ClientSummary(Long id, String name, String industry) {
    }

    public record UserSummary(Long id, String name) {
    }
}
