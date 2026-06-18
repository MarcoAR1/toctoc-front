import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminPropertyDetailPage } from '@/features/admin/pages/AdminPropertyDetailPage'

const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { GET: getMock, POST: postMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const PROPERTY = {
  id: 'p1',
  type: 'building',
  name: 'Edificio Roca',
  code: 'UN2SSCJ',
  status: 'active',
  directoryVisibility: 'listed',
  createdBy: 'admin',
}
const UNIT = { id: 'u1', propertyId: 'p1', label: '4B', directoryName: 'Familia Pérez', status: 'active' }

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/properties/p1']}>
        <Routes>
          <Route path="/admin/properties/:id" element={<AdminPropertyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminPropertyDetailPage', () => {
  beforeEach(() => {
    getMock.mockImplementation((path: string) => {
      switch (path) {
        case '/properties/{propertyId}':
          return Promise.resolve({ data: PROPERTY })
        case '/properties/{propertyId}/units':
          return Promise.resolve({ data: { items: [UNIT], total: 1, page: 1, limit: 100 } })
        default:
          return Promise.resolve({ data: [] })
      }
    })
    postMock.mockResolvedValue({ data: { id: 'u9', propertyId: 'p1', label: '5A', status: 'active' } })
  })
  afterEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('muestra la cabecera de la propiedad y sus unidades', async () => {
    renderPage()

    expect(await screen.findByText('Edificio Roca')).toBeInTheDocument()
    expect(screen.getByText('UN2SSCJ')).toBeInTheDocument()
    expect(screen.getByText('Directorio visible')).toBeInTheDocument()
    expect(await screen.findByText('4B')).toBeInTheDocument()
    expect(screen.getByText('Familia Pérez')).toBeInTheDocument()
    expect(screen.getByText('Unidades (1)')).toBeInTheDocument()
  })

  it('agrega una unidad con la etiqueta del formulario', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /agregar/i }))
    await user.type(screen.getByLabelText('Etiqueta'), '5A')

    const submit = screen.getByRole('button', { name: /agregar unidad/i })
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    const [path, init] = postMock.mock.calls[0] as [
      string,
      { params: { path: { propertyId: string } }; body: Record<string, unknown> },
    ]
    expect(path).toBe('/properties/{propertyId}/units')
    expect(init.params.path.propertyId).toBe('p1')
    expect(init.body).toMatchObject({ label: '5A' })
  })
})
