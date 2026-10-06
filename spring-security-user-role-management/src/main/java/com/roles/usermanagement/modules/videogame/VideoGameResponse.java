package com.roles.usermanagement.modules.videogame;

public record VideoGameResponse(
        Long id,
        String titulo,
        Plataforma plataforma,
        EstadoProyecto estado,
        Long clienteId,
        String clienteNombre
) {}