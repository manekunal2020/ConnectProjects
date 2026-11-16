package com.connectprojects.backend.account;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PermissionsUpdateRequest(@NotNull List<String> permissions) {
}
