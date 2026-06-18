import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminClaimsPage } from '@/features/admin/pages/AdminClaimsPage'

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}))
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
const CLAIM = {
  id: 'c1',
  propertyId: 'p1',
  unitId: 'u1',
  filedBy: 'user-resident',
  category: 'maintenance',
  subject: 'Gotera en la cocina',
  description: 'Hay una gotera sobre la cocina',
  priority: 'high',
  status: 'open',
  createdAt: '2026-06-18T12:00:00Z',
}
const ADMIN = { id: 'a1', propertyId: 'p1', userId: 'user-manager', role: 'manager', status: 'active' }
const COMMENT = {
  id: 'cm1',
  claimId: 'c1',
  authorId: 'user-manager',
  body: 'Ya estamos viéndolo',
  internal: false,
  createdAt: '2026-06-18T13:00:00Z',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminClaimsPage />
    </QueryClientProvider>,
  )
}

describe('AdminClaimsPage', () => {
  beforeEach(() => {
    getMock.mockImplementation((path: string) => {
      switch (path) {
        case '/properties':
          return Promise.resolve({ data: [PROPERTY] })
        case '/claims':
          return Promise.resolve({ data: [CLAIM] })
        case '/properties/{propertyId}/admins':
          return Promise.resolve({ data: [ADMIN] })
        case '/claims/{claimId}/comments':
          return Promise.resolve({ data: [COMMENT] })
        default:
          return Promise.resolve({ data: [] })
      }
    })
    postMock.mockImplementation((path: string) => {
      switch (path) {
        case '/claims/{claimId}/assign':
          return Promise.resolve({ data: { ...CLAIM, status: 'in_progress', assignedTo: 'user-manager' } })
        case '/claims/{claimId}/resolve':
          return Promise.resolve({ data: { ...CLAIM, status: 'resolved', resolution: 'Reparado' } })
        case '/claims/{claimId}/close':
          return Promise.resolve({ data: { ...CLAIM, status: 'closed' } })
        case '/claims/{claimId}/comments':
          return Promise.resolve({
            data: { id: 'cm2', claimId: 'c1', authorId: 'user-manager', body: 'nuevo', internal: false },
          })
        default:
          return Promise.resolve({ data: {} })
      }
    })
  })
  afterEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('lista los reclamos y filtra por estado', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Gotera en la cocina')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Abiertos' }))

    await waitFor(() => {
      const filtered = getMock.mock.calls.find(
        (c) =>
          c[0] === '/claims' &&
          (c[1] as { params: { query: { status?: string } } }).params.query.status === 'open',
      )
      expect(filtered).toBeTruthy()
    })
  })

  it('resuelve un reclamo con resolución', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /gestionar/i }))
    await user.click(screen.getByRole('button', { name: 'Resolver' }))
    await user.type(screen.getByLabelText('Resolución'), 'Reparado')
    await user.click(screen.getByRole('button', { name: /confirmar/i }))

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    const call = postMock.mock.calls.find((c) => c[0] === '/claims/{claimId}/resolve')
    expect(call).toBeTruthy()
    const init = call![1] as { params: { path: { claimId: string } }; body: Record<string, unknown> }
    expect(init.params.path.claimId).toBe('c1')
    expect(init.body).toMatchObject({ resolution: 'Reparado' })
  })

  it('cierra un reclamo', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /gestionar/i }))
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    const call = postMock.mock.calls.find((c) => c[0] === '/claims/{claimId}/close')
    expect(call).toBeTruthy()
    expect((call![1] as { params: { path: { claimId: string } } }).params.path.claimId).toBe('c1')
  })

  it('asigna un reclamo a un co-admin', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /gestionar/i }))
    expect(await screen.findByRole('option', { name: /user-manager/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Asignar' }))

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    const call = postMock.mock.calls.find((c) => c[0] === '/claims/{claimId}/assign')
    expect(call).toBeTruthy()
    const init = call![1] as { params: { path: { claimId: string } }; body: Record<string, unknown> }
    expect(init.params.path.claimId).toBe('c1')
    expect(init.body).toMatchObject({ assigneeUserId: 'user-manager' })
  })

  it('muestra el hilo de comentarios al abrir la conversación', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /conversación/i }))

    expect(await screen.findByText('Ya estamos viéndolo')).toBeInTheDocument()
    const call = getMock.mock.calls.find((c) => c[0] === '/claims/{claimId}/comments')
    expect(call).toBeTruthy()
    expect((call![1] as { params: { path: { claimId: string } } }).params.path.claimId).toBe('c1')
  })

  it('publica una respuesta pública al residente', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /conversación/i }))
    await screen.findByText('Ya estamos viéndolo')
    await user.type(screen.getByLabelText('Mensaje'), 'Mañana pasa el plomero')
    await user.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() =>
      expect(postMock.mock.calls.find((c) => c[0] === '/claims/{claimId}/comments')).toBeTruthy(),
    )
    const call = postMock.mock.calls.find((c) => c[0] === '/claims/{claimId}/comments')
    const init = call![1] as { params: { path: { claimId: string } }; body: Record<string, unknown> }
    expect(init.params.path.claimId).toBe('c1')
    expect(init.body).toMatchObject({ body: 'Mañana pasa el plomero', internal: false })
  })

  it('publica una nota interna (internal:true)', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /conversación/i }))
    await screen.findByText('Ya estamos viéndolo')
    await user.type(screen.getByLabelText('Mensaje'), 'Revisar caño del 3B')
    await user.click(screen.getByLabelText('Nota interna'))
    await user.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() =>
      expect(postMock.mock.calls.find((c) => c[0] === '/claims/{claimId}/comments')).toBeTruthy(),
    )
    const call = postMock.mock.calls.find((c) => c[0] === '/claims/{claimId}/comments')
    const init = call![1] as { body: Record<string, unknown> }
    expect(init.body).toMatchObject({ body: 'Revisar caño del 3B', internal: true })
  })
})
