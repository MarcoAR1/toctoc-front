import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'

export type Invitation = components['schemas']['Invitation']
export type InvitationType = components['schemas']['InvitationType']
export type InvitationStatus = components['schemas']['InvitationStatus']
export type MembershipRole = components['schemas']['MembershipRole']
export type ManageableAdminRole = components['schemas']['ManageableAdminRole']
export type PropertyAdminRole = components['schemas']['PropertyAdminRole']
export type CreateResidentInvitationBody = components['schemas']['CreateResidentInvitationBody']
export type CreateAdminInvitationBody = components['schemas']['CreateAdminInvitationBody']

export const INVITATION_TYPE_LABEL: Record<InvitationType, string> = {
  unit_resident: 'Residente',
  property_admin: 'Co-admin',
}

export const MEMBERSHIP_ROLE_LABEL: Record<MembershipRole, string> = {
  owner: 'Propietario',
  tenant: 'Inquilino',
  family: 'Familiar',
  admin: 'Admin de unidad',
}

/** Cubre todos los roles de staff (incluye `owner`) para mostrar invitaciones existentes. */
export const ADMIN_ROLE_LABEL: Record<PropertyAdminRole, string> = {
  owner: 'Propietario',
  manager: 'Administrador',
  concierge: 'Encargado',
}

/** Roles que un owner puede asignar al invitar staff (no se puede invitar como `owner`). */
export const MANAGEABLE_ADMIN_ROLES: ManageableAdminRole[] = ['manager', 'concierge']

export const invitationsKey = (propertyId: string) =>
  ['admin', 'property', propertyId, 'invitations'] as const

/**
 * `GET /invitations?propertyId=` — invitaciones **pendientes** de la propiedad.
 *
 * `List` colisiona en el OpenAPI (lo reusan muchos controllers) y openapi-typescript lo resuelve al
 * primero, así que forzamos el contrato real con un cast acotado, igual que en `useMyClaims`.
 */
export function useInvitations(propertyId: string | undefined) {
  return useQuery({
    queryKey: invitationsKey(propertyId ?? 'none'),
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<Invitation[]> => {
      const result = await api.GET('/invitations', {
        params: { query: { propertyId: propertyId! } },
      } as unknown as never)
      return unwrap(result) as unknown as Invitation[]
    },
  })
}

/** `POST /invitations/residents` — invita a un residente a una unidad. `InviteResident` es único. */
export function useInviteResident(propertyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateResidentInvitationBody): Promise<Invitation> =>
      unwrap(await api.POST('/invitations/residents', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationsKey(propertyId) }),
  })
}

/** `POST /invitations/admins` — invita a un co-admin (owner-only en el backend). `InviteAdmin` es único. */
export function useInviteAdmin(propertyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<CreateAdminInvitationBody, 'propertyId'>): Promise<Invitation> =>
      unwrap(await api.POST('/invitations/admins', { body: { propertyId, ...input } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationsKey(propertyId) }),
  })
}

/**
 * `DELETE /invitations/{invitationId}` — revoca una invitación pendiente (204).
 *
 * `Revoke` colisiona en el OpenAPI → cast acotado en el init (la respuesta no tiene cuerpo).
 */
export function useRevokeInvitation(propertyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string): Promise<void> => {
      const result = await api.DELETE('/invitations/{invitationId}', {
        params: { path: { invitationId } },
      } as unknown as never)
      unwrap(result)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationsKey(propertyId) }),
  })
}
