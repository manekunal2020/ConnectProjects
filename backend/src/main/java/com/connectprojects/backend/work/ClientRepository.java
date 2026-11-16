package com.connectprojects.backend.work;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClientRepository extends JpaRepository<ClientEntity, Long> {
    List<ClientEntity> findAllByOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
}
