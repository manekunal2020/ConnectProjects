package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets")
public class TicketEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_number", nullable = false, unique = true, length = 32)
    private String ticketNumber;

    @Column(nullable = false, length = 240)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description = "";

    @Column(nullable = false, length = 100)
    private String category = "General";

    @Column(nullable = false, length = 20)
    private String priority = "Medium";

    @Column(nullable = false, length = 30)
    private String status = "Open";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private AppUser assignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private AppUser createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "first_response_at")
    private Instant firstResponseAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "response_sla_hours", nullable = false)
    private int responseSlaHours;

    @Column(name = "resolution_sla_hours", nullable = false)
    private int resolutionSlaHours;

    @Column(name = "response_due_at", nullable = false)
    private Instant responseDueAt;

    @Column(name = "resolution_due_at", nullable = false)
    private Instant resolutionDueAt;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<TicketHistoryEntity> history = new ArrayList<>();

    protected TicketEntity() {
    }

    public TicketEntity(String ticketNumber, String subject, String description, String category, String priority,
                        AppUser assignee, AppUser createdBy, int responseSlaHours, int resolutionSlaHours) {
        this.ticketNumber = ticketNumber;
        this.subject = subject;
        this.description = description;
        this.category = category;
        this.priority = priority;
        this.assignee = assignee;
        this.createdBy = createdBy;
        this.responseSlaHours = responseSlaHours;
        this.resolutionSlaHours = resolutionSlaHours;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
        this.responseDueAt = createdAt.plusSeconds(responseSlaHours * 3600L);
        this.resolutionDueAt = createdAt.plusSeconds(resolutionSlaHours * 3600L);
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public void addHistory(String actor, String action, String details) {
        history.add(new TicketHistoryEntity(this, actor, action, details));
    }

    public Long getId() { return id; }
    public String getTicketNumber() { return ticketNumber; }
    public String getSubject() { return subject; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public String getPriority() { return priority; }
    public String getStatus() { return status; }
    public AppUser getAssignee() { return assignee; }
    public AppUser getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getFirstResponseAt() { return firstResponseAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public Instant getClosedAt() { return closedAt; }
    public int getResponseSlaHours() { return responseSlaHours; }
    public int getResolutionSlaHours() { return resolutionSlaHours; }
    public Instant getResponseDueAt() { return responseDueAt; }
    public Instant getResolutionDueAt() { return resolutionDueAt; }
    public List<TicketHistoryEntity> getHistory() { return history; }

    public void setSubject(String subject) { this.subject = subject; }
    public void setDescription(String description) { this.description = description; }
    public void setCategory(String category) { this.category = category; }
    public void setPriority(String priority) { this.priority = priority; }
    public void setStatus(String status) { this.status = status; }
    public void setAssignee(AppUser assignee) { this.assignee = assignee; }
    public void setFirstResponseAt(Instant firstResponseAt) { this.firstResponseAt = firstResponseAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
}
