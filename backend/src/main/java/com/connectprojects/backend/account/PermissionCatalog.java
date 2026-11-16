package com.connectprojects.backend.account;

import java.util.List;

public final class PermissionCatalog {
    private static final List<String> ALL = List.of(
            "dashboard.view",
            "projects.view", "projects.create", "projects.edit", "projects.delete",
            "tasks.view", "tasks.create", "tasks.edit", "tasks.delete",
            "tickets.view", "tickets.create", "tickets.assign", "tickets.update",
            "tickets.resolve", "tickets.close", "tickets.delete",
            "reports.view", "reports.generate", "reports.export", "reports.schedule",
            "users.view", "users.create", "users.edit", "users.delete",
            "settings.view", "settings.edit"
    );

    private PermissionCatalog() {
    }

    public static List<String> all() {
        return ALL;
    }

    public static List<String> defaults(UserRole role) {
        return switch (role) {
            case SUPER_USER -> ALL;
            case ADMIN -> List.of(
                    "dashboard.view",
                    "projects.view", "projects.create", "projects.edit", "projects.delete",
                    "tasks.view", "tasks.create", "tasks.edit", "tasks.delete",
                    "tickets.view", "tickets.create", "tickets.assign", "tickets.update",
                    "tickets.resolve", "tickets.close", "tickets.delete",
                    "reports.view", "reports.generate", "reports.export",
                    "settings.view", "settings.edit"
            );
            case PROJECT_LEAD -> List.of(
                    "dashboard.view",
                    "projects.view", "projects.create", "projects.edit",
                    "tasks.view", "tasks.create", "tasks.edit",
                    "tickets.view", "tickets.create", "tickets.assign", "tickets.update",
                    "tickets.resolve", "tickets.close",
                    "reports.view", "reports.generate", "reports.export",
                    "settings.view", "settings.edit"
            );
            case TEAM_MEMBER -> List.of(
                    "dashboard.view", "projects.view", "tasks.view", "tasks.edit",
                    "tickets.view", "tickets.update", "reports.view", "settings.view"
            );
        };
    }

    public static boolean allows(AppUser user, String permission) {
        return user.getRole() == UserRole.SUPER_USER || user.getPermissions().contains(permission);
    }

    public static List<String> validate(List<String> permissions) {
        if (permissions == null || permissions.stream().anyMatch(permission -> !ALL.contains(permission))) {
            throw new IllegalArgumentException("The permission list contains an unknown permission.");
        }
        return permissions.stream().distinct().toList();
    }
}
