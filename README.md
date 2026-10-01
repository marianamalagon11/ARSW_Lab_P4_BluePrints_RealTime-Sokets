# Lab P4 — BluePrints en Tiempo Real (Sockets & STOMP)
## Paula Lozano y Mariana Malagón
## Las evidencias se encuentran en docs/evidencias.md

---

# README del equipo

**Backend:** el de la Parte 2 (Java 21 + Spring Boot + JWT + Postgres), copiado a `backend/`.
**Tiempo real:** STOMP sobre el mismo backend de Spring (no se usa servidor Node).
**Front:** React + Vite en la raíz del repo.

**Video de la demo (≤ 90 s):** _pendiente_

## Puesta en marcha

Requisitos: Java 21, Maven, Node 18+ y Docker.

```bash
# 1) Postgres (desde backend/)
cd backend
docker compose up -d

# 2) Backend REST + STOMP en http://localhost:8080
mvn spring-boot:run

# 3) Front en http://localhost:5173 (desde la raíz, en otra terminal)
cp .env.example .env.local
npm i
npm run dev
```

Usuarios de prueba (en memoria, `InMemoryUserService`): `student` / `student123` y `assistant` / `assistant123`.
Swagger: http://localhost:8080/swagger-ui.html

Para ver la colaboración: entra con un usuario, escribe el autor y presiona **Cargar**, crea o selecciona un plano y abre una segunda pestaña en el mismo plano. Los clics en el canvas aparecen en las dos.

## Endpoints usados

| Método | Ruta | Uso en el Front |
|---|---|---|
| `POST` | `/auth/login` | Login, devuelve el JWT |
| `GET` | `/api/v1/blueprints/{author}` | Tabla del autor y total de puntos (404 = autor sin planos) |
| `GET` | `/api/v1/blueprints/{author}/{name}` | Estado inicial del plano al abrirlo |
| `POST` | `/api/v1/blueprints` | **Create** (plano vacío) |
| `PUT` | `/api/v1/blueprints/{author}/{name}` | **Save/Update**, reemplaza todos los puntos |
| `DELETE` | `/api/v1/blueprints/{author}/{name}` | **Delete** |

Todas las rutas `/api/v1/**` llevan `Authorization: Bearer <token>`. Las respuestas vienen envueltas en `{ code, message, data }`.

**STOMP**

| | Destino |
|---|---|
| Endpoint WebSocket | `ws://localhost:8080/ws-blueprints` |
| Publicar un punto | `/app/draw` con `{ author, name, point: { x, y } }` |
| Suscribirse a un plano | `/topic/blueprints.{author}.{name}` |

## Decisiones

- **Un tópico por plano** (`blueprints.{author}.{name}`): cada pestaña solo recibe los puntos del plano que tiene abierto, así que los planos quedan aislados entre sí.
- **El punto se pinta cuando vuelve del broker**, no al hacer clic. Como el broker reenvía el punto también a quien lo mandó, todas las pestañas pintan en el mismo orden. Si el tiempo real está en "None" o desconectado, el punto se pinta solo en local.
- **El tiempo real no guarda en la base de datos.** Los puntos dibujados se persisten con **Save/Update** (`PUT`). Así el `DrawController` queda simple y la escritura en Postgres sigue pasando por la API con JWT. La interfaz avisa con "sin guardar" cuando hay cambios pendientes.
- **WebSocket sin JWT.** `/ws-blueprints` está en `permitAll` y restringido al origen `http://localhost:5173`. Para producción habría que validar el token en el `CONNECT` de STOMP.
- **Reconexión automática** con `reconnectDelay: 1000`; al reconectar el cliente se vuelve a suscribir al tópico.
- **Logs en consola** (`[STOMP] conectado`, `suscrito a`, `punto recibido`, `desuscrito de`) para seguir la conexión y los eventos.
- Se agregó `backend/docker-compose.yml` para levantar Postgres con las credenciales de `application.yml`.

## Hallazgos (detalle en `docs/evidencias.md`)

- Latencia de un punto entre dos pestañas: **33–53 ms** en local.
- Con el backend caído el cliente muestra "reconectando..."; al volver el backend se reconectó en **0,8 s** sin recargar la página.
- Comparativa STOMP vs Socket.IO en la sección *Análisis* de las evidencias.

