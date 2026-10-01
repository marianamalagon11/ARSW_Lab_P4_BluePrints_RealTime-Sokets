# Plan de trabajo – Lab P4 BluePrints RT

Backend elegido: **P2 (Java21 + JWT)** · Tecnología RT: **STOMP (Spring Boot)**

El código de P1/P2/P3 no se toca en sus repos originales; se trae copiado a este repo (`backend/` y `src/services/`).

| # | Punto | Dónde | Estado |
|---|-------|-------|--------|
| 0 | Copiar backend de P2 (`pom.xml` + `src/`) a `backend/` en este repo + ajustar `.gitignore` (Java/Maven) | `backend/` | ✅ |
| 1 | Agregar CORS para `http://localhost:5173` | `backend/` | ✅ |
| 2 | Completar CRUD: `PUT` (reemplazo completo de puntos) y `DELETE` en controller + service + persistence | `backend/` | ✅ |
| 3 | Soporte STOMP: dependencia websocket, config `/ws-blueprints`, `@MessageMapping("/draw")` → `/topic/blueprints.{author}.{name}`, permitir en `SecurityConfig` | `backend/` | ✅ |
| 4 | `.env.local` del Front (`VITE_API_BASE`, rutas `/api/v1/blueprints`) | raíz del Front | ✅ |
| 5 | Traer/adaptar cliente API CRUD de P3 (`blueprintsApiClient.js` + login JWT) | `src/services/` | ✅ |
| 6 | Panel CRUD en `App.jsx`: tabla de planos por autor + total de puntos (`reduce`) + Create/Save/Delete | `src/` | ✅ |
| 7 | Verificar integración STOMP ya scaffoldeada (`stompClient.js`) contra el backend copiado | `src/` | ✅ |
| 8 | Prueba end-to-end: 2 pestañas dibujando en vivo + CRUD refrescando lista/total | — | ✅ |
| 9 | README del equipo + evidencias (capturas/video corto) — falta solo el video | raíz | 🔄 |

**Leyenda:** ⬜ pendiente · 🔄 en progreso · ✅ hecho
