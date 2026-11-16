package com.connectprojects.backend.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.connectprojects.backend.account.AppUser;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final CurrentUserService currentUserService;

    public AuthController(AuthService authService, CurrentUserService currentUserService) {
        this.authService = authService;
        this.currentUserService = currentUserService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return UserResponse.from(currentUserService.get(authentication));
    }

    @PatchMapping("/me")
    public UserResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest request, Authentication authentication) {
        return authService.updateProfile(currentUserService.get(authentication), request);
    }

    @PutMapping("/me/password")
    public MessageResponse changePassword(@Valid @RequestBody ChangePasswordRequest request, Authentication authentication) {
        authService.changePassword(currentUserService.get(authentication), request);
        return new MessageResponse("Your password has been changed successfully.");
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return new MessageResponse(authService.requestPasswordReset(request.email()));
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.OK)
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.password());
        return new MessageResponse("Your password has been reset successfully. You can now sign in.");
    }

    public record MessageResponse(String message) {
    }
}
