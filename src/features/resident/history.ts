import { useQuery } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import type { Ring } from '@/features/visitor/api'

export type Property = components['schemas']['Property']
export type Unit = components['schemas']['Unit']
export type AccessEvent = components['schemas']['AccessEvent']
export type CallSession = components['schemas']['CallSession']

/** `GET /properties` — propiedades donde el usuario es miembro o admin. */
export function useMyProperties() {
  return useQuery({
    queryKey: ['properties', 'mine'],
    queryFn: async () => unwrap(await api.GET('/properties')),
  })
}

/** `GET /properties/{propertyId}/units` — unidades de la propiedad (abierto a cualquier sesión). */
export function usePropertyUnits(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['property', propertyId ?? 'none', 'units'],
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<Unit[]> => {
      const page = unwrap(
        await api.GET('/properties/{propertyId}/units', {
          params: { path: { propertyId: propertyId! }, query: { limit: 200 } },
        }),
      )
      return page.items
    },
  })
}

/**
 * `GET /rings?unitId=` — historial de timbres de la unidad (más reciente primero).
 *
 * El operationId `List` colisiona en el OpenAPI del backend (varios controllers lo reusan), así que
 * openapi-typescript lo resuelve al primer `List` —que exige `propertyId`—. Forzamos el contrato real
 * (`unitId → Ring[]`) con un cast acotado, igual que en `useOpenDoor`.
 */
export function useRingsByUnit(unitId: string | undefined) {
  return useQuery({
    queryKey: ['rings', 'by-unit', unitId ?? 'none'],
    enabled: Boolean(unitId),
    queryFn: async (): Promise<Ring[]> => {
      const result = await api.GET('/rings', {
        params: { query: { unitId: unitId! } as unknown as { propertyId: string } },
      })
      return unwrap(result) as unknown as Ring[]
    },
  })
}

/** `GET /access?unitId=` — bitácora de accesos de la unidad (más reciente primero). */
export function useAccessByUnit(unitId: string | undefined) {
  return useQuery({
    queryKey: ['access', 'by-unit', unitId ?? 'none'],
    enabled: Boolean(unitId),
    queryFn: async () => unwrap(await api.GET('/access', { params: { query: { unitId: unitId! } } })),
  })
}

/** `GET /calls/by-unit?unitId=` — historial de llamadas de la unidad (más reciente primero). */
export function useCallsByUnit(unitId: string | undefined) {
  return useQuery({
    queryKey: ['calls', 'by-unit', unitId ?? 'none'],
    enabled: Boolean(unitId),
    queryFn: async () =>
      unwrap(await api.GET('/calls/by-unit', { params: { query: { unitId: unitId! } } })),
  })
}
