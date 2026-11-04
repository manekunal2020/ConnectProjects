package com.connectprojects.backend.account;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AccountRequestSubmission(
        @NotBlank(message = "Enter your full name.")
        @Size(max = 120, message = "Full name must be at most 120 characters.")
        String name,
        @NotBlank(message = "Enter a requested username.")
        @Size(min = 3, max = 30, message = "Username must be 3-30 characters.")
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Username may only contain letters, numbers, dots, underscores, and hyphens.")
        String username,
        @NotBlank(message = "Enter your email address.")
        @Email(message = "Enter a valid email address.")
        @Size(max = 254, message = "Email address must be at most 254 characters.")
        String email
) {
}
