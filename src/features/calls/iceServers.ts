import { config } from '@/config/env'

/**
 * Mapea `config.iceServers` (parseado de `VITE_ICE_SERVERS`) al shape que espera
 * `RTCPeerConnection`. Sin configuración, `config` ya provee un STUN público por defecto.
 */
export function getIceServers(): RTCIceServer[] {
  return config.iceServers.map((server) =>
    server.username && server.credential
      ? { urls: server.urls, username: server.username, credential: server.credential }
      : { urls: server.urls },
  )
}
