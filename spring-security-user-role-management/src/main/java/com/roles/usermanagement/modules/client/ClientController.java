package com.roles.usermanagement.modules.client;

import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

// Controlador para el cliente.
@RestController 
@RequestMapping("/api/clients") 
@Tag(name = "Clientes") 
@SecurityRequirement(name = "bearerAuth")
public class ClientController {

    private final ClientService service;

    public ClientController(ClientService service) {
        this.service = service;
    }

    // Lista todos los clientes.
    @Operation(summary = "Listar clientes", description = "Lista paginada de clientes.")
    @GetMapping
    @PreAuthorize("hasAuthority('CLIENT_READ')")
    public Page<ClientResponse> all(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.all(page, size);
    }

    // Obtiene cliente por ID.
    @Operation(summary = "Consultar detalle de clientes")
    @GetMapping("/{id}") 
    @PreAuthorize("hasAuthority('CLIENT_READ')")
    public ClientResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    // Crea un cliente nuevo.
    @Operation(summary = "Crear registro de clientes")
    @PostMapping 
    @PreAuthorize("hasAuthority('CLIENT_CREATE')")
    public ResponseEntity<ClientResponse> create(@Valid @RequestBody ClientRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    // Actualiza un cliente.
    @Operation(summary = "Actualizar registro de clientes")
    @PutMapping("/{id}") 
    @PreAuthorize("hasAuthority('CLIENT_UPDATE')")
    public ClientResponse update(@PathVariable Long id, @Valid @RequestBody ClientRequest dto) {
        return service.update(id, dto);
    }

    // Desactiva un cliente.
    @Operation(summary = "Desactivar registro de clientes")
    @DeleteMapping("/{id}") 
    @PreAuthorize("hasAuthority('CLIENT_DELETE')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
