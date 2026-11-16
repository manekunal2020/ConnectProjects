package com.connectprojects.backend.work;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record ProjectRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 5000) String description,
        @Size(max = 30) String status,
        LocalDate due,
        Long leadId,
        Long clientId,
        Long projectManagerId,
        List<Long> teamLeaderIds,
        Boolean active
) {
}
