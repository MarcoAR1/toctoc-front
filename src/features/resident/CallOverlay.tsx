import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Phone, PhoneOff, Video as VideoIcon } from 'lucide-react'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { MediaView } from '@/features/calls/MediaView'
import { PeerSession } from '@/features/calls/PeerSession'
import { acceptCall, declineCall, endCall } from '@/features/calls/signaling'
import { getIceServers } from '@/features/calls/iceServers'
import type { CallEndReason, CallSession } from '@/features/calls/types'
import { useResidentCallStore } from '@/features/resident/callStore'

type Phase = 'incoming' | 'connecting' | 'active' | 'ended' | 'error'

/**
 * Overlay de llamada en vivo del residente (callee). Se monta una vez en `ResidentLayout` y
 * sólo dibuja algo cuando hay una llamada en el store (alimentado por `useResidentRealtime`).
 */
export function ResidentCallOverlay() {
  const call = useResidentCallStore((s) => s.call)
  const endSignal = useResidentCallStore((s) => s.endSignal)
  const clear = useResidentCallStore((s) => s.clear)
  if (!call) return null
  const end = endSignal && endSignal.callId === call.id ? endSignal : undefined
  return <CallSurface key={call.id} call={call} endSignal={end} onClose={clear} />
}

function CallSurface({
  call,
  endSignal,
  onClose,
}: {
  call: CallSession
  endSignal?: { callId: string; reason?: CallEndReason }
  onClose: () => void
}) {
  const [phase, setPhase] = useState<Phase>('incoming')
  const [error, setError] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream>()
  const [remoteStream, setRemoteStream] = useState<MediaStream>()
  const peerRef = useRef<PeerSession | null>(null)
  const isVideo = call.media === 'video'

  const teardown = useCallback(() => {
    peerRef.current?.close()
    peerRef.current = null
    setLocalStream(undefined)
    setRemoteStream(undefined)
  }, [])

  // Cierre del peer al desmontar el surface (cambia la llamada o se limpia el store).
  useEffect(() => {
    return () => {
      peerRef.current?.close()
      peerRef.current = null
    }
  }, [])

  // Fin remoto (`call.ended`): cortamos el medio y mostramos el cierre un instante.
  useEffect(() => {
    if (!endSignal) return
    teardown()
    setPhase('ended')
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [endSignal, teardown, onClose])

  const accept = useCallback(async () => {
    if (!call.offer) {
      setError('La llamada no trae una oferta válida.')
      setPhase('error')
      return
    }
    setPhase('connecting')
    setError(null)
    try {
      const peer = new PeerSession({
        iceServers: getIceServers(),
        media: call.media,
        onRemoteStream: setRemoteStream,
      })
      peerRef.current = peer
      setLocalStream(await peer.openLocalMedia())
      const answer = await peer.acceptOffer(call.offer)
      await acceptCall(call.id, answer)
      setPhase('active')
    } catch (err) {
      teardown()
      setError(friendlyMessage(err))
      setPhase('error')
    }
  }, [call, teardown])

  const decline = useCallback(async () => {
    try {
      await declineCall(call.id)
    } catch {
      // si ya no estaba sonando, igual cerramos
    }
    teardown()
    onClose()
  }, [call.id, teardown, onClose])

  const hangUp = useCallback(async () => {
    try {
      await endCall(call.id)
    } catch {
      // si ya estaba terminada, igual cerramos
    }
    teardown()
    onClose()
  }, [call.id, teardown, onClose])

  const caller =
    call.initiatorLabel?.trim() || (call.initiatorKind === 'visitor' ? 'Visitante' : 'Llamada')

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
              <p className="text-lg font-medium">{caller}</p>
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
            onClick={hangUp}
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
      : phase === 'ended'
        ? 'Llamada finalizada'
        : phase === 'error'
          ? 'No se pudo conectar'
          : isVideo
            ? 'Videollamada entrante'
            : 'Llamada entrante'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-neutral-950 p-6 text-center text-white">
      <div className="flex flex-col items-center gap-3">
        <span className="relative flex size-20 items-center justify-center rounded-full bg-white/10">
          {phase === 'incoming' && (
            <span className="absolute inset-0 animate-ping rounded-full bg-white/10" />
          )}
          {isVideo ? (
            <VideoIcon className="size-9" aria-hidden="true" />
          ) : (
            <Phone className="size-9" aria-hidden="true" />
          )}
        </span>
        <p className="text-xl font-semibold">{caller}</p>
        <p className="text-sm text-white/60">{subtitle}</p>
        {phase === 'error' && error && <p className="max-w-xs text-sm text-red-300">{error}</p>}
      </div>

      {phase === 'connecting' && (
        <div className="flex items-center gap-2 text-white/70">
          <Spinner className="size-5" />
          Conectando…
        </div>
      )}

      {phase === 'ended' && (
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      )}

      {phase === 'error' && (
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={accept}>
            Reintentar
          </Button>
        </div>
      )}

      {phase === 'incoming' && (
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={decline}
            aria-label="Rechazar"
            className="flex size-16 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
          >
            <PhoneOff className="size-7" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={accept}
            aria-label="Atender"
            className="flex size-16 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700"
          >
            <Phone className="size-7" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
