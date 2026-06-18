import { useState } from 'react'

import { useMyProperties, usePropertyUnits } from '@/features/resident/history'

/**
 * Selección propiedad → unidad del residente (compartida por Historial y Ajustes).
 * Descubre las propiedades con `GET /properties` y, para la elegida, sus unidades con
 * `GET /properties/{id}/units`. Por defecto toma la primera de cada lista; al cambiar de
 * propiedad resetea la unidad. Expone también las queries para los estados de carga/error.
 */
export function useUnitSelection() {
  const properties = useMyProperties()
  const [propertyId, setPropertyId] = useState<string>()
  const [unitId, setUnitId] = useState<string>()

  const propertyList = properties.data ?? []
  const selectedPropertyId = propertyId ?? propertyList[0]?.id

  const units = usePropertyUnits(selectedPropertyId)
  const unitList = units.data ?? []
  const selectedUnitId = unitId ?? unitList[0]?.id

  return {
    properties,
    units,
    propertyList,
    unitList,
    selectedPropertyId,
    selectedUnitId,
    selectProperty: (id: string) => {
      setPropertyId(id)
      setUnitId(undefined)
    },
    selectUnit: (id: string) => setUnitId(id),
  }
}

export type UnitSelection = ReturnType<typeof useUnitSelection>
