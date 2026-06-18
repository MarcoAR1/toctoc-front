import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminPropertyDetailPage } from '@/features/admin/pages/AdminPropertyDetailPage'

const { getMock, postMock, patchMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
  deleteMock: vi.fn(),
}))
vi.mock('@/api/client', () => ({
  api: { GET: getMock, POST: postMock, PATCH: patchMock, DELETE: deleteMock },
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
const QR = { code: 'UN2SSCJ', url: 'http://localhost:5173/r/UN2SSCJ' }
const INVITATION = {
  id: 'inv1',
  email: 'pendiente@example.com',
  propertyId: 'p1',
  type: 'unit_resident',
  unitId: 'u1',
  membershipRole: 'tenant',
  status: 'pending',
  expiresAt: '2026-07-01T12:00:00Z',
  invitedBy: 'admin',
}

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
        case '/properties/{propertyId}/qr':
          return Promise.resolve({ data: QR })
        case '/invitations':
          return Promise.resolve({ data: [INVITATION] })
        default:
          return Promise.resolve({ data: [] })
      }
    })
    postMock.mockImplementation((path: string) => {
      switch (path) {
        case '/properties/{propertyId}/units':
          return Promise.resolve({ data: { id: 'u9', propertyId: 'p1', label: '5A', status: 'active' } })
        case '/properties/{propertyId}/code/rotate':
          return Promise.resolve({ data: { ...PROPERTY, code: 'NEWCODE7' } })
        case '/properties/{propertyId}/disable':
          return Promise.resolve({ data: { ...PROPERTY, status: 'disabled' } })
        case '/properties/{propertyId}/enable':
          return Promise.resolve({ data: { ...PROPERTY, status: 'active' } })
        case '/invitations/residents':
          return Promise.resolve({ data: { ...INVITATION, id: 'inv9', email: 'vecino@example.com' } })
        case '/invitations/admins':
          return Promise.resolve({ data: { ...INVITATION, id: 'inv8', type: 'property_admin' } })
        default:
          return Promise.resolve({ data: {} })
      }
    })
    patchMock.mockResolvedValue({ data: { ...PROPERTY, name: 'Edificio Roca 999' } })
    deleteMock.mockResolvedValue({ data: undefined })
  })
  afterEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    patchMock.mockReset()
    deleteMock.mockReset()
  })

  it('muestra la cabecera, el QR y las unidades', async () => {
    renderPage()

    expect(await screen.findByText('Edificio Roca')).toBeInTheDocument()
    expect(screen.getByText('Directorio visible')).toBeInTheDocument()
    expect(await screen.findByText('4B')).toBeInTheDocument()
    expect(screen.getByText('Familia Pérez')).toBeInTheDocument()
    expect(screen.getByText('Unidades (1)')).toBeInTheDocument()
    // QR: enlace público + acciones
    expect(screen.getByText('http://localhost:5173/r/UN2SSCJ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copiar enlace/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rotar código/i })).toBeInTheDocument()
  })

  it('agrega una unidad con la etiqueta del formulario', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Agregar' }))
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

  it('edita el nombre y la visibilidad (PATCH)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /editar/i }))
    const name = screen.getByLabelText('Nombre')
    await user.clear(name)
    await user.type(name, 'Edificio Roca 999')
    await user.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(patchMock).toHaveBeenCalled())
    const [path, init] = patchMock.mock.calls[0] as [
      string,
      { params: { path: { propertyId: string } }; body: Record<string, unknown> },
    ]
    expect(path).toBe('/properties/{propertyId}')
    expect(init.params.path.propertyId).toBe('p1')
    expect(init.body).toMatchObject({ name: 'Edificio Roca 999', directoryVisibility: 'listed' })
  })

  it('deshabilita la propiedad', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Deshabilitar' }))

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    expect(postMock.mock.calls[0][0]).toBe('/properties/{propertyId}/disable')
    expect(await screen.findByRole('button', { name: 'Habilitar' })).toBeInTheDocument()
  })

  it('rota el código del QR tras confirmar', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /rotar código/i }))
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    expect(postMock.mock.calls[0][0]).toBe('/properties/{propertyId}/code/rotate')
  })

  it('invita a un residente a una unidad', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Invitar' }))
    await user.type(screen.getByLabelText('Email'), 'vecino@example.com')

    const submit = screen.getByRole('button', { name: /enviar invitación/i })
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    const [path, init] = postMock.mock.calls[0] as [string, { body: Record<string, unknown> }]
    expect(path).toBe('/invitations/residents')
    expect(init.body).toMatchObject({ unitId: 'u1', email: 'vecino@example.com', role: 'tenant' })
  })

  it('lista una invitación pendiente y la revoca', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('pendiente@example.com')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Revocar invitación' }))

    await waitFor(() => expect(deleteMock).toHaveBeenCalled())
    const [path, init] = deleteMock.mock.calls[0] as [
      string,
      { params: { path: { invitationId: string } } },
    ]
    expect(path).toBe('/invitations/{invitationId}')
    expect(init.params.path.invitationId).toBe('inv1')
  })
})
