# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

## [0.16.0] - 2026-06-19

**Panel admin — bitácora por propiedad** (M4): timbres, accesos y llamadas de toda la propiedad en
un solo lugar, para que el admin/conserje audite la actividad sin depender de cada unidad.

### Added

- **Bitácora del admin (#Activity)** — nueva página `/admin/activity` (entrada "Bitácora" en el
  sidebar) con selector de propiedad y tres pestañas: **Timbres** (`GET /rings?propertyId=`),
  **Accesos** (`GET /access?propertyId=`) y **Llamadas** (`GET /calls?propertyId=`), más reciente
  primero. Hooks en `admin/activity.ts` (`useRingsLog` / `useAccessLog` / `useCallsLog`).
- **Presentación compartida (`features/activity/log.tsx`)** — `ActivityTabs`, `ActivityPanel` y los
  renders de timbre/acceso/llamada (con sus etiquetas y badges de estado), reutilizados por el
  historial del residente y la bitácora del admin.

### Changed

- **Historial del residente** — `HistoryPage` ahora reutiliza la presentación compartida; se eliminó
  la duplicación de mapas de etiquetas, fila y lista (misma UI, ~210 líneas menos).

### Tests

- `AdminActivityPage`: lista timbres por defecto y cambia de pestaña consultando por `propertyId`; el
  selector de propiedad refiltra la bitácora; estado vacío sin propiedades.

## [0.15.0] - 2026-06-18

**Panel admin — reclamos en vivo** (M4): el board y el hilo de reclamos se actualizan solos vía
socket, sin recargar; cierra la mesa de ayuda del panel.

### Added

