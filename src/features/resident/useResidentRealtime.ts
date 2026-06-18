import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { CallEndedEvent, CallIncomingEvent, CallTakenEvent } from '@/features/calls/types'
import { useAuthStore } from '@/features/auth/store'
import { useResidentCallStore } from '@/features/resident/callStore'
import { claimCommentsKey, claimKey, claimsKey, type Claim } from '@/features/resident/claims'
import { useResidentStore } from '@/features/resident/store'
import { ringKey, type Ring } from '@/features/visitor/api'
import { useSocket } from '@/realtime/useSocket'

const REASON_LABEL: Record<Ring['reason'], string> = {
  visit: 'Visita',
  delivery: 'Entrega',
  service: 'Servicio',
}

/**
 * Conecta el socket autenticado del residente (auto-une a `user:{userId}`) y vuelca los timbres
 * entrantes (`ring.created` / `ring.updated`) al store + cache de queries, con aviso visual.
 * Pensado para montarse una sola vez, en `ResidentLayout`.
 */
export function useResidentRealtime() {
  const token = useAuthStore((s) => s.accessToken)
  const { socket, connected } = useSocket(token ? { kind: 'authenticated', token } : null)
  const setConnected = useResidentStore((s) => s.setConnected)
  const upsertRing = useResidentStore((s) => s.upsertRing)
  const setIncomingCall = useResidentCallStore((s) => s.setIncoming)
  const applyCallTaken = useResidentCallStore((s) => s.applyTaken)
  const applyCallEnded = useResidentCallStore((s) => s.applyEnded)
  const queryClient = useQueryClient()

  useEffect(() => {
    setConnected(connected)
  }, [connected, setConnected])

  useEffect(() => {
    if (!socket) return
    const apply = (ring: Ring) => {
      upsertRing(ring)
      queryClient.setQueryData(ringKey(ring.id), ring)
    }
    const onCreated = (ring: Ring) => {
      apply(ring)
      const who = ring.visitorName?.trim() || 'Alguien'
      toast(`${who} está tocando el timbre`, { description: REASON_LABEL[ring.reason] })
    }
    socket.on('ring.created', onCreated)
    socket.on('ring.updated', apply)
    return () => {
      socket.off('ring.created', onCreated)
      socket.off('ring.updated', apply)
    }
  }, [socket, upsertRing, queryClient])

  useEffect(() => {
    if (!socket) return
    const onIncoming = (call: CallIncomingEvent) => {
      setIncomingCall(call)
      const who = call.initiatorLabel?.trim() || 'Alguien'
      const verb = call.media === 'video' ? 'te hace una videollamada' : 'te llama'
      toast(`${who} ${verb}`, { description: 'Llamada entrante' })
    }
    const onTaken = (e: CallTakenEvent) => applyCallTaken(e.callId)
    const onEnded = (e: CallEndedEvent) => applyCallEnded(e.callId, e.reason)
    socket.on('call.incoming', onIncoming)
    socket.on('call.taken', onTaken)
    socket.on('call.ended', onEnded)
    return () => {
      socket.off('call.incoming', onIncoming)
      socket.off('call.taken', onTaken)
      socket.off('call.ended', onEnded)
    }
  }, [socket, setIncomingCall, applyCallTaken, applyCallEnded])

  useEffect(() => {
    if (!socket) return
    const handle = (message: string) => (claim: Claim) => {
      queryClient.setQueryData(claimKey(claim.id), claim)
      queryClient.invalidateQueries({ queryKey: claimsKey(claim.propertyId) })
      queryClient.invalidateQueries({ queryKey: claimCommentsKey(claim.id) })
      toast(message, { description: claim.subject })
    }
    const events: Record<string, (claim: Claim) => void> = {
      'claim.assigned': handle('Tu reclamo fue asignado'),
      'claim.resolved': handle('Tu reclamo fue resuelto'),
      'claim.closed': handle('Tu reclamo fue cerrado'),
      'claim.reopened': handle('Tu reclamo fue reabierto'),
      'claim.cancelled': handle('Tu reclamo fue cancelado'),
      'claim.comment': handle('Nuevo comentario en tu reclamo'),
    }
    for (const [event, fn] of Object.entries(events)) socket.on(event, fn)
    return () => {
      for (const [event, fn] of Object.entries(events)) socket.off(event, fn)
    }
  }, [socket, queryClient])

  return { connected }
}
