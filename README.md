# TocToc Front

Frontend **único** de TocToc: una sola app (Vite + React + TypeScript) que sirve a las **tres
personas** del producto, se instala como **PWA** y se empaqueta como app móvil con **Capacitor**.

> TocToc reemplaza el timbre físico: poné un **QR** en la entrada, el visitante escanea, **toca el
> timbre**, y el residente lo ve, habla y le **abre la puerta** — todo desde la web/app.

Backend (API + realtime): repo `MarcoAR1/TocToc`. La guía de producto vive en
`TocToc/docs/api/frontend-guide.md` y el flujo end-to-end en `frontend-flow.md`.

---

## Personas y mapa de rutas

Una sola base de código, separada por **grupos de ruta** (no son apps distintas):

| Persona | Auth | Rutas | Layout |
|---------|------|-------|--------|
| **Visitante** | sin login (QR) | `/r`, `/r/:code`, `/r/:code/:unitCode`, `/ring/:ringId` | `VisitorLayout` (mobile-first) |
| **Residente** | JWT (magic link) | `/app`, `/app/incoming/:id`, `/app/history`, `/app/settings` | `ResidentLayout` (app shell + nav inferior) |
| **Admin** | JWT (magic link) | `/admin`, `/admin/properties/:id` | `AdminLayout` (desktop + sidebar) |
| **Auth** | público | `/auth/login`, `/auth/verify`, `/invite/accept` | `AuthLayout` (centrado) |

`/` es una landing que deriva a cada persona. Las rutas de residente/admin están protegidas por
`RequireAuth` (redirige a `/auth/login` si no hay token).

---

## Stack

- **Vite 6** + **React 19** + **TypeScript** (estricto).
- **React Router 7** (data router) — grupos de ruta por persona.
- **TanStack Query 5** (estado de servidor) sobre un cliente **openapi-fetch** tipado.
- **Zustand** (sesión/JWT, persistida).
- **Tailwind CSS v4** + **shadcn/ui** (Radix) + **Lucide** + **sonner** (toasts).
- **socket.io-client** (realtime) + WebRTC nativo (llamadas) — hooks en `src/realtime`.
- **vite-plugin-pwa** (Workbox) para la PWA. **Capacitor** para el wrapper móvil.
- **Vitest** + **Testing Library** (unit) y **Playwright** (e2e).
- **React Hook Form** + **Zod** (formularios y validación).

### Tipos de la API (codegen desde OpenAPI)

El backend genera `swagger.json` (TSOA). De ahí derivamos los tipos del front:

```bash
npm run api          # = sync:openapi + gen:api
# sync:openapi -> copia el OpenAPI a openapi/toctoc.openapi.json
# gen:api      -> openapi-typescript -> src/api/schema.d.ts
```

Fuente del OpenAPI (por prioridad): `OPENAPI_URL` (descarga) → `OPENAPI_SRC` (archivo) →
ruta hermana por defecto `../TocToc/src/infrastructure/routes/swagger.json`.

```bash
# Ejemplos
OPENAPI_URL=http://localhost:8080/api-docs/swagger.json npm run api
OPENAPI_SRC=/ruta/a/swagger.json npm run api
```

El cliente está en `src/api/client.ts` (`api` + `unwrap()`); los tipos en `src/api/schema.d.ts`
(autogenerado, **no editar a mano**).

---

## Requisitos

- **Node 22** (hay `.nvmrc`): `nvm use`.
- Acceso a la red corporativa **solo si vas a instalar** (ver Nexus abajo).

## Instalación

```bash
nvm use            # Node 22
npm install        # usa el registry de Nexus (.npmrc local, NO versionado)
npm run api        # genera los tipos de la API
npm run dev        # http://localhost:5173
```

> **Registry corporativo (Nexus):** la URL del registry va **solo** en un `.npmrc` local
> (gitignored). El `package-lock.json` versionado debe quedar siempre con URLs públicas
> (`https://registry.npmjs.org/`). Tras instalar, normalizá el lockfile:
> ```bash
> sed -i '' 's|http://nexus.iaas.ar.bsch/repository/npm-public/|https://registry.npmjs.org/|g' package-lock.json
> ```

