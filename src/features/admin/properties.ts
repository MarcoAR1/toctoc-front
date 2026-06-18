import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'

export type Property = components['schemas']['Property']
export type Unit = components['schemas']['Unit']
export type PaginatedUnits = components['schemas']['PaginatedUnits']
export type CreateUnitInput = components['schemas']['CreateUnitInput']
export type PropertyType = Property['type']
export type PropertyStatus = Property['status']
export type DirectoryVisibility = Property['directoryVisibility']

/** Cuerpo de `POST /properties` (onboarding express). Definido a mano: el operationId `Create`
 *  colisiona en el OpenAPI (lo gana `POST /surveys`), así que el tipo generado no sirve. */
export interface CreatePropertyBody {
  type: PropertyType
  name: string
  directoryVisibility?: DirectoryVisibility
  address?: NonNullable<Property['address']>
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  building: 'Edificio',
  house: 'Casa',
  duplex: 'Dúplex',
  complex: 'Complejo',
}

export const PROPERTY_STATUS_BADGE: Record<PropertyStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Activa', variant: 'success' },
  disabled: { label: 'Deshabilitada', variant: 'secondary' },
}

export const DIRECTORY_VISIBILITY_LABEL: Record<DirectoryVisibility, string> = {
  listed: 'Directorio visible',
  code_only: 'Sólo por código',
}

export const propertiesKey = ['admin', 'properties'] as const
export const propertyKey = (propertyId: string) => ['admin', 'property', propertyId] as const
export const propertyUnitsKey = (propertyId: string) =>
  ['admin', 'property', propertyId, 'units'] as const

/** `GET /properties` — propiedades que el usuario creó o administra/habita. `ListMine` es único. */
export function useAdminProperties() {
  return useQuery({
    queryKey: propertiesKey,
    queryFn: async (): Promise<Property[]> => unwrap(await api.GET('/properties')),
  })
}

/**
 * `GET /properties/{propertyId}` — detalle de la propiedad.
 *
 * El operationId `GetById` colisiona en el OpenAPI (lo gana `GET /rings/{ringId}`); openapi-typescript
 * lo resuelve al primero, así que forzamos el contrato real con un cast acotado.
 */
export function useProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyKey(propertyId ?? 'none'),
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<Property> => {
      const result = await api.GET('/properties/{propertyId}', {
        params: { path: { propertyId: propertyId! } },
      } as unknown as never)
      return unwrap(result) as unknown as Property
    },
  })
}

/** `GET /properties/{propertyId}/units` — unidades (paginado). `ListUnits` es único. */
export function usePropertyUnits(propertyId: string | undefined) {
  return useQuery({
    queryKey: propertyUnitsKey(propertyId ?? 'none'),
    enabled: Boolean(propertyId),
    queryFn: async (): Promise<PaginatedUnits> =>
      unwrap(
        await api.GET('/properties/{propertyId}/units', {
          params: { path: { propertyId: propertyId! }, query: { limit: 100 } },
        }),
      ),
  })
}

/**
 * `POST /properties` — alta de propiedad (onboarding). El operationId `Create` colisiona en el
 * OpenAPI (lo gana `POST /surveys`), así que casteamos el init/respuesta como en `useFileClaim`.
 */
export function useCreateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreatePropertyBody): Promise<Property> => {
      const result = await api.POST('/properties', { body } as unknown as never)
      return unwrap(result) as unknown as Property
    },
    onSuccess: (property) => {
      queryClient.setQueryData(propertyKey(property.id), property)
      queryClient.invalidateQueries({ queryKey: propertiesKey })
    },
  })
}

/** `POST /properties/{propertyId}/units` — alta de una unidad. `AddUnit` es único. */
export function useAddUnit(propertyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateUnitInput): Promise<Unit> =>
      unwrap(await api.POST('/properties/{propertyId}/units', { params: { path: { propertyId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: propertyUnitsKey(propertyId) }),
  })
}
