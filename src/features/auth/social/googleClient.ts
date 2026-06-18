import { ApiRequestError, isApiError } from '@/api/errors'
import type { components } from '@/api/schema'
import { config } from '@/config/env'

type AuthResult = components['schemas']['AuthResult']

/** ¿Hay al menos un proveedor social configurado? Gatea la sección social y su divisor. */
export function hasSocialProviders(): boolean {
  return Boolean(config.google)
}

/** Respuesta de credencial de Google Identity Services (GIS). `credential` es el ID token (JWT). */
export interface GoogleCredentialResponse {
  credential: string
  select_by?: string
}

interface GoogleIdConfig {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'small' | 'medium' | 'large'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<GoogleAccountsId> | null = null

/** Carga (una sola vez) el SDK de Google Identity Services y resuelve `google.accounts.id`. */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<GoogleAccountsId>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    const script = existing ?? document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id)
      else reject(new Error('Google Identity Services no se inicializó'))
    })
    script.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')))
    if (!existing) document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Canjea el ID token de Google por una sesión TocToc.
 *
 * Usa `fetch` directo (no el cliente tipado) porque el endpoint todavía NO existe en el OpenAPI
 * del backend; la ruta es configurable con `VITE_GOOGLE_AUTH_PATH` (default `/auth/google`).
 * El backend debe verificar el ID token y devolver el mismo `AuthResult` que `/auth/verify`
 * (`{ accessToken, user }`).
 */
export async function exchangeGoogleIdToken(idToken: string): Promise<AuthResult> {
  const authPath = config.google?.authPath ?? '/auth/google'
  const res = await fetch(`${config.apiUrl}${authPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })

  const payload: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    if (isApiError(payload)) throw new ApiRequestError(payload)
    throw new ApiRequestError({
      name: 'GoogleAuthError',
      code: res.status,
      message: 'No se pudo iniciar sesión con Google',
    })
  }
  return payload as AuthResult
}
