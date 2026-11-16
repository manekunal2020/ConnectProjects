package com.connectprojects.backend.account;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(min = 3, max = 30) @Pattern(regexp = "^[a-zA-Z0-9._-]+$") String username,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 12, max = 72) String password,
        @NotBlank String role
) {
}
