import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InviteAcceptPage } from '@/features/auth/pages/InviteAcceptPage'

const { postMock, setSession } = vi.hoisted(() => ({ postMock: vi.fn(), setSession: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { POST: postMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))
vi.mock('@/features/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ setSession }),
}))

const result = (type: 'unit_resident' | 'property_admin') => ({
  data: {
    accessToken: 'jwt-123',
    user: { id: 'u1', email: 'vecino@example.com', status: 'active' },
    invitation: { id: 'inv1', type, status: 'accepted' },
  },
})

function renderAt(entry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/invite/accept" element={<InviteAcceptPage />} />
          <Route path="/app" element={<div>App residente</div>} />
          <Route path="/admin" element={<div>Panel admin</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('InviteAcceptPage', () => {
  beforeEach(() => {
    postMock.mockReset()
    setSession.mockReset()
  })
  afterEach(() => {
    postMock.mockReset()
    setSession.mockReset()
  })

  it('canjea el token, guarda la sesión y entra a la app (residente)', async () => {
    postMock.mockResolvedValue(result('unit_resident'))
    renderAt('/invite/accept?token=abc')

    expect(await screen.findByText('App residente')).toBeInTheDocument()
    expect(postMock).toHaveBeenCalledWith('/invitations/accept', { body: { token: 'abc' } })
    expect(setSession).toHaveBeenCalledWith('jwt-123', expect.objectContaining({ id: 'u1', email: 'vecino@example.com' }))
  })

  it('redirige al panel cuando la invitación es de co-admin', async () => {
    postMock.mockResolvedValue(result('property_admin'))
    renderAt('/invite/accept?token=abc')

    expect(await screen.findByText('Panel admin')).toBeInTheDocument()
  })

  it('muestra inválida cuando falta el token', async () => {
    renderAt('/invite/accept')

    expect(await screen.findByText(/invitación inválida/i)).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('muestra el error cuando el canje falla', async () => {
    postMock.mockRejectedValue(new Error('expirada'))
    renderAt('/invite/accept?token=abc')

    expect(await screen.findByText(/no pudimos aceptar la invitación/i)).toBeInTheDocument()
  })
})
