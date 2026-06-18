import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Ban, BellRing, CircleCheck, CircleX, Clock, Phone, Video } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import type { CallMedia } from '@/features/calls/types'
import { ringKey, useCancelRing, useRing, type Ring } from '@/features/visitor/api'
import { VisitorCallPanel } from '@/features/visitor/VisitorCallPanel'
import { useSocket } from '@/realtime/useSocket'

/** Seguimiento del timbre tras tocarlo: estado en vivo, cancelar y desenlace. */
export function RingWaitingPage() {
  const { ringId } = useParams()
  const ring = useRing(ringId)
  const cancel = useCancelRing()
  const queryClient = useQueryClient()
  const { socket } = useSocket({ kind: 'anonymous' })
  const [callMedia, setCallMedia] = useState<CallMedia | null>(null)

  // Suscripción por socket (instantáneo); el polling de `useRing` es el respaldo.
  useEffect(() => {
    if (!socket || !ringId) return
    const subscribe = () => socket.emit('ring:subscribe', ringId)
    const onUpdate = (updated: Ring) => {
      if (updated?.id === ringId) queryClient.setQueryData(ringKey(ringId), updated)
    }
    subscribe()
    socket.on('connect', subscribe) // re-suscribir tras reconexión: el room se pierde
    socket.on('ring.updated', onUpdate)
    return () => {
      socket.emit('ring:unsubscribe', ringId)
      socket.off('connect', subscribe)
      socket.off('ring.updated', onUpdate)
    }
  }, [socket, ringId, queryClient])

  if (ring.isLoading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Spinner className="size-4" />
          Conectando…
        </CardContent>
      </Card>
    )
  }

  if (ring.isError || !ring.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No encontramos el timbre</CardTitle>
          <CardDescription>
            {ring.error ? friendlyMessage(ring.error) : 'Puede haber expirado.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/r">Volver a empezar</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const status = ring.data.status

  const callPanel = callMedia ? (
    <VisitorCallPanel ringId={ringId!} media={callMedia} onClose={() => setCallMedia(null)} />
  ) : null
  const callActions = (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1 gap-2" onClick={() => setCallMedia('audio')}>
        <Phone className="size-4" aria-hidden="true" />
        Llamar
      </Button>
      <Button variant="outline" className="flex-1 gap-2" onClick={() => setCallMedia('video')}>
        <Video className="size-4" aria-hidden="true" />
        Video
      </Button>
    </div>
  )

  if (status === 'ringing') {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <span className="bg-primary/10 text-primary relative mb-1 flex size-16 items-center justify-center rounded-full">
            <span className="bg-primary/20 absolute inset-0 animate-ping rounded-full" />
            <BellRing className="size-7" aria-hidden="true" />
          </span>
          <CardTitle>Tocando el timbre…</CardTitle>
          <CardDescription>Esperando que atiendan. No cierres esta pantalla.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {callActions}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => cancel.mutate(ringId!)}
            disabled={cancel.isPending}
          >
            {cancel.isPending && <Spinner className="size-4" />}
            Cancelar
          </Button>
          {callPanel}
        </CardContent>
      </Card>
    )
  }

  const result = {
    answered: {
      Icon: CircleCheck,
      title: 'Te están atendiendo',
      description: 'El residente respondió. Aguardá en la puerta.',
      className: 'bg-emerald-500/10 text-emerald-600',
    },
    rejected: {
      Icon: CircleX,
      title: 'No pueden atender',
      description: 'El residente no puede atender en este momento.',
      className: 'bg-destructive/10 text-destructive',
    },
    timeout: {
      Icon: Clock,
      title: 'Nadie respondió',
      description: 'No hubo respuesta. Probá de nuevo en un rato.',
      className: 'bg-amber-500/10 text-amber-600',
    },
    cancelled: {
      Icon: Ban,
      title: 'Timbre cancelado',
      description: 'Cancelaste el timbre.',
      className: 'bg-muted text-muted-foreground',
    },
  }[status]

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <span
          className={`mb-1 flex size-16 items-center justify-center rounded-full ${result.className}`}
        >
          <result.Icon className="size-7" aria-hidden="true" />
        </span>
        <CardTitle>{result.title}</CardTitle>
        <CardDescription>{result.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === 'answered' && callActions}
        <Button asChild variant="outline" className="w-full">
          <Link to="/r">Tocar de nuevo</Link>
        </Button>
        {callPanel}
      </CardContent>
    </Card>
  )
}
