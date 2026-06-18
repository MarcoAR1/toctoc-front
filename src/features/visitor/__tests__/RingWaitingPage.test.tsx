import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RingWaitingPage } from '@/features/visitor/pages/RingWaitingPage'

// Cliente HTTP mockeado: GET resuelve el estado del timbre.
const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { GET: getMock, POST: postMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))
// Sin socket real en tests: el seguimiento cae al polling de la query.
vi.mock('@/realtime/useSocket', () => ({ useSocket: () => ({ socket: null, connected: false }) }))

const baseRing = { id: 'r123', propertyId: 'p1', unitId: 'u1', reason: 'visit' }

function renderWaiting() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/ring/r123']}>
        <Routes>
          <Route path="/ring/:ringId" element={<RingWaitingPage />} />
          <Route path="/r" element={<div>inicio</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RingWaitingPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('muestra "Tocando el timbre" y el botón cancelar mientras suena', async () => {
    getMock.mockResolvedValue({ data: { ...baseRing, status: 'ringing' } })
    renderWaiting()

    expect(await screen.findByText(/tocando el timbre/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('muestra el desenlace cuando el residente atiende', async () => {
    getMock.mockResolvedValue({ data: { ...baseRing, status: 'answered' } })
    renderWaiting()

    expect(await screen.findByText(/te están atendiendo/i)).toBeInTheDocument()
  })
})
