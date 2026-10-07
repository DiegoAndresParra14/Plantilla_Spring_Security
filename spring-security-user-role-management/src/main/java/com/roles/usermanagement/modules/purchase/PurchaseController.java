package com.roles.usermanagement.modules.purchase;

import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.security.Principal;

// Api de compras.
@RestController 
@RequestMapping("/api/purchases") 
@Tag(name = "Compras") 
@SecurityRequirement(name = "bearerAuth")
public class PurchaseController {

    private final PurchaseService service;

    public PurchaseController(PurchaseService service) {
        this.service = service;
    }

    // Lista compras.
    @Operation(summary = "Listar compras", description = "Filtro por videojuego.")
    @GetMapping
    @PreAuthorize("hasAuthority('PURCHASE_READ')")
    public Page<PurchaseResponse> all(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size, @RequestParam(required = false) Long videojuego) {
        return service.all(page, size, videojuego);
    }

    // Obtiene detalle compra.
    @Operation(summary = "Consultar detalle de compra")
    @GetMapping("/{id}") 
    @PreAuthorize("hasAuthority('PURCHASE_READ')")
    public PurchaseResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    // Crea una compra.
    @Operation(summary = "Registrar compra", description = "Asigna al usuario en sesión.")
    @PostMapping 
    @PreAuthorize("hasAuthority('PURCHASE_CREATE')")
    public ResponseEntity<PurchaseResponse> create(@Valid @RequestBody PurchaseRequest dto, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto, principal.getName()));
    }

    // Edita una compra.
    @Operation(summary = "Actualizar registro de compras")
    @PutMapping("/{id}") 
    @PreAuthorize("hasAuthority('PURCHASE_UPDATE')")
    public PurchaseResponse update(@PathVariable Long id, @Valid @RequestBody PurchaseRequest dto) {
        return service.update(id, dto);
    }

    // Elimina una compra.
    @Operation(summary = "Anular compra", description = "Elimina físicamente.")
    @DeleteMapping("/{id}") 
    @PreAuthorize("hasAnyAuthority('PURCHASE_DELETE', 'PURCHASE_CANCEL')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
