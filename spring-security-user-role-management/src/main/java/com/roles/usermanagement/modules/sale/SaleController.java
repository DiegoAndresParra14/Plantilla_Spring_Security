package com.roles.usermanagement.modules.sale;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.security.Principal;
@RestController @RequestMapping("/api/sales") @Tag(name="Ventas") @SecurityRequirement(name="bearerAuth")
public class SaleController {
 private final SaleService service;
 public SaleController(SaleService service){this.service=service;}

 @Operation(summary="Listar ventas",description="Paginación: page desde 0; size entre 1 y 100. Filtro opcional por videojuego.")
 @GetMapping
 @PreAuthorize("hasAuthority('SALE_READ')")
 public Page<SaleResponse> all(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(required=false) Long videojuego){return service.all(page,size,videojuego);}

 @Operation(summary="Consultar detalle de ventas")
 @GetMapping("/{id}") @PreAuthorize("hasAuthority('SALE_READ')")
 public SaleResponse get(@PathVariable Long id){return service.get(id);}

 @Operation(summary="Registrar venta",description="El usuario que registra la venta se toma de la sesión autenticada; la fecha es opcional.")
 @PostMapping @PreAuthorize("hasAuthority('SALE_CREATE')")
 public ResponseEntity<SaleResponse> create(@Valid @RequestBody SaleRequest dto,Principal principal){return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto,principal.getName()));}

 @Operation(summary="Actualizar registro de ventas",description="Reemplaza concepto, monto, videojuego y fecha; conserva el usuario que la registró.")
 @PutMapping("/{id}") @PreAuthorize("hasAuthority('SALE_CREATE')")
 public SaleResponse update(@PathVariable Long id,@Valid @RequestBody SaleRequest dto){return service.update(id,dto);}

 @Operation(summary="Anular registro de ventas",description="Elimina físicamente la venta.")
 @DeleteMapping("/{id}") @PreAuthorize("hasAuthority('SALE_CANCEL')")
 public ResponseEntity<Void> delete(@PathVariable Long id){service.delete(id);return ResponseEntity.noContent().build();}
}
