import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'

export type PropertyDirectory = components['schemas']['PropertyDirectory']
export type DirectoryUnit = components['schemas']['DirectoryUnit']
export type Ring = components['schemas']['Ring']
export type RingInput = components['schemas']['RingInput']
export type RingReason = components['schemas']['RingReason']

/** Clave de cache de un timbre puntual (compartida por la query y las actualizaciones por socket). */
export function ringKey(ringId: string) {
  return ['ring', ringId] as const
}

/** Estados terminales: el timbre dejó de sonar. */
const TERMINAL: ReadonlySet<Ring['status']> = new Set([
  'answered',
  'rejected',
  'timeout',
  'cancelled',
])

export function isRingTerminal(status: Ring['status']): boolean {
  return TERMINAL.has(status)
}

/** `GET /properties/by-code/{code}` — directorio público (propiedad + unidades activas). */
export function usePropertyDirectory(code: string | undefined) {
  return useQuery({
    queryKey: ['directory', code ?? 'none'],
    enabled: Boolean(code),
    queryFn: async () =>
      unwrap(await api.GET('/properties/by-code/{code}', { params: { path: { code: code! } } })),
  })
}

/** `POST /rings` — el visitante toca el timbre de una unidad (público, sin sesión). */
export function useCreateRing() {
  return useMutation({
    mutationFn: async (input: RingInput) => unwrap(await api.POST('/rings', { body: input })),
  })
}

/**
 * `GET /rings/{ringId}` — seguimiento del timbre. Pollea cada 2.5s mientras suena (respaldo del
 * socket) y se detiene al llegar a un estado terminal.
 */
export function useRing(ringId: string | undefined) {
  return useQuery({
    queryKey: ['ring', ringId ?? 'none'],
    enabled: Boolean(ringId),
    queryFn: async () =>
      unwrap(await api.GET('/rings/{ringId}', { params: { path: { ringId: ringId! } } })),
    refetchInterval: (query) => {
      const ring = query.state.data
      return ring && isRingTerminal(ring.status) ? false : 2500
    },
  })
}

/** `POST /rings/{ringId}/cancel` — el visitante cancela el timbre (público). */
export function useCancelRing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ringId: string) =>
      unwrap(await api.POST('/rings/{ringId}/cancel', { params: { path: { ringId } } })),
    onSuccess: (ring) => queryClient.setQueryData(ringKey(ring.id), ring),
  })
}
