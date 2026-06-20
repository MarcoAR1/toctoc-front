import { useState } from 'react'

import { friendlyMessage } from '@/api/errors'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityPanel, ActivityTabs, type ActivityTab } from '@/features/activity/log'
import { UnitPicker } from '@/features/resident/UnitPicker'
import { useAccessByUnit, useCallsByUnit, useRingsByUnit } from '@/features/resident/history'
import { useUnitSelection } from '@/features/resident/units'

/** Historial de timbres / accesos / llamadas del residente, por unidad. */
export function HistoryPage() {
  const selection = useUnitSelection()
  const { properties, units, propertyList, unitList, selectedUnitId } = selection
  const [tab, setTab] = useState<ActivityTab>('rings')

  const rings = useRingsByUnit(selectedUnitId)
  const access = useAccessByUnit(selectedUnitId)
  const calls = useCallsByUnit(selectedUnitId)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Historial</h1>

      {properties.isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : properties.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(properties.error)}
        </p>
      ) : propertyList.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No tenés propiedades asociadas.
          </CardContent>
        </Card>
      ) : (
        <>
          <UnitPicker selection={selection} />

          {units.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : unitList.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center text-sm">
                Esta propiedad todavía no tiene unidades.
              </CardContent>
            </Card>
          ) : (
            <>
              <ActivityTabs tab={tab} onChange={setTab} />
              <ActivityPanel tab={tab} rings={rings} access={access} calls={calls} />
            </>
          )}
        </>
      )}
    </div>
  )
}
