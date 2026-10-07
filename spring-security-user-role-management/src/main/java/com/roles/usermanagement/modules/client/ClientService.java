package com.roles.usermanagement.modules.client;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

// Lógica del negocio cliente.
@Service 
@Transactional
public class ClientService {

    private final ClientRepository repository;

    public ClientService(ClientRepository repository) {
        this.repository = repository;
    }

    // Busca cliente por ID.
    private Client existing(Long id, boolean lock) {
        return (lock ? repository.findForUpdate(id) : repository.findById(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro no encontrado"));
    }

    // Convierte entidad a DTO.
    private ClientResponse dto(Client e) {
        return new ClientResponse(e.getId(), e.getNombre(), e.getCorreo(), e.getTelefono(), e.getEmpresa(), e.isActivo());
    }

    // Lista todos los clientes.
    @Transactional(readOnly = true)
    public Page<ClientResponse> all(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page >= 0; size entre 1 y 100");
        return repository.findAll(PageRequest.of(page, size, Sort.by("id"))).map(this::dto);
    }

    // Obtiene un cliente.
    @Transactional(readOnly = true)
    public ClientResponse get(Long id) {
        return dto(existing(id, false));
    }

    // Crea un cliente nuevo.
    public ClientResponse create(ClientRequest d) {
        Client e = new Client(); 
        e.setNombre(d.nombre().trim()); 
        e.setCorreo(d.correo().trim()); 
        e.setTelefono(d.telefono());
        e.setEmpresa(d.empresa() != null ? d.empresa().trim() : "Particular");
        return dto(repository.save(e));
    }

    // Actualiza cliente por ID.
    public ClientResponse update(Long id, ClientRequest d) {
        Client e = existing(id, true);
        if (!e.isActivo()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Registro inactivo"); 
        e.setNombre(d.nombre().trim()); 
        e.setCorreo(d.correo().trim()); 
        e.setTelefono(d.telefono());
        e.setEmpresa(d.empresa() != null ? d.empresa().trim() : "Particular");
        return dto(e);
    }

    // Desactiva cliente por ID.
    public void deactivate(Long id) {
        existing(id, true).setActivo(false);
    }
}
