package com.connectprojects.backend.work;

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
@RequestMapping("/api/projects/{projectId}")
public class ProjectConfigurationController {
    private final ProjectManagementService service;

    public ProjectConfigurationController(ProjectManagementService service) {
        this.service = service;
    }

    @GetMapping("/shifts")
    public List<SupportShiftEntity> shifts(@PathVariable Long projectId, Authentication authentication) {
        return service.listShifts(projectId, authentication);
    }

    @PostMapping("/shifts")
    @ResponseStatus(HttpStatus.CREATED)
    public SupportShiftEntity addShift(@PathVariable Long projectId, @Valid @RequestBody SupportShiftRequest request,
                                       Authentication authentication) {
        return service.addShift(projectId, request, authentication);
    }

    @DeleteMapping("/shifts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteShift(@PathVariable Long projectId, @PathVariable Long id, Authentication authentication) {
        service.deleteShift(projectId, id, authentication);
    }

    @GetMapping("/priorities")
    public List<TicketPriorityEntity> priorities(@PathVariable Long projectId, Authentication authentication) {
        return service.listPriorities(projectId, authentication);
    }

    @PostMapping("/priorities")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketPriorityEntity addPriority(@PathVariable Long projectId, @Valid @RequestBody TicketPriorityRequest request,
                                            Authentication authentication) {
        return service.addPriority(projectId, request, authentication);
    }

    @DeleteMapping("/priorities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePriority(@PathVariable Long projectId, @PathVariable Long id, Authentication authentication) {
        service.deletePriority(projectId, id, authentication);
    }

    @GetMapping("/categories")
    public List<TicketCategoryEntity> categories(@PathVariable Long projectId, Authentication authentication) {
        return service.listCategories(projectId, authentication);
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketCategoryEntity addCategory(@PathVariable Long projectId, @Valid @RequestBody TicketCategoryRequest request,
                                            Authentication authentication) {
        return service.addCategory(projectId, request, authentication);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long projectId, @PathVariable Long id, Authentication authentication) {
        service.deleteCategory(projectId, id, authentication);
    }

    @PostMapping("/categories/{categoryId}/subcategories")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketSubcategoryEntity addSubcategory(@PathVariable Long projectId, @PathVariable Long categoryId,
                                                  @Valid @RequestBody TicketCategoryRequest request,
                                                  Authentication authentication) {
        return service.addSubcategory(projectId, categoryId, request, authentication);
    }

    @DeleteMapping("/categories/{categoryId}/subcategories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSubcategory(@PathVariable Long projectId, @PathVariable Long categoryId,
                                  @PathVariable Long id, Authentication authentication) {
        service.deleteSubcategory(projectId, categoryId, id, authentication);
    }

    @GetMapping("/slas")
    public List<ProjectSlaEntity> slas(@PathVariable Long projectId, Authentication authentication) {
        return service.listSlas(projectId, authentication);
    }

    @PostMapping("/slas")
    public ProjectSlaEntity saveSla(@PathVariable Long projectId, @Valid @RequestBody ProjectSlaRequest request,
                                    Authentication authentication) {
        return service.saveSla(projectId, request, authentication);
    }

    @DeleteMapping("/slas/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSla(@PathVariable Long projectId, @PathVariable Long id, Authentication authentication) {
        service.deleteSla(projectId, id, authentication);
    }
}
