package com.roles.usermanagement.modules.client;

import jakarta.validation.constraints.*;

// Datos para crear cliente.
public record ClientRequest(
    @NotBlank @Size(max=150) String nombre,
    @NotBlank @Email @Size(max=200) String correo,
    @Size(max=30) String telefono,
    @Size(max=150) String empresa
) {}
