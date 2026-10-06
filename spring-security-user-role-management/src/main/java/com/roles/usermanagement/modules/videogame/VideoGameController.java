package com.roles.usermanagement.modules.videogame;

import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController @RequestMapping("/api/videogames") @Tag(name="Videojuegos") @SecurityRequirement(name="bearerAuth")
public class VideoGameController {
    private final VideoGameService service;
    
    public VideoGameController(VideoGameService service){this.service=service;}

    @Operation(summary="Listar videojuegos",description="Paginación: page desde 0; size entre 1 y 100. Filtro opcional por cliente.")
    @GetMapping
    @PreAuthorize("hasAuthority('PRODUCT_READ')")
    public Page<VideoGameResponse> all(@RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size, @RequestParam(required=false) Long clienteId){
        return service.all(page, size, clienteId);
    }

    @Operation(summary="Consultar detalle de videojuego")
    @GetMapping("/{id}") @PreAuthorize("hasAuthority('PRODUCT_READ')")
    public VideoGameResponse get(@PathVariable Long id){return service.get(id);}

    @Operation(summary="Registrar videojuego")
    @PostMapping @PreAuthorize("hasAuthority('PRODUCT_CREATE')")
    public ResponseEntity<VideoGameResponse> create(@Valid @RequestBody VideoGameRequest dto){
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @Operation(summary="Actualizar registro de videojuego")
    @PutMapping("/{id}") @PreAuthorize("hasAuthority('PRODUCT_UPDATE')")
    public VideoGameResponse update(@PathVariable Long id, @Valid @RequestBody VideoGameRequest dto){
        return service.update(id, dto);
    }

    @Operation(summary="Eliminar registro de videojuego")
    @DeleteMapping("/{id}") @PreAuthorize("hasAuthority('PRODUCT_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}