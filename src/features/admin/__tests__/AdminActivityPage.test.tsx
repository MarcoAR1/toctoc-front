import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminActivityPage } from '@/features/admin/pages/AdminActivityPage'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { GET: getMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))

const P1 = {
  id: 'p1',
  type: 'building',
  name: 'Edificio Roca',
  code: 'X',
  status: 'active',
  directoryVisibility: 'listed',
  createdBy: 'admin',
}
const P2 = { ...P1, id: 'p2', name: 'Torre Sur', code: 'Y' }
const RING = {
  id: 'r1',
  propertyId: 'p1',
  unitId: 'u1',
  reason: 'visit',
  status: 'answered',
  visitorName: 'Juan',
  createdAt: '2026-06-10T10:00:00Z',
}
const ACCESS = {
  id: 'a1',
  type: 'door',
  propertyId: 'p1',
  unitId: 'u1',
  openedBy: 'me',
  method: 'remote',
  result: 'opened',
  createdAt: '2026-06-10T10:01:00Z',
}
const CALL = {
  id: 'c1',
  propertyId: 'p1',
  unitId: 'u1',
  media: 'video',
  initiatorKind: 'visitor',
  initiatorId: 'v',
  initiatorLabel: 'Visitante del 4B',
  status: 'ended',
  startedAt: '2026-06-10T10:02:00Z',
}

function mockEndpoints(properties: unknown[] = [P1]) {
  getMock.mockImplementation((path: string) => {
    switch (path) {
      case '/properties':
        return Promise.resolve({ data: properties })
      case '/rings':
        return Promise.resolve({ data: [RING] })
      case '/access':
        return Promise.resolve({ data: [ACCESS] })
      case '/calls':
        return Promise.resolve({ data: [CALL] })
      default:
        return Promise.resolve({ data: [] })
    }
  })
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminActivityPage />
    </QueryClientProvider>,
  )
}

/** Última query de un endpoint dado (path → init). */
function lastQuery(path: string): Record<string, unknown> | undefined {
  const call = [...getMock.mock.calls].reverse().find((c) => c[0] === path)
  return call?.[1]?.params?.query
}

describe('AdminActivityPage', () => {
  beforeEach(() => getMock.mockReset())
  afterEach(() => getMock.mockReset())

  it('muestra timbres por defecto y cambia entre pestañas, consultando por propiedad', async () => {
    mockEndpoints()
    const user = userEvent.setup()
    renderPage()

    // Timbres (pestaña por defecto).
    expect(await screen.findByText('Juan')).toBeInTheDocument()

    // Accesos.
    await user.click(screen.getByRole('tab', { name: 'Accesos' }))
    expect(await screen.findByText('Puerta')).toBeInTheDocument()

    // Llamadas.
    await user.click(screen.getByRole('tab', { name: 'Llamadas' }))
    expect(await screen.findByText('Visitante del 4B')).toBeInTheDocument()

    // Cada bitácora se consulta con el propertyId de la propiedad.
    expect(lastQuery('/rings')).toEqual({ propertyId: 'p1' })
    expect(lastQuery('/access')).toEqual({ propertyId: 'p1' })
    expect(lastQuery('/calls')).toEqual({ propertyId: 'p1' })

    // Con una sola propiedad no se muestra el selector.
    expect(screen.queryByLabelText('Propiedad')).not.toBeInTheDocument()
  })

  it('con varias propiedades, al cambiar el selector consulta la otra propiedad', async () => {
    mockEndpoints([P1, P2])
    const user = userEvent.setup()
    renderPage()

    const selector = await screen.findByLabelText('Propiedad')
    await user.selectOptions(selector, 'p2')

    await waitFor(() => expect(lastQuery('/rings')).toEqual({ propertyId: 'p2' }))
  })

  it('muestra el estado vacío cuando no hay propiedades', async () => {
    mockEndpoints([])
    renderPage()

    expect(await screen.findByText(/no tenés propiedades para gestionar/i)).toBeInTheDocument()
  })
})
