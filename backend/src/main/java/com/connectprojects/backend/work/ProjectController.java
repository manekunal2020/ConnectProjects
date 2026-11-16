package com.connectprojects.backend.work;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService service;

    public ProjectController(ProjectService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProjectResponse> list(Authentication authentication) {
        return service.list(authentication);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@Valid @RequestBody ProjectRequest request, Authentication authentication) {
        return service.create(request, authentication);
    }

    @PutMapping("/{id}")
    public ProjectResponse update(@PathVariable Long id, @Valid @RequestBody ProjectRequest request, Authentication authentication) {
        return service.update(id, request, authentication);
    }

    @PatchMapping("/{id}/status")
    public ProjectResponse updateActive(@PathVariable Long id, @RequestParam boolean active,
                                        Authentication authentication) {
        return service.updateActive(id, active, authentication);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        service.delete(id, authentication);
    }
}
