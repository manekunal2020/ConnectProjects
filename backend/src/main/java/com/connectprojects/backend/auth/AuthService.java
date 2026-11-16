package com.connectprojects.backend.auth;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.AppUserRepository;
import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.ProfileUpdateRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;

@Service
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final AppUserRepository users;
    private final JwtService jwtService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final String frontendUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            AuthenticationManager authenticationManager,
            AppUserRepository users,
            JwtService jwtService,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            EmailService emailService,
            @Value("${app.frontend-url}") String frontendUrl
    ) {
        this.authenticationManager = authenticationManager;
        this.users = users;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
    }

    public LoginResponse login(LoginRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(username, request.password())
            );
        } catch (BadCredentialsException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect username or password.");
        }

        AppUser user = users.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect username or password."));
        return new LoginResponse(jwtService.issueToken(user.getUsername()), UserResponse.from(user));
    }

    @Transactional
    public String requestPasswordReset(String email) {
        emailService.requireConfigured();
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        AppUser user = users.findByEmail(normalizedEmail).orElse(null);
        if (user == null) {
            return "If an account exists with this email address, a password reset link will be sent.";
        }

        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        user.setPasswordReset(hashToken(token), Instant.now().plusSeconds(15 * 60));
        String link = frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + token;
        try {
            emailService.send(
                    user.getEmail(),
                    "Reset your Connect Projects password",
                    "Open this link to reset your password: " + link,
                    "<p>Open the following link to reset your password. It expires in 15 minutes.</p><p><a href=\"" + link + "\">Reset password</a></p>"
            );
        } catch (RuntimeException exception) {
            user.clearPasswordReset();
            throw exception;
        }
        return "If an account exists with this email address, a password reset link will be sent.";
    }

    @Transactional
    public void resetPassword(String token, String password) {
        AppUser user = users.findByResetTokenHash(hashToken(token))
                .filter(candidate -> candidate.getResetTokenExpires() != null
                        && candidate.getResetTokenExpires().isAfter(Instant.now()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "This password reset link is invalid or has expired. Please request a new one."));
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password cannot exceed 72 UTF-8 bytes.");
        }
        user.setPasswordHash(passwordEncoder.encode(password));
        user.clearPasswordReset();
    }

    @Transactional
    public UserResponse updateProfile(AppUser user, ProfileUpdateRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailAndIdNot(email, user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "That email address is already in use.");
        }
        user.setFullName(request.name().trim());
        user.setEmail(email);
        return UserResponse.from(user);
    }

    @Transactional
    public void changePassword(AppUser user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }
        if (request.newPassword().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password cannot exceed 72 UTF-8 bytes.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.clearPasswordReset();
    }

    private String hashToken(String token) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }
}
