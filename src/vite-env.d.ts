/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Base URL del backend TocToc (ej: http://localhost:8080). */
  readonly VITE_API_URL: string
  /** URL pública de esta app (QR + deep links de magic link/invitaciones). */
  readonly VITE_APP_URL: string
  /** Servidores ICE para WebRTC, separados por coma. */
  readonly VITE_ICE_SERVERS?: string
  /** Client ID de Google OAuth. Si está presente, aparece el botón "Continuar con Google". */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  /** Endpoint del backend que canjea el ID token de Google (default: /auth/google). */
  readonly VITE_GOOGLE_AUTH_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
