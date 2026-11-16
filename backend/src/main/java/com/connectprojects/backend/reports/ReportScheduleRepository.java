package com.connectprojects.backend.reports;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportScheduleRepository extends JpaRepository<ReportScheduleEntity, Long> {
    List<ReportScheduleEntity> findAllByCreatedBy_IdOrderByCreatedAtDesc(Long userId);
    List<ReportScheduleEntity> findAllByActiveTrue();
}
