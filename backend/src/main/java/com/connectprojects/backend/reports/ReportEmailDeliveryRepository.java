package com.connectprojects.backend.reports;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportEmailDeliveryRepository extends JpaRepository<ReportEmailDeliveryEntity, Long> {
    List<ReportEmailDeliveryEntity> findTop50ByCreatedBy_IdOrderBySentAtDesc(Long userId);
}
