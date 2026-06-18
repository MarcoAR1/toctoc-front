import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import { ringKey, type Ring } from '@/features/visitor/api'
import { useResidentStore } from '@/features/resident/store'

export type AccessEvent = components['schemas']['AccessEvent']
export type OpenDoorInput = components['schemas']['OpenDoorInput']

/** Vuelca un timbre resuelto al store + cache de queries (lo comparten todas las acciones). */
function useApplyRing() {
  const queryClient = useQueryClient()
  const upsertRing = useResidentStore((s) => s.upsertRing)
  return (ring: Ring) => {
    queryClient.setQueryData(ringKey(ring.id), ring)
    upsertRing(ring)
  }
}

/** `POST /rings/{ringId}/answer` — el residente atiende (queda `answered`, `answeredBy` = yo). */
export function useAnswerRing() {
  const applyRing = useApplyRing()
  return useMutation({
    mutationFn: async (ringId: string) =>
      unwrap(await api.POST('/rings/{ringId}/answer', { params: { path: { ringId } } })),
    onSuccess: applyRing,
  })
}

/** `POST /rings/{ringId}/reject` — el residente rechaza (queda `rejected`). */
export function useRejectRing() {
  const applyRing = useApplyRing()
  return useMutation({
    mutationFn: async (ringId: string) =>
      unwrap(await api.POST('/rings/{ringId}/reject', { params: { path: { ringId } } })),
    onSuccess: applyRing,
  })
}

/** `POST /access/open` — abre la puerta; `ringId` liga la apertura al timbre (bitácora). */
export function useOpenDoor() {
  return useMutation({
    mutationFn: async (input: OpenDoorInput): Promise<AccessEvent> => {
      // El OpenAPI del backend reusa el operationId "Open" para `/access/open` y `/lockers/open`;
      // openapi-typescript los colapsa y tipa el body de `/access/open` como el de lockers (`{ code }`).
      // Forzamos el contrato real (OpenDoorInput → AccessEvent) hasta que el backend desambigüe los ids.
      const result = await api.POST('/access/open', { body: input as unknown as { code: string } })
      return unwrap(result) as unknown as AccessEvent
    },
  })
}
