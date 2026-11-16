package com.connectprojects.backend.auth;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.PermissionCatalog;

import java.util.List;

public record UserResponse(Long id, String username, String name, String email, String role, List<String> permissions) {
    public static UserResponse from(AppUser user) {
        String role = switch (user.getRole()) {
            case SUPER_USER -> "Super User";
            case ADMIN -> "Admin";
            case PROJECT_LEAD -> "Project Lead";
            case TEAM_MEMBER -> "Team Member";
        };
        List<String> permissions = user.getRole() == com.connectprojects.backend.account.UserRole.SUPER_USER
                ? PermissionCatalog.all()
                : user.getPermissions();
        return new UserResponse(user.getId(), user.getUsername(), user.getFullName(), user.getEmail(), role, permissions);
    }
}
