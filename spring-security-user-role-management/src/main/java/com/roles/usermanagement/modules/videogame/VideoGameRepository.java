package com.roles.usermanagement.modules.videogame;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface VideoGameRepository extends JpaRepository<VideoGame, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from VideoGame e where e.id=:id")
    Optional<VideoGame> findForUpdate(@Param("id") Long id);

    Page<VideoGame> findByClienteId(Long clienteId, Pageable pageable);
}