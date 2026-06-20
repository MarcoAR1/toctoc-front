import { useQuery } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { AccessEvent, CallSession, Ring } from '@/features/activity/log'

export type { AccessEvent, CallSession, Ring }

export const ringsLogKey = (propertyId: string) => ['admin', 'activity', 'rings', propertyId] as const
export const accessLogKey = (propertyId: string) => ['admin', 'activity', 'access', propertyId] as const
export const callsLogKey = (propertyId: string) => ['admin', 'activity', 'calls', propertyId] as const

/**
 * `GET /rings?propertyId=` — bitácora de timbres de la propiedad (admin, más reciente primero).
 *
 * El operationId `List` colisiona (varios controllers lo reusan); el ganador exige `propertyId`
 * —que es justo lo que mandamos—, pero su tipo de respuesta no es `Ring[]`, así que casteamos el
 * resultado igual que en `useRingsByUnit`.
 */
export function useRingsLog(propertyId: string | undefined) {
  return useQuery({
    queryKey: ringsLogKey(propertyId ?? 'none'),
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<Ring[]> => {
      const result = await api.GET('/rings', { params: { query: { propertyId: propertyId! } } })
      return unwrap(result) as unknown as Ring[]
    },
  })
}

/** `GET /access?propertyId=` — bitácora de accesos de la propiedad (admin, más reciente primero). */
export function useAccessLog(propertyId: string | undefined) {
  return useQuery({
    queryKey: accessLogKey(propertyId ?? 'none'),
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<AccessEvent[]> =>
      unwrap(await api.GET('/access', { params: { query: { propertyId: propertyId! } } })),
  })
}

/**
 * `GET /calls?propertyId=` — historial de llamadas de la propiedad (admin, más reciente primero).
 *
 * `ListForProperty` colisiona con `GET /claims` (el board de reclamos, que gana la dedupe por ir
 * primero en el schema), así que forzamos el contrato real con un cast acotado igual que en
 * `useClaimsBoard`.
 */
export function useCallsLog(propertyId: string | undefined) {
  return useQuery({
    queryKey: callsLogKey(propertyId ?? 'none'),
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<CallSession[]> => {
      const result = await api.GET('/calls', {
        params: { query: { propertyId: propertyId! } },
      } as unknown as never)
      return unwrap(result) as unknown as CallSession[]
    },
  })
}
