package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.PermissionCatalog;
import com.connectprojects.backend.auth.CurrentUserService;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {
    private final CurrentUserService currentUserService;
    private final ProjectService projectService;
    private final TaskService taskService;
    private final TicketService ticketService;

    public DashboardService(CurrentUserService currentUserService, ProjectService projectService, TaskService taskService, TicketService ticketService) {
        this.currentUserService = currentUserService;
        this.projectService = projectService;
        this.taskService = taskService;
        this.ticketService = ticketService;
    }

    @Transactional(readOnly = true)
    public DashboardResponse get(Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "dashboard.view");
        List<ProjectResponse> projects = PermissionCatalog.allows(user, "projects.view")
                ? projectService.list(authentication) : List.of();
        List<TaskResponse> tasks = PermissionCatalog.allows(user, "tasks.view")
                ? taskService.list(authentication) : List.of();
        List<TicketResponse> tickets = PermissionCatalog.allows(user, "tickets.view")
                ? ticketService.list(authentication, "tickets.view") : List.of();
        Instant now = Instant.now();

        Map<String, Long> totals = new LinkedHashMap<>();
        totals.put("projects", (long) projects.size());
        totals.put("active", projects.stream().filter(project -> !"Completed".equals(project.status())).count());
        totals.put("tasksOpen", tasks.stream().filter(task -> !"Completed".equals(task.status())).count());
        totals.put("overdue", projects.stream().filter(project -> project.due() != null
                && project.due().atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().isBefore(now)
                && !"Completed".equals(project.status())).count());

        List<DashboardResponse.ActivityResponse> activity = tickets.stream()
                .flatMap(ticket -> ticket.history().stream().map(item ->
                        new DashboardResponse.ActivityResponse(item.id(), item.user(), item.action(), ticket.subject(), item.timestamp())))
                .sorted(Comparator.comparing(DashboardResponse.ActivityResponse::timestamp).reversed())
                .limit(6)
                .toList();

        Map<String, Long> workload = tasks.stream()
                .filter(task -> !"Completed".equals(task.status()) && task.assignee() != null && !task.assignee().isBlank())
                .collect(Collectors.groupingBy(TaskResponse::assignee, Collectors.counting()));
        List<DashboardResponse.WorkloadResponse> workloadRows = new ArrayList<>();
        workload.forEach((name, open) -> workloadRows.add(new DashboardResponse.WorkloadResponse(name, open)));
        workloadRows.sort(Comparator.comparingLong(DashboardResponse.WorkloadResponse::open).reversed());

        return new DashboardResponse(totals, projects, tasks, activity, workloadRows);
    }
}
