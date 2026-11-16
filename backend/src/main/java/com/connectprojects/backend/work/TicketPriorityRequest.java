package com.connectprojects.backend.work;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TicketPriorityRequest(
        @NotBlank @Size(max = 80) String name,
        @NotNull @Min(1) @Max(10) Integer level,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String color
) {
}
