package com.roles.usermanagement.modules.purchase;

import com.roles.usermanagement.modules.client.Client;
import com.roles.usermanagement.modules.videogame.VideoGame;
import com.roles.usermanagement.persistance.crud.UserCrudRepository;
import com.roles.usermanagement.persistance.entity.UserEntity;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

// Lógica de compras.
@Service 
@Transactional
public class PurchaseService {

    private final PurchaseRepository repository;
    private final UserCrudRepository users;
    private final EntityManager entityManager;

    public PurchaseService(PurchaseRepository repository, UserCrudRepository users, EntityManager entityManager) {
        this.repository = repository;
        this.users = users;
        this.entityManager = entityManager;
    }

    // Busca compra existente.
    private Purchase existing(Long id, boolean lock) {
        return (lock ? repository.findForUpdate(id) : repository.findById(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro no encontrado"));
    }

    // Valida y busca juego.
    private VideoGame videojuego(Long id) {
        VideoGame v = id == null ? null : entityManager.find(VideoGame.class, id);
        if (v == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Videojuego no encontrado");
        return v;
    }

    // Valida y busca usuario.
    private UserEntity usuario(String username) {
        if (username == null || username.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        return users.findById(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario autenticado no encontrado"));
    }

    // Aplica datos recibidos.
    private void apply(Purchase e, PurchaseRequest d) {
        if (d.descripcion() == null || d.descripcion().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Descripción obligatoria");
        if (d.proveedor() == null || d.proveedor().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Proveedor obligatorio");
        if (d.costo() == null || d.costo().signum() <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Costo mayor a cero");
        
        e.setDescripcion(d.descripcion().trim()); 
        e.setCosto(d.costo()); 
        e.setProveedor(d.proveedor().trim());
        e.setVideojuego(videojuego(d.videojuego()));
        
        if (d.fecha() != null) e.setFecha(d.fecha());
        if (e.getFecha() == null) e.setFecha(LocalDateTime.now());
    }

    // Convierte a respuesta.
    private PurchaseResponse dto(Purchase e) {
        VideoGame v = e.getVideojuego(); 
        Client c = v.getCliente();
        return new PurchaseResponse(e.getId(), e.getFecha(), e.getDescripcion(), e.getCosto(), e.getProveedor(),
                v.getId(), v.getTitulo(), c.getId(), c.getNombre(), e.getUsuario().getUsername());
    }

    // Lista de compras.
    @Transactional(readOnly = true)
    public Page<PurchaseResponse> all(int page, int size, Long videojuego) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page >= 0; size entre 1 y 100");
        Pageable pageable = PageRequest.of(page, size, Sort.by("id"));
        return (videojuego == null ? repository.findAll(pageable) : repository.findByVideojuegoId(videojuego, pageable)).map(this::dto);
    }

    // Obtiene una compra.
    @Transactional(readOnly = true)
    public PurchaseResponse get(Long id) {
        return dto(existing(id, false));
    }

    // Crea nueva compra.
    public PurchaseResponse create(PurchaseRequest d, String username) {
        Purchase e = new Purchase(); 
        apply(e, d); 
        e.setUsuario(usuario(username));
        return dto(repository.save(e));
    }

    // Actualiza una compra.
    public PurchaseResponse update(Long id, PurchaseRequest d) {
        Purchase e = existing(id, true); 
        apply(e, d);
        return dto(e);
    }

    // Elimina una compra.
    public void delete(Long id) {
        repository.delete(existing(id, true));
    }
}
