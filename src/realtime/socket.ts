import { io, type Socket } from 'socket.io-client'

import { config } from '@/config/env'

export type SocketAuth =
  /** Residente/admin con JWT, o visitante con su token efímero de llamada. */
  | { kind: 'authenticated'; token: string }
  /** Visitante anónimo: sigue un timbre vía `ring:subscribe`. */
  | { kind: 'anonymous' }

/**
 * Crea un socket TocToc según la persona. Socket.IO reconecta solo;
 * al evento `connect` hay que re-suscribirse a los rooms efímeros (`ring:subscribe`).
 */
export function createSocket(auth: SocketAuth): Socket {
  return io(config.apiUrl, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    ...(auth.kind === 'authenticated' ? { auth: { token: auth.token } } : {}),
  })
}
