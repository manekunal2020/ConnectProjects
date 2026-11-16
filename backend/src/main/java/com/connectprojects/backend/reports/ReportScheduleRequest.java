package com.connectprojects.backend.reports;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;
import java.util.List;

public record ReportScheduleRequest(
        @NotEmpty @Size(max = 10) List<@NotBlank @Email @Size(max = 254) String> emails,
        @NotBlank @Pattern(regexp = "daily|weekly|monthly") String frequency,
        @NotNull LocalTime time,
        @NotBlank @Size(max = 80) String timeZone,
        Integer weekday,
        Integer monthDay
) {
}
