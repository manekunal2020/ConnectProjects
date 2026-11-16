package com.connectprojects.backend.account;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, Long id);
    boolean existsByRole(UserRole role);
    Optional<AppUser> findFirstByRole(UserRole role);
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByResetTokenHash(String resetTokenHash);
    List<AppUser> findAllByOrderByFullNameAsc();
    List<AppUser> findAllByEnabledTrueOrderByFullNameAsc();
    List<AppUser> findAllByRoleAndEnabledTrueOrderByFullNameAsc(UserRole role);
}
