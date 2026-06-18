import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import { useAuthStore, type AuthUser } from '@/features/auth/store'

type User = components['schemas']['User']

/** Mapea el `User` del backend al shape mínimo que guardamos en sesión. */
export function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email, name: user.name ?? undefined }
}

/** `POST /auth/magic-link` — solicita el enlace de acceso (sirve para login y alta). */
export function useRequestMagicLink() {
  return useMutation({
    mutationFn: async (email: string) => {
      // 202 sin cuerpo: sólo nos importa que no devuelva error.
      unwrap(await api.POST('/auth/magic-link', { body: { email } }))
    },
  })
}

/** `POST /auth/verify` — canjea el token del magic link y persiste la sesión. */
export function useVerifyMagicLink() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: async (token: string) => unwrap(await api.POST('/auth/verify', { body: { token } })),
    onSuccess: (result) => setSession(result.accessToken, toAuthUser(result.user)),
  })
}

/**
 * `POST /invitations/accept` — self-claim: canjea el token de la invitación, persiste la sesión
 * (igual que un magic link) y devuelve el resultado (incluye `invitation.type` para el redirect).
 * El operationId `Accept` gana la dedupe del OpenAPI → queda bien tipado.
 */
export function useAcceptInvitation() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: async (token: string) =>
      unwrap(await api.POST('/invitations/accept', { body: { token } })),
    onSuccess: (result) => setSession(result.accessToken, toAuthUser(result.user)),
  })
}

/** `GET /auth/me` — usuario de la sesión actual. Sólo corre si hay token. */
export function useMe() {
  const token = useAuthStore((s) => s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: ['auth', 'me'],
    enabled: Boolean(token),
    queryFn: async () => {
      const user = toAuthUser(unwrap(await api.GET('/auth/me')))
      setUser(user)
      return user
    },
  })
}

/** Cierra la sesión: limpia el store + la cache de queries y vuelve al login. */
export function useLogout() {
  const clear = useAuthStore((s) => s.clear)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return () => {
    clear()
    queryClient.clear()
    navigate('/auth/login', { replace: true })
  }
}