---

# Enunciado del laboratorio

> **Repositorio:** `DECSIS-ECI/Lab_P4_BluePrints_RealTime-Sokets`  
> **Front:** React + Vite (Canvas, CRUD, y selector de tecnología RT)  
> **Backends guía (elige uno o compáralos):**
> - **Socket.IO (Node.js):** https://github.com/DECSIS-ECI/example-backend-socketio-node-/blob/main/README.md
> - **STOMP (Spring Boot):** https://github.com/DECSIS-ECI/example-backend-stopm/tree/main

## 🎯 Objetivo del laboratorio
Implementar **colaboración en tiempo real** para el caso de BluePrints. El Front consume la API CRUD de la Parte 3 (o equivalente) y habilita tiempo real usando **Socket.IO** o **STOMP**, para que múltiples clientes dibujen el mismo plano de forma simultánea.

Al finalizar, el equipo debe:
1. Integrar el Front con su **API CRUD** (listar/crear/actualizar/eliminar planos, y total de puntos por autor).
2. Conectar el Front a un backend de **tiempo real** (Socket.IO **o** STOMP) siguiendo los repos guía.
3. Demostrar **colaboración en vivo** (dos pestañas navegando el mismo plano).

---

## 🧩 Alcance y criterios funcionales
- **CRUD** (REST):
  - `GET /api/blueprints?author=:author` → lista por autor (incluye total de puntos).
  - `GET /api/blueprints/:author/:name` → puntos del plano.
  - `POST /api/blueprints` → crear.
  - `PUT /api/blueprints/:author/:name` → actualizar.
  - `DELETE /api/blueprints/:author/:name` → eliminar.
- **Tiempo real (RT)** (elige uno):
  - **Socket.IO** (rooms): `join-room`, `draw-event` → broadcast `blueprint-update`.
  - **STOMP** (topics): `@MessageMapping("/draw")` → `convertAndSend(/topic/blueprints.{author}.{name})`.
- **UI**:
  - Canvas con **dibujo por clic** (incremental).
  - Panel del autor: **tabla** de planos y **total de puntos** (`reduce`).
  - Barra de acciones: **Create / Save/Update / Delete** y **selector de tecnología** (None / Socket.IO / STOMP).
- **DX/Calidad**: código limpio, manejo de errores, README de equipo.

---

## 🏗️ Arquitectura (visión rápida)

```
React (Vite)
 ├─ HTTP (REST CRUD + estado inicial) ───────────────> Tu API (P3 / propia)
 └─ Tiempo Real (elige uno):
     ├─ Socket.IO: join-room / draw-event ──────────> Socket.IO Server (Node)
     └─ STOMP: /app/draw -> /topic/blueprints.* ────> Spring WebSocket/STOMP
```

**Convenciones recomendadas**  
- **Plano como canal/sala**: `blueprints.{author}.{name}`  
- **Payload de punto**: `{ x, y }`

---

## 📦 Repos guía (clona/consulta)
- **Socket.IO (Node.js)**: https://github.com/DECSIS-ECI/example-backend-socketio-node-/blob/main/README.md  
  - *Uso típico en el cliente:* `io(VITE_IO_BASE, { transports: ['websocket'] })`, `join-room`, `draw-event`, `blueprint-update`.
- **STOMP (Spring Boot)**: https://github.com/DECSIS-ECI/example-backend-stopm/tree/main  
  - *Uso típico en el cliente:* `@stomp/stompjs` → `client.publish('/app/draw', body)`; suscripción a `/topic/blueprints.{author}.{name}`.

---

## ⚙️ Variables de entorno (Front)
Crea `.env.local` en la raíz del proyecto **Front**:
```bash
# REST (tu backend CRUD)
VITE_API_BASE=http://localhost:8080

# Tiempo real: apunta a uno u otro según el backend que uses
VITE_IO_BASE=http://localhost:3001     # si usas Socket.IO (Node)
VITE_STOMP_BASE=http://localhost:8080  # si usas STOMP (Spring)
```
En la UI, selecciona la tecnología en el **selector RT**.

