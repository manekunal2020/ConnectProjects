package com.connectprojects.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Email @Size(max = 254) String email
) {
}
