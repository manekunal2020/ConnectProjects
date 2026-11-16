package com.connectprojects.backend.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
@Entity
@Table(name = "app_users")
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    @Column(nullable = false)
    private boolean enabled = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "app_user_permissions", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "permission", nullable = false, length = 80)
    private List<String> permissions = new ArrayList<>();

    @Column(name = "reset_token_hash", length = 64)
    private String resetTokenHash;

    @Column(name = "reset_token_expires")
    private Instant resetTokenExpires;

    protected AppUser() {
    }

    public AppUser(String username, String email, String fullName, String passwordHash, UserRole role) {
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.passwordHash = passwordHash;
        this.role = role;
        this.enabled = true;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public UserRole getRole() {
        return role;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public List<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<String> permissions) {
        this.permissions.clear();
        this.permissions.addAll(permissions);
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getResetTokenHash() {
        return resetTokenHash;
    }

    public Instant getResetTokenExpires() {
        return resetTokenExpires;
    }

    public void setPasswordReset(String tokenHash, Instant expiresAt) {
        this.resetTokenHash = tokenHash;
        this.resetTokenExpires = expiresAt;
    }

    public void clearPasswordReset() {
        this.resetTokenHash = null;
        this.resetTokenExpires = null;
    }
}
