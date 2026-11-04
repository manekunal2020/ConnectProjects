package com.connectprojects.backend.account;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AccountRequestRepository extends JpaRepository<AccountRequest, Long> {
    List<AccountRequest> findAllByStatusOrderBySubmittedAtAsc(RequestStatus status);

    @Query("""
            select count(request) > 0 from AccountRequest request
            where request.status = :status
              and (lower(request.username) = lower(:username) or lower(request.email) = lower(:email))
            """)
    boolean existsMatchingRequest(
            @Param("status") RequestStatus status,
            @Param("username") String username,
            @Param("email") String email
    );
}
