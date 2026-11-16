package com.connectprojects.backend.work;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportShiftRepository extends JpaRepository<SupportShiftEntity, Long> {
    List<SupportShiftEntity> findByProjectIdOrderByStartTime(Long projectId);
}
