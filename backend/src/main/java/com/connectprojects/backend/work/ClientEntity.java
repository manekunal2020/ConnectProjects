package com.connectprojects.backend.work;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "clients")
public class ClientEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 160)
    private String name;

    @Column(length = 160)
    private String industry;

    @Column(nullable = false)
    private boolean active = true;

    protected ClientEntity() {
    }

    public ClientEntity(String name, String industry) {
        this.name = name;
        this.industry = industry;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getIndustry() { return industry; }
    public boolean isActive() { return active; }
}
