package com.connectprojects.backend.work;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "ticket_priorities", uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "name"}))
public class TicketPriorityEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false)
    private Integer level;

    @Column(length = 16)
    private String color;

    protected TicketPriorityEntity() {
    }

    public TicketPriorityEntity(Long projectId, String name, Integer level, String color) {
        this.projectId = projectId;
        this.name = name;
        this.level = level;
        this.color = color;
    }

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public String getName() { return name; }
    public Integer getLevel() { return level; }
    public String getColor() { return color; }
}
