package com.connectprojects.backend.work;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {
    private final TicketService service;

    public TicketController(TicketService service) {
        this.service = service;
    }

    @GetMapping
    public List<TicketResponse> list(Authentication authentication) {
        return service.list(authentication, "tickets.view");
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketResponse create(@Valid @RequestBody TicketCreateRequest request, Authentication authentication) {
        return service.create(request, authentication);
    }

    @PatchMapping("/{id}")
    public TicketResponse update(@PathVariable Long id, @Valid @RequestBody TicketUpdateRequest request, Authentication authentication) {
        return service.update(id, request, authentication);
    }

    @PatchMapping("/{id}/assign")
    public TicketResponse assign(@PathVariable Long id, @Valid @RequestBody TicketAssignRequest request, Authentication authentication) {
        return service.assign(id, request.assigneeId(), authentication);
    }

    @PatchMapping("/{id}/resolve")
    public TicketResponse resolve(@PathVariable Long id, Authentication authentication) {
        return service.resolve(id, authentication);
    }

    @PatchMapping("/{id}/close")
    public TicketResponse close(@PathVariable Long id, Authentication authentication) {
        return service.close(id, authentication);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        service.delete(id, authentication);
    }
}
