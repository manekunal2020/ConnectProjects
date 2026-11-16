package com.connectprojects.backend.work;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProjectSlaRequest(
        @NotNull Long priorityId,
        @NotNull @Min(1) Integer responseMinutes,
        @NotNull @Min(1) Integer resolutionMinutes,
        boolean businessHoursOnly
) {
}
