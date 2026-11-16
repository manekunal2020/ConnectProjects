package com.connectprojects.backend.account;

import com.connectprojects.backend.auth.CurrentUserService;
import com.connectprojects.backend.auth.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;
    private final CurrentUserService currentUserService;

    public UserController(UserService service, CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public List<UserResponse> list(Authentication authentication) {
        currentUserService.requireSuperUser(authentication);
        return service.list();
    }

    @GetMapping("/assignees")
    public List<UserResponse> listAssignees(Authentication authentication) {
        return service.listAssignees(authentication);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request, Authentication authentication) {
        currentUserService.requireSuperUser(authentication);
        return service.create(request);
    }

    @PutMapping("/{id}/permissions")
    public UserResponse updatePermissions(@PathVariable Long id, @Valid @RequestBody PermissionsUpdateRequest request, Authentication authentication) {
        currentUserService.requireSuperUser(authentication);
        return service.updatePermissions(id, request.permissions());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        service.delete(id, currentUserService.requireSuperUser(authentication));
    }
}
