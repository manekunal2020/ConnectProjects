package com.connectprojects.backend.work;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "slas", uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "priority_id"}))
public class ProjectSlaEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "priority_id", nullable = false)
    private Long priorityId;

    @Column(name = "response_minutes", nullable = false)
    private Integer responseMinutes;

    @Column(name = "resolution_minutes", nullable = false)
    private Integer resolutionMinutes;

    @Column(name = "business_hours_only", nullable = false)
    private boolean businessHoursOnly = true;

    protected ProjectSlaEntity() {
    }

    public ProjectSlaEntity(Long projectId, Long priorityId, Integer responseMinutes, Integer resolutionMinutes, boolean businessHoursOnly) {
        this.projectId = projectId;
        this.priorityId = priorityId;
        this.responseMinutes = responseMinutes;
        this.resolutionMinutes = resolutionMinutes;
        this.businessHoursOnly = businessHoursOnly;
    }

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public Long getPriorityId() { return priorityId; }
    public Integer getResponseMinutes() { return responseMinutes; }
    public Integer getResolutionMinutes() { return resolutionMinutes; }
    public boolean isBusinessHoursOnly() { return businessHoursOnly; }
    public void setResponseMinutes(Integer responseMinutes) { this.responseMinutes = responseMinutes; }
    public void setResolutionMinutes(Integer resolutionMinutes) { this.resolutionMinutes = resolutionMinutes; }
    public void setBusinessHoursOnly(boolean businessHoursOnly) { this.businessHoursOnly = businessHoursOnly; }
}
