package com.connectprojects.backend.auth;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.AppUserRepository;
import com.connectprojects.backend.account.PermissionCatalog;
import com.connectprojects.backend.api.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
    private final AppUserRepository users;

    public CurrentUserService(AppUserRepository users) {
        this.users = users;
    }

    public AppUser get(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserDetails principal)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Sign in is required.");
        }
        return users.findByUsername(principal.getUsername())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Account no longer exists."));
    }

    public AppUser require(Authentication authentication, String permission) {
        AppUser user = get(authentication);
        if (!PermissionCatalog.allows(user, permission)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have permission to perform this action.");
        }
        return user;
    }

    public AppUser requireSuperUser(Authentication authentication) {
        AppUser user = get(authentication);
        if (user.getRole() != com.connectprojects.backend.account.UserRole.SUPER_USER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the Super User can manage user accounts.");
        }
        return user;
    }
}
