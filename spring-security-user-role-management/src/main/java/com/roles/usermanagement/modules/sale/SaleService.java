package com.roles.usermanagement.modules.sale;
import com.roles.usermanagement.modules.customer.Customer;
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
@Service @Transactional
public class SaleService {

 private final SaleRepository repository;
 private final UserCrudRepository users;
 private final EntityManager entityManager;

 public SaleService(SaleRepository repository,UserCrudRepository users,EntityManager entityManager){
  this.repository=repository;
  this.users=users;
  this.entityManager=entityManager;
 }

 private Sale existing(Long id,boolean lock){
  return (lock?repository.findForUpdate(id):repository.findById(id))
          .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Registro no encontrado"));
 }

 private VideoGame videojuego(Long id){
  VideoGame v=id==null?null:entityManager.find(VideoGame.class,id);
  if(v==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Videojuego no encontrado");
  return v;
 }

 private UserEntity usuario(String username){
  if(username==null||username.isBlank())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Usuario no autenticado");
  return users.findById(username)
          .orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Usuario autenticado no encontrado"));
 }

 private void apply(Sale e,SaleRequest d){
  if(d.concepto()==null||d.concepto().isBlank())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El concepto es obligatorio");
  if(d.monto()==null||d.monto().signum()<=0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El monto debe ser mayor que cero");
  e.setConcepto(d.concepto().trim()); e.setMonto(d.monto()); e.setVideojuego(videojuego(d.videojuego()));
  if(d.fecha()!=null)e.setFecha(d.fecha());
  if(e.getFecha()==null)e.setFecha(LocalDateTime.now());
 }

 private SaleResponse dto(Sale e){
  VideoGame v=e.getVideojuego(); Customer c=v.getCliente();
  return new SaleResponse(e.getId(),e.getFecha(),e.getConcepto(),e.getMonto(),
          v.getId(),v.getTitulo(),c.getId(),c.getName(),e.getUsuario().getUsername());
 }

 @Transactional(readOnly=true)
 public Page<SaleResponse> all(int page,int size,Long videojuego){
  if(page<0||size<1||size>100)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"page >= 0; size entre 1 y 100");
  Pageable pageable=PageRequest.of(page,size,Sort.by("id"));
  return (videojuego==null?repository.findAll(pageable):repository.findByVideojuegoId(videojuego,pageable)).map(this::dto);
 }

 @Transactional(readOnly=true)
 public SaleResponse get(Long id){
  return dto(existing(id,false));
 }

 public SaleResponse create(SaleRequest d,String username){
  Sale e=new Sale(); apply(e,d); e.setUsuario(usuario(username));
  return dto(repository.save(e));
 }

 public SaleResponse update(Long id,SaleRequest d){
  Sale e=existing(id,true); apply(e,d);
  return dto(e);
 }

 public void delete(Long id){
  repository.delete(existing(id,true));
 }
}
