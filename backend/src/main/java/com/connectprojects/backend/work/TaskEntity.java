package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tasks")
public class TaskEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 240)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private ProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private AppUser assignee;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(nullable = false, length = 20)
    private String priority = "Medium";

    @Column(nullable = false, length = 30)
    private String status = "To do";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TaskEntity() {
    }

    public TaskEntity(String title, ProjectEntity project, AppUser assignee, LocalDate dueDate, String priority, String status) {
        this.title = title;
        this.project = project;
        this.assignee = assignee;
        this.dueDate = dueDate;
        this.priority = priority;
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public ProjectEntity getProject() { return project; }
    public AppUser getAssignee() { return assignee; }
    public LocalDate getDueDate() { return dueDate; }
    public String getPriority() { return priority; }
    public String getStatus() { return status; }

    public void setTitle(String title) { this.title = title; }
    public void setProject(ProjectEntity project) { this.project = project; }
    public void setAssignee(AppUser assignee) { this.assignee = assignee; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public void setPriority(String priority) { this.priority = priority; }
    public void setStatus(String status) { this.status = status; }
}
