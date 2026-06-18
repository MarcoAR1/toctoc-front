import { useEffect, useRef, useState } from 'react'

import { friendlyMessage } from '@/api/errors'
import { config } from '@/config/env'
import { toAuthUser } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/store'
import {
  exchangeGoogleIdToken,
  loadGoogleIdentity,
  type GoogleCredentialResponse,
} from '@/features/auth/social/googleClient'

export interface SocialAuthCallbacks {
  onError?: (message: string) => void
  onSuccess?: () => void
}

/**
 * Botón "Continuar con Google" (Google Identity Services).
 * Sólo se monta si `config.google` está definido (VITE_GOOGLE_CLIENT_ID).
 */
export function GoogleSignInButton({ onError, onSuccess }: SocialAuthCallbacks) {
  const google = config.google
  const containerRef = useRef<HTMLDivElement>(null)
  const setSession = useAuthStore((s) => s.setSession)
  const [loading, setLoading] = useState(false)

  // Callbacks en refs para no re-inicializar GIS si el padre re-renderiza.
  const onErrorRef = useRef(onError)
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onErrorRef.current = onError
    onSuccessRef.current = onSuccess
  })

  useEffect(() => {
    if (!google) return
    let cancelled = false

    async function handleCredential(response: GoogleCredentialResponse) {
      setLoading(true)
      try {
        const result = await exchangeGoogleIdToken(response.credential)
        if (cancelled) return
        setSession(result.accessToken, toAuthUser(result.user))
        onSuccessRef.current?.()
      } catch (err) {
        if (!cancelled) onErrorRef.current?.(friendlyMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadGoogleIdentity()
      .then((id) => {
        if (cancelled || !containerRef.current) return
        id.initialize({ client_id: google.clientId, callback: (r) => void handleCredential(r) })
        id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        })
      })
      .catch((err: unknown) => {
        if (!cancelled) onErrorRef.current?.(err instanceof Error ? err.message : 'Error al cargar Google')
      })

    return () => {
      cancelled = true
    }
  }, [google, setSession])

  if (!google) return null

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} className={loading ? 'pointer-events-none opacity-60' : undefined} />
      {loading && <p className="text-muted-foreground text-xs">Conectando con Google…</p>}
    </div>
  )
}
