package com.roles.usermanagement.modules.videogame;
import jakarta.validation.constraints.*;

public record VideoGameRequest(
        @NotBlank @Size(max=150) String titulo,
        @NotNull Plataforma plataforma,
        @NotNull EstadoProyecto estado,
        @NotNull @Positive Long clienteId
) {}