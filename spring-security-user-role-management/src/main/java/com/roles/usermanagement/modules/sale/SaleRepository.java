package com.roles.usermanagement.modules.sale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
public interface SaleRepository extends JpaRepository<Sale,Long> {
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select e from Sale e where e.id=:id")
 Optional<Sale> findForUpdate(@Param("id") Long id);

 List<Sale> findByVideojuegoId(Long videojuegoId);

 Page<Sale> findByVideojuegoId(Long videojuegoId,Pageable pageable);

 @Query("select coalesce(sum(e.monto),0) from Sale e where e.videojuego.id=:videojuegoId")
 BigDecimal totalByVideojuego(@Param("videojuegoId") Long videojuegoId);
}
