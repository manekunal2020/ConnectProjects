package com.connectprojects.backend.work;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<TicketEntity, Long> {
    List<TicketEntity> findAllByOrderByCreatedAtDesc();
    List<TicketEntity> findAllByAssignee_IdOrderByCreatedAtDesc(Long assigneeId);
    Optional<TicketEntity> findByTicketNumber(String ticketNumber);
}
