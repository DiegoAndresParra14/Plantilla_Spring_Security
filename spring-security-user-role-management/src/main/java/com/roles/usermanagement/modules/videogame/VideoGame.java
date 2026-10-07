package com.roles.usermanagement.modules.videogame;

import com.roles.usermanagement.modules.client.Client;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "videojuegos")
@Getter
@Setter
public class VideoGame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Plataforma plataforma; // PC, CONSOLA, MOVIL, WEB

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EstadoProyecto estado; // PLANEACION, EN_DESARROLLO, BETA, FINALIZADO

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Client cliente;
}