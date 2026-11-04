package com.connectprojects.backend.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ApproveAccountRequest(
        @NotBlank(message = "Set a temporary password for the new account.")
        @Size(min = 12, max = 72, message = "Temporary password must be 12-72 characters.")
        String password
) {
}
