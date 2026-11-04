package com.connectprojects.backend.config;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.AppUserRepository;
import com.connectprojects.backend.account.UserRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Component
public class BootstrapSuperUser implements ApplicationRunner {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;
    private final String name;

    public BootstrapSuperUser(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap-super-user.username}") String username,
            @Value("${app.bootstrap-super-user.password}") String password,
            @Value("${app.bootstrap-super-user.name}") String name
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.password = password;
        this.name = name;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.existsByRole(UserRole.SUPER_USER)) {
            return;
        }
        if (username.isBlank() || password.isBlank() || name.isBlank()) {
            throw new IllegalStateException(
                    "No Super User exists. Set BOOTSTRAP_SUPERUSER_USERNAME, BOOTSTRAP_SUPERUSER_PASSWORD, and BOOTSTRAP_SUPERUSER_NAME."
            );
        }
        if (!username.trim().matches("^[a-zA-Z0-9._-]{3,30}$")) {
            throw new IllegalStateException("Bootstrap Super User username must be 3-30 valid username characters.");
        }
        if (password.length() < 12 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException("Bootstrap Super User password must be 12-72 UTF-8 bytes.");
        }

        String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        if (users.existsByUsername(normalizedUsername)) {
            throw new IllegalStateException("Bootstrap Super User username is already assigned to another role.");
        }
        users.save(new AppUser(
                normalizedUsername,
                normalizedUsername + "@bootstrap.invalid",
                name.trim(),
                passwordEncoder.encode(password),
                UserRole.SUPER_USER
        ));
    }
}
