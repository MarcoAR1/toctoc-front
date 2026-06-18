import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PeerSession } from '@/features/calls/PeerSession'

/** `RTCPeerConnection` falso: la recolección ICE "completa" tras fijar la descripción local. */
class FakePeerConnection extends EventTarget {
  iceGatheringState: RTCIceGatheringState = 'new'
  connectionState: RTCPeerConnectionState = 'new'
  localDescription: RTCSessionDescriptionInit | null = null
  remoteDescription: RTCSessionDescriptionInit | null = null
  readonly tracks: MediaStreamTrack[] = []

  constructor(_config?: RTCConfiguration) {
    super()
  }
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'OFFER' }
  }
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'ANSWER' }
  }
  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = { ...desc }
    setTimeout(() => {
      this.iceGatheringState = 'complete'
      this.dispatchEvent(new Event('icegatheringstatechange'))
    }, 0)
  }
  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = { ...desc }
  }
  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track)
  }
  close(): void {}
}

let getUserMedia: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubGlobal('RTCPeerConnection', FakePeerConnection as unknown as typeof RTCPeerConnection)
  getUserMedia = vi.fn().mockResolvedValue({
    getTracks: () => [{ kind: 'audio' } as MediaStreamTrack],
  })
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PeerSession (WebRTC, ICE no-trickle)', () => {
  it('createOffer fija la descripción local y espera la recolección ICE', async () => {
    const peer = new PeerSession({ iceServers: [], media: 'audio' })
    const sdp = await peer.createOffer()
    expect(sdp).toBe('OFFER')
    expect(peer.pc.localDescription?.type).toBe('offer')
  })

  it('acceptOffer aplica el offer remoto y devuelve el answer', async () => {
    const peer = new PeerSession({ iceServers: [], media: 'video' })
    const answer = await peer.acceptOffer('REMOTE_OFFER')
    expect(answer).toBe('ANSWER')
    expect(peer.pc.remoteDescription?.sdp).toBe('REMOTE_OFFER')
    expect(peer.pc.localDescription?.type).toBe('answer')
  })

  it('openLocalMedia pide video sólo en llamadas de video', async () => {
    const peer = new PeerSession({ iceServers: [], media: 'audio' })
    await peer.openLocalMedia()
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false })
  })

  it('setAnswer fija la descripción remota (caller)', async () => {
    const peer = new PeerSession({ iceServers: [], media: 'audio' })
    await peer.setAnswer('REMOTE_ANSWER')
    expect(peer.pc.remoteDescription?.sdp).toBe('REMOTE_ANSWER')
  })
})
