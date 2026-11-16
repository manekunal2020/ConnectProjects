package com.connectprojects.backend.work;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;

public record SupportShiftRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 40) String daysOfWeek,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @Size(max = 80) String timezone
) {
}
