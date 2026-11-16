package com.connectprojects.backend.work;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalTime;

@Entity
@Table(name = "support_shifts")
public class SupportShiftEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "days_of_week", nullable = false, length = 40)
    private String daysOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(length = 80)
    private String timezone;

    protected SupportShiftEntity() {
    }

    public SupportShiftEntity(Long projectId, String name, String daysOfWeek, LocalTime startTime, LocalTime endTime, String timezone) {
        this.projectId = projectId;
        this.name = name;
        this.daysOfWeek = daysOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.timezone = timezone;
    }

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public String getName() { return name; }
    public String getDaysOfWeek() { return daysOfWeek; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getTimezone() { return timezone; }
}
