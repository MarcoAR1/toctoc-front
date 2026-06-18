import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminPropertiesPage } from '@/features/admin/pages/AdminPropertiesPage'

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { GET: getMock, POST: postMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const property = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  type: 'building',
  name: 'Edificio Roca',
  code: 'UN2SSCJ',
  status: 'active',
  directoryVisibility: 'listed',
  createdBy: 'admin',
  ...over,
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminPropertiesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminPropertiesPage', () => {
  beforeEach(() => {
    getMock.mockImplementation((path: string) => {
      switch (path) {
        case '/properties':
          return Promise.resolve({
            data: [
              property(),
              property({ id: 'p2', name: 'Casa Mitre', type: 'house', code: 'AB12CD3', status: 'disabled' }),
            ],
          })
        default:
          return Promise.resolve({ data: [] })
      }
    })
    postMock.mockResolvedValue({ data: property({ id: 'p9', name: 'Nuevo Edificio' }) })
  })
  afterEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('lista las propiedades con tipo, código y estado', async () => {
    renderPage()

    expect(await screen.findByText('Edificio Roca')).toBeInTheDocument()
    expect(screen.getByText('UN2SSCJ')).toBeInTheDocument()
    expect(screen.getByText('Edificio')).toBeInTheDocument()
    expect(screen.getByText('Casa Mitre')).toBeInTheDocument()
    expect(screen.getByText('Deshabilitada')).toBeInTheDocument()
  })

  it('muestra el estado vacío', async () => {
    getMock.mockResolvedValue({ data: [] })
    renderPage()

    expect(await screen.findByText(/todavía no administrás ninguna propiedad/i)).toBeInTheDocument()
  })

  it('crea una propiedad con los datos del formulario', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /nueva/i }))
    await user.type(screen.getByLabelText('Nombre'), 'Nuevo Edificio')

    const submit = screen.getByRole('button', { name: /crear propiedad/i })
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    const [path, init] = postMock.mock.calls[0] as [string, { body: Record<string, unknown> }]
    expect(path).toBe('/properties')
    expect(init.body).toMatchObject({
      type: 'building',
      name: 'Nuevo Edificio',
      directoryVisibility: 'listed',
    })
  })
})
