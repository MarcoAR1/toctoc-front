import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuthStore } from '@/features/auth/store'
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

  return { connected }
}
