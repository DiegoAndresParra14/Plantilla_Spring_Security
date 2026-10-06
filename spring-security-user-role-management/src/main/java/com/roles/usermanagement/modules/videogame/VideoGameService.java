package com.roles.usermanagement.modules.videogame;

import com.roles.usermanagement.modules.customer.Customer;
import com.roles.usermanagement.modules.customer.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service @Transactional
public class VideoGameService {

    private final VideoGameRepository repository;
    private final CustomerRepository customerRepository;

    public VideoGameService(VideoGameRepository repository, CustomerRepository customerRepository){
        this.repository = repository;
        this.customerRepository = customerRepository;
    }

    private VideoGame existing(Long id, boolean lock) {
        return (lock ? repository.findForUpdate(id) : repository.findById(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Videojuego no encontrado"));
    }

    private Customer cliente(Long id) {
        if(id == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El ID del cliente es obligatorio");
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));
    }

    private void apply(VideoGame e, VideoGameRequest d) {
        if(d.titulo() == null || d.titulo().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El título es obligatorio");
        e.setTitulo(d.titulo().trim());
        e.setPlataforma(d.plataforma());
        e.setEstado(d.estado());
        e.setCliente(cliente(d.clienteId()));
    }

    private VideoGameResponse dto(VideoGame e) {
        Customer c = e.getCliente();
        return new VideoGameResponse(e.getId(), e.getTitulo(), e.getPlataforma(), e.getEstado(), c.getId(), c.getName());
    }

    @Transactional(readOnly = true)
    public Page<VideoGameResponse> all(int page, int size, Long clienteId) {
        if(page < 0 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page >= 0; size entre 1 y 100");
        Pageable pageable = PageRequest.of(page, size, Sort.by("id"));
        return (clienteId == null ? repository.findAll(pageable) : repository.findByClienteId(clienteId, pageable)).map(this::dto);
    }

    @Transactional(readOnly = true)
    public VideoGameResponse get(Long id) {
        return dto(existing(id, false));
    }

    public VideoGameResponse create(VideoGameRequest d) {
        VideoGame e = new VideoGame();
        apply(e, d);
        return dto(repository.save(e));
    }

    public VideoGameResponse update(Long id, VideoGameRequest d) {
        VideoGame e = existing(id, true);
        apply(e, d);
        return dto(e);
    }

    public void delete(Long id) {
        repository.delete(existing(id, true));
    }
}