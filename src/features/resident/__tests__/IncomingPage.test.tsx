import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IncomingPage } from '@/features/resident/pages/IncomingPage'
import { useAuthStore } from '@/features/auth/store'
import { useResidentStore } from '@/features/resident/store'
import type { Ring } from '@/features/visitor/api'

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { GET: getMock, POST: postMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))

function ring(overrides: Partial<Ring> = {}): Ring {
  return {
    id: 'r1',
    propertyId: 'p1',
    unitId: 'u1',
    reason: 'visit',
    status: 'ringing',
    visitorName: 'Juan',
    ...overrides,
  }
}

function renderIncoming() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/incoming/r1']}>
        <Routes>
          <Route path="/app/incoming/:id" element={<IncomingPage />} />
          <Route path="/app" element={<div>inicio</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('IncomingPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    useAuthStore.setState({ accessToken: 't', user: { id: 'me', email: 'me@ejemplo.com' } })
    useResidentStore.getState().reset()
  })
  afterEach(() => useResidentStore.getState().reset())

  it('atiende el timbre y luego abre la puerta', async () => {
    useResidentStore.setState({ rings: { r1: ring() } })
    getMock.mockResolvedValue({ data: ring() })
    postMock.mockImplementation((path: string) => {
      if (path === '/rings/{ringId}/answer')
        return Promise.resolve({ data: ring({ status: 'answered', answeredBy: 'me' }) })
      if (path === '/access/open')
        return Promise.resolve({
          data: { id: 'a1', type: 'door', propertyId: 'p1', openedBy: 'me', method: 'remote', result: 'opened' },
        })
      return Promise.resolve({ data: {} })
    })
    const user = userEvent.setup()
    renderIncoming()

    await user.click(screen.getByRole('button', { name: /^atender$/i }))

    expect(await screen.findByText(/atendiste este timbre/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /abrir puerta/i }))

    expect(await screen.findByText(/puerta abierta/i)).toBeInTheDocument()
    expect(postMock).toHaveBeenCalledWith('/rings/{ringId}/answer', {
      params: { path: { ringId: 'r1' } },
    })
    expect(postMock).toHaveBeenCalledWith('/access/open', {
      body: { propertyId: 'p1', unitId: 'u1', ringId: 'r1' },
    })
  })

  it('avisa cuando otro residente ya atendió', () => {
    useResidentStore.setState({ rings: { r1: ring({ status: 'answered', answeredBy: 'other' }) } })
    getMock.mockResolvedValue({ data: ring({ status: 'answered', answeredBy: 'other' }) })
    renderIncoming()

    expect(screen.getByText(/atendido por otra persona/i)).toBeInTheDocument()
  })
})
