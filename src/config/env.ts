export interface IceServerConfig {
  urls: string
  username?: string
  credential?: string
}

/**
 * Parsea VITE_ICE_SERVERS. Formato por entrada (separadas por coma):
 *   "stun:host:puerto"  o  "turn:host:puerto|usuario|credencial"
 */
function parseIceServers(raw: string | undefined): IceServerConfig[] {
  if (!raw) return [{ urls: 'stun:stun.l.google.com:19302' }]
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [urls, username, credential] = entry.split('|').map((p) => p.trim())
      return username && credential ? { urls, username, credential } : { urls }
    })
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export interface GoogleAuthConfig {
  clientId: string
  /** Ruta del backend que verifica el ID token de Google y devuelve { accessToken, user }. */
  authPath: string
}

/** `null` salvo que VITE_GOOGLE_CLIENT_ID esté definido (gatea el botón de Google). */
function parseGoogleConfig(): GoogleAuthConfig | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  if (!clientId) return null
  return { clientId, authPath: import.meta.env.VITE_GOOGLE_AUTH_PATH?.trim() || '/auth/google' }
}

/** Configuración derivada de las variables de entorno (Vite). */
export const config = {
  apiUrl: stripTrailingSlash(import.meta.env.VITE_API_URL ?? 'http://localhost:8080'),
  appUrl: stripTrailingSlash(import.meta.env.VITE_APP_URL ?? window.location.origin),
  iceServers: parseIceServers(import.meta.env.VITE_ICE_SERVERS),
  google: parseGoogleConfig(),
} as const
