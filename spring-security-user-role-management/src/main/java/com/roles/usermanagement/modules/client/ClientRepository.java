package com.roles.usermanagement.modules.client;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

// Acceso a la base.
public interface ClientRepository extends JpaRepository<Client, Long> {
    
    // Buscar para editar seguro.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Client e where e.id = :id")
    Optional<Client> findForUpdate(@Param("id") Long id);
}
