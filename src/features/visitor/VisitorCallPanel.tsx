import { useEffect, useRef, useState } from 'react'
import { Mic, PhoneOff, Video as VideoIcon } from 'lucide-react'
import type { Socket } from 'socket.io-client'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { MediaView } from '@/features/calls/MediaView'
import { PeerSession } from '@/features/calls/PeerSession'
import { endVisitorCall, issueVisitorToken, startVisitorCall } from '@/features/calls/signaling'
import { getIceServers } from '@/features/calls/iceServers'
import type { CallAcceptedEvent, CallMedia } from '@/features/calls/types'
import { createSocket } from '@/realtime/socket'

type Phase = 'connecting' | 'ringing' | 'active' | 'ended' | 'error'

interface VisitorCallPanelProps {
  ringId: string
  media: CallMedia
  onClose: () => void
}

/**
 * Llamada en vivo del visitante (caller). Pide un token efímero atado al timbre, abre el
 * micrófono/cámara, manda el offer (`POST /calls/visitor`) y espera `call.accepted` por un socket
 * autenticado con ese token (room `user:visitor:{ringId}`). Al desmontar corta y cuelga la llamada.
 */
export function VisitorCallPanel({ ringId, media, onClose }: VisitorCallPanelProps) {
  const [phase, setPhase] = useState<Phase>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream>()
  const [remoteStream, setRemoteStream] = useState<MediaStream>()
  const callIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const isVideo = media === 'video'

  useEffect(() => {
    let cancelled = false
    let socket: Socket | null = null
    const peer = new PeerSession({
      iceServers: getIceServers(),
      media,
      onRemoteStream: (stream) => {
        if (!cancelled) setRemoteStream(stream)
      },
    })

    const finishRemotely = () => {
      if (cancelled) return
      setPhase('ended')
      setTimeout(() => {
        if (!cancelled) onClose()
      }, 2000)
    }

    async function run() {
      try {
        setPhase('connecting')
        setError(null)
        const visitorToken = await issueVisitorToken(ringId)
        if (cancelled) return
        tokenRef.current = visitorToken.token

        socket = createSocket({ kind: 'authenticated', token: visitorToken.token })
        socket.on('call.accepted', (event: CallAcceptedEvent) => {
          peer
            .setAnswer(event.answer)
            .then(() => {
              if (!cancelled) setPhase('active')
            })
            .catch(() => {
              /* descriptor inválido: el peer reportará el fallo de conexión */
            })
        })
        socket.on('call.declined', finishRemotely)
        socket.on('call.ended', finishRemotely)

        setLocalStream(await peer.openLocalMedia())
        if (cancelled) return
        const offer = await peer.createOffer()
        if (cancelled) return
        const call = await startVisitorCall(visitorToken.token, media, offer)
        if (cancelled) return
        callIdRef.current = call.id
        setPhase('ringing')
      } catch (err) {
        if (!cancelled) {
          setError(friendlyMessage(err))
          setPhase('error')
        }
      }
    }
    void run()

    return () => {
      cancelled = true
      socket?.disconnect()
      const callId = callIdRef.current
      const token = tokenRef.current
      if (callId && token) void endVisitorCall(token, callId).catch(() => undefined)
      peer.close()
    }
    // ringId/media identifican la llamada; el resto se maneja por refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringId, media])

  if (phase === 'active') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white">
        <div className="relative flex-1 overflow-hidden">
          <MediaView
            stream={remoteStream}
            className={
              isVideo
                ? 'h-full w-full bg-neutral-900 object-cover'
                : 'pointer-events-none absolute size-0 opacity-0'
            }
          />
          {!isVideo && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <span className="flex size-20 items-center justify-center rounded-full bg-white/10">
                <Mic className="size-9" aria-hidden="true" />
              </span>
              <p className="text-sm text-white/60">En llamada</p>
            </div>
          )}
          {isVideo && localStream && (
            <MediaView
              stream={localStream}
              muted
              className="absolute right-3 top-3 h-32 w-24 rounded-lg border border-white/20 object-cover shadow-lg"
            />
          )}
        </div>
        <div className="flex items-center justify-center p-6">
          <Button
            variant="destructive"
            size="lg"
            className="gap-2 rounded-full px-8"
            onClick={onClose}
            aria-label="Colgar"
          >
            <PhoneOff className="size-5" aria-hidden="true" />
            Colgar
          </Button>
        </div>
      </div>
    )
  }

  const subtitle =
    phase === 'connecting'
      ? 'Conectando…'
      : phase === 'ringing'
        ? 'Llamando… esperá que atiendan'
        : phase === 'ended'
          ? 'Llamada finalizada'
          : 'No se pudo conectar'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-neutral-950 p-6 text-center text-white">
      <div className="flex flex-col items-center gap-3">
        <span className="relative flex size-20 items-center justify-center rounded-full bg-white/10">
          {phase === 'ringing' && (
            <span className="absolute inset-0 animate-ping rounded-full bg-white/10" />
          )}
          {isVideo ? (
            <VideoIcon className="size-9" aria-hidden="true" />
          ) : (
            <Mic className="size-9" aria-hidden="true" />
          )}
        </span>
        <p className="text-sm text-white/60">{subtitle}</p>
        {phase === 'error' && error && <p className="max-w-xs text-sm text-red-300">{error}</p>}
      </div>

      {(phase === 'connecting' || phase === 'ringing') && (
        <div className="flex flex-col items-center gap-6">
          <Spinner className="size-6 text-white/70" />
          <Button variant="destructive" className="gap-2" onClick={onClose} aria-label="Cancelar">
            <PhoneOff className="size-4" aria-hidden="true" />
            Cancelar
          </Button>
        </div>
      )}

      {(phase === 'ended' || phase === 'error') && (
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      )}
    </div>
  )
}
