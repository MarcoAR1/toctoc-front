import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginPage } from '@/features/auth/pages/LoginPage'
import { useAuthStore } from '@/features/auth/store'

// Cliente HTTP mockeado: capturamos POST y simulamos el 202 sin cuerpo del backend.
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { POST: postMock, GET: vi.fn() },
  unwrap: (result: { data?: unknown }) => result.data,
}))

// Sin credenciales de Google: la sección social debe quedar oculta.
vi.mock('@/config/env', () => ({
  config: { apiUrl: 'http://localhost:8080', appUrl: 'http://localhost:5173', iceServers: [], google: null },
}))

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/auth/login']}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null })
    postMock.mockReset()
  })

  it('solicita el magic link y muestra el estado "revisá tu correo"', async () => {
    postMock.mockResolvedValue({ data: undefined })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'vecino@ejemplo.com')
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }))

    expect(await screen.findByText(/revisá tu correo/i)).toBeInTheDocument()
    expect(screen.getByText('vecino@ejemplo.com')).toBeInTheDocument()
    expect(postMock).toHaveBeenCalledWith('/auth/magic-link', { body: { email: 'vecino@ejemplo.com' } })
  })

  it('no muestra la sección social cuando no hay credenciales de Google', () => {
    renderLogin()
    // El divisor "o" sólo existe si hay un proveedor social configurado.
    expect(screen.queryByText('o')).not.toBeInTheDocument()
  })
})
