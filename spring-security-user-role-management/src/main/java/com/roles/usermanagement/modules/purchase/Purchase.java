package com.roles.usermanagement.modules.purchase;

import com.roles.usermanagement.modules.videogame.VideoGame;
import com.roles.usermanagement.persistance.entity.UserEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "compras")
@Getter
@Setter
public class Purchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    @Column(nullable = false, length = 255)
    private String descripcion;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal costo;

    @Column(nullable = false, length = 150)
    private String proveedor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "videojuego_id", nullable = false)
    private VideoGame videojuego;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_username", nullable = false)
    private UserEntity usuario;
}