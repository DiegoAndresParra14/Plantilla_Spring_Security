package com.roles.usermanagement.modules.client;

// Datos para devolver cliente.
public record ClientResponse(
    Long id,
    String nombre,
    String correo,
    String telefono,
    String empresa,
    boolean activo
) {}
