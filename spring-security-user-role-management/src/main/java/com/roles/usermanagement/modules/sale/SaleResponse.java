package com.roles.usermanagement.modules.sale;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public record SaleResponse(Long id,
                           LocalDateTime fecha,
                           String concepto,
                           BigDecimal monto,
                           Long videojuegoId,
                           String videojuegoTitulo,
                           Long clienteId,
                           String clienteNombre,
                           String usuario) {}
