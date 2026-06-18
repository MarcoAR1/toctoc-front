import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ClaimsPage } from '@/features/resident/pages/ClaimsPage'

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
const claim = (over: Record<string, unknown> = {}) => ({
  id: 'cl1',
  propertyId: 'p1',
  unitId: 'u1',
  filedBy: 'me',
  category: 'maintenance',
  subject: 'Gotera en la cocina',
  description: 'Hay una gotera',
  priority: 'high',
  status: 'open',
  createdAt: '2026-06-10T10:00:00Z',
  ...over,
})

function mockEndpoints(claims: unknown[] = [claim()]) {
  getMock.mockImplementation((path: string) => {
    switch (path) {
      case '/properties':
        return Promise.resolve({ data: [PROPERTY] })
      case '/properties/{propertyId}/units':
        return Promise.resolve({ data: { items: [UNIT], total: 1 } })
      case '/claims/mine':
        return Promise.resolve({ data: claims })
      default:
        return Promise.resolve({ data: [] })
    }
  })
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClaimsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClaimsPage', () => {
  beforeEach(() => getMock.mockReset())
  afterEach(() => getMock.mockReset())

  it('lista mis reclamos con su estado', async () => {
    mockEndpoints([
      claim(),
      claim({ id: 'cl2', subject: 'Ruido molesto', status: 'resolved', category: 'noise', priority: 'low' }),
    ])
    renderPage()

    expect(await screen.findByText('Gotera en la cocina')).toBeInTheDocument()
    expect(screen.getByText('Ruido molesto')).toBeInTheDocument()
    expect(screen.getByText('Abierto')).toBeInTheDocument()
    expect(screen.getByText('Resuelto')).toBeInTheDocument()
  })

  it('muestra el estado vacío', async () => {
    mockEndpoints([])
    renderPage()

    expect(await screen.findByText(/todavía no abriste reclamos/i)).toBeInTheDocument()
  })
})
