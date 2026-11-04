package com.connectprojects.backend.auth;

import com.connectprojects.backend.account.AppUser;

public record UserResponse(String username, String name, String role) {
    public static UserResponse from(AppUser user) {
        String role = switch (user.getRole()) {
            case SUPER_USER -> "Super User";
            case ADMIN -> "Admin";
            case PROJECT_LEAD -> "Project Lead";
        };
        return new UserResponse(user.getUsername(), user.getFullName(), role);
    }
}
