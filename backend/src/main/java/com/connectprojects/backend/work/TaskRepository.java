package com.connectprojects.backend.work;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<TaskEntity, Long> {
    List<TaskEntity> findAllByOrderByDueDateAsc();
    List<TaskEntity> findAllByAssignee_IdOrderByDueDateAsc(Long assigneeId);
    List<TaskEntity> findAllByProject_Lead_IdOrderByDueDateAsc(Long leadId);
    List<TaskEntity> findAllByProject_Id(Long projectId);
    long countByProject_Id(Long projectId);
    long countByProject_IdAndStatusIgnoreCase(Long projectId, String status);
}
