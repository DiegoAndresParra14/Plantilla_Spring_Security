package com.roles.usermanagement.modules.client;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

// Entidad de la base.
@Entity
@Table(name = "clientes")
@Getter
@Setter
public class Client {

    // ID del cliente.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre del cliente.
    @Column(nullable = false, length = 150)
    private String nombre;

    // Correo del cliente.
    @Column(nullable = false, length = 200)
    private String correo;

    // Teléfono del cliente.
    @Column(length = 30)
    private String telefono;

    // Empresa del cliente.
    @Column(nullable = false, length = 150)
    private String empresa = "Particular";

    // Estado activo o inactivo.
    @Column(nullable = false)
    private boolean activo = true;
}
