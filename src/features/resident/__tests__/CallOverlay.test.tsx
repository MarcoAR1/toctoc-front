import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ResidentCallOverlay } from '@/features/resident/CallOverlay'
import { useResidentCallStore } from '@/features/resident/callStore'
import type { CallSession } from '@/features/calls/types'

const { peerInstances, acceptCall, declineCall, endCall } = vi.hoisted(() => ({
  peerInstances: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
  acceptCall: vi.fn(),
  declineCall: vi.fn(),
  endCall: vi.fn(),
}))

vi.mock('@/features/calls/signaling', () => ({ acceptCall, declineCall, endCall }))
vi.mock('@/features/calls/PeerSession', () => ({
  PeerSession: vi.fn().mockImplementation(() => {
    const inst = {
      openLocalMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      acceptOffer: vi.fn().mockResolvedValue('ANSWER_SDP'),
      setAnswer: vi.fn().mockResolvedValue(undefined),
      createOffer: vi.fn().mockResolvedValue('OFFER_SDP'),
      close: vi.fn(),
    }
    peerInstances.push(inst)
    return inst
  }),
}))

const CALL = {
  id: 'c1',
  propertyId: 'p1',
  unitId: 'u1',
  media: 'video',
  initiatorKind: 'visitor',
  initiatorId: 'visitor:r1',
  initiatorLabel: 'Juan',
  status: 'ringing',
  offer: 'OFFER_SDP',
  startedAt: '2026-06-18T00:00:00Z',
} as CallSession

describe('ResidentCallOverlay', () => {
  beforeEach(() => {
    peerInstances.length = 0
    acceptCall.mockReset().mockResolvedValue({ ...CALL, status: 'active' })
    declineCall.mockReset().mockResolvedValue({ ...CALL, status: 'ended' })
    endCall.mockReset().mockResolvedValue({ ...CALL, status: 'ended' })
    useResidentCallStore.getState().clear()
  })
  afterEach(() => useResidentCallStore.getState().clear())

  it('muestra la videollamada entrante y la atiende', async () => {
    const user = userEvent.setup()
    useResidentCallStore.getState().setIncoming(CALL)
    render(<ResidentCallOverlay />)

    expect(screen.getByText('Juan')).toBeInTheDocument()
    expect(screen.getByText('Videollamada entrante')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Atender' }))

    await waitFor(() => expect(acceptCall).toHaveBeenCalledWith('c1', 'ANSWER_SDP'))
    expect(await screen.findByRole('button', { name: 'Colgar' })).toBeInTheDocument()
  })

  it('rechaza la llamada entrante', async () => {
    const user = userEvent.setup()
    useResidentCallStore.getState().setIncoming(CALL)
    render(<ResidentCallOverlay />)

    await user.click(screen.getByRole('button', { name: 'Rechazar' }))

    await waitFor(() => expect(declineCall).toHaveBeenCalledWith('c1'))
  })

  it('muestra el cierre cuando la llamada termina del otro lado', async () => {
    useResidentCallStore.getState().setIncoming(CALL)
    render(<ResidentCallOverlay />)

    useResidentCallStore.getState().applyEnded('c1', 'canceled')

    expect(await screen.findByText('Llamada finalizada')).toBeInTheDocument()
  })
})
