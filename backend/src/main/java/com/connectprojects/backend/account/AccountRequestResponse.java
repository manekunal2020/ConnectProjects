package com.connectprojects.backend.account;

import java.time.Instant;

public record AccountRequestResponse(
        Long id,
        String username,
        String email,
        String name,
        Instant submittedAt
) {
    public static AccountRequestResponse from(AccountRequest request) {
        return new AccountRequestResponse(
                request.getId(),
                request.getUsername(),
                request.getEmail(),
                request.getFullName(),
                request.getSubmittedAt()
        );
    }
}
