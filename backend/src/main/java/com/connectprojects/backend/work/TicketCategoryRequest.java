package com.connectprojects.backend.work;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TicketCategoryRequest(@NotBlank @Size(max = 120) String name) {
}
