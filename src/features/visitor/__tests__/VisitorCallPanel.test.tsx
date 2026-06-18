import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { VisitorCallPanel } from '@/features/visitor/VisitorCallPanel'

const { socketHandlers, disconnect, issueVisitorToken, startVisitorCall, endVisitorCall, peerInstances } =
  vi.hoisted(() => ({
    socketHandlers: new Map<string, (...args: unknown[]) => void>(),
    disconnect: vi.fn(),
    issueVisitorToken: vi.fn(),
    startVisitorCall: vi.fn(),
    endVisitorCall: vi.fn(),
    peerInstances: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
  }))

vi.mock('@/features/calls/signaling', () => ({ issueVisitorToken, startVisitorCall, endVisitorCall }))
vi.mock('@/realtime/socket', () => ({
  createSocket: () => ({
    on: (event: string, cb: (...args: unknown[]) => void) => socketHandlers.set(event, cb),
    off: vi.fn(),
    disconnect,
  }),
}))
vi.mock('@/features/calls/PeerSession', () => ({
  PeerSession: vi.fn().mockImplementation(() => {
    const inst = {
      openLocalMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
      createOffer: vi.fn().mockResolvedValue('OFFER_SDP'),
      setAnswer: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
    }
    peerInstances.push(inst)
    return inst
  }),
}))

describe('VisitorCallPanel', () => {
  beforeEach(() => {
    socketHandlers.clear()
    peerInstances.length = 0
    disconnect.mockReset()
    issueVisitorToken
      .mockReset()
      .mockResolvedValue({ token: 'vt', expiresIn: 600, propertyId: 'p1', unitId: 'u1', ringId: 'r1' })
    startVisitorCall.mockReset().mockResolvedValue({ id: 'c1', status: 'ringing' })
    endVisitorCall.mockReset().mockResolvedValue({ id: 'c1', status: 'ended' })
  })
  afterEach(() => socketHandlers.clear())

  it('inicia la llamada, conecta al ser atendida y permite colgar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<VisitorCallPanel ringId="r1" media="audio" onClose={onClose} />)

    expect(await screen.findByText(/Llamando/)).toBeInTheDocument()
    await waitFor(() => expect(startVisitorCall).toHaveBeenCalledWith('vt', 'audio', 'OFFER_SDP'))

    await act(async () => {
      socketHandlers.get('call.accepted')?.({
        callId: 'c1',
        answeredBy: 'u9',
        answer: 'ANS',
        call: { id: 'c1' },
      })
    })

    expect(await screen.findByRole('button', { name: 'Colgar' })).toBeInTheDocument()
    expect(peerInstances[0].setAnswer).toHaveBeenCalledWith('ANS')

    await user.click(screen.getByRole('button', { name: 'Colgar' }))
    expect(onClose).toHaveBeenCalled()
  })
})
