import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { claimsBoardPrefix } from '@/features/admin/claims'
import { useAuthStore } from '@/features/auth/store'
import { claimCommentsKey, claimKey, type Claim } from '@/features/resident/claims'
import { useSocket } from '@/realtime/useSocket'

/**
 * Conecta el socket autenticado del admin (auto-une a `user:{userId}`) y refresca el board y el hilo
 * de reclamos ante los eventos `claim.*` que recibe: nuevos reclamos (→ admins), asignaciones,
 * reaperturas/cancelaciones y comentarios. El payload de cada evento es el `Claim` actualizado.
 *
 * Pensado para montarse una sola vez, en `AdminLayout`.
 */
export function useAdminRealtime() {
  const token = useAuthStore((s) => s.accessToken)
  const { socket, connected } = useSocket(token ? { kind: 'authenticated', token } : null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!socket) return
    const refresh = (claim: Claim) => {
      queryClient.setQueryData(claimKey(claim.id), claim)
      queryClient.invalidateQueries({ queryKey: claimsBoardPrefix(claim.propertyId) })
      queryClient.invalidateQueries({ queryKey: claimCommentsKey(claim.id) })
    }
    const notify = (message: string) => (claim: Claim) => {
      refresh(claim)
      toast(message, { description: claim.subject })
    }
    const events: Record<string, (claim: Claim) => void> = {
      'claim.created': notify('Nuevo reclamo'),
      'claim.assigned': refresh,
      'claim.resolved': refresh,
      'claim.closed': refresh,
      'claim.reopened': refresh,
      'claim.cancelled': refresh,
      'claim.comment': notify('Nuevo comentario en un reclamo'),
    }
    for (const [event, fn] of Object.entries(events)) socket.on(event, fn)
    return () => {
      for (const [event, fn] of Object.entries(events)) socket.off(event, fn)
    }
  }, [socket, queryClient])

  return { connected }
}