## Scripts

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Typecheck + build de producción (`dist/`) |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | `tsc --noEmit` (app + config) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (escribe) |
| `npm run test` | Vitest (unit) |
| `npm run test:e2e` | Playwright (e2e) |
| `npm run api` | Sincroniza OpenAPI y regenera los tipos |
| `npm run cap:sync` | Capacitor sync (tras `build`) |

## Variables de entorno

Copiá `.env.example` a `.env`:

- `VITE_API_URL` — base del backend (dev: `http://localhost:8080`).
- `VITE_APP_URL` — URL pública de esta app (QR + deep links de magic link/invitaciones).
- `VITE_ICE_SERVERS` — STUN/TURN para WebRTC (`stun:host:puerto` o `turn:host:puerto|user|cred`, separados por coma).
- `VITE_GOOGLE_CLIENT_ID` — *(opcional)* Client ID OAuth 2.0 de Google. **Gatea** el botón "Continuar con Google": sin esta variable el login es sólo magic link.
- `VITE_GOOGLE_AUTH_PATH` — *(opcional)* ruta del backend que canjea el ID token de Google (default `/auth/google`).

---

## Estructura de carpetas

```
src/
  main.tsx                # entry: monta la app + registra el service worker (PWA)
  app/
    providers.tsx         # ThemeProvider + QueryClient + Router + Toaster
    router.tsx            # rutas por persona (grupos)
  api/
    client.ts             # cliente openapi-fetch (auth + manejo de error)
    errors.ts             # ApiError / ApiRequestError / friendlyMessage
    query.ts              # QueryClient (reintentos, staleTime)
    schema.d.ts           # AUTOGENERADO desde OpenAPI
  realtime/
    socket.ts             # fábrica de socket.io según persona
    useSocket.ts          # hook de ciclo de vida del socket
  config/
    env.ts                # lee import.meta.env (apiUrl, appUrl, iceServers, google)
  components/
    ui/                   # shadcn/ui (button, input, card, label, badge, ...)
    layout/               # VisitorLayout, ResidentLayout, AdminLayout, AuthLayout
    theme/                # ThemeProvider + useTheme + ModeToggle (claro/oscuro/sistema)
    brand/Logo.tsx        # isotipo
    auth/RequireAuth.tsx  # guard de rutas protegidas
    common/Placeholder.tsx
  features/
    auth/                 # store (Zustand) + api (hooks) + pages (login, verify, invite) + social (Google drop-in)
    visitor/pages/        # scan, directorio, espera del timbre
    resident/pages/       # home, entrante, historial, ajustes
    admin/pages/          # propiedades, detalle
  styles/globals.css      # Tailwind v4 + design tokens (light/dark)
  test/setup.ts           # setup de Vitest (jest-dom + matchMedia)
e2e/                      # specs de Playwright
openapi/                  # snapshot del OpenAPI del backend
scripts/sync-openapi.mjs  # copia/descarga el OpenAPI
```

**Convención de features:** cada persona vive bajo `src/features/<persona>/`. Lo transversal
(UI, layout, theme, api, realtime, config) vive en `src/components` y módulos raíz. Agregá
`features/<persona>/components|hooks|api` a medida que crezca cada feature.

---

## Autenticación

Login/alta **sin contraseña** vía **magic link**, con **Google OAuth** opcional como drop-in.

**Flujo magic link**

1. `/auth/login` → el usuario pone su correo → `POST /auth/magic-link` (`useRequestMagicLink`) →
   estado "revisá tu correo" (con reenviar).
2. El backend envía un correo con un enlace a `VITE_APP_URL` + `/auth/verify?token=…`.
3. `/auth/verify` canjea el token → `POST /auth/verify` (`useVerifyMagicLink`) → guarda
   `{ accessToken, user }` en el store (Zustand, persistido) y redirige a `?from` (o `/app`).

