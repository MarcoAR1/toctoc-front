# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [0.8.0] - 2026-06-18

**Reclamos del residente** (contexto `claims`): mesa de ayuda del edificio. El residente abre un
reclamo sobre su unidad (mantenimiento, ruido, seguridad…), sigue su estado y conversa con la
administración en un hilo de comentarios.

### Added

- **Reclamos (#Claims)** — nueva pestaña **Reclamos** en la navegación del residente:
  - **Listar** mis reclamos por propiedad (`GET /claims/mine`) con asunto, categoría, prioridad,
    estado y fecha (`ClaimsPage`).
  - **Abrir** un reclamo (`POST /claims`) eligiendo unidad, categoría y prioridad (`NewClaimPage`).
  - **Detalle** con el workflow (`open → in_progress → resolved → closed`, o `cancelled`), acciones
    del autor (**cancelar** / **reabrir**) y un **hilo de comentarios** público
    (`GET`/`POST /claims/{id}/comments`) (`ClaimDetailPage`).
- **Realtime de reclamos** — `useResidentRealtime` ahora escucha `claim.assigned` / `claim.resolved`
  / `claim.closed` / `claim.reopened` / `claim.cancelled` / `claim.comment` y refresca la cache de
  TanStack Query + avisa con un toast (consistente con timbres y llamadas).
- **Hooks de claims** (`src/features/resident/claims.ts`) con react-query + mapas de etiquetas
  (categoría/prioridad/estado) reutilizables por las páginas.

### Tests

- `ClaimsPage` (lista + estado vacío), `NewClaimPage` (crea con el body correcto) y
  `ClaimDetailPage` (detalle + hilo, agregar comentario, cancelar) con `@/api/client` mockeado.

### Notas

- **Colisión de operationId** (igual que en milestones anteriores): `ListMine` (lo reusa
  `GET /properties`), `Get`, `Cancel` y `Reopen` resuelven a otra operación en el OpenAPI, así que
  `GET /claims/mine`, `GET /claims/{id}`, `cancel` y `reopen` usan un cast acotado y comentado.
  `File` (crear) y `ListComments`/`Comment` (hilo) son únicos y quedan bien tipados.
- **Fuera de alcance** (será parte del panel admin, M4): board de la propiedad (`GET /claims`) y las
  transiciones de gestión (`assign` / `resolve` / `close`), que son admin-only.

## [0.7.0] - 2026-06-18

**Llamada en vivo (WebRTC)** (M3): tras tocar el timbre, el visitante puede hablar/verse con el
residente en tiempo real. El servidor sólo retransmite la señalización (SDP); el audio/video va
peer-to-peer.

### Added

- **Módulo de llamadas (`src/features/calls`)** — base compartida por visitante y residente:
  `PeerSession` (envoltura de `RTCPeerConnection` con **ICE no-trickle**: junta los candidatos y los
  embebe en el SDP, con tope de espera), `signaling.ts` (atender/rechazar/colgar e iniciar como
  visitante), `iceServers` (de `VITE_ICE_SERVERS`) y `MediaView` (enchufa el `MediaStream` al video).
- **Residente atiende (#Calls, callee)** — `ResidentCallOverlay` montado en `ResidentLayout`: la
  llamada entrante (`call.incoming`) aparece sobre cualquier pantalla con **Atender / Rechazar**, y
  en curso muestra video remoto + preview local y **Colgar**. Si otro residente atiende primero
  (`call.taken`) o el otro lado corta (`call.ended`), se cierra solo.
- **Visitante llama (#Calls, caller)** — botones **Llamar** (audio) y **Videollamada** en
  `RingWaitingPage` mientras el timbre suena o fue atendido. `VisitorCallPanel` pide un token
  efímero (`POST /calls/visitor-token`), inicia la llamada (`POST /calls/visitor`) y recibe el
  `call.accepted` por un socket autenticado con ese token (room `user:visitor:{ringId}`).

### Tests

- `PeerSession` (offer/answer + espera de recolección ICE) con `RTCPeerConnection`/`getUserMedia`
  mockeados; `ResidentCallOverlay` (entrante → atender → en curso; rechazar; fin remoto);
  `VisitorCallPanel` (iniciar → atendida → colgar).

### Notas

- **ICE no-trickle**: por simplicidad y robustez no usamos el canal `/calls/{id}/ice` ni el evento
  `call.ice`; el SDP ya viaja con los candidatos. Se puede migrar a trickle más adelante.
- `POST /calls/{callId}/accept` reusa el operationId colisionado `Accept` (resuelve a aceptar
  invitación) — se fuerza el contrato con un cast acotado, como en `useOpenDoor`/`useRingsByUnit`.
- El visitante adjunta su token por header (`Authorization`) porque no tiene sesión; el
  `authMiddleware` sólo pisa ese header cuando hay token de sesión.

## [0.6.0] - 2026-06-18

**Ajustes del residente** (cierra M2): "no molestar" por unidad y gestión de dispositivos. Con esto la
app del residente queda completa (timbre en vivo + historial + ajustes).

### Added

- **No molestar / DND (#DoNotDisturb)** — sección en `SettingsPage` para configurar las horas de
  silencio de una unidad: interruptor, franja `Desde`/`Hasta` y días de la semana (vacío = todos). Lee
  `GET /dnd?unitId=` y guarda con `PUT /dnd`. Durante la franja se silencian los push de timbres (el
  timbre se sigue registrando y se ve en vivo con la app abierta). Horarios en UTC.
- **Dispositivos (#Identity)** — lista los equipos del usuario (`GET /devices`) y permite quitarlos
  (`DELETE /devices/{id}`) para dejar de recibir push allí.
- **Selección de unidad compartida** — `useUnitSelection` (`units.ts`) + `UnitPicker` reutilizables;
  `HistoryPage` ahora los usa (mismo comportamiento) y `SettingsPage` los reusa para el DND.
- **`formatDateTime`** — helper de fecha (`Intl` es-AR) en `src/lib/datetime.ts`, compartido por
  Historial y Dispositivos.

### Tests

- `SettingsPage`: carga el "no molestar" de la unidad, alterna el interruptor y guarda (`PUT /dnd`);
  lista dispositivos y los quita (`DELETE /devices/{id}`).

### Notas

- **Registro de push fuera de alcance**: `POST /devices` necesita un `pushToken` de FCM y todavía no
  hay integración de Firebase/Web Push en el front; por eso la sección sólo lista y quita.
- **Invitaciones = panel admin**: `POST /invitations/residents`, `GET /invitations` y
  `DELETE /invitations/{id}` exigen rol de gestión (owner/manager) en el backend, así que no van en los
  ajustes del residente (quedan para M4).
- `GET /devices` y `GET /dnd` reusan operationIds colisionados en el OpenAPI (`List`/`Get`); se fuerza
  el contrato real con casts acotados y comentados, igual que en `useOpenDoor`/`useRingsByUnit`.

## [0.5.0] - 2026-06-18

**Historial del residente** (M2): la pantalla de actividad por unidad. Con la sesión, el residente
elige su propiedad/unidad y revisa **timbres**, **accesos** y **llamadas** (más reciente primero).

### Added

- **Historial del residente (#Rings/#Access/#Calls)** — `HistoryPage` real: descubre las unidades vía
  `GET /properties` + `GET /properties/{id}/units`, con selector de propiedad y unidad (ocultos cuando
  hay una sola). Pestañas **Timbres** (`GET /rings?unitId=`), **Accesos** (`GET /access?unitId=`) y
  **Llamadas** (`GET /calls/by-unit?unitId=`), cada una con estados de carga, vacío y error (incl. `403`).
- **Hooks del historial** — `src/features/resident/history.ts`: `useMyProperties`, `usePropertyUnits`,
  `useRingsByUnit`, `useAccessByUnit`, `useCallsByUnit` (TanStack Query, habilitados por unidad).
- **Filas y badges de estado** — cada ítem muestra ícono, nombre/motivo, fecha (`Intl` es-AR) y un badge
  por estado (atendido/abierta/finalizada → éxito; rechazado/denegado/falló → destructivo; etc.).

### Tests

- `HistoryPage`: muestra timbres por defecto, cambia entre pestañas (accesos/llamadas) y oculta los
  selectores cuando hay una sola propiedad/unidad; estado vacío sin propiedades.

### Notas

- `GET /rings` reusa el operationId `List` (colisiona con otros controllers); como con `/access/open`,
  se fuerza el contrato real (`unitId → Ring[]`) con un cast acotado en `useRingsByUnit`.
- No hay endpoint “mis unidades”: `GET /properties/{id}/units` lista **todas** las de la propiedad (el
  backend sólo pide JWT). El historial de una unidad ajena responde `403` y se muestra como tal; un
  endpoint de membresías propias permitiría afinar el selector a futuro.

## [0.4.0] - 2026-06-17

La otra mitad del **loop del timbre**: la **app del residente** (M2). Con la sesión del magic link, el
residente recibe los timbres **en vivo** por socket autenticado, los atiende o rechaza y **abre la
puerta** — el primero que responde gana.

### Added

- **Realtime del residente (#Rings)** — `useResidentRealtime` (montado en `ResidentLayout`) conecta el
  socket **autenticado** (auto-une a `user:{userId}`), escucha `ring.created` / `ring.updated` y vuelca
  los timbres a un store Zustand + la cache de TanStack Query, con aviso (toast) al sonar. El header
  muestra el estado de conexión (**En vivo** / **Conectando…**).
- **Home del residente (#Rings)** — `ResidentHomePage` lista los timbres **sonando ahora** (nombre y
  motivo) con enlace al detalle, y un estado vacío cuando no hay ninguno.
- **Timbre entrante (#Rings)** — `IncomingPage` (`/app/incoming/:id`): foto/avatar del visitante,
  nombre, motivo y mensaje; **Atender** (`POST /rings/{id}/answer`), **Rechazar**
  (`POST /rings/{id}/reject`), **Atender y abrir** (orquesta ambas) y **Abrir puerta**
  (`POST /access/open` → `AccessEvent`, mostrando `opened`/`denied`/`failed`). Refleja “ya atendido por
  otra persona” y maneja el `409` (otro lo tomó). Lee el timbre del store con respaldo a `GET /rings/{id}`.
- **Hooks y store del residente** — `src/features/resident/api.ts` (`useAnswerRing`, `useRejectRing`,
  `useOpenDoor`) y `src/features/resident/store.ts` (store realtime + selector `ringingRings`).

### Fixed

- **Tests** — registrado el `cleanup()` de Testing Library en el setup (con `globals: false` no se
  registraba solo), evitando que los componentes se acumulen en el DOM entre tests del mismo archivo.

### Tests

- `ResidentHomePage`: lista sólo los timbres sonando (no los resueltos) con enlace al detalle.
  `IncomingPage`: atiende y luego abre la puerta; avisa cuando otro residente ya atendió.

### Notas

- El OpenAPI del backend reusa el operationId `Open` para `/access/open` y `/lockers/open`;
  openapi-typescript los colapsa y tipa mal el body de `/access/open`. Se fuerza el contrato real
  (`OpenDoorInput` → `AccessEvent`) con un cast acotado y documentado en `useOpenDoor`.
- **Llamada en vivo** (WebRTC, M3) e **historial** (`GET /rings?unitId=` / `GET /access?unitId=`)
  quedan para próximas iteraciones.

## [0.3.0] - 2026-06-17

Primer **loop del timbre** del lado del visitante (M1): escanear/ingresar el código de la propiedad,
elegir la unidad y tocar el timbre, con seguimiento del estado **en vivo** hasta que el residente
atiende, rechaza o se agota el tiempo. Todo público, sin sesión.

### Added

- **Directorio del visitante (#Rings)** — `DirectoryPage` real: resuelve la propiedad por código
  (`GET /properties/by-code/{code}`), lista las unidades activas con buscador (por `directoryName` o
  `label`) y maneja los estados cargando / código inválido (404) / **directorio privado** (`code_only`,
  sin unidades). Soporta el deep-link `/r/:code/:unitCode` preseleccionando la unidad.
- **Formulario de timbre (#Rings)** — `RingForm`: motivo (`visit`/`delivery`/`service`), nombre y
  mensaje opcionales; dispara `POST /rings` y navega a la espera con el `ring.id`.
- **Pantalla de espera en vivo (#Rings)** — `RingWaitingPage`: estado del timbre por **socket anónimo**
  (`ring:subscribe` + `ring.updated`, con re-suscripción al reconectar) y **fallback a polling**
  (`GET /rings/{id}` cada 2.5s mientras suena). Botón **Cancelar** (`POST /rings/{id}/cancel`) y
  desenlaces por estado: atendido / rechazado / sin respuesta (timeout) / cancelado.
- **Hooks tipados del visitante** — `src/features/visitor/api.ts`: `usePropertyDirectory`,
  `useCreateRing`, `useRing` (con `refetchInterval` que se detiene en estados terminales) y
  `useCancelRing`, sobre el cliente `openapi-fetch` tipado y TanStack Query.

### Tests

- `DirectoryPage`: lista unidades y abre el formulario al elegir una; avisa "directorio privado"
  cuando no hay unidades. `RingWaitingPage`: muestra "Tocando el timbre" + cancelar mientras suena y
  el desenlace cuando atienden.

### Pendiente

- **Foto del visitante** (`photo` en `POST /rings`) y **escalado a llamada en vivo** (WebRTC, M3)
  quedan para una próxima iteración; el contrato del backend ya los contempla.

## [0.2.0] - 2026-06-17

Primera feature funcional: **autenticación**. Login/registro _passwordless_ por **magic link**
(ya operativo contra el backend) y andamiaje **listo para Google OAuth**: el botón aparece y
funciona en cuanto se cargan las credenciales, sin tocar código.

### Added

- **Login por magic link (#Auth)** — `LoginPage` real: un único campo de email que sirve para
  **iniciar sesión o crear cuenta** (el backend hace _find-or-create_). Llama a
  `POST /auth/magic-link` y muestra el estado "revisá tu correo" con opción de **reenviar** y de
  **cambiar el email**. En desarrollo el backend imprime el enlace por consola (no hace falta SMTP).
- **Verificación y sesión (#Auth)** — `VerifyPage` real: lee el `token` de la query, canjea
  `POST /auth/verify`, guarda `accessToken` + `user` en la sesión (Zustand persistida) y redirige
  al destino original (`from`) o a `/app`. Maneja los estados cargando / enlace inválido o vencido
  (con reintento hacia el login).
- **Hidratación de sesión (#Auth)** — `RequireAuth` revalida la sesión con `GET /auth/me` en
  segundo plano siempre que hay token; si el token venció, el cliente limpia la sesión (401) y
  redirige al login.
- **Cerrar sesión (#Auth)** — acción de logout (limpia la sesión y vuelve al login) integrada en
  `Ajustes`, mostrando el email de la sesión activa.
- **Hooks tipados de auth** — `src/features/auth/api.ts`: `useRequestMagicLink`, `useVerifyMagicLink`,
  `useMe` y `useLogout`, sobre el cliente `openapi-fetch` tipado y TanStack Query.
- **Drop-in de Google OAuth (#Auth)** — `SocialAuthSection` + `GoogleSignInButton` (Google Identity
  Services). La sección social y el divisor **solo se renderizan si hay un proveedor configurado**
  (`VITE_GOOGLE_CLIENT_ID`), así que el botón **aparece automáticamente** al cargar credenciales.
  Al obtener el _ID token_ de Google se canjea por una sesión en el backend
  (`POST /auth/google`, ruta configurable con `VITE_GOOGLE_AUTH_PATH`). Pensado para sumar más
  proveedores (Apple, etc.) agregando una entrada a la lista.

### Changed

- **Configuración** — `src/config/env.ts` y `.env.example` incorporan `VITE_GOOGLE_CLIENT_ID` y
  `VITE_GOOGLE_AUTH_PATH` (opcional). El bloque `config.google` queda `null` si no hay client id.

### Docs

- **README** — nueva sección **Autenticación**: flujo de magic link, cómo habilitar Google
  (variables + endpoint de backend pendiente) y el contrato esperado `POST /auth/google`.

### Tests

- `LoginPage`: enviar el formulario dispara `POST /auth/magic-link` y pasa al estado "revisá tu
  correo". `SocialAuthSection`: queda oculta cuando no hay credenciales configuradas.

### Pendiente de backend

- **`POST /auth/google`** — el backend hoy es magic-link puro (`/auth/magic-link`, `/auth/verify`,
  `/auth/me`); **no** existe endpoint de Google. El front ya está cableado: falta implementar en el
  backend la verificación del _ID token_ de Google y devolver el mismo `AuthResult`
  (`{ accessToken, user }`). Mientras tanto, sin `VITE_GOOGLE_CLIENT_ID` el botón no aparece.

## [0.1.0] - 2026-06-17

Base del proyecto (**scaffold**): una sola app (Vite + React + TypeScript) que sirve a las tres
personas de TocToc (visitante, residente, administración), instalable como PWA y empaquetable con
Capacitor.

### Added

- **App shell y routing por persona** — React Router 7 con grupos de ruta: visitante (público,
  `/r`, `/ring/:id`), auth (`/auth/*`, `/invite/accept`), y protegidos por `RequireAuth`: residente
  (`/app/*`) y administración (`/admin/*`). Layouts y páginas _placeholder_ por persona.
- **Fundación de estilo** — Tailwind CSS v4 con _design tokens_ (claro/oscuro, `oklch`) en
  `src/styles/globals.css`, `ThemeProvider` (claro/oscuro/sistema) y base de **shadcn/ui** (Radix):
  `button`, `input`, `card`, `label`, `badge`, `skeleton`, `spinner`, `sonner`.
- **Capa de API tipada** — _snapshot_ del OpenAPI del backend + codegen con `openapi-typescript`
  (`npm run api`), cliente `openapi-fetch` con middleware de auth (Bearer) y manejo de error
  uniforme (`ApiRequestError`, `friendlyMessage`), más `QueryClient` (TanStack Query) y sesión
  con Zustand persistida.
- **Realtime y config** — fábrica de `socket.io-client` + `useSocket`, y módulo `config/env`
  (`VITE_API_URL`, `VITE_APP_URL`, `VITE_ICE_SERVERS`).
- **PWA y Capacitor** — `vite-plugin-pwa` (Workbox, _autoupdate_) + registro del service worker;
  `capacitor.config.ts` listo (sin plataformas nativas todavía).
- **Testing** — Vitest + Testing Library (setup + test de ejemplo) y Playwright (config + smoke e2e).
- **Tooling** — TypeScript estricto, ESLint (flat) + Prettier, Node 22 (`.nvmrc`), instalación vía
  Nexus con `.npmrc` local (gitignored) y `package-lock.json` con URLs públicas; `README` con
  arquitectura, estructura, guía de estilo y comandos.

[Unreleased]: https://github.com/MarcoAR1/toctoc-front/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MarcoAR1/toctoc-front/releases/tag/v0.1.0
