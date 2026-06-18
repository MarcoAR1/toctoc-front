import { useState, type ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { BellRing, DoorOpen, Phone } from 'lucide-react'

import { friendlyMessage } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UnitPicker } from '@/features/resident/UnitPicker'
import {
  useAccessByUnit,
  useCallsByUnit,
  useRingsByUnit,
  type AccessEvent,
  type CallSession,
} from '@/features/resident/history'
import { useUnitSelection } from '@/features/resident/units'
import type { Ring } from '@/features/visitor/api'
import { cn } from '@/lib/utils'

type Tab = 'rings' | 'access' | 'calls'
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline'
type StatusBadge = { label: string; variant: BadgeVariant }

const TABS: { id: Tab; label: string }[] = [
  { id: 'rings', label: 'Timbres' },
  { id: 'access', label: 'Accesos' },
  { id: 'calls', label: 'Llamadas' },
]

const REASON_LABEL: Record<Ring['reason'], string> = {
  visit: 'Visita',
  delivery: 'Entrega',
  service: 'Servicio',
}
const RING_STATUS: Record<Ring['status'], StatusBadge> = {
  ringing: { label: 'Sonando', variant: 'warning' },
  answered: { label: 'Atendido', variant: 'success' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
  timeout: { label: 'Sin respuesta', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
}
const ACCESS_RESULT: Record<AccessEvent['result'], StatusBadge> = {
  opened: { label: 'Abierta', variant: 'success' },
  denied: { label: 'Denegada', variant: 'destructive' },
  failed: { label: 'Falló', variant: 'destructive' },
  delivered: { label: 'Entregado', variant: 'secondary' },
  picked_up: { label: 'Retirado', variant: 'secondary' },
  returned: { label: 'Devuelto', variant: 'secondary' },
}
const ACCESS_METHOD: Record<AccessEvent['method'], string> = {
  remote: 'Remota',
  manual: 'Manual',
  qr: 'QR',
  proximity: 'Proximidad',
}
const CALL_STATUS: Record<CallSession['status'], StatusBadge> = {
  ringing: { label: 'Sonó', variant: 'warning' },
  active: { label: 'En curso', variant: 'success' },
  ended: { label: 'Finalizada', variant: 'secondary' },
}

const DATE_FMT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
function formatWhen(iso?: string): string {
  return iso ? DATE_FMT.format(new Date(iso)) : ''
}

/** Fila genérica del historial: ícono, título, subtítulo + fecha, y un badge de estado. */
function Row({
  icon,
  title,
  subtitle,
  when,
  badge,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  when: string
  badge: StatusBadge
}) {
  return (
    <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
      <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{title}</span>
        <span className="text-muted-foreground truncate text-xs">
          {subtitle}
          {when && ` · ${when}`}
        </span>
      </div>
      <Badge variant={badge.variant}>{badge.label}</Badge>
    </div>
  )
}

function renderRing(ring: Ring): ReactNode {
  return (
    <Row
      icon={<BellRing className="size-4" />}
      title={ring.visitorName?.trim() || 'Visitante'}
      subtitle={REASON_LABEL[ring.reason]}
      when={formatWhen(ring.createdAt)}
      badge={RING_STATUS[ring.status]}
    />
  )
}
function renderAccess(event: AccessEvent): ReactNode {
  return (
    <Row
      icon={<DoorOpen className="size-4" />}
      title={event.type === 'parcel' ? 'Paquete' : 'Puerta'}
      subtitle={ACCESS_METHOD[event.method]}
      when={formatWhen(event.createdAt)}
      badge={ACCESS_RESULT[event.result]}
    />
  )
}
function renderCall(call: CallSession): ReactNode {
  return (
    <Row
      icon={<Phone className="size-4" />}
      title={call.initiatorLabel?.trim() || 'Llamada'}
      subtitle={call.media === 'video' ? 'Video' : 'Audio'}
      when={formatWhen(call.startedAt)}
      badge={CALL_STATUS[call.status]}
    />
  )
}

/** Lista de una pestaña: maneja cargando / error (incl. 403) / vacío / datos. */
function HistoryList<T>({
  query,
  empty,
  getKey,
  renderItem,
}: {
  query: UseQueryResult<T[]>
  empty: string
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}) {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[60px] w-full" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {friendlyMessage(query.error)}
      </p>
    )
  }
  const items = query.data ?? []
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">{empty}</CardContent>
      </Card>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={getKey(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  )
}

/** Historial de timbres / accesos / llamadas del residente, por unidad. */
export function HistoryPage() {
  const selection = useUnitSelection()
  const { properties, units, propertyList, unitList, selectedUnitId } = selection
  const [tab, setTab] = useState<Tab>('rings')

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
              <div role="tablist" className="bg-muted flex gap-1 rounded-lg p-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      tab === t.id
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'rings' && (
                <HistoryList
                  query={rings}
                  empty="Sin timbres todavía."
                  getKey={(r) => r.id}
                  renderItem={renderRing}
                />
              )}
              {tab === 'access' && (
                <HistoryList
                  query={access}
                  empty="Sin accesos todavía."
                  getKey={(e) => e.id}
                  renderItem={renderAccess}
                />
              )}
              {tab === 'calls' && (
                <HistoryList
                  query={calls}
                  empty="Sin llamadas todavía."
                  getKey={(c) => c.id}
                  renderItem={renderCall}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