Las rutas protegidas (`RequireAuth`) **hidratan** la sesión con `GET /auth/me` (`useMe`). Si el
token venció, el middleware del cliente (`src/api/client.ts`) limpia la sesión ante un `401` y el
guard redirige al login. El logout (`useLogout`, en Ajustes) limpia store + cache de Query.

**Google OAuth (drop-in)**

El botón "Continuar con Google" aparece **solo** si `VITE_GOOGLE_CLIENT_ID` está definido
(ver `SocialAuthSection` / `hasSocialProviders`). Usa **Google Identity Services**; el ID token se
canjea contra `VITE_GOOGLE_AUTH_PATH` (default `/auth/google`), que debe devolver el mismo
`{ accessToken, user }` que `/auth/verify`. **El endpoint de backend está pendiente**; al definir
el Client ID, el botón se habilita automáticamente sin más cambios de código.

Archivos: `src/features/auth/{api.ts,store.ts}`, `src/features/auth/pages/{LoginPage,VerifyPage}.tsx`,
`src/features/auth/social/*`, `src/components/auth/RequireAuth.tsx`.

---

## Estilo / Design tokens

El sistema visual se controla con **CSS variables** en `src/styles/globals.css`
(formato `oklch`, light + dark). Para **re-brandear** toda la app editá solo esas variables:

- **Marca**: `--primary` / `--primary-foreground` (hoy indigo). `--ring` suele igualar a `--primary`.
- **Superficies**: `--background`, `--card`, `--popover`, `--muted`, `--accent`.
- **Semánticos**: `--destructive`, `--success`, `--warning` (+ `*-foreground`).
- **Bordes/inputs**: `--border`, `--input`. **Radio**: `--radius` (deriva sm/md/lg/xl).

El bloque `@theme inline` mapea cada token a utilidades de Tailwind (`bg-background`,
`text-primary`, `border-border`, `rounded-lg`, etc.). El **modo oscuro** es por clase `.dark`
en `<html>` (lo maneja `ThemeProvider`; `ModeToggle` cicla claro/oscuro/sistema).

Tipografía: stack de sistema + Inter (si está disponible). Componentes: estilo **new-york** de
shadcn/ui; agregá más con `npx shadcn@latest add <componente>` (respeta `components.json`).

---

## PWA y Capacitor

- **PWA**: `vite-plugin-pwa` con `registerType: 'autoUpdate'`. Manifest e íconos configurados en
  `vite.config.ts`. El SW se registra en `src/main.tsx`. Probá el comportamiento offline con
  `npm run build && npm run preview`.
- **Capacitor**: `capacitor.config.ts` listo (`appId: com.toctoc.app`, `webDir: dist`). Las
  plataformas nativas se agregan cuando haga falta (hito del residente):
  ```bash
  npm run build
  npx cap add android      # y/o: npx cap add ios   (requiere Android Studio / Xcode)
  npm run cap:sync
  ```
  Plugins previstos para más adelante: Push, Camera, Geolocation y App (deep links del magic link).

---

## Testing

- **Unit**: Vitest + Testing Library (`src/**/*.test.tsx`). `npm run test`.
- **E2E**: Playwright (`e2e/*.spec.ts`). `npm run test:e2e` (levanta el dev server solo).

---

## Hitos (roadmap de construcción)

Alineados con `TocToc/docs/api/frontend-guide.md` (§11). El scaffold deja las rutas y placeholders
de todas las personas; cada hito reemplaza placeholders por la UI real:

- **M1 — Timbre simple**: visitante `/r/:code` → directorio → `POST /rings` → espera (socket
  anónimo + polling). Admin mínimo: crear propiedad, unidades, ver/imprimir QR.
- **M2 — Residente atiende y abre**: magic link, push, socket autenticado, pantalla entrante,
  `answer`/`reject`, `access/open`, historial.
- **M3 — Llamada en vivo (WebRTC)**: visitante y residente, ICE/SDP, STUN/TURN, UI de video.
- **M4 — Gestión**: invitaciones (self-claim), membresías, admins/staff, rotación de QR.
- **M5 — Pulido**: bitácoras, "no molestar", reconexión, errores, i18n, accesibilidad, offline.
