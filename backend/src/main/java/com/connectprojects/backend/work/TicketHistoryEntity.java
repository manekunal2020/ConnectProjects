package com.connectprojects.backend.work;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "ticket_history")
public class TicketHistoryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    private TicketEntity ticket;

    @Column(name = "actor_name", nullable = false, length = 120)
    private String actorName;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(nullable = false, length = 500)
    private String details = "";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TicketHistoryEntity() {
    }

    public TicketHistoryEntity(TicketEntity ticket, String actorName, String action, String details) {
        this.ticket = ticket;
        this.actorName = actorName;
        this.action = action;
        this.details = details == null ? "" : details;
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public String getActorName() { return actorName; }
    public String getAction() { return action; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
}
