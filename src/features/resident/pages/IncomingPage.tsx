import { BellRing, Check, DoorOpen, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/features/auth/store'
import { useAnswerRing, useOpenDoor, useRejectRing } from '@/features/resident/api'
import { useResidentStore } from '@/features/resident/store'
import { useRing, type Ring } from '@/features/visitor/api'
import { cn } from '@/lib/utils'

const REASON_LABEL: Record<Ring['reason'], string> = {
  visit: 'Visita',
  delivery: 'Entrega',
  service: 'Servicio',
}

/** Cabecera con la foto/avatar del visitante, su nombre y el motivo del timbre. */
function VisitorHeader({ ring }: { ring: Ring }) {
  const visitorName = ring.visitorName?.trim() || 'Visitante'
  return (
    <CardHeader className="items-center text-center">
      {ring.photoUrl ? (
        <img
          src={ring.photoUrl}
          alt={visitorName}
          className="size-24 rounded-full border object-cover"
        />
      ) : (
        <span className="bg-primary/10 text-primary flex size-24 items-center justify-center rounded-full">
          <BellRing className="size-10" aria-hidden="true" />
        </span>
      )}
      <CardTitle>{visitorName}</CardTitle>
      <CardDescription>{REASON_LABEL[ring.reason]}</CardDescription>
    </CardHeader>
  )
}

function BackHome() {
  return (
    <Button asChild variant="outline" className="w-full">
      <Link to="/app">Volver al inicio</Link>
    </Button>
  )
}

/** Pantalla crítica del residente: timbre entrante. Atender, rechazar o abrir la puerta. */
export function IncomingPage() {
  const { id } = useParams()
  const fromStore = useResidentStore((s) => (id ? s.rings[id] : undefined))
  const ringQuery = useRing(id)
  const ring = fromStore ?? ringQuery.data

  const answer = useAnswerRing()
  const reject = useRejectRing()
  const openDoor = useOpenDoor()
  const myId = useAuthStore((s) => s.user?.id)

  if (!ring) {
    if (ringQuery.isLoading) {
      return (
        <Card>
          <CardContent className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
            <Spinner className="size-4" />
            Cargando el timbre…
          </CardContent>
        </Card>
      )
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle>No encontramos el timbre</CardTitle>
          <CardDescription>Puede haberse resuelto o expirado.</CardDescription>
        </CardHeader>
        <CardContent>
          <BackHome />
        </CardContent>
      </Card>
    )
  }

  const busy = answer.isPending || reject.isPending || openDoor.isPending
  const openHere = () =>
    openDoor.mutate({ propertyId: ring.propertyId, unitId: ring.unitId, ringId: ring.id })
  const actionError = answer.error ?? reject.error

  if (ring.status === 'ringing') {
    return (
      <Card>
        <VisitorHeader ring={ring} />
        <CardContent className="flex flex-col gap-3">
          {ring.message && (
            <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
              “{ring.message}”
            </p>
          )}
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => answer.mutate(ring.id, { onSuccess: openHere })}
          >
            {busy ? <Spinner className="size-4" /> : <DoorOpen className="size-4" />}
            Atender y abrir
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={busy} onClick={() => answer.mutate(ring.id)}>
              <Check className="size-4" />
              Atender
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => reject.mutate(ring.id)}>
              <X className="size-4" />
              Rechazar
            </Button>
          </div>
          {actionError && (
            <p className="text-destructive text-sm" role="alert">
              {friendlyMessage(actionError)}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (ring.status === 'answered') {
    const mine = ring.answeredBy && myId && ring.answeredBy === myId
    return (
      <Card>
        <VisitorHeader ring={ring} />
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-center text-sm">
            {mine ? 'Atendiste este timbre.' : 'Atendido por otra persona.'}
          </p>
          <Button className="w-full" disabled={openDoor.isPending} onClick={openHere}>
            {openDoor.isPending ? <Spinner className="size-4" /> : <DoorOpen className="size-4" />}
            Abrir puerta
          </Button>
          {openDoor.data && (
            <p
              className={cn(
                'text-center text-sm',
                openDoor.data.result === 'opened' ? 'text-emerald-600' : 'text-destructive',
              )}
              role="status"
            >
              {openDoor.data.result === 'opened'
                ? 'Puerta abierta.'
                : openDoor.data.result === 'denied'
                  ? 'Apertura denegada.'
                  : 'No se pudo abrir (error del lector).'}
            </p>
          )}
          {openDoor.isError && (
            <p className="text-destructive text-center text-sm" role="alert">
              {friendlyMessage(openDoor.error)}
            </p>
          )}
          <BackHome />
        </CardContent>
      </Card>
    )
  }

  // Estados terminales sin acciones: rejected | timeout | cancelled.
  const closed: Record<Exclude<Ring['status'], 'ringing' | 'answered'>, string> = {
    rejected: 'El timbre fue rechazado.',
    timeout: 'Nadie llegó a tiempo.',
    cancelled: 'El visitante canceló.',
  }
  return (
    <Card>
      <VisitorHeader ring={ring} />
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-center text-sm">{closed[ring.status]}</p>
        <BackHome />
      </CardContent>
    </Card>
  )
}
