package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.AppUserRepository;
import com.connectprojects.backend.account.UserRole;
import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectManagementServiceTest {
    @Mock private ProjectRepository projects;
    @Mock private ClientRepository clients;
    @Mock private AppUserRepository users;
    @Mock private SupportShiftRepository shifts;
    @Mock private TicketPriorityRepository priorities;
    @Mock private TicketCategoryRepository categories;
    @Mock private TicketSubcategoryRepository subcategories;
    @Mock private ProjectSlaRepository slas;
    @Mock private CurrentUserService currentUserService;
    @Mock private Authentication authentication;

    private ProjectManagementService service;

    @BeforeEach
    void setUp() {
        service = new ProjectManagementService(projects, clients, users, shifts, priorities, categories,
                subcategories, slas, currentUserService);
    }

    @Test
    void addShiftNormalizesSelectedDaysAndRequiresProjectEditPermission() {
        AppUser admin = user(UserRole.ADMIN);
        ProjectEntity project = project();
        when(currentUserService.require(authentication, "projects.edit")).thenReturn(admin);
        when(projects.findById(10L)).thenReturn(Optional.of(project));
        when(shifts.save(any(SupportShiftEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.addShift(10L, new SupportShiftRequest("Day shift", "FRI,MON,TUE", LocalTime.of(9, 0),
                LocalTime.of(17, 0), "UTC"), authentication);

        ArgumentCaptor<SupportShiftEntity> shift = ArgumentCaptor.forClass(SupportShiftEntity.class);
        verify(shifts).save(shift.capture());
        assertEquals("MON,TUE,FRI", shift.getValue().getDaysOfWeek());
        assertEquals(10L, shift.getValue().getProjectId());
    }

    @Test
    void projectLeadCannotReadConfigurationForUnassignedProject() {
        AppUser lead = user(UserRole.PROJECT_LEAD);
        ProjectEntity project = project(3L);
        when(currentUserService.require(authentication, "projects.view")).thenReturn(lead);
        when(projects.findById(10L)).thenReturn(Optional.of(project));

        ApiException error = assertThrows(ApiException.class, () -> service.listShifts(10L, authentication));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(shifts, never()).findByProjectIdOrderByStartTime(10L);
    }

    @Test
    void slaCannotResolveFasterThanItsResponseTarget() {
        AppUser admin = user(UserRole.ADMIN);
        ProjectEntity project = project();
        when(currentUserService.require(authentication, "projects.edit")).thenReturn(admin);
        when(projects.findById(10L)).thenReturn(Optional.of(project));
        when(priorities.findByIdAndProjectId(20L, 10L))
                .thenReturn(Optional.of(new TicketPriorityEntity(10L, "Critical", 1, "#C62828")));

        ApiException error = assertThrows(ApiException.class, () -> service.saveSla(10L,
                new ProjectSlaRequest(20L, 120, 60, true), authentication));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(slas, never()).save(any(ProjectSlaEntity.class));
    }

    private static ProjectEntity project() {
        return new ProjectEntity("Project", "", "On track", null, null);
    }

    private static ProjectEntity project(Long managerId) {
        AppUser manager = mock(AppUser.class);
        when(manager.getId()).thenReturn(managerId);
        return new ProjectEntity("Project", "", "On track", null, manager);
    }

    private static AppUser user(UserRole role) {
        AppUser user = mock(AppUser.class);
        when(user.getRole()).thenReturn(role);
        return user;
    }

}
