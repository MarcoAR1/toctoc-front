import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'

export type Device = components['schemas']['Device']
export type QuietHours = components['schemas']['QuietHours']
export type SetQuietHoursBody = components['schemas']['SetQuietHoursBody']

/**
 * `GET /devices` — dispositivos del usuario que reciben push.
 *
 * El operationId `List` colisiona en el OpenAPI (resuelve al primer `List`, que exige `propertyId`);
 * `/devices` no recibe query, así que forzamos el contrato real (sin query → `Device[]`).
 */
export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: async (): Promise<Device[]> => {
      const result = await api.GET('/devices', {
        params: {} as unknown as { query: { propertyId: string } },
      })
      return unwrap(result) as unknown as Device[]
    },
  })
}

/** `DELETE /devices/{id}` — quita un dispositivo (deja de recibir push allí). */
export function useRemoveDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await api.DELETE('/devices/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
  })
}

/**
 * `GET /dnd?unitId=` — "no molestar" de la unidad (el backend devuelve un default deshabilitado
 * cuando no hay configuración, sin 404).
 *
 * El operationId `Get` colisiona (resuelve a otra operación con `path`, no a la de dnd); forzamos el
 * contrato real (query `unitId` → `QuietHours`).
 */
export function useDnd(unitId: string | undefined) {
  return useQuery({
    queryKey: ['dnd', unitId ?? 'none'],
    enabled: Boolean(unitId),
    queryFn: async (): Promise<QuietHours> => {
      const result = await api.GET('/dnd', {
        params: { query: { unitId: unitId! } } as unknown as never,
      })
      return unwrap(result) as unknown as QuietHours
    },
  })
}

/** `PUT /dnd` — configura el "no molestar" de la unidad. */
export function useSetDnd() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: SetQuietHoursBody) => unwrap(await api.PUT('/dnd', { body })),
    onSuccess: (quietHours) => queryClient.setQueryData(['dnd', quietHours.unitId], quietHours),
  })
}
