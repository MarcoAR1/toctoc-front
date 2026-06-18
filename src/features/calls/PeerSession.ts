import type { CallMedia } from './types'

export interface PeerSessionConfig {
  iceServers: RTCIceServer[]
  media: CallMedia
  /** Se invoca cuando llega el stream remoto (audio/video del otro peer). */
  onRemoteStream?: (stream: MediaStream) => void
  /** Cambios de estado de la conexión (connecting/connected/failed/...). */
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  /** Tope de espera de la recolección de candidatos ICE (ms). */
  gatheringTimeoutMs?: number
}

const DEFAULT_GATHERING_TIMEOUT_MS = 2500

/**
 * Espera a que `RTCPeerConnection` termine de juntar candidatos ICE (o hasta `timeoutMs`).
 * Usamos ICE "no-trickle": el SDP que mandamos ya lleva los candidatos embebidos, así que el
 * servidor sólo retransmite offer/answer (no hace falta el canal de `/ice`).
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      pc.removeEventListener('icegatheringstatechange', onChange)
      resolve()
    }
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') finish()
    }
    const timer = setTimeout(finish, timeoutMs)
    pc.addEventListener('icegatheringstatechange', onChange)
  })
}

/**
 * Envoltura mínima de `RTCPeerConnection` para una llamada 1‑a‑1 (sin trickle ICE).
 * Independiente de React para poder testearla con un `RTCPeerConnection` mockeado.
 *
 * - caller:  `openLocalMedia()` → `createOffer()` → (envío del offer) → `setAnswer(answer)`.
 * - callee:  `openLocalMedia()` → `acceptOffer(offer)` (devuelve el answer a enviar).
 */
export class PeerSession {
  readonly pc: RTCPeerConnection
  private local?: MediaStream
  private remote?: MediaStream
  private readonly gatheringTimeoutMs: number

  constructor(private readonly cfg: PeerSessionConfig) {
    this.gatheringTimeoutMs = cfg.gatheringTimeoutMs ?? DEFAULT_GATHERING_TIMEOUT_MS
    this.pc = new RTCPeerConnection({ iceServers: cfg.iceServers })
    this.pc.addEventListener('track', (event) => {
      const [stream] = (event as RTCTrackEvent).streams
      if (stream) {
        this.remote = stream
        this.cfg.onRemoteStream?.(stream)
      }
    })
    this.pc.addEventListener('connectionstatechange', () => {
      this.cfg.onConnectionStateChange?.(this.pc.connectionState)
    })
  }

  get localStream(): MediaStream | undefined {
    return this.local
  }

  get remoteStream(): MediaStream | undefined {
    return this.remote
  }

  /** Pide cámara/micrófono según el medio y agrega las pistas a la conexión. */
  async openLocalMedia(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: this.cfg.media === 'video',
    })
    this.local = stream
    for (const track of stream.getTracks()) this.pc.addTrack(track, stream)
    return stream
  }

  /** caller: crea el offer, lo fija como descripción local y espera los candidatos. */
  async createOffer(): Promise<string> {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    await waitForIceGathering(this.pc, this.gatheringTimeoutMs)
    return this.pc.localDescription?.sdp ?? offer.sdp ?? ''
  }

  /** callee: aplica el offer remoto y devuelve el SDP answer (con candidatos embebidos). */
  async acceptOffer(offerSdp: string): Promise<string> {
    await this.pc.setRemoteDescription({ type: 'offer', sdp: offerSdp })
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    await waitForIceGathering(this.pc, this.gatheringTimeoutMs)
    return this.pc.localDescription?.sdp ?? answer.sdp ?? ''
  }

  /** caller: aplica el answer remoto recibido por `call.accepted`. */
  async setAnswer(answerSdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
  }

  /** Corta el medio local y cierra la conexión. Idempotente. */
  close(): void {
    this.local?.getTracks().forEach((track) => track.stop())
    this.local = undefined
    try {
      this.pc.close()
    } catch {
      // la conexión ya estaba cerrada
    }
  }
}
