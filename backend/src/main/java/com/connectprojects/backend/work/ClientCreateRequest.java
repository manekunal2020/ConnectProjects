package com.connectprojects.backend.work;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClientCreateRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 160) String industry
) {
}
