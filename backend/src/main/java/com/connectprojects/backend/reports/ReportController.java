package com.connectprojects.backend.reports;

import com.connectprojects.backend.auth.CurrentUserService;
import com.connectprojects.backend.work.TicketResponse;
import com.connectprojects.backend.work.TicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final ReportScheduleService schedules;
    private final TicketService tickets;
    private final CurrentUserService currentUserService;

    public ReportController(ReportScheduleService schedules, TicketService tickets, CurrentUserService currentUserService) {
        this.schedules = schedules;
        this.tickets = tickets;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/tickets")
    public List<TicketResponse> tickets(Authentication authentication) {
        return tickets.list(authentication, "reports.view");
    }

    @GetMapping("/schedules")
    public List<ReportScheduleResponse> list(Authentication authentication) {
        return schedules.list(authentication);
    }

    @GetMapping("/deliveries")
    public List<ReportEmailDeliveryResponse> listDeliveries(Authentication authentication) {
        return schedules.listDeliveries(authentication);
    }

    @PostMapping("/schedules")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportScheduleResponse create(@Valid @RequestBody ReportScheduleRequest request, Authentication authentication) {
        return schedules.create(request, authentication);
    }

    @DeleteMapping("/schedules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, Authentication authentication) {
        schedules.delete(id, authentication);
    }
}