- **Realtime de reclamos (#Claims)** — `useAdminRealtime` conecta el socket autenticado del admin
  (room `user:{userId}`) y, ante los eventos `claim.*` que recibe (`claim.created`, `claim.assigned`,
  `claim.resolved`, `claim.closed`, `claim.reopened`, `claim.cancelled`, `claim.comment`), cachea el
  `Claim` y refresca el board de su propiedad y el hilo del reclamo (React Query).
- **Avisos** — toast en `claim.created` ("Nuevo reclamo") y `claim.comment` ("Nuevo comentario en un
  reclamo") con el asunto del reclamo como descripción.
- **Indicador "En vivo"** — `AdminLayout` monta el hook una sola vez y muestra el estado de conexión
  del socket en el header (espejando el del residente).

### Changed

- **`claimsBoardPrefix(propertyId)`** — nuevo helper en `admin/claims.ts` para invalidar todos los
  filtros del board de una propiedad; lo reusan las mutaciones y el realtime.

### Tests

- `useAdminRealtime`: `claim.created` cachea el reclamo, invalida el board (prefijo de propiedad) y el
  hilo, y avisa; `claim.comment` refresca board + hilo; suscribe/desuscribe los eventos `claim.*`.

## [0.14.0] - 2026-06-18

**Panel admin — hilo de reclamos** (M4): completa la mesa de ayuda con la conversación del reclamo,
para responderle al residente y dejar notas internas del equipo.

### Added

- **Hilo de comentarios (#Claims)** — cada reclamo del board despliega su conversación
  (`GET /claims/{id}/comments`, botón "Conversación") con las respuestas públicas y las notas
  internas, etiquetando al autor (vos / equipo / residente) y resaltando las notas internas.
- **Responder y notas internas (#Claims)** — composer por reclamo (`POST /claims/{id}/comments`) con
  un switch "Nota interna": las notas internas (`internal: true`) solo las ve el equipo; sin el
  switch, la respuesta es pública para el residente.

### Tests

- `AdminClaimsPage`: abrir la conversación carga el hilo; publicar una respuesta pública
  (`internal: false`) y una nota interna (`internal: true`) con el `body`/`claimId` correctos.

### Notas

- Reutiliza los hooks `useClaimComments` / `useAddClaimComment` de `resident/claims` (el board admin
  envía `internal`, que el backend ignora para residentes). El hilo solo consulta al expandirse, para
  no disparar una query por cada reclamo del board.

## [0.13.0] - 2026-06-18

**Panel admin — board de reclamos** (M4): nueva sección en el panel para gestionar los reclamos que
abren los residentes, con filtro por estado y las transiciones de la mesa de ayuda.

### Added

- **Board de reclamos (#Claims)** — página `/admin/claims` (entrada "Reclamos" en el sidebar): elige
  una propiedad, filtra por estado (todos / abiertos / en progreso / resueltos / cerrados / cancelados)
  y lista los reclamos más recientes primero (`GET /claims?propertyId=&status=`).
- **Gestión de un reclamo (#Claims)** — por tarjeta: **asignar** a un co-admin
  (`POST /claims/{id}/assign`, `open → in_progress`), **resolver** con resolución opcional
  (`POST /claims/{id}/resolve`) y **cerrar** (`POST /claims/{id}/close`). Los reclamos terminales
  (cerrado / cancelado) se muestran sin acciones.
- **Hooks** — `src/features/admin/claims.ts` (`useClaimsBoard`, `useAssignClaim`, `useResolveClaim`,
  `useCloseClaim`), reutilizando tipos y etiquetas de `resident/claims`.

### Tests

- `AdminClaimsPage`: listar el board y filtrar por estado (`GET` con `status=open`); asignar a un
  co-admin, resolver con resolución y cerrar (cada `POST` con el `claimId`/body correctos).

### Notas

- Colisión de operationId: `ListForProperty` (GET board) la comparte el log de llamadas pero `/claims`
  gana la dedupe; `Close` colisiona con el cierre de encuestas (que gana) → cast acotado. `Assign` y
  `Resolve` son únicos. La asignación lista co-admins por `userId` (las personas aún no exponen
  nombre/email) y el backend responde `400` si el asignado no es admin activo (vía `friendlyMessage`).

## [0.12.0] - 2026-06-18

**Panel admin — residentes y equipo** (M4): cierra la gestión de personas del detalle de la propiedad.
Ahora se ve quién vive en cada unidad y quién administra la propiedad, con opción de revocar accesos.

### Added

- **Residentes por unidad (#People)** — cada unidad despliega sus residentes (`GET /units/{id}/memberships`)
  con rol y estado, y permite **remover** a cada uno (`DELETE /units/{id}/memberships/{membershipId}`).
- **Equipo (#People)** — sección de co-admins de la propiedad (`GET /properties/{id}/admins`) con rol y
  estado; se puede **revocar** a managers y encargados (`DELETE /properties/{id}/admins/{adminId}`). El
  `owner` aparece destacado y no es revocable (no se muestra la acción).
- **Hooks** — `src/features/admin/people.ts` (`useUnitMemberships`, `useRevokeMembership`,
  `usePropertyAdmins`, `useRevokeAdmin`) + `PERSON_STATUS_LABEL`.

### Tests

- `AdminPropertyDetailPage`: desplegar los residentes de una unidad y remover uno (`DELETE` con el
  `unitId`/`membershipId` correctos); listar co-admins y revocar a un manager, verificando que el
  `owner` no expone botón de revocar.

### Notas

- Las entidades `Membership` y `PropertyAdmin` sólo traen `userId` (sin email/nombre) → se muestra el
  `userId`; el alta de personas sigue siendo por invitación (v0.11.0).
- Colisión de operationId: `List` (GET memberships) y `Revoke` (DELETE membership) colisionan → cast
  acotado; `ListAdmins`/`RevokeAdmin` son únicos. Revocar co-admins es owner-only en el backend (`403`
  vía `friendlyMessage`); revocar al `owner` responde `400` y por eso se oculta la acción.

## [0.11.0] - 2026-06-18

**Panel admin — invitaciones + aceptación** (M4): onboarding de personas por email. El admin invita
residentes (a una unidad) o co-admins (a la propiedad), y el invitado entra en un clic desde el enlace
del email (self-claim).

### Added

- **Invitaciones (#Invitations)** — sección en el detalle de la propiedad: invitar **residente**
  (`POST /invitations/residents`, eligiendo unidad + rol) o **co-admin** (`POST /invitations/admins`,
  rol manager/encargado), **listar** las pendientes (`GET /invitations?propertyId=`) y **revocar**
  (`DELETE /invitations/{id}`).
- **Aceptar invitación (#Invitations)** — `InviteAcceptPage` real (`/invite/accept?token=`): canjea el
  token (`POST /invitations/accept`), persiste la sesión igual que un magic link y entra; un co-admin
  va al panel (`/admin`), un residente a la app (`/app`). Maneja token faltante / inválido / vencido.
- **Hooks** — `src/features/admin/invitations.ts` (`useInvitations`, `useInviteResident`,
  `useInviteAdmin`, `useRevokeInvitation`) + `useAcceptInvitation` en `auth/api.ts`, con mapas de
  etiquetas (tipo de invitación, rol de residente y de staff).

### Tests

- `AdminPropertyDetailPage`: invitar a un residente (`POST` con el body correcto) y listar + revocar
  una invitación pendiente. `InviteAcceptPage`: canje OK con redirect por tipo (residente/co-admin),
  token faltante e invitación inválida.

### Notas

- Colisión de operationId: `Accept` (POST /invitations/accept) **gana** la dedupe del OpenAPI → queda
  bien tipado; `InviteResident`/`InviteAdmin` son únicos; `List` (GET /invitations) y `Revoke`
  (DELETE) colisionan → cast acotado y comentado, como en `useMyClaims`.
- Aún no hay gating de rol fino en el front: invitar co-admin es owner-only en el backend (responde
  `403`, que se muestra con `friendlyMessage`).

## [0.10.0] - 2026-06-18

**Panel admin — gestión de la propiedad** (M4): completa el detalle con edición, habilitar/deshabilitar
y el código QR (ver, copiar, descargar y rotar).

### Added

- **Editar propiedad (#Properties)** — desde el detalle: nombre y visibilidad del directorio
  (`PATCH /properties/{id}`), en un formulario inline.
- **Habilitar / Deshabilitar (#Properties)** — `POST /properties/{id}/disable` / `…/enable`; al
  deshabilitar, la propiedad deja de resolver por QR (se avisa en la tarjeta del código).
- **Código QR (#Properties)** — el detalle muestra el QR público (`GET /properties/{id}/qr`)
  renderizado en cliente, con **copiar enlace**, **descargar** (SVG) y **rotar código**
  (`POST /properties/{id}/code/rotate`, con confirmación) que invalida el QR anterior.
- **Hooks** — `useUpdateProperty`, `useDisableProperty`, `useEnableProperty`, `useRotateCode`,
  `usePropertyQr` (TanStack Query; refrescan la cache de la propiedad y del QR).

### Changed

- Nueva dependencia **`qrcode.react`** para renderizar el QR como SVG (impresión/descarga nítida, sin
  depender de servicios externos).

### Tests

- `AdminPropertyDetailPage`: render con QR + acciones, **editar** (`PATCH` con el body correcto),
  **deshabilitar** y **rotar** el código.

### Notas

- Sin colisión de operationId esta vez: `Update` (PATCH) gana la dedupe del OpenAPI y
  `Disable` / `Enable` / `RotateCode` / `GetQr` son únicos → todos quedan bien tipados (sin cast).
- La descarga del QR es **SVG** (escalable e imprimible); el export a PNG se puede sumar a futuro
  convirtiéndolo en canvas.

## [0.9.0] - 2026-06-18

**Panel admin — propiedades** (arranca M4): la consola de administración. El admin ve las propiedades
que gestiona, da de alta nuevas (onboarding express) y abre el detalle para cargar unidades.

### Added

- **Propiedades (#Properties)** — `AdminPropertiesPage` real: lista las propiedades del usuario
  (`GET /properties`) con tipo, código y estado, y un formulario de **alta express** (`POST /properties`)
  eligiendo tipo y visibilidad del directorio (las unidades se autoprovisionan según el tipo).
- **Detalle de propiedad (#Properties)** — `AdminPropertyDetailPage`: cabecera (nombre, tipo, código,
  estado y visibilidad del directorio) + sección de **unidades** (`GET /properties/{id}/units`) con alta
  de unidad (`POST /properties/{id}/units`).
- **Hooks de admin** (`src/features/admin/properties.ts`): `useAdminProperties`, `useProperty`,
  `usePropertyUnits`, `useCreateProperty`, `useAddUnit` + mapas de etiquetas (tipo/estado/visibilidad).

### Tests

- `AdminPropertiesPage` (lista, estado vacío, crear con el body correcto) y `AdminPropertyDetailPage`
  (cabecera + unidades, agregar unidad) con `@/api/client` mockeado.

### Notas

- **Colisión de operationId** (igual que en milestones anteriores): `Create` (lo gana `POST /surveys`)
  y `GetById` (lo gana `GET /rings/{ringId}`) resuelven a otra operación en el OpenAPI, así que
  `POST /properties` y `GET /properties/{id}` usan un cast acotado y comentado. `ListMine` / `ListUnits`
  / `AddUnit` son únicos y quedan bien tipados.
- **Próximas rebanadas del panel** (M4): QR (ver/imprimir/rotar), editar/habilitar/deshabilitar la
  propiedad, residentes (membresías) y co-admins, invitaciones por email, board de reclamos y bitácoras.

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

[Unreleased]: https://github.com/MarcoAR1/toctoc-front/compare/v0.16.0...HEAD
[0.16.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MarcoAR1/toctoc-front/releases/tag/v0.1.0
