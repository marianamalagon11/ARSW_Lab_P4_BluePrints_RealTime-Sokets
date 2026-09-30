# Evidencias del laboratorio – BluePrints RT (Sockets & STOMP)

Backend usado: **P2 (Java21 + JWT)**, traído a `backend/` en este repo. Tecnología RT: **STOMP (Spring Boot)**.

## Índice de imágenes

| # | Descripción | Punto |
|---|---|---|
| 1 | `mvn compile` con BUILD SUCCESS sobre el backend ya copiado y con CORS agregado | [Backend: copia + CORS](#backend-copia-a-backend--cors) |
| 2 | Login en Swagger, token obtenido | [Backend: CRUD completo](#backend-crud-completo-put-y-delete) |
| 3 | Pegando el token en el botón Authorize | [Backend: CRUD completo](#backend-crud-completo-put-y-delete) |
| 4 | Sesión autorizada en Swagger | [Backend: CRUD completo](#backend-crud-completo-put-y-delete) |
| 5 | POST exitoso, blueprint `mari/pruebaLAB` creado (201) | [Backend: CRUD completo](#backend-crud-completo-put-y-delete) |
| 6 | PUT, reemplazo completo de puntos (200) | [Backend: CRUD completo](#backend-crud-completo-put-y-delete) |
| 7 | DELETE del blueprint de prueba (200) | [Backend: CRUD completo](#backend-crud-completo-put-y-delete) |

---

## Backend: copia a `backend/` + CORS

Copiamos el código del backend de la Parte 2 (JWT) a la carpeta `backend/` de este repo, sin tocar el repositorio original de P2. Solo se trajeron `pom.xml` y `src/` (nada de `target/` ni de carpetas de build).

Luego agregamos **CORS** en `SecurityConfig.java`. Los navegadores, por seguridad, no dejan que una página cargada desde `http://localhost:5173` (el Front) le pida datos directamente a `http://localhost:8080` (el backend), porque son "orígenes" distintos, aunque ambos corran en la misma máquina local. Sin ninguna configuración adicional, el backend simplemente rechaza esas peticiones.

Para permitirlo, le dijimos explícitamente a Spring Security que sí confíe en peticiones que vengan de `http://localhost:5173`, y que acepte los métodos `GET`, `POST`, `PUT`, `DELETE` y `OPTIONS` (el último es el que el propio navegador manda solo, como "pregunta previa", antes de un `PUT` o `DELETE` real, para confirmar que tiene permiso; si el backend no responde que sí, el navegador ni siquiera intenta la petición real).

Compilamos con `mvn compile` parados dentro de `backend/` y quedó en verde.

![mvn compile con BUILD SUCCESS](evidencias/01-backend-build-success.png)
*Figura 1. `mvn compile` corriendo sobre el backend ya copiado a `backend/`, con CORS agregado. BUILD SUCCESS en 3.9s.*

---

## Backend: CRUD completo (PUT y DELETE)

El backend de P2 solo traía lectura, creación de un blueprint nuevo y una operación para agregar un punto suelto. Faltaban dos operaciones que exige el CRUD completo: reemplazar todos los puntos de un blueprint existente y eliminarlo.

Se agregaron los dos métodos en cada capa del backend: primero en la interfaz de persistencia (`BlueprintPersistence`), luego en su implementación contra Postgres (`PostgresBlueprintPersistence`), después en la capa de servicio (`BlueprintsServices`), y por último los dos endpoints nuevos en el controlador (`BlueprintsAPIController`).

Quedaron disponibles:
- `PUT /api/v1/blueprints/{author}/{bpname}`, reemplaza todos los puntos del blueprint con la lista que llega en el cuerpo de la petición.
- `DELETE /api/v1/blueprints/{author}/{bpname}`, elimina el blueprint.

Si el blueprint indicado no existe, ambas operaciones responden 404 automáticamente, usando el mismo manejador de errores que ya tenían los demás endpoints.

Esto se probó contra la base de datos real (Postgres en Docker), usando la interfaz de Swagger que ya traía el backend en lugar de `curl`.

Primero se hizo login y se autorizó la sesión con el token obtenido.

![Login en Swagger](evidencias/02-swagger-login.png)
*Figura 2. Login desde Swagger, con el token de acceso en la respuesta.*

![Pegando el token en Authorize](evidencias/03-swagger-authorize.png)
*Figura 3. El token pegado en el botón Authorize de Swagger.*

![Sesión autorizada](evidencias/04-swagger-authorized.png)
*Figura 4. La sesión queda autorizada para las siguientes peticiones.*

Con la sesión autorizada, el POST creó el blueprint `mari/pruebaLAB`.

![POST exitoso](evidencias/07-swagger-post-ok.png)
*Figura 5. Blueprint `mari/pruebaLAB` creado (201).*

Luego se probó el PUT nuevo (`/api/v1/blueprints/mari/pruebaLAB`), enviando un cuerpo `{"points": [...]}` que reemplazó toda la lista de puntos del blueprint.

![PUT correcto, reemplazo completo](evidencias/10-swagger-put-full-ok.png)
*Figura 6. El PUT respondiendo 200 y reemplazando los puntos del blueprint.*

Por último se borró el blueprint de prueba con el DELETE nuevo.

![DELETE exitoso](evidencias/09-swagger-delete-ok.png)
*Figura 7. Blueprint `mari/pruebaLAB` eliminado (200).*

Con esto quedaron probadas las cuatro operaciones del CRUD (crear, leer, actualizar y eliminar) contra la base de datos real.

---
