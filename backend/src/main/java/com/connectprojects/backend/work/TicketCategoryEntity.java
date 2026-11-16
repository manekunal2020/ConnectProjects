package com.connectprojects.backend.work;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ticket_categories", uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "name"}))
public class TicketCategoryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(nullable = false, length = 120)
    private String name;

    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("name")
    private List<TicketSubcategoryEntity> subcategories = new ArrayList<>();

    protected TicketCategoryEntity() {
    }

    public TicketCategoryEntity(Long projectId, String name) {
        this.projectId = projectId;
        this.name = name;
    }

    public Long getId() { return id; }
    public Long getProjectId() { return projectId; }
    public String getName() { return name; }
    public List<TicketSubcategoryEntity> getSubcategories() { return subcategories; }
}
