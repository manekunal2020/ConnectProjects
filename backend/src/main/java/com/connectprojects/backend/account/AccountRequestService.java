package com.connectprojects.backend.account;

import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

@Service
public class AccountRequestService {
    private final AccountRequestRepository requests;
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;

    public AccountRequestService(
            AccountRequestRepository requests,
            AppUserRepository users,
            PasswordEncoder passwordEncoder
    ) {
        this.requests = requests;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AccountRequestResponse submit(AccountRequestSubmission submission) {
        String username = submission.username().trim().toLowerCase(Locale.ROOT);
        String email = submission.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByUsername(username) || users.existsByEmail(email)
                || requests.existsMatchingRequest(RequestStatus.PENDING, username, email)) {
            throw new ApiException(HttpStatus.CONFLICT, "That username or email already has an account or pending enquiry.");
        }
        AccountRequest request = requests.save(new AccountRequest(username, email, submission.name().trim()));
        return AccountRequestResponse.from(request);
    }

    @Transactional(readOnly = true)
    public List<AccountRequestResponse> pendingRequests() {
        return requests.findAllByStatusOrderBySubmittedAtAsc(RequestStatus.PENDING)
                .stream()
                .map(AccountRequestResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse approve(Long requestId, ApproveAccountRequest approval, AppUser reviewer) {
        AccountRequest request = findPending(requestId);
        if (users.existsByUsername(request.getUsername()) || users.existsByEmail(request.getEmail())) {
            throw new ApiException(HttpStatus.CONFLICT, "The requested username or email is already in use.");
        }
        if (approval.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Temporary password cannot exceed 72 UTF-8 bytes.");
        }

        AppUser newUser = new AppUser(
                request.getUsername(),
                request.getEmail(),
                request.getFullName(),
                passwordEncoder.encode(approval.password()),
                UserRole.PROJECT_LEAD
        );
        newUser.setPermissions(PermissionCatalog.defaults(UserRole.PROJECT_LEAD));
        users.save(newUser);
        request.review(RequestStatus.APPROVED, reviewer);
        return UserResponse.from(newUser);
    }

    @Transactional
    public AccountRequestResponse reject(Long requestId, AppUser reviewer) {
        AccountRequest request = findPending(requestId);
        request.review(RequestStatus.REJECTED, reviewer);
        return AccountRequestResponse.from(request);
    }

    private AccountRequest findPending(Long requestId) {
        AccountRequest request = requests.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account enquiry not found."));
        if (request.getStatus() != RequestStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "This account enquiry has already been reviewed.");
        }
        return request;
    }
}
