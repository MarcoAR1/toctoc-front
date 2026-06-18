import { useState } from 'react'
import { LogOut, Smartphone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UnitPicker } from '@/features/resident/UnitPicker'
import {
  useDevices,
  useDnd,
  useRemoveDevice,
  useSetDnd,
  type Device,
  type QuietHours,
} from '@/features/resident/settings'
import { useUnitSelection } from '@/features/resident/units'
import { useLogout } from '@/features/auth/api'
import { formatDateTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'

/** Días en orden Lun→Dom; el índice sigue al backend (0=domingo … 6=sábado). */
const WEEKDAYS: { n: number; label: string }[] = [
  { n: 1, label: 'L' },
  { n: 2, label: 'M' },
  { n: 3, label: 'M' },
  { n: 4, label: 'J' },
  { n: 5, label: 'V' },
  { n: 6, label: 'S' },
  { n: 0, label: 'D' },
]
const PLATFORM_LABEL: Record<Device['platform'], string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
}

function ErrorText({ error }: { error: unknown }) {
  return (
    <p className="text-destructive text-sm" role="alert">
      {friendlyMessage(error)}
    </p>
  )
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground py-8 text-center text-sm">{children}</CardContent>
    </Card>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'focus-visible:ring-ring/50 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-[3px]',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span
        className={cn(
          'inline-block size-5 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

const TIME_INPUT_CLASS =
  'border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50'

/** Formulario de "no molestar" para una unidad; se reinicia al cambiar de unidad (via `key`). */
function DndForm({ initial }: { initial: QuietHours }) {
  const setDnd = useSetDnd()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [startTime, setStartTime] = useState(initial.startTime)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [days, setDays] = useState<number[]>(initial.byWeekday ?? [])

  const toggleDay = (n: number) =>
    setDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]))

  const save = () =>
    setDnd.mutate(
      { unitId: initial.unitId, enabled, startTime, endTime, byWeekday: days },
      {
        onSuccess: () => toast.success('Preferencia guardada'),
        onError: (error) => toast.error(friendlyMessage(error)),
      },
    )

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Activar "no molestar"</p>
            <p className="text-muted-foreground text-xs">Silenciar push de timbres en la franja.</p>
          </div>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">Desde</span>
            <input
              type="time"
              value={startTime}
              disabled={!enabled}
              onChange={(e) => setStartTime(e.target.value)}
              className={TIME_INPUT_CLASS}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium">Hasta</span>
            <input
              type="time"
              value={endTime}
              disabled={!enabled}
              onChange={(e) => setEndTime(e.target.value)}
              className={TIME_INPUT_CLASS}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Días (vacío = todos)</span>
          <div className="flex gap-1.5">
            {WEEKDAYS.map((day, index) => {
              const active = days.includes(day.n)
              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={active}
                  disabled={!enabled}
                  onClick={() => toggleDay(day.n)}
                  className={cn(
                    'size-8 rounded-full text-xs font-medium transition-colors disabled:opacity-50',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">Los horarios se interpretan en UTC.</span>
          <Button onClick={save} disabled={setDnd.isPending}>
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DeviceRow({ device }: { device: Device }) {
  const remove = useRemoveDevice()
  const when = device.lastSeenAt
    ? `Visto ${formatDateTime(device.lastSeenAt)}`
    : device.createdAt
      ? `Agregado ${formatDateTime(device.createdAt)}`
      : ''
  return (
    <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
      <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
        <Smartphone className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">{PLATFORM_LABEL[device.platform]}</span>
        {when && <span className="text-muted-foreground truncate text-xs">{when}</span>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Quitar dispositivo"
        disabled={remove.isPending}
        onClick={() =>
          remove.mutate(device.id, { onError: (error) => toast.error(friendlyMessage(error)) })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

/** Ajustes del residente: "no molestar" por unidad, dispositivos y cerrar sesión. */
export function SettingsPage() {
  const logout = useLogout()
  const selection = useUnitSelection()
  const { properties, units, propertyList, unitList, selectedUnitId } = selection
  const dnd = useDnd(selectedUnitId)
  const devices = useDevices()
  const deviceList = devices.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Ajustes</h1>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-medium">No molestar</h2>
          <p className="text-muted-foreground text-sm">
            Silenciá las notificaciones push de timbres en una franja horaria. El timbre se sigue
            registrando y, con la app abierta, lo ves igual.
          </p>
        </div>
        {properties.isPending ? (
          <Skeleton className="h-9 w-full" />
        ) : properties.isError ? (
          <ErrorText error={properties.error} />
        ) : propertyList.length === 0 ? (
          <EmptyCard>No tenés propiedades asociadas.</EmptyCard>
        ) : (
          <>
            <UnitPicker selection={selection} />
            {units.isPending || dnd.isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : unitList.length === 0 ? (
              <EmptyCard>Esta propiedad todavía no tiene unidades.</EmptyCard>
            ) : dnd.isError ? (
              <ErrorText error={dnd.error} />
            ) : dnd.data ? (
              <DndForm key={selectedUnitId} initial={dnd.data} />
            ) : null}
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-medium">Dispositivos</h2>
          <p className="text-muted-foreground text-sm">
            Equipos donde iniciaste sesión y reciben notificaciones push.
          </p>
        </div>
        {devices.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : devices.isError ? (
          <ErrorText error={devices.error} />
        ) : deviceList.length === 0 ? (
          <EmptyCard>No hay dispositivos registrados.</EmptyCard>
        ) : (
          <ul className="flex flex-col gap-2">
            {deviceList.map((device) => (
              <li key={device.id}>
                <DeviceRow device={device} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button variant="outline" onClick={logout}>
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    </div>
  )
}
