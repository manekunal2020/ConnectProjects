package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.AppUserRepository;
import com.connectprojects.backend.account.PermissionCatalog;
import com.connectprojects.backend.account.UserRole;
import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class TaskService {
    private static final Set<String> PRIORITIES = Set.of("Low", "Medium", "High", "Critical");
    private static final Set<String> STATUSES = Set.of("To do", "In progress", "Completed");
    private final TaskRepository tasks;
    private final ProjectRepository projects;
    private final AppUserRepository users;
    private final CurrentUserService currentUserService;

    public TaskService(TaskRepository tasks, ProjectRepository projects, AppUserRepository users, CurrentUserService currentUserService) {
        this.tasks = tasks;
        this.projects = projects;
        this.users = users;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> list(Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tasks.view");
        List<TaskEntity> rows = switch (user.getRole()) {
            case TEAM_MEMBER -> tasks.findAllByAssignee_IdOrderByDueDateAsc(user.getId());
            case PROJECT_LEAD -> tasks.findAllByProject_Lead_IdOrderByDueDateAsc(user.getId());
            default -> tasks.findAllByOrderByDueDateAsc();
        };
        return rows.stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskAssigneeResponse> listAssignees(Authentication authentication) {
        AppUser user = currentUserService.get(authentication);
        if (!canAssignTasks(user)
                || (!PermissionCatalog.allows(user, "tasks.create") && !PermissionCatalog.allows(user, "tasks.edit"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only Admins and Super Users with task access can assign tasks.");
        }
        return users.findAllByEnabledTrueOrderByFullNameAsc().stream()
                .map(assignee -> new TaskAssigneeResponse(assignee.getId(), assignee.getFullName()))
                .toList();
    }

    @Transactional
    public TaskResponse create(TaskRequest request, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tasks.create");
        TaskEntity task = new TaskEntity(
                request.title().trim(),
                project(request.projectId()),
                assignee(request.assigneeId(), user),
                request.due(),
                validPriority(request.priority()),
                validStatus(request.status())
        );
        TaskEntity saved = tasks.save(task);
        refreshProjectProgress(saved.getProject());
        return response(saved);
    }

    @Transactional
    public TaskResponse update(Long id, TaskRequest request, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tasks.edit");
        TaskEntity task = find(id);
        ensureTaskAccess(task, user);
        if (user.getRole() == UserRole.TEAM_MEMBER) {
            task.setStatus(validStatus(request.status()));
        } else {
            if (!canAssignTasks(user) && !Objects.equals(
                    request.assigneeId(),
                    task.getAssignee() == null ? null : task.getAssignee().getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Only Admins and Super Users can assign tasks.");
            }
            ProjectEntity previousProject = task.getProject();
            task.setTitle(request.title().trim());
            task.setProject(project(request.projectId()));
            if (canAssignTasks(user)) {
                task.setAssignee(assignee(request.assigneeId(), user));
            }
            task.setDueDate(request.due());
            task.setPriority(validPriority(request.priority()));
            task.setStatus(validStatus(request.status()));
            refreshProjectProgress(previousProject);
        }
        refreshProjectProgress(task.getProject());
        return response(task);
    }

    @Transactional
    public void delete(Long id, Authentication authentication) {
        AppUser user = currentUserService.require(authentication, "tasks.delete");
        TaskEntity task = find(id);
        ensureTaskAccess(task, user);
        ProjectEntity project = task.getProject();
        tasks.delete(task);
        refreshProjectProgress(project);
    }

    private void refreshProjectProgress(ProjectEntity project) {
        if (project == null) return;
        List<TaskEntity> rows = tasks.findAllByProject_Id(project.getId());
        long done = rows.stream().filter(task -> task.getStatus().equalsIgnoreCase("Completed")).count();
        project.setProgress(rows.isEmpty() ? 0 : (int) Math.round(done * 100.0 / rows.size()));
    }

    private TaskResponse response(TaskEntity task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getProject() == null ? "" : task.getProject().getName(),
                task.getDueDate(),
                task.getPriority(),
                task.getStatus(),
                task.getAssignee() == null ? "" : task.getAssignee().getFullName(),
                task.getAssignee() == null ? null : task.getAssignee().getId()
        );
    }

    private ProjectEntity project(Long id) {
        if (id == null) return null;
        return projects.findById(id).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Selected project was not found."));
    }

    private AppUser assignee(Long id, AppUser currentUser) {
        if (!canAssignTasks(currentUser)) {
            if (id != null) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Only Admins and Super Users can assign tasks.");
            }
            return currentUser.getRole() == UserRole.TEAM_MEMBER ? currentUser : null;
        }
        if (id == null) return null;
        return users.findById(id).filter(AppUser::isEnabled)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Choose an enabled task assignee."));
    }

    private boolean canAssignTasks(AppUser user) {
        return user.getRole() == UserRole.SUPER_USER || user.getRole() == UserRole.ADMIN;
    }

    private void ensureTaskAccess(TaskEntity task, AppUser user) {
        if (user.getRole() == UserRole.TEAM_MEMBER
                && (task.getAssignee() == null || !task.getAssignee().getId().equals(user.getId()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only manage your assigned tasks.");
        }
        if (user.getRole() == UserRole.PROJECT_LEAD
                && (task.getProject() == null || task.getProject().getLead() == null
                || !task.getProject().getLead().getId().equals(user.getId()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only manage tasks in your projects.");
        }
    }

    private TaskEntity find(Long id) {
        return tasks.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Task not found."));
    }

    private String validPriority(String value) {
        String priority = value == null || value.isBlank() ? "Medium" : value.trim();
        if (!PRIORITIES.contains(priority)) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose Low, Medium, High, or Critical priority.");
        return priority;
    }

    private String validStatus(String value) {
        String status = value == null || value.isBlank() ? "To do" : value.trim();
        if (!STATUSES.contains(status)) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose To do, In progress, or Completed status.");
        return status;
    }
}
