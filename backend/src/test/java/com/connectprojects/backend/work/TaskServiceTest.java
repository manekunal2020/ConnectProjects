package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import com.connectprojects.backend.account.AppUserRepository;
import com.connectprojects.backend.account.UserRole;
import com.connectprojects.backend.api.ApiException;
import com.connectprojects.backend.auth.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {
    @Mock private TaskRepository tasks;
    @Mock private ProjectRepository projects;
    @Mock private AppUserRepository users;
    @Mock private CurrentUserService currentUserService;
    @Mock private Authentication authentication;

    private TaskService service;

    @BeforeEach
    void setUp() {
        service = new TaskService(tasks, projects, users, currentUserService);
    }

    @Test
    void projectLeadCannotAssignTaskToAnotherUser() {
        AppUser lead = mock(AppUser.class);
        when(lead.getRole()).thenReturn(UserRole.PROJECT_LEAD);
        when(currentUserService.require(authentication, "tasks.create")).thenReturn(lead);

        ApiException error = assertThrows(ApiException.class, () -> service.create(
                new TaskRequest("Task", null, 22L, null, "Medium", "To do"), authentication));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(tasks, never()).save(any(TaskEntity.class));
    }

    @Test
    void adminCanAssignTaskToAnEnabledUser() {
        AppUser admin = mock(AppUser.class);
        AppUser assignee = mock(AppUser.class);
        when(admin.getRole()).thenReturn(UserRole.ADMIN);
        when(assignee.isEnabled()).thenReturn(true);
        when(assignee.getId()).thenReturn(22L);
        when(assignee.getFullName()).thenReturn("Team Member");
        when(currentUserService.require(authentication, "tasks.create")).thenReturn(admin);
        when(users.findById(22L)).thenReturn(Optional.of(assignee));
        when(tasks.save(any(TaskEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TaskResponse response = service.create(
                new TaskRequest("Task", null, 22L, null, "Medium", "To do"), authentication);

        assertEquals(22L, response.assigneeId());
        assertEquals("Team Member", response.assignee());
    }
}