---

## 🚀 Puesta en marcha

### 1) Backend RT (elige uno)

**Opción A — Socket.IO (Node.js)**  
Sigue el README del repo guía:  
https://github.com/DECSIS-ECI/example-backend-socketio-node-/blob/main/README.md
```bash
npm i
npm run dev
# expone: http://localhost:3001
# prueba rápida del estado inicial:
curl http://localhost:3001/api/blueprints/juan/plano-1
```

**Opción B — STOMP (Spring Boot)**  
Sigue el repo guía:  
https://github.com/DECSIS-ECI/example-backend-stopm/tree/main
```bash
./mvnw spring-boot:run
# expone: http://localhost:8080
# endpoint WS (ej.): /ws-blueprints
```

### 2) Front (este repo)
```bash
npm i
npm run dev
# http://localhost:5173
```
En la interfaz: selecciona **Socket.IO** o **STOMP**, define `author` y `name`, abre **dos pestañas** y dibuja en el canvas (clics).

---

## 🔌 Protocolos de Tiempo Real (detalle mínimo)

### A) Socket.IO
- **Unirse a sala**
  ```js
  socket.emit('join-room', `blueprints.${author}.${name}`)
  ```
- **Enviar punto**
  ```js
  socket.emit('draw-event', { room, author, name, point: { x, y } })
  ```
- **Recibir actualización**
  ```js
  socket.on('blueprint-update', (upd) => { /* append points y repintar */ })
  ```

### B) STOMP
- **Publicar punto**
  ```js
  client.publish({ destination: '/app/draw', body: JSON.stringify({ author, name, point }) })
  ```
- **Suscribirse a tópico**
  ```js
  client.subscribe(`/topic/blueprints.${author}.${name}`, (msg) => { /* append points y repintar */ })
  ```

---

## 🧪 Casos de prueba mínimos
- **Estado inicial**: al seleccionar plano, el canvas carga puntos (`GET /api/blueprints/:author/:name`).  
- **Dibujo local**: clic en canvas agrega puntos y redibuja.  
- **RT multi-pestaña**: con 2 pestañas, los puntos se **replican** casi en tiempo real.  
- **CRUD**: Create/Save/Delete funcionan y refrescan la lista y el **Total** del autor.

---

## 📊 Entregables del equipo
1. Código del Front integrado con **CRUD** y **RT** (Socket.IO o STOMP).  
2. **Video corto** (≤ 90s) mostrando colaboración en vivo y operaciones CRUD.  
3. **README del equipo**: setup, endpoints usados, decisiones (rooms/tópicos), y (opcional) breve comparativa Socket.IO vs STOMP.

---

## 🧮 Rúbrica sugerida
- **Funcionalidad (40%)**: RT estable (join/broadcast), aislamiento por plano, CRUD operativo.  
- **Calidad técnica (30%)**: estructura limpia, manejo de errores, documentación clara.  
- **Observabilidad/DX (15%)**: logs útiles (conexión, eventos), health checks básicos.  
- **Análisis (15%)**: hallazgos (latencia/reconexión) y, si aplica, pros/cons Socket.IO vs STOMP.

---

## 🩺 Troubleshooting
- **Pantalla en blanco (Front)**: revisa consola; confirma `@vitejs/plugin-react` instalado y que `AppP4.jsx` esté en `src/`.  
- **No hay broadcast**: ambas pestañas deben hacer `join-room` al **mismo** plano (Socket.IO) o suscribirse al **mismo tópico** (STOMP).  
- **CORS**: en dev permite `http://localhost:5173`; en prod, **restringe orígenes**.  
- **Socket.IO no conecta**: fuerza transporte WebSocket `{ transports: ['websocket'] }`.  
- **STOMP no recibe**: verifica `brokerURL`/`webSocketFactory` y los prefijos `/app` y `/topic` en Spring.

---

## 🔐 Seguridad (mínimos)
- Validación de payloads (p. ej., zod/joi).  
- Restricción de orígenes en prod.  
- Opcional: **JWT** + autorización por plano/sala.

---

## 📄 Licencia
MIT (o la definida por el curso/equipo).
