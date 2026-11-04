package com.connectprojects.backend.auth;

public record LoginResponse(String token, UserResponse user) {
}
