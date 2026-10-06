package com.roles.usermanagement.modules.sale;

import com.roles.usermanagement.modules.videogame.VideoGame;
import com.roles.usermanagement.persistance.entity.UserEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "ventas")
@Getter
@Setter
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    @Column(nullable = false, length = 255)
    private String concepto;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal monto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "videojuego_id", nullable = false)
    private VideoGame videojuego;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_username", nullable = false)
    private UserEntity usuario;
}