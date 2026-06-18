import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HistoryPage } from '@/features/resident/pages/HistoryPage'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { GET: getMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))

const PROPERTY = {
  id: 'p1',
  type: 'building',
  name: 'Edificio Roca',
  code: 'X',
  status: 'active',
  directoryVisibility: 'listed',
  createdBy: 'admin',
}
const UNIT = { id: 'u1', propertyId: 'p1', label: '4B', status: 'active' }
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

function mockEndpoints(properties: unknown[] = [PROPERTY]) {
  getMock.mockImplementation((path: string) => {
    switch (path) {
      case '/properties':
        return Promise.resolve({ data: properties })
      case '/properties/{propertyId}/units':
        return Promise.resolve({ data: { items: [UNIT], total: 1 } })
      case '/rings':
        return Promise.resolve({ data: [RING] })
      case '/access':
        return Promise.resolve({ data: [ACCESS] })
      case '/calls/by-unit':
        return Promise.resolve({ data: [CALL] })
      default:
        return Promise.resolve({ data: [] })
    }
  })
}

function renderHistory() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <HistoryPage />
    </QueryClientProvider>,
  )
}

describe('HistoryPage', () => {
  beforeEach(() => getMock.mockReset())
  afterEach(() => getMock.mockReset())

  it('muestra timbres por defecto y cambia entre pestañas', async () => {
    mockEndpoints()
    const user = userEvent.setup()
    renderHistory()

    // Pestaña Timbres (por defecto).
    expect(await screen.findByText('Juan')).toBeInTheDocument()

    // Accesos.
    await user.click(screen.getByRole('tab', { name: 'Accesos' }))
    expect(await screen.findByText('Puerta')).toBeInTheDocument()

    // Llamadas.
    await user.click(screen.getByRole('tab', { name: 'Llamadas' }))
    expect(await screen.findByText('Visitante del 4B')).toBeInTheDocument()

    // Con una sola propiedad y unidad, no se muestran selectores.
    expect(screen.queryByText('Propiedad')).not.toBeInTheDocument()
    expect(screen.queryByText('Unidad')).not.toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay propiedades', async () => {
    mockEndpoints([])
    renderHistory()

    expect(await screen.findByText(/no tenés propiedades asociadas/i)).toBeInTheDocument()
  })
})
