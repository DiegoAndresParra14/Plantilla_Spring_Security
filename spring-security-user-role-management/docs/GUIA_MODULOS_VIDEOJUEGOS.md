# Guía de módulos: Agencia de Videojuegos

Esta guía explica **qué hace cada archivo** de un módulo y **qué debe ir dentro**
en cada paquete (`client`, `videoGame`, `sale`, `purchase`). No contiene código
completo: sirve para entender el patrón y escribirlo tú mismo, usando el módulo
`customer` original como referencia.

---

## 1. Flujo de una petición

```
Frontend → Controller → Service → Repository → Base de datos
                          │
Frontend ← Controller ← Service (convierte la entidad en Response)
```

| Capa | Analogía (restaurante) | Pregunta que responde |
| --- | --- | --- |
| Entity | Inventario de la cocina | ¿Cómo se guarda esto en la BD? |
| Request | La comanda del mesero | ¿Qué datos envía el frontend? |
| Response | El plato servido | ¿Qué datos devuelvo al frontend? |
| Repository | El almacenista | ¿Cómo guardo y busco en la BD? |
| Service | El chef | ¿Cuáles son las reglas del negocio? |
| Controller | El mesero | ¿Qué URL recibe la petición y a quién se la paso? |

**Regla de oro:** cada capa hace una sola cosa. El Controller no tiene reglas de
negocio; el Service no sabe de HTTP; la Entity nunca sale al frontend.

---

## 2. Qué lleva cada archivo

### 2.1 Entity (ej. `Client.java`, `Purchase.java`)

Una clase que representa **una tabla**: cada atributo es una columna.

Debe llevar:
- `@Entity` y `@Table(name = "...")` sobre la clase.
- `@Id` + `@GeneratedValue` en la llave primaria.
- `@Column` en cada atributo con sus reglas (`nullable`, `length`, `precision`).
- Relaciones con `@ManyToOne` + `@JoinColumn` (el lado "muchos" guarda la llave foránea).
- `@Getter` y `@Setter` de Lombok para no escribir getters/setters.

No debe llevar: lógica de negocio ni validaciones de entrada.

### 2.2 Request (DTO de entrada)

Un `record` con **solo los campos que el usuario puede enviar**.

Debe llevar:
- Los campos del formulario.
- Validaciones: `@NotBlank` (texto no vacío), `@NotNull` (obligatorio),
  `@Size(max=...)`, `@Email`, `@DecimalMin` (mínimo para montos).
- Para relaciones, el **id** del otro objeto (ej. `videojuegoId`), no el objeto completo.

No debe llevar: `id`, `fecha` ni `usuario`. Esos los asigna el servidor.

### 2.3 Response (DTO de salida)

Un `record` con **los datos que se muestran al frontend**.

Debe llevar:
- `id` y los campos visibles.
- Para relaciones, datos útiles y planos (ej. `videojuegoId` y `videojuegoTitulo`).

No debe llevar: la contraseña del usuario ni entidades completas (evita datos
sensibles y errores de referencias circulares al generar JSON).

### 2.4 Repository

Una **interfaz** que extiende `JpaRepository<Entidad, TipoDelId>`. Spring escribe
el SQL por ti.

Ya incluye gratis: `save`, `findById`, `findAll`, `deleteById`.

Debe llevar solo lo extra que necesites:
- Métodos por convención de nombre, como `findByVideojuegoId` (busca por el id del videojuego).
- Consultas con `@Query` (JPQL) para sumas, como el total de ventas de un juego.
- `@Lock(PESSIMISTIC_WRITE)` si necesitas bloquear una fila al modificarla (así lo hace `customer`).

### 2.5 Service

**El cerebro.** Aquí van las reglas del negocio.

Debe llevar:
- `@Service` y `@Transactional` sobre la clase (si falla algo, se revierte todo).
- Constructor que recibe los repositories (inyección de dependencias).
- Métodos: `all`, `get`, `create`, `update`, `deactivate` (según el módulo).
- Un método privado que busca por id y lanza 404 si no existe.
- Un método privado que convierte Entity → Response.
- `@Transactional(readOnly = true)` en los métodos de solo lectura.
- Errores con `ResponseStatusException` (404 no existe, 409 conflicto, 400 entrada inválida).

Receta de un `create`:
1. Buscar las entidades relacionadas por id (si no existen → 404).
2. Validar las reglas (ej. el juego no puede estar `FINALIZADO` → 409).
3. Tomar el usuario autenticado del contexto de seguridad (solo en `sale` y `purchase`).
4. Crear la entidad, copiar los datos del Request y fijar fecha/usuario.
5. Guardar con el repository.
6. Devolver el Response.

### 2.6 Controller

