package com.connectprojects.backend.work;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {
    List<ProjectEntity> findAllByOrderByCreatedAtDesc();
    List<ProjectEntity> findAllByLead_IdOrderByCreatedAtDesc(Long leadId);
    @Query("select distinct p from ProjectEntity p left join p.teamLeaders t where p.lead.id = :userId or t.id = :userId order by p.createdAt desc")
    List<ProjectEntity> findVisibleToProjectLead(@Param("userId") Long userId);
}
