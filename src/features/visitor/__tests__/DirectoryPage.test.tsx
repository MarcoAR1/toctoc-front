import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DirectoryPage } from '@/features/visitor/pages/DirectoryPage'

// Cliente HTTP mockeado: GET resuelve el directorio público.
const { getMock, postMock } = vi.hoisted(() => ({ getMock: vi.fn(), postMock: vi.fn() }))
vi.mock('@/api/client', () => ({
  api: { GET: getMock, POST: postMock },
  unwrap: (result: { data?: unknown }) => result.data,
}))

const directory = {
  property: {
    id: 'p1',
    name: 'Edificio Roca',
    code: 'CASA01',
    type: 'building',
    directoryVisibility: 'listed',
  },
  units: [
    { id: 'u1', label: '1A' },
    { id: 'u2', label: '2B', directoryName: 'Familia Pérez' },
  ],
}

function renderDirectory(path = '/r/CASA01') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/r/:code" element={<DirectoryPage />} />
          <Route path="/r/:code/:unitCode" element={<DirectoryPage />} />
          <Route path="/ring/:ringId" element={<div>esperando</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DirectoryPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('lista las unidades y abre el formulario de timbre al elegir una', async () => {
    getMock.mockResolvedValue({ data: directory })
    const user = userEvent.setup()
    renderDirectory()

    expect(await screen.findByText('Edificio Roca')).toBeInTheDocument()
    expect(screen.getByText('1A')).toBeInTheDocument()
    expect(screen.getByText('Familia Pérez')).toBeInTheDocument()

    await user.click(screen.getByText('Familia Pérez'))

    expect(await screen.findByRole('button', { name: /tocar el timbre/i })).toBeInTheDocument()
  })

  it('avisa que el directorio es privado cuando no hay unidades (code_only)', async () => {
    getMock.mockResolvedValue({ data: { ...directory, units: [] } })
    renderDirectory()

    expect(await screen.findByText(/directorio de esta propiedad es privado/i)).toBeInTheDocument()
  })
})
