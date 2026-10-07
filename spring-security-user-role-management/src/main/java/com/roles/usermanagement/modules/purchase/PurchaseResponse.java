package com.roles.usermanagement.modules.purchase;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Resultado de compra.
public record PurchaseResponse(
    Long id,
    LocalDateTime fecha,
    String descripcion,
    BigDecimal costo,
    String proveedor,
    Long videojuegoId,
    String videojuegoTitulo,
    Long clienteId,
    String clienteNombre,
    String usuario
) {}
