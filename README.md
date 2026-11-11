# NEXO · Gestión y seguridad con Spring Boot

Aplicación con **Java 21, Spring Boot 4.1.1, Spring Security y PostgreSQL**. Incluye autenticación JWT, un rol por usuario, permisos adicionales y módulos de clientes, videojuegos, compras y ventas. Su cliente web usa HTML, CSS y JavaScript.

## Arquitectura

| Carpeta | Responsabilidad |
| --- | --- |
| spring-security-user-role-management/src/main/java | Controladores, servicios, seguridad, entidades y persistencia. |
| spring-security-user-role-management/src/main/resources | Perfiles de configuración y migración SQL. |
| spring-security-user-role-management/src/test | Pruebas de JWT y flujos HTTP. |
| spring-security-user-role-management/docs | Guías para ampliar módulos. |
| Frontend | Interfaz, cliente REST y estilos adaptables. |

Los controladores reciben las peticiones; los servicios aplican reglas de negocio y los repositorios acceden a los datos. El backend comprueba los permisos de las operaciones protegidas.

## Requisitos

- JDK 21 y PostgreSQL.
- Gradle Wrapper incluido; no requiere instalar Gradle.
- Navegador moderno y, opcionalmente, Python para servir la interfaz.
- El frontend no necesita npm ni compilación.

## Inicio local

1. Crea una base PostgreSQL de desarrollo y un usuario con permisos sobre ella.
2. Configura las variables de entorno de la tabla siguiente con tus valores locales.
3. Desde la raíz del repositorio:

```powershell
cd spring-security-user-role-management
.\gradlew.bat bootRun
```

| Variables | Uso |
| --- | --- |
| DB_URL, DB_USERNAME, DB_PASSWORD | Conexión y credenciales de tu PostgreSQL local. |
| JWT_SECRET, JWT_ISSUER, JWT_EXPIRATION | Firma, emisor y duración de los tokens. Genera un secreto propio fuera de Git. |
| BOOTSTRAP_ADMIN_ENABLED | Habilita o deshabilita la creación de una cuenta inicial en desarrollo. |
| ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD | Datos propios de la cuenta inicial cuando el bootstrap esté habilitado. |

El bootstrap no reemplaza los datos de una cuenta que ya existe. No reutilices credenciales publicadas ni valores de demostración para un despliegue accesible.

Por defecto el backend usa el perfil de desarrollo y escucha en `http://localhost:8050`. La creación o actualización automática de tablas de este perfil está orientada a desarrollo; un despliegue real necesita una estrategia de migraciones.

En otra terminal, desde la raíz:

```powershell
cd Frontend
python -m http.server 5500 --bind 127.0.0.1
```

Abre `http://127.0.0.1:5500` y configura `http://localhost:8050` como URL del backend, sin añadir `/api`. Inicia sesión con tu cuenta local configurada. Esta guía no distribuye contraseñas ni secretos JWT.

## Funciones

| Área | Comportamiento |
| --- | --- |
| Autenticación | Login y validación de JWT. |
| Usuarios | Gestión, bloqueo, desactivación y un rol por usuario. |
| Permisos | Catálogo, permisos del rol y permisos individuales adicionales. |
| Negocio | Clientes, videojuegos, compras y ventas relacionados con el dominio. |
| Documentación HTTP | Swagger UI en /swagger-ui/index.html y OpenAPI en /v3/api-docs. |

Consulta los endpoints concretos en la [guía del backend](spring-security-user-role-management/README.md). La interfaz adapta sus menús a los permisos efectivos; ocultar controles no sustituye la autorización del servidor.

## Pruebas

Desde la raíz:

```powershell
cd spring-security-user-role-management
.\gradlew.bat test
```

Las pruebas usan el perfil test con H2, contexto Spring y flujos HTTP locales. En la revisión del **11 de noviembre de 2026 pasaron las 11 pruebas existentes**. No sustituyen una integración contra PostgreSQL ni la validación de un despliegue real.

Para la sintaxis del cliente, desde la raíz: `node --check Frontend/app.js`.

## Configuración y límites

- Mantén credenciales y secretos fuera de Git; configúralos mediante el entorno del proceso.
- Sustituye los valores de demostración del perfil de desarrollo antes de publicar un servicio.
- El cliente conserva el JWT en sessionStorage. No implementa renovación automática ni una lista de revocación.
- Ajusta CORS a los orígenes de tu despliegue.
- Las guías detalladas conservan contexto histórico; contrástalas con la configuración actual antes de usarlas en producción.

## Guías y vista previa

- [Backend: configuración, endpoints y permisos](spring-security-user-role-management/README.md).
- [Frontend: ejecución, pantallas y sesión](Frontend/README.md).
- [Plantilla para ampliar módulos](spring-security-user-role-management/docs/PLANTILLA_MODULOS.md).
- [Ejemplo de videojuegos](spring-security-user-role-management/docs/GUIA_MODULOS_VIDEOJUEGOS.md).

![NEXO: vista previa con datos de prueba](Frontend/vista-previa.png)

## Procedencia y autoría

Fork de [CRISTIAN7712/Plantilla_Spring_Security](https://github.com/CRISTIAN7712/Plantilla_Spring_Security), proyecto original de **Ing. Cristian Díaz**. Se conserva esa atribución; los cambios de Diego Andrés Parra pueden consultarse en el historial de esta copia.
