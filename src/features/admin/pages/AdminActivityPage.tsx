import { useState } from 'react'

import { friendlyMessage } from '@/api/errors'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityPanel, ActivityTabs, type ActivityTab } from '@/features/activity/log'
import { useAccessLog, useCallsLog, useRingsLog } from '@/features/admin/activity'
import { useAdminProperties } from '@/features/admin/properties'

const SELECT_CLASS =
  'border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]'

/** Bitácora de la propiedad (admin): timbres, accesos y llamadas, más reciente primero. */
export function AdminActivityPage() {
  const properties = useAdminProperties()
  const propertyList = properties.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const [tab, setTab] = useState<ActivityTab>('rings')

  const effectivePropertyId = propertyId || propertyList[0]?.id || ''
  const rings = useRingsLog(effectivePropertyId || undefined)
  const access = useAccessLog(effectivePropertyId || undefined)
  const calls = useCallsLog(effectivePropertyId || undefined)

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Bitácora</h1>

      {properties.isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : properties.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(properties.error)}
        </p>
      ) : propertyList.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No tenés propiedades para gestionar.
          </CardContent>
        </Card>
      ) : (
        <>
          {propertyList.length > 1 && (
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">Propiedad</span>
              <select
                aria-label="Propiedad"
                value={effectivePropertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className={SELECT_CLASS}
              >
                {propertyList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <ActivityTabs tab={tab} onChange={setTab} />
          <ActivityPanel tab={tab} rings={rings} access={access} calls={calls} />
        </>
      )}
    </div>
  )
}
