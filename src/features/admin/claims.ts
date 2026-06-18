import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import { claimKey, type Claim, type ClaimStatus } from '@/features/resident/claims'

export type AssignClaimBody = components['schemas']['AssignClaimBody']
export type ResolveClaimBody = components['schemas']['ResolveClaimBody']

/** Filtro del board: cualquier `ClaimStatus` o `all` (sin filtro). */
export type ClaimStatusFilter = ClaimStatus | 'all'

/** Prefijo de cache del board de una propiedad (cubre todos los filtros de estado). */
export const claimsBoardPrefix = (propertyId: string) => ['admin', 'claims', propertyId] as const

export const claimsBoardKey = (propertyId: string, status: ClaimStatusFilter) =>
  [...claimsBoardPrefix(propertyId), status] as const

/**
 * `GET /claims?propertyId=&status=` — board de la propiedad (admin, más reciente primero).
 *
 * `ListForProperty` también lo usa el log de llamadas; al colisionar, openapi-typescript resuelve al
 * primero del archivo (`/claims`), pero forzamos el contrato con un cast acotado igual que en
 * `useMyClaims` para no depender del orden.
 */
export function useClaimsBoard(propertyId: string | undefined, status: ClaimStatusFilter) {
  return useQuery({
    queryKey: claimsBoardKey(propertyId ?? 'none', status),
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<Claim[]> => {
      const query = status === 'all' ? { propertyId: propertyId! } : { propertyId: propertyId!, status }
      const result = await api.GET('/claims', { params: { query } } as unknown as never)
      return unwrap(result) as unknown as Claim[]
    },
  })
}

/** Refresca el detalle del reclamo y todos los filtros del board de su propiedad. */
function onClaimUpdated(queryClient: QueryClient) {
  return (claim: Claim) => {
    queryClient.setQueryData(claimKey(claim.id), claim)
    queryClient.invalidateQueries({ queryKey: claimsBoardPrefix(claim.propertyId) })
  }
}

/**
 * `POST /claims/{claimId}/assign` — asigna el reclamo a un admin (`open → in_progress`).
 * `Assign` es único. Responde `400` si el `assigneeUserId` no es admin activo de la propiedad.
 */
export function useAssignClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      claimId,
      assigneeUserId,
    }: {
      claimId: string
      assigneeUserId: string
    }): Promise<Claim> =>
      unwrap(
        await api.POST('/claims/{claimId}/assign', {
          params: { path: { claimId } },
          body: { assigneeUserId },
        }),
      ),
    onSuccess: onClaimUpdated(queryClient),
  })
}

/** `POST /claims/{claimId}/resolve` — resuelve (`open/in_progress → resolved`). `Resolve` es único. */
export function useResolveClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      claimId,
      resolution,
    }: {
      claimId: string
      resolution?: string
    }): Promise<Claim> =>
      unwrap(
        await api.POST('/claims/{claimId}/resolve', {
          params: { path: { claimId } },
          body: { resolution },
        }),
      ),
    onSuccess: onClaimUpdated(queryClient),
  })
}

/**
 * `POST /claims/{claimId}/close` — cierra el reclamo (`→ closed`).
 *
 * `Close` colisiona con `POST /surveys/{surveyId}/close` (que gana la dedupe por ir primero), así que
 * forzamos el contrato real con un cast acotado.
 */
export function useCloseClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (claimId: string): Promise<Claim> => {
      const result = await api.POST('/claims/{claimId}/close', {
        params: { path: { claimId } },
      } as unknown as never)
      return unwrap(result) as unknown as Claim
    },
    onSuccess: onClaimUpdated(queryClient),
  })
}
