package com.connectprojects.backend.account;

import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.UserResponse;
import com.connectprojects.backend.auth.CurrentUserService;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

@Service
public class UserService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;

    public UserService(AppUserRepository users, PasswordEncoder passwordEncoder, CurrentUserService currentUserService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return users.findAllByOrderByFullNameAsc().stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listAssignees(Authentication authentication) {
        currentUserService.require(authentication, "tickets.assign");
        return users.findAllByOrderByFullNameAsc().stream()
                .filter(AppUser::isEnabled)
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByUsername(username) || users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "That username or email is already in use.");
        }
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password cannot exceed 72 UTF-8 bytes.");
        }

        UserRole role = parseRole(request.role());
        AppUser user = new AppUser(username, email, request.name().trim(), passwordEncoder.encode(request.password()), role);
        user.setPermissions(PermissionCatalog.defaults(role));
        return UserResponse.from(users.save(user));
    }

    @Transactional
    public UserResponse updatePermissions(Long userId, List<String> requestedPermissions) {
        AppUser user = find(userId);
        if (user.getRole() == UserRole.SUPER_USER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Super User permissions cannot be changed.");
        }
        try {
            user.setPermissions(PermissionCatalog.validate(requestedPermissions));
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
        return UserResponse.from(user);
    }

    @Transactional
    public void delete(Long userId, AppUser actingUser) {
        AppUser user = find(userId);
        if (user.getRole() == UserRole.SUPER_USER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Super User accounts are protected.");
        }
        if (user.getId().equals(actingUser.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot delete your own account.");
        }
        users.delete(user);
    }

    private AppUser find(Long id) {
        return users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found."));
    }

    private UserRole parseRole(String role) {
        return switch (role.trim().toLowerCase(Locale.ROOT)) {
            case "super user" -> UserRole.SUPER_USER;
            case "admin" -> UserRole.ADMIN;
            case "project lead" -> UserRole.PROJECT_LEAD;
            case "team member" -> UserRole.TEAM_MEMBER;
            default -> throw new ApiException(HttpStatus.BAD_REQUEST, "Choose Super User, Admin, Project Lead, or Team Member.");
        };
    }
}
