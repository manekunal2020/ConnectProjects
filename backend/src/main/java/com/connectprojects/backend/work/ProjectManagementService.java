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
import java.util.Locale;

@Service
public class ProjectManagementService {
    private final ProjectRepository projects;
    private final ClientRepository clients;
    private final AppUserRepository users;
    private final SupportShiftRepository shifts;
    private final TicketPriorityRepository priorities;
    private final TicketCategoryRepository categories;
    private final TicketSubcategoryRepository subcategories;
    private final ProjectSlaRepository slas;
    private final CurrentUserService currentUserService;

    public ProjectManagementService(
            ProjectRepository projects,
            ClientRepository clients,
            AppUserRepository users,
            SupportShiftRepository shifts,
            TicketPriorityRepository priorities,
            TicketCategoryRepository categories,
            TicketSubcategoryRepository subcategories,
            ProjectSlaRepository slas,
            CurrentUserService currentUserService
    ) {
        this.projects = projects;
        this.clients = clients;
        this.users = users;
        this.shifts = shifts;
        this.priorities = priorities;
        this.categories = categories;
        this.subcategories = subcategories;
        this.slas = slas;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<ClientEntity> listClients(Authentication authentication) {
        currentUserService.require(authentication, "projects.view");
        return clients.findAllByOrderByNameAsc();
    }

    @Transactional
    public ClientEntity createClient(ClientCreateRequest request, Authentication authentication) {
        currentUserService.require(authentication, "projects.create");
        String name = request.name().trim();
        if (clients.existsByNameIgnoreCase(name)) {
            throw new ApiException(HttpStatus.CONFLICT, "A client with that name already exists.");
        }
        return clients.save(new ClientEntity(name, request.industry() == null ? null : request.industry().trim()));
    }

    @Transactional(readOnly = true)
    public List<AppUser> listProjectLeads(Authentication authentication) {
        currentUserService.require(authentication, "projects.view");
        return users.findAllByRoleAndEnabledTrueOrderByFullNameAsc(UserRole.PROJECT_LEAD);
    }

    @Transactional(readOnly = true)
    public List<SupportShiftEntity> listShifts(Long projectId, Authentication authentication) {
        requireProject(projectId, authentication, false);
        return shifts.findByProjectIdOrderByStartTime(projectId);
    }

    @Transactional
    public SupportShiftEntity addShift(Long projectId, SupportShiftRequest request, Authentication authentication) {
        requireProject(projectId, authentication, true);
        String days = normalizeDays(request.daysOfWeek());
        return shifts.save(new SupportShiftEntity(
                projectId, request.name().trim(), days, request.startTime(), request.endTime(),
                request.timezone() == null ? "" : request.timezone().trim()));
    }

    @Transactional
    public void deleteShift(Long projectId, Long shiftId, Authentication authentication) {
        requireProject(projectId, authentication, true);
        SupportShiftEntity shift = shifts.findById(shiftId)
                .filter(item -> item.getProjectId().equals(projectId))
                .orElseThrow(() -> notFound("Shift"));
        shifts.delete(shift);
    }

    @Transactional(readOnly = true)
    public List<TicketPriorityEntity> listPriorities(Long projectId, Authentication authentication) {
        requireProject(projectId, authentication, false);
        return priorities.findByProjectIdOrderByLevel(projectId);
    }

    @Transactional
    public TicketPriorityEntity addPriority(Long projectId, TicketPriorityRequest request, Authentication authentication) {
        requireProject(projectId, authentication, true);
        String name = request.name().trim();
        if (priorities.existsByProjectIdAndNameIgnoreCase(projectId, name)) {
            throw new ApiException(HttpStatus.CONFLICT, "That priority already exists for this project.");
        }
        if (priorities.existsByProjectIdAndLevel(projectId, request.level())) {
            throw new ApiException(HttpStatus.CONFLICT, "That priority level is already used for this project.");
        }
        return priorities.save(new TicketPriorityEntity(projectId, name, request.level(), request.color()));
    }

    @Transactional
    public void deletePriority(Long projectId, Long priorityId, Authentication authentication) {
        requireProject(projectId, authentication, true);
        TicketPriorityEntity priority = priorities.findByIdAndProjectId(priorityId, projectId)
                .orElseThrow(() -> notFound("Priority"));
        slas.deleteByProjectIdAndPriorityId(projectId, priorityId);
        priorities.delete(priority);
    }

    @Transactional(readOnly = true)
    public List<TicketCategoryEntity> listCategories(Long projectId, Authentication authentication) {
        requireProject(projectId, authentication, false);
        return categories.findByProjectIdOrderByName(projectId);
    }

    @Transactional
    public TicketCategoryEntity addCategory(Long projectId, TicketCategoryRequest request, Authentication authentication) {
        requireProject(projectId, authentication, true);
        String name = request.name().trim();
        if (categories.existsByProjectIdAndNameIgnoreCase(projectId, name)) {
            throw new ApiException(HttpStatus.CONFLICT, "That category already exists for this project.");
        }
        return categories.save(new TicketCategoryEntity(projectId, name));
    }

    @Transactional
    public void deleteCategory(Long projectId, Long categoryId, Authentication authentication) {
        requireProject(projectId, authentication, true);
        TicketCategoryEntity category = categories.findByIdAndProjectId(categoryId, projectId)
                .orElseThrow(() -> notFound("Category"));
        categories.delete(category);
    }

    @Transactional
    public TicketSubcategoryEntity addSubcategory(Long projectId, Long categoryId, TicketCategoryRequest request,
                                                   Authentication authentication) {
        requireProject(projectId, authentication, true);
        TicketCategoryEntity category = categories.findByIdAndProjectId(categoryId, projectId)
                .orElseThrow(() -> notFound("Category"));
        String name = request.name().trim();
        boolean exists = category.getSubcategories().stream().anyMatch(item -> item.getName().equalsIgnoreCase(name));
        if (exists) throw new ApiException(HttpStatus.CONFLICT, "That subcategory already exists.");
        return subcategories.save(new TicketSubcategoryEntity(name, category));
    }

    @Transactional
    public void deleteSubcategory(Long projectId, Long categoryId, Long subcategoryId, Authentication authentication) {
        requireProject(projectId, authentication, true);
        TicketSubcategoryEntity subcategory = subcategories.findById(subcategoryId)
                .filter(item -> item.getCategory().getId().equals(categoryId)
                        && item.getCategory().getProjectId().equals(projectId))
                .orElseThrow(() -> notFound("Subcategory"));
        subcategories.delete(subcategory);
    }

    @Transactional(readOnly = true)
    public List<ProjectSlaEntity> listSlas(Long projectId, Authentication authentication) {
        requireProject(projectId, authentication, false);
        return slas.findByProjectId(projectId);
    }

    @Transactional
    public ProjectSlaEntity saveSla(Long projectId, ProjectSlaRequest request, Authentication authentication) {
        requireProject(projectId, authentication, true);
        priorities.findByIdAndProjectId(request.priorityId(), projectId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Choose a priority for this project."));
        if (request.resolutionMinutes() < request.responseMinutes()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resolution time must be at least the response time.");
        }
        ProjectSlaEntity existing = slas.findByProjectIdAndPriorityId(projectId, request.priorityId()).orElse(null);
        if (existing != null) {
            existing.setResponseMinutes(request.responseMinutes());
            existing.setResolutionMinutes(request.resolutionMinutes());
            existing.setBusinessHoursOnly(request.businessHoursOnly());
            return existing;
        }
        return slas.save(new ProjectSlaEntity(projectId, request.priorityId(), request.responseMinutes(),
                request.resolutionMinutes(), request.businessHoursOnly()));
    }

    @Transactional
    public void deleteSla(Long projectId, Long slaId, Authentication authentication) {
        requireProject(projectId, authentication, true);
        ProjectSlaEntity sla = slas.findByIdAndProjectId(slaId, projectId).orElseThrow(() -> notFound("SLA"));
        slas.delete(sla);
    }

    private ProjectEntity requireProject(Long projectId, Authentication authentication, boolean write) {
        AppUser user = currentUserService.require(authentication, write ? "projects.edit" : "projects.view");
        ProjectEntity project = projects.findById(projectId)
                .orElseThrow(() -> notFound("Project"));
        if (user.getRole() == UserRole.PROJECT_LEAD
                && (project.getLead() == null || !project.getLead().getId().equals(user.getId()))
                && project.getTeamLeaders().stream().noneMatch(leader -> leader.getId().equals(user.getId()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this project.");
        }
        return project;
    }

    private String normalizeDays(String value) {
        List<String> days = List.of("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN");
        List<String> normalized = java.util.Arrays.stream(value.split(","))
                .map(day -> day.trim().toUpperCase(Locale.ROOT))
                .filter(day -> !day.isBlank())
                .distinct()
                .toList();
        if (normalized.isEmpty() || normalized.stream().anyMatch(day -> !days.contains(day))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose at least one valid support day.");
        }
        return days.stream().filter(normalized::contains).reduce((a, b) -> a + "," + b).orElseThrow();
    }

    private ApiException notFound(String item) {
        return new ApiException(HttpStatus.NOT_FOUND, item + " not found.");
    }
}
