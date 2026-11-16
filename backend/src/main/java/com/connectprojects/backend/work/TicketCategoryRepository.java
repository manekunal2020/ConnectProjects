package com.connectprojects.backend.work;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketCategoryRepository extends JpaRepository<TicketCategoryEntity, Long> {
    List<TicketCategoryEntity> findByProjectIdOrderByName(Long projectId);
    boolean existsByProjectIdAndNameIgnoreCase(Long projectId, String name);
    Optional<TicketCategoryEntity> findByIdAndProjectId(Long id, Long projectId);
}
