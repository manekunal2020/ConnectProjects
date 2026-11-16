package com.connectprojects.backend.work;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketPriorityRepository extends JpaRepository<TicketPriorityEntity, Long> {
    List<TicketPriorityEntity> findByProjectIdOrderByLevel(Long projectId);
    boolean existsByProjectIdAndNameIgnoreCase(Long projectId, String name);
    boolean existsByProjectIdAndLevel(Long projectId, Integer level);
    java.util.Optional<TicketPriorityEntity> findByIdAndProjectId(Long id, Long projectId);
}
