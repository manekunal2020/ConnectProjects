package com.connectprojects.backend.work;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "ticket_subcategories", uniqueConstraints = @UniqueConstraint(columnNames = {"category_id", "name"}))
public class TicketSubcategoryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonIgnore
    private TicketCategoryEntity category;

    protected TicketSubcategoryEntity() {
    }

    public TicketSubcategoryEntity(String name, TicketCategoryEntity category) {
        this.name = name;
        this.category = category;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public TicketCategoryEntity getCategory() { return category; }
}
