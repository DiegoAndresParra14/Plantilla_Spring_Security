package com.roles.usermanagement.modules.purchase;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// Datos de la compra.
public record PurchaseRequest(
    @NotBlank @Size(max=255) String descripcion,
    @NotNull @DecimalMin(value="0.01") @Digits(integer=17, fraction=2) BigDecimal costo,
    @NotBlank @Size(max=150) String proveedor,
    @NotNull @Positive Long videojuego,
    LocalDateTime fecha
) {}
