import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'

import { createSocket, type SocketAuth } from '@/realtime/socket'

/**
 * Crea y mantiene un socket durante la vida del componente.
 * Pasá `null` para no conectar (p. ej. mientras no hay sesión).
 */
export function useSocket(auth: SocketAuth | null): { socket: Socket | null; connected: boolean } {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  // Clave estable para re-crear el socket sólo cuando cambia la identidad.
  const authKey = auth ? JSON.stringify(auth) : null

  useEffect(() => {
    if (!auth) {
      setSocket(null)
      setConnected(false)
      return
    }
    const s = createSocket(auth)
    setSocket(s)
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.disconnect()
    }
    // authKey resume la identidad de `auth`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey])

  return { socket, connected }
}
