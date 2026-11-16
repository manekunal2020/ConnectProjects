package com.connectprojects.backend.work;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/project-management")
public class ProjectManagementController {
    private final ProjectManagementService service;

    public ProjectManagementController(ProjectManagementService service) {
        this.service = service;
    }

    @GetMapping("/clients")
    public List<ClientEntity> clients(Authentication authentication) {
        return service.listClients(authentication);
    }

    @PostMapping("/clients")
    @ResponseStatus(HttpStatus.CREATED)
    public ClientEntity createClient(@Valid @RequestBody ClientCreateRequest request, Authentication authentication) {
        return service.createClient(request, authentication);
    }

    @GetMapping("/leads")
    public List<ProjectLeadResponse> projectLeads(Authentication authentication) {
        return service.listProjectLeads(authentication).stream()
                .map(user -> new ProjectLeadResponse(user.getId(), user.getFullName()))
                .toList();
    }
}
