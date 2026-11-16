package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.AppUserRepository;
import com.connectprojects.backend.account.UserRole;
import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class ProjectService {
    private static final Set<String> STATUSES = Set.of("On track", "At risk", "Delayed", "Completed");
    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final AppUserRepository users;
    private final ClientRepository clients;
    private final CurrentUserService currentUserService;

    public ProjectService(ProjectRepository projects, TaskRepository tasks, AppUserRepository users,
                          ClientRepository clients, CurrentUserService currentUserService) {
        this.projects = projects;
        this.tasks = tasks;
        this.users = users;
        this.clients = clients;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "projects.view");
        List<ProjectEntity> rows = user.getRole() == UserRole.PROJECT_LEAD
                ? projects.findVisibleToProjectLead(user.getId())
                : projects.findAllByOrderByCreatedAtDesc();
        return rows.stream().map(this::response).toList();
    }

    @Transactional
    public ProjectResponse create(ProjectRequest request, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "projects.create");
        ProjectEntity project = new ProjectEntity(
                request.name().trim(),
                request.description() == null ? "" : request.description().trim(),
                validStatus(request.status()),
                request.due(),
                requestedLead(projectManagerId(request), user)
        );
        if (request.clientId() != null) project.setClient(requestedClient(request.clientId()));
        project.setTeamLeaders(requestedTeamLeaders(request.teamLeaderIds()));
        if (request.active() != null) project.setActive(request.active());
        return response(projects.save(project));
    }

    @Transactional
    public ProjectResponse update(Long id, ProjectRequest request, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "projects.edit");
        ProjectEntity project = find(id);
        ensureProjectAccess(project, user);
        project.setName(request.name().trim());
        project.setDescription(request.description() == null ? "" : request.description().trim());
        project.setStatus(validStatus(request.status()));
        project.setDueDate(request.due());
        if (projectManagerId(request) != null) {
            project.setLead(requestedLead(projectManagerId(request), user));
        }
        if (request.clientId() != null) project.setClient(requestedClient(request.clientId()));
        if (request.teamLeaderIds() != null) project.setTeamLeaders(requestedTeamLeaders(request.teamLeaderIds()));
        if (request.active() != null) project.setActive(request.active());
        return response(project);
    }

    @Transactional
    public void delete(Long id, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "projects.delete");
        ProjectEntity project = find(id);
        ensureProjectAccess(project, user);
        projects.delete(project);
    }

    @Transactional
    public ProjectResponse updateActive(Long id, boolean active, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "projects.edit");
        ProjectEntity project = find(id);
        ensureProjectAccess(project, user);
        project.setActive(active);
        return response(project);
    }

    private ProjectResponse response(ProjectEntity project) {
        List<TaskEntity> projectTasks = tasks.findAllByProject_Id(project.getId());
        long done = projectTasks.stream().filter(task -> task.getStatus().equalsIgnoreCase("Completed")
                || task.getStatus().equalsIgnoreCase("Done")).count();
        int progress = projectTasks.isEmpty() ? project.getProgress() : (int) Math.round(done * 100.0 / projectTasks.size());
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getLead() == null ? "Unassigned" : project.getLead().getFullName(),
                project.getStatus(),
                progress,
                project.getDueDate(),
                projectTasks.size(),
                done,
                project.getClient() == null ? null : new ProjectResponse.ClientSummary(
                        project.getClient().getId(), project.getClient().getName(), project.getClient().getIndustry()),
                project.getLead() == null ? null : new ProjectResponse.UserSummary(
                        project.getLead().getId(), project.getLead().getFullName()),
                project.getTeamLeaders().stream()
                        .map(leader -> new ProjectResponse.UserSummary(leader.getId(), leader.getFullName()))
                        .toList(),
                project.isActive()
        );
    }

    private ProjectEntity find(Long id) {
        return projects.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Project not found."));
    }

    private AppUser requestedLead(Long leadId, AppUser currentUser) {
        if (leadId == null) return currentUser;
        if (currentUser.getRole() == UserRole.PROJECT_LEAD && !currentUser.getId().equals(leadId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Project Leads can only lead their own projects.");
        }
        return users.findById(leadId).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected project lead was not found."));
    }

    private void ensureProjectAccess(ProjectEntity project, AppUser user) {
        if (user.getRole() == UserRole.PROJECT_LEAD
                && (project.getLead() == null || !project.getLead().getId().equals(user.getId()))
                && project.getTeamLeaders().stream().noneMatch(leader -> leader.getId().equals(user.getId()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only manage projects assigned to you.");
        }
    }

    private Long projectManagerId(ProjectRequest request) {
        return request.projectManagerId() != null ? request.projectManagerId() : request.leadId();
    }

    private ClientEntity requestedClient(Long clientId) {
        return clients.findById(clientId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected client was not found."));
    }

    private List<AppUser> requestedTeamLeaders(List<Long> leaderIds) {
        if (leaderIds == null || leaderIds.isEmpty()) return List.of();
        List<AppUser> leaders = users.findAllById(leaderIds);
        if (leaders.size() != leaderIds.stream().distinct().count()
                || leaders.stream().anyMatch(leader -> leader.getRole() != UserRole.PROJECT_LEAD)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose valid Project Lead accounts for team leaders.");
        }
        return leaders;
    }

    private String validStatus(String status) {
        String value = status == null || status.isBlank() ? "On track" : status.trim();
        if (!STATUSES.contains(value)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose On track, At risk, Delayed, or Completed.");
        }
        return value;
    }
}
