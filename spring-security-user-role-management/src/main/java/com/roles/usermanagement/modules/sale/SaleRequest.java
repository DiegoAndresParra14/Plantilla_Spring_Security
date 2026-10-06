package com.roles.usermanagement.modules.sale;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public record SaleRequest(@NotBlank @Size(max=255) String concepto,
                          @NotNull @DecimalMin(value="0.01") @Digits(integer=17,fraction=2) BigDecimal monto,
                          @NotNull @Positive Long videojuego,
                          LocalDateTime fecha) {}
