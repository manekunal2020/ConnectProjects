package com.connectprojects.backend.work;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectSlaRepository extends JpaRepository<ProjectSlaEntity, Long> {
    List<ProjectSlaEntity> findByProjectId(Long projectId);
    Optional<ProjectSlaEntity> findByProjectIdAndPriorityId(Long projectId, Long priorityId);
    Optional<ProjectSlaEntity> findByIdAndProjectId(Long id, Long projectId);
    void deleteByProjectIdAndPriorityId(Long projectId, Long priorityId);
}