La puerta de entrada HTTP. **Debe ser delgado**: recibe, delega al Service y responde.

Debe llevar:
- `@RestController` y `@RequestMapping("/api/...")` en la clase.
- `@Tag` y `@SecurityRequirement(name="bearerAuth")` para que Swagger lo documente y use el token.
- Un constructor que recibe el Service.
- Un método por operación, cada uno con su verbo HTTP, su `@PreAuthorize` y su `@Operation`.

---

## 3. Anatomía de `CustomerController` (tu modelo)

Cada método del controlador actual sigue exactamente la misma estructura:

| Método | Verbo y ruta | Permiso | Qué recibe | Qué hace | Respuesta |
| --- | --- | --- | --- | --- | --- |
| `all` | `GET /api/customers` | `CUSTOMER_READ` | `page` y `size` en la URL | Llama a `service.all` | 200 + página de Response |
| `get` | `GET /api/customers/{id}` | `CUSTOMER_READ` | `id` en la URL | Llama a `service.get` | 200 + Response |
| `create` | `POST /api/customers` | `CUSTOMER_CREATE` | JSON validado | Llama a `service.create` | 201 + Response |
| `update` | `PUT /api/customers/{id}` | `CUSTOMER_UPDATE` | `id` + JSON validado | Llama a `service.update` | 200 + Response |
| `deactivate` | `DELETE /api/customers/{id}` | `CUSTOMER_DELETE` | `id` en la URL | Llama a `service.deactivate` | 204 sin cuerpo |

Piezas de sintaxis del controlador:

| Elemento | Para qué sirve |
| --- | --- |
| `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping` | Verbo HTTP que atiende el método |
| `@PathVariable Long id` | Toma el `{id}` de la URL |
| `@RequestParam(defaultValue="0")` | Toma un parámetro opcional (`?page=0`) con valor por defecto |
| `@Valid @RequestBody` | Convierte el JSON en el Request y aplica sus validaciones |
| `@PreAuthorize("hasAuthority('X')")` | Solo entra quien tenga el permiso `X` |
| `ResponseEntity` | Permite elegir el código HTTP (201, 204, ...) |
| `@Operation(summary=...)` | Texto que aparece en Swagger |

Para adaptarlo: cambia el nombre de la clase, la ruta base, el prefijo del
permiso (`CLIENT_`, `VIDEOGAME_`, `SALE_`, `PURCHASE_`) y los tipos Request/Response.

---

## 4. Qué lleva cada paquete

### 4.1 `client` (Cliente) — empieza aquí

| Archivo | Contenido |
| --- | --- |
| `Client` | Tabla `clientes`: `id`, `nombre`, `correo`, `telefono`, `empresa` (por defecto "Particular"), `activo` |
| `ClientRequest` | `nombre` (`@NotBlank`), `correo` (`@NotBlank @Email`), `telefono`, `empresa` |
| `ClientResponse` | `id`, `nombre`, `correo`, `telefono`, `empresa`, `activo` |
| `ClientRepository` | Extiende `JpaRepository`; puedes conservar `findForUpdate` |
| `ClientService` | CRUD con borrado lógico (`deactivate`) |
| `ClientController` | Ruta `/api/clients`, permisos `CLIENT_*` |

Es casi un copiar-y-adaptar de `customer`: cambia nombres de campos y clases.

### 4.2 `videoGame` (Videojuego)

| Archivo | Contenido |
| --- | --- |
| `VideoGame` | Tabla `videojuegos`: `id`, `titulo`, `plataforma`, `estado`, `cliente` (`@ManyToOne` obligatorio) |
| `VideoGameRequest` | `titulo`, `plataforma`, `estado`, `clienteId` |
| `VideoGameResponse` | `id`, `titulo`, `plataforma`, `estado`, `clienteId`, `clienteNombre` |
| `VideoGameRepository` | `findByClienteId` (juegos de un cliente) |
| `VideoGameService` | Al crear/editar busca el cliente por `clienteId` (404 si no existe). Añade el cálculo de **rentabilidad**: ventas − compras |
| `VideoGameController` | Ruta `/api/videogames`, permisos `VIDEOGAME_*` y un `GET` para rentabilidad |

Se recomienda definir dos `enum` (`Plataforma` y `EstadoProyecto`) y guardarlos
con `@Enumerated(EnumType.STRING)` para que en la BD se lea el texto, no un número.

### 4.3 `sale` (Venta, ingreso)

