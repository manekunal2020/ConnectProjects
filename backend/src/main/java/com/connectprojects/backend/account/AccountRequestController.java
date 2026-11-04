package com.connectprojects.backend.account;

import com.connectprojects.backend.auth.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/account-requests")
public class AccountRequestController {
    private final AccountRequestService service;
    private final AppUserRepository users;

    public AccountRequestController(AccountRequestService service, AppUserRepository users) {
        this.service = service;
        this.users = users;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountRequestResponse submit(@Valid @RequestBody AccountRequestSubmission submission) {
        return service.submit(submission);
    }

    @GetMapping
    public List<AccountRequestResponse> pendingRequests() {
        return service.pendingRequests();
    }

    @PostMapping("/{id}/approve")
    public UserResponse approve(
            @PathVariable Long id,
            @Valid @RequestBody ApproveAccountRequest approval,
            Authentication authentication
    ) {
        return service.approve(id, approval, authenticatedUser(authentication));
    }

    @PostMapping("/{id}/reject")
    public AccountRequestResponse reject(@PathVariable Long id, Authentication authentication) {
        return service.reject(id, authenticatedUser(authentication));
    }

    private AppUser authenticatedUser(Authentication authentication) {
        UserDetails principal = (UserDetails) authentication.getPrincipal();
        return users.findByUsername(principal.getUsername())
                .orElseThrow(() -> new IllegalStateException("Authenticated account no longer exists."));
    }
}
