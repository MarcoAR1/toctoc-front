import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ClaimDetailPage } from '@/features/resident/pages/ClaimDetailPage'

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { GET: getMock, POST: postMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: { user: { id: string } }) => unknown) => selector({ user: { id: 'me' } }),
}))

const CLAIM = {
  id: 'cl1',
  propertyId: 'p1',
  unitId: 'u1',
  filedBy: 'me',
  category: 'maintenance',
  subject: 'Gotera en la cocina',
  description: 'Hay una gotera sobre la cocina',
  priority: 'high',
  status: 'open',
  createdAt: '2026-06-10T10:00:00Z',
}
const COMMENTS = [
  { id: 'm1', claimId: 'cl1', authorId: 'me', body: 'Sigue empeorando', internal: false, createdAt: '2026-06-10T11:00:00Z' },
  { id: 'm2', claimId: 'cl1', authorId: 'admin', body: 'Vamos a revisarlo', internal: false, createdAt: '2026-06-10T12:00:00Z' },
]

function mockGet(claim: Record<string, unknown> = CLAIM) {
  getMock.mockImplementation((path: string) => {
    switch (path) {
      case '/claims/{claimId}':
        return Promise.resolve({ data: claim })
      case '/claims/{claimId}/comments':
        return Promise.resolve({ data: COMMENTS })
      default:
        return Promise.resolve({ data: [] })
    }
  })
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/claims/cl1']}>
        <Routes>
          <Route path="/app/claims/:claimId" element={<ClaimDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClaimDetailPage', () => {
  beforeEach(() => {
    mockGet()
    postMock.mockReset()
  })
  afterEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('muestra el detalle y el hilo de comentarios', async () => {
    renderPage()

    expect(await screen.findByText('Gotera en la cocina')).toBeInTheDocument()
    expect(screen.getByText('Hay una gotera sobre la cocina')).toBeInTheDocument()
    expect(screen.getByText('Abierto')).toBeInTheDocument()
    expect(screen.getByText('Sigue empeorando')).toBeInTheDocument()
    expect(screen.getByText('Vamos a revisarlo')).toBeInTheDocument()
    expect(screen.getByText(/^Vos/)).toBeInTheDocument()
    expect(screen.getByText(/^Administración/)).toBeInTheDocument()
  })

  it('agrega un comentario', async () => {
    postMock.mockResolvedValue({
      data: { id: 'm3', claimId: 'cl1', authorId: 'me', body: 'Gracias', internal: false },
    })
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Mensaje'), 'Gracias por avisar')
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    const [path, init] = postMock.mock.calls[0] as [string, { body: Record<string, unknown> }]
    expect(path).toBe('/claims/{claimId}/comments')
    expect(init.body).toMatchObject({ body: 'Gracias por avisar' })
  })

  it('permite cancelar un reclamo abierto', async () => {
    postMock.mockResolvedValue({ data: { ...CLAIM, status: 'cancelled' } })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /cancelar reclamo/i }))

    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/claims/{claimId}/cancel', expect.anything()))
  })
})