| Archivo | Contenido |
| --- | --- |
| `Sale` | Tabla `ventas`: `id`, `fecha`, `concepto`, `monto`, `videojuego` (`@ManyToOne`), `usuario` (`@ManyToOne` a `UserEntity`) |
| `SaleRequest` | `videojuegoId`, `concepto`, `monto` (mayor que 0). **Sin fecha ni usuario** |
| `SaleResponse` | `id`, `fecha`, `concepto`, `monto`, `videojuegoId`, `videojuegoTitulo`, `usuarioUsername` |
| `SaleRepository` | `findByVideojuegoId` y una suma de montos por videojuego |
| `SaleService` | Valida que el juego exista y no esté `FINALIZADO`; asigna usuario y fecha automáticamente |
| `SaleController` | Ruta `/api/sales`, permisos `SALE_READ` y `SALE_CREATE` |

Las ventas no se editan ni se borran: son registros financieros. Si algo está
mal, se registra otro movimiento.

### 4.4 `purchase` (Compra, egreso)

Es la misma estructura que `sale`, con otros campos.

| Archivo | Contenido |
| --- | --- |
| `Purchase` | Tabla `compras`: `id`, `fecha`, `descripcion`, `costo`, `proveedor`, `videojuego`, `usuario` |
| `PurchaseRequest` | `videojuegoId`, `descripcion`, `costo`, `proveedor` |
| `PurchaseResponse` | `id`, `fecha`, `descripcion`, `costo`, `proveedor`, `videojuegoId`, `videojuegoTitulo`, `usuarioUsername` |
| `PurchaseRepository` | `findByVideojuegoId` y una suma de costos por videojuego |
| `PurchaseService` | Mismas validaciones que `SaleService` |
| `PurchaseController` | Ruta `/api/purchases`, permisos `PURCHASE_READ` y `PURCHASE_CREATE` |

---

## 5. Cambios fuera de los módulos

| Archivo | Qué cambiar |
| --- | --- |
| `domain/service/UserRoles.java` | Reemplaza `CUSTOMER_*` y `PRODUCT_*` por `CLIENT_*`, `VIDEOGAME_*` y agrega `PURCHASE_*`. Conserva `SALE_*` (quita `SALE_CANCEL` si no cancelas ventas) |
| `domain/service/SecurityBootstrapService.java` | No requiere cambios: recorre `UserRoles.Authority` y crea los permisos que falten |
| `Frontend/app.js` | En `sections`, reemplaza `customers` y `products` por `clients` y `videogames`, y agrega `purchases` con su `prefix` y `endpoint` |
| `docs/PLANTILLA_MODULOS.md` | Opcional: actualizarlo al terminar |

---

## 6. Puntos de atención

- **Nombre del paquete:** en Java los paquetes van en minúscula. Renombra
  `videoGame` a `videogame` y corrige las clases (`VideGameRequest` tiene un
  error de escritura; debe ser `VideoGameRequest`).
- **Idioma:** elige uno para clases y atributos. La guía usa clases en inglés
  (`Client`, `Sale`) y atributos en español (`titulo`, `monto`) porque coincide
  con tu especificación. Lo importante es ser consistente.
- **Eliminar `customer`, `product` y el `sale` viejo** solo cuando `client`
  compile, y después de leer `customer` como referencia.
- **Referencias rotas:** al borrar `customer`/`product` busca otros usos con
  una búsqueda global de `Customer` y `Product` (por ejemplo tests y `application.properties`).
- **Base de datos:** si Hibernate ya creó las tablas viejas (`business_customer`,
  `business_sale`...), bórralas o recrea la base para evitar conflictos con el nuevo modelo.

---

## 7. Orden de trabajo recomendado

1. Leer `customer` en este orden: Entity → Request → Response → Repository → Service → Controller.
2. Completar `client`.
3. Actualizar `UserRoles.Authority`.
4. Completar `videoGame` (relación con `client`).
5. Completar `sale` (relación con `videoGame` y usuario autenticado).
6. Completar `purchase` (repite `sale`).
7. Agregar la rentabilidad.
8. Borrar `customer` y `product`; ajustar el frontend.
9. Compilar y probar en Swagger: `http://localhost:8050/swagger-ui.html`.

---

## 8. Glosario rápido

| Término | Significado |
| --- | --- |
| DTO | Objeto que solo transporta datos (Request y Response) |
| `record` | Clase corta e inmutable; ideal para DTO |
| Inyección de dependencias | Spring te entrega el Service o Repository por el constructor; no usas `new` |
| JPQL | Lenguaje de consulta parecido a SQL, pero sobre entidades |
| Borrado lógico | Marcar `activo = false` en vez de eliminar la fila |
| `@Transactional` | Todo se guarda o nada se guarda |
| 200 / 201 / 204 | OK / Creado / Sin contenido |
| 400 / 403 / 404 / 409 | Entrada inválida / Sin permiso / No existe / Conflicto |
