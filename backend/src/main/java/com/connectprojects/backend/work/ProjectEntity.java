package com.connectprojects.backend.work;

import com.connectprojects.backend.account.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projects")
public class ProjectEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description = "";

    @Column(nullable = false, length = 30)
    private String status = "On track";

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(nullable = false)
    private int progress;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private AppUser lead;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private ClientEntity client;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "project_team_leaders",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    private List<AppUser> teamLeaders = new ArrayList<>();

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ProjectEntity() {
    }

    public ProjectEntity(String name, String description, String status, LocalDate dueDate, AppUser lead) {
        this.name = name;
        this.description = description;
        this.status = status;
        this.dueDate = dueDate;
        this.lead = lead;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public LocalDate getDueDate() { return dueDate; }
    public int getProgress() { return progress; }
    public AppUser getLead() { return lead; }
    public ClientEntity getClient() { return client; }
    public List<AppUser> getTeamLeaders() { return teamLeaders; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setStatus(String status) { this.status = status; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public void setLead(AppUser lead) { this.lead = lead; }
    public void setClient(ClientEntity client) { this.client = client; }
    public void setTeamLeaders(List<AppUser> teamLeaders) {
        this.teamLeaders.clear();
        this.teamLeaders.addAll(teamLeaders);
    }
    public void setActive(boolean active) { this.active = active; }
    public void setProgress(int progress) { this.progress = Math.max(0, Math.min(100, progress)); }
}
