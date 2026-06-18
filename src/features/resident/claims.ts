import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'

export type Claim = components['schemas']['Claim']
export type ClaimComment = components['schemas']['ClaimComment']
export type ClaimCategory = components['schemas']['ClaimCategory']
export type ClaimPriority = components['schemas']['ClaimPriority']
export type ClaimStatus = components['schemas']['ClaimStatus']
export type CreateClaimBody = components['schemas']['CreateClaimBody']
export type AddClaimCommentBody = components['schemas']['AddClaimCommentBody']

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'

export const CLAIM_CATEGORY_LABEL: Record<ClaimCategory, string> = {
  maintenance: 'Mantenimiento',
  noise: 'Ruido',
  security: 'Seguridad',
  cleaning: 'Limpieza',
  billing: 'Facturación',
  other: 'Otro',
}

export const CLAIM_PRIORITY_LABEL: Record<ClaimPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export const CLAIM_PRIORITY_VARIANT: Record<ClaimPriority, BadgeVariant> = {
  low: 'secondary',
  medium: 'outline',
  high: 'destructive',
}

export const CLAIM_STATUS_BADGE: Record<ClaimStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Abierto', variant: 'warning' },
  in_progress: { label: 'En progreso', variant: 'default' },
  resolved: { label: 'Resuelto', variant: 'success' },
  closed: { label: 'Cerrado', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
}

export const claimsKey = (propertyId: string) => ['claims', 'mine', propertyId] as const
export const claimKey = (claimId: string) => ['claim', claimId] as const
export const claimCommentsKey = (claimId: string) => ['claim', claimId, 'comments'] as const

/**
 * `GET /claims/mine?propertyId=` — mis reclamos en una propiedad.
 *
 * El operationId `ListMine` colisiona con `GET /properties` en el OpenAPI (varios controllers lo
 * reusan); openapi-typescript lo resuelve al primero (propiedades, sin query), así que forzamos el
 * contrato real con un cast acotado, igual que en `useRingsByUnit`.
 */
export function useMyClaims(propertyId: string | undefined) {
  return useQuery({
    queryKey: claimsKey(propertyId ?? 'none'),
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<Claim[]> => {
      const result = await api.GET('/claims/mine', {
        params: { query: { propertyId: propertyId! } },
      } as unknown as never)
      return unwrap(result) as unknown as Claim[]
    },
  })
}

/** `GET /claims/{claimId}` — un reclamo. `Get` colisiona en el OpenAPI → cast acotado. */
export function useClaim(claimId: string | undefined) {
  return useQuery({
    queryKey: claimKey(claimId ?? 'none'),
    enabled: Boolean(claimId),
    queryFn: async (): Promise<Claim> => {
      const result = await api.GET('/claims/{claimId}', {
        params: { path: { claimId: claimId! } },
      } as unknown as never)
      return unwrap(result) as unknown as Claim
    },
  })
}

/** `GET /claims/{claimId}/comments` — hilo (más antiguo primero). `ListComments` es único. */
export function useClaimComments(claimId: string | undefined) {
  return useQuery({
    queryKey: claimCommentsKey(claimId ?? 'none'),
    enabled: Boolean(claimId),
    queryFn: async () =>
      unwrap(
        await api.GET('/claims/{claimId}/comments', { params: { path: { claimId: claimId! } } }),
      ),
  })
}

/** `POST /claims` — abre un reclamo. `File` es único. */
export function useFileClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateClaimBody): Promise<Claim> =>
      unwrap(await api.POST('/claims', { body })),
    onSuccess: (claim) => {
      queryClient.setQueryData(claimKey(claim.id), claim)
      queryClient.invalidateQueries({ queryKey: claimsKey(claim.propertyId) })
    },
  })
}

/** `POST /claims/{claimId}/comments` — comenta (residente: siempre público). `Comment` es único. */
export function useAddClaimComment(claimId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: AddClaimCommentBody): Promise<ClaimComment> =>
      unwrap(await api.POST('/claims/{claimId}/comments', { params: { path: { claimId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claimCommentsKey(claimId) }),
  })
}

/** Refresca las caches tras una transición que devuelve el `Claim` actualizado. */
function onClaimUpdated(queryClient: QueryClient) {
  return (claim: Claim) => {
    queryClient.setQueryData(claimKey(claim.id), claim)
    queryClient.invalidateQueries({ queryKey: claimsKey(claim.propertyId) })
  }
}

/** `POST /claims/{claimId}/cancel` — el autor cancela. `Cancel` colisiona → cast acotado. */
export function useCancelClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (claimId: string): Promise<Claim> => {
      const result = await api.POST('/claims/{claimId}/cancel', {
        params: { path: { claimId } },
      } as unknown as never)
      return unwrap(result) as unknown as Claim
    },
    onSuccess: onClaimUpdated(queryClient),
  })
}

/** `POST /claims/{claimId}/reopen` — el autor reabre. `Reopen` colisiona → cast acotado. */
export function useReopenClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (claimId: string): Promise<Claim> => {
      const result = await api.POST('/claims/{claimId}/reopen', {
        params: { path: { claimId } },
      } as unknown as never)
      return unwrap(result) as unknown as Claim
    },
    onSuccess: onClaimUpdated(queryClient),
  })
}
