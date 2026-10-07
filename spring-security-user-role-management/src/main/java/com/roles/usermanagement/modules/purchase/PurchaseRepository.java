package com.roles.usermanagement.modules.purchase;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

// Acceso a compras.
public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    
    // Bloqueo para edición.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Purchase e where e.id=:id")
    Optional<Purchase> findForUpdate(@Param("id") Long id);

    // Buscar por juego.
    List<Purchase> findByVideojuegoId(Long videojuegoId);

    // Listado con paginación.
    Page<Purchase> findByVideojuegoId(Long videojuegoId, Pageable pageable);

    // Costo total juego.
    @Query("select coalesce(sum(e.costo), 0) from Purchase e where e.videojuego.id=:videojuegoId")
    BigDecimal totalByVideojuego(@Param("videojuegoId") Long videojuegoId);
}
