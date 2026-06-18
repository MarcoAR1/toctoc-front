import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsPage } from '@/features/resident/pages/SettingsPage'

const { getMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}))
vi.mock('@/api/client', () => ({
  api: { GET: getMock, PUT: putMock, DELETE: deleteMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const PROPERTY = {
  id: 'p1',
  type: 'house',
  name: 'Casa',
  code: 'X',
  status: 'active',
  directoryVisibility: 'listed',
  createdBy: 'me',
}
const UNIT = { id: 'u1', propertyId: 'p1', label: 'Casa', status: 'active' }
const QUIET_HOURS = { unitId: 'u1', enabled: false, startTime: '22:00', endTime: '07:00', byWeekday: [] }
const DEVICE = {
  id: 'd1',
  userId: 'me',
  platform: 'web',
  pushToken: 'tok',
  createdAt: '2026-06-10T10:00:00Z',
}

function mockEndpoints() {
  getMock.mockImplementation((path: string) => {
    switch (path) {
      case '/properties':
        return Promise.resolve({ data: [PROPERTY] })
      case '/properties/{propertyId}/units':
        return Promise.resolve({ data: { items: [UNIT], total: 1 } })
      case '/dnd':
        return Promise.resolve({ data: QUIET_HOURS })
      case '/devices':
        return Promise.resolve({ data: [DEVICE] })
      default:
        return Promise.resolve({ data: [] })
    }
  })
  putMock.mockResolvedValue({ data: { ...QUIET_HOURS, enabled: true } })
  deleteMock.mockResolvedValue({ data: undefined })
}

function renderSettings() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    putMock.mockReset()
    deleteMock.mockReset()
    mockEndpoints()
  })
  afterEach(() => {
    getMock.mockReset()
    putMock.mockReset()
    deleteMock.mockReset()
  })

  it('carga el "no molestar" de la unidad y guarda los cambios', async () => {
    const user = userEvent.setup()
    renderSettings()

    const toggle = await screen.findByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(putMock).toHaveBeenCalled())
    expect(putMock).toHaveBeenCalledWith('/dnd', {
      body: { unitId: 'u1', enabled: true, startTime: '22:00', endTime: '07:00', byWeekday: [] },
    })
  })

  it('lista los dispositivos y permite quitarlos', async () => {
    const user = userEvent.setup()
    renderSettings()

    expect(await screen.findByText('Web')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar dispositivo' }))

    await waitFor(() =>
      expect(deleteMock).toHaveBeenCalledWith('/devices/{id}', { params: { path: { id: 'd1' } } }),
    )
  })
})
