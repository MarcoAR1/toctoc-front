import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NewClaimPage } from '@/features/resident/pages/NewClaimPage'

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
  code: 'X',
  status: 'active',
  directoryVisibility: 'listed',
  createdBy: 'admin',
}
const UNIT = { id: 'u1', propertyId: 'p1', label: '4B', status: 'active' }

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NewClaimPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NewClaimPage', () => {
  beforeEach(() => {
    getMock.mockImplementation((path: string) => {
      switch (path) {
        case '/properties':
          return Promise.resolve({ data: [PROPERTY] })
        case '/properties/{propertyId}/units':
          return Promise.resolve({ data: { items: [UNIT], total: 1 } })
        default:
          return Promise.resolve({ data: [] })
      }
    })
    postMock.mockResolvedValue({
      data: { id: 'cl9', propertyId: 'p1', unitId: 'u1', subject: 'Gotera en la cocina', status: 'open' },
    })
  })
  afterEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('crea un reclamo con los datos del formulario', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Asunto'), 'Gotera en la cocina')
    await user.type(screen.getByLabelText('Descripción'), 'Hay una gotera grande sobre la cocina')

    const submit = screen.getByRole('button', { name: /enviar reclamo/i })
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)

    await waitFor(() => expect(postMock).toHaveBeenCalled())
    const [path, init] = postMock.mock.calls[0] as [string, { body: Record<string, unknown> }]
    expect(path).toBe('/claims')
    expect(init.body).toMatchObject({
      propertyId: 'p1',
      unitId: 'u1',
      subject: 'Gotera en la cocina',
      description: 'Hay una gotera grande sobre la cocina',
      category: 'maintenance',
      priority: 'medium',
    })
  })
})
