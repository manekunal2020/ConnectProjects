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
import java.util.regex.Pattern;

@Component
public class BootstrapSuperUser implements ApplicationRunner {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String password;
    private final String name;
    private final String email;

    public BootstrapSuperUser(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap-super-user.username}") String username,
            @Value("${app.bootstrap-super-user.password}") String password,
            @Value("${app.bootstrap-super-user.name}") String name,
            @Value("${app.bootstrap-super-user.email}") String email
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.username = username;
        this.password = password;
        this.name = name;
        this.email = email;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.existsByRole(UserRole.SUPER_USER)) {
            users.findFirstByRole(UserRole.SUPER_USER).ifPresent(user -> {
                if (user.getEmail().endsWith("@bootstrap.invalid")) {
                    String normalizedEmail = normalizeAndValidateEmail(email);
                    if (users.existsByEmailAndIdNot(normalizedEmail, user.getId())) {
                        throw new IllegalStateException("Bootstrap Super User email is already assigned to another account.");
                    }
                    user.setEmail(normalizedEmail);
                    users.save(user);
                }
            });
            return;
        }
        if (username.isBlank() || password.isBlank() || name.isBlank() || email.isBlank()) {
            throw new IllegalStateException(
                    "No Super User exists. Set BOOTSTRAP_SUPERUSER_USERNAME, BOOTSTRAP_SUPERUSER_PASSWORD, BOOTSTRAP_SUPERUSER_NAME, and BOOTSTRAP_SUPERUSER_EMAIL."
            );
        }
        if (!username.trim().matches("^[a-zA-Z0-9._-]{3,30}$")) {
            throw new IllegalStateException("Bootstrap Super User username must be 3-30 valid username characters.");
        }
        if (password.length() < 12 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalStateException("Bootstrap Super User password must be 12-72 UTF-8 bytes.");
        }

        String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        String normalizedEmail = normalizeAndValidateEmail(email);
        if (users.existsByUsername(normalizedUsername)) {
            throw new IllegalStateException("Bootstrap Super User username is already assigned to another role.");
        }
        if (users.existsByEmail(normalizedEmail)) {
            throw new IllegalStateException("Bootstrap Super User email is already assigned to another account.");
        }
        users.save(new AppUser(
                normalizedUsername,
                normalizedEmail,
                name.trim(),
                passwordEncoder.encode(password),
                UserRole.SUPER_USER
        ));
    }

    private String normalizeAndValidateEmail(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() > 254 || !EMAIL_PATTERN.matcher(normalized).matches()) {
            throw new IllegalStateException("Bootstrap Super User email must be a valid email address.");
        }
        return normalized;
    }
}
