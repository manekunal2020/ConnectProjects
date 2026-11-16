package com.connectprojects.backend.work;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record TaskRequest(
        @NotBlank @Size(max = 240) String title,
        Long projectId,
        Long assigneeId,
        LocalDate due,
        @Size(max = 20) String priority,
        @Size(max = 30) String status
) {
}
