package com.connectprojects.backend.work;

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
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping
    public List<TaskResponse> list(Authentication authentication) {
        return service.list(authentication);
    }

    @GetMapping("/assignees")
    public List<TaskAssigneeResponse> listAssignees(Authentication authentication) {
        return service.listAssignees(authentication);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@Valid @RequestBody TaskRequest request, Authentication authentication) {
        return service.create(request, authentication);
    }

    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable Long id, @Valid @RequestBody TaskRequest request, Authentication authentication) {
        return service.update(id, request, authentication);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        service.delete(id, authentication);
    }
}
