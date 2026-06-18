import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'

export type Membership = components['schemas']['Membership']
export type MembershipStatus = components['schemas']['MembershipStatus']
export type PropertyAdmin = components['schemas']['PropertyAdmin']
export type PropertyAdminStatus = components['schemas']['PropertyAdminStatus']

/** Estado de una persona (membresía o co-admin); ambos comparten el mismo conjunto de valores. */
export const PERSON_STATUS_LABEL: Record<MembershipStatus, string> = {
  active: 'Activo',
  invited: 'Invitado',
  revoked: 'Revocado',
}

export const unitMembershipsKey = (unitId: string) =>
  ['admin', 'unit', unitId, 'memberships'] as const
export const propertyAdminsKey = (propertyId: string) =>
  ['admin', 'property', propertyId, 'admins'] as const

/**
 * `GET /units/{unitId}/memberships` — residentes vinculados a la unidad.
 *
 * `List` colisiona en el OpenAPI (lo reusan muchos controllers) y openapi-typescript lo resuelve al
 * primero, así que forzamos el contrato real con un cast acotado, igual que en `useInvitations`.
 */
export function useUnitMemberships(unitId: string) {
  return useQuery({
    queryKey: unitMembershipsKey(unitId),
    queryFn: async (): Promise<Membership[]> => {
      const result = await api.GET('/units/{unitId}/memberships', {
        params: { path: { unitId } },
      } as unknown as never)
      return unwrap(result) as unknown as Membership[]
    },
  })
}

/**
 * `DELETE /units/{unitId}/memberships/{membershipId}` — revoca la membresía (204).
 *
 * `Revoke` colisiona en el OpenAPI → cast acotado en el init (la respuesta no tiene cuerpo).
 */
export function useRevokeMembership(unitId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (membershipId: string): Promise<void> => {
      const result = await api.DELETE('/units/{unitId}/memberships/{membershipId}', {
        params: { path: { unitId, membershipId } },
      } as unknown as never)
      unwrap(result)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitMembershipsKey(unitId) }),
  })
}

/** `GET /properties/{propertyId}/admins` — co-admins de la propiedad. `ListAdmins` es único. */
export function usePropertyAdmins(propertyId: string) {
  return useQuery({
    queryKey: propertyAdminsKey(propertyId),
    queryFn: async (): Promise<PropertyAdmin[]> =>
      unwrap(await api.GET('/properties/{propertyId}/admins', { params: { path: { propertyId } } })),
  })
}

/**
 * `DELETE /properties/{propertyId}/admins/{adminId}` — revoca a un co-admin (204, owner-only en el
 * backend; responde 400 si se intenta revocar al `owner`). `RevokeAdmin` es único.
 */
export function useRevokeAdmin(propertyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (adminId: string): Promise<void> => {
      unwrap(
        await api.DELETE('/properties/{propertyId}/admins/{adminId}', {
          params: { path: { propertyId, adminId } },
        }),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: propertyAdminsKey(propertyId) }),
  })
}
