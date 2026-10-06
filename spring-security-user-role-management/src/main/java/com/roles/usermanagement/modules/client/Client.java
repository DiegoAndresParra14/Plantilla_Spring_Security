package com.roles.usermanagement.modules.client;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "clientes")
@Getter
@Setter
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false, length = 200)
    private String correo;

    @Column(length = 30)
    private String telefono;

    @Column(nullable = false, length = 150)
    private String empresa = "Particular";

    @Column(nullable = false)
    private boolean activo = true;
}