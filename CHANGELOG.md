# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y el proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

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

[Unreleased]: https://github.com/MarcoAR1/toctoc-front/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MarcoAR1/toctoc-front/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MarcoAR1/toctoc-front/releases/tag/v0.1.0
