import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ResidentHomePage } from '@/features/resident/pages/ResidentHomePage'
import { useResidentStore } from '@/features/resident/store'
import type { Ring } from '@/features/visitor/api'

function ring(overrides: Partial<Ring> = {}): Ring {
  return {
    id: 'r1',
    propertyId: 'p1',
    unitId: 'u1',
    reason: 'visit',
    status: 'ringing',
    visitorName: 'Juan',
    createdAt: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function renderHome() {
  return render(
    <MemoryRouter>
      <ResidentHomePage />
    </MemoryRouter>,
  )
}

describe('ResidentHomePage', () => {
  beforeEach(() => useResidentStore.getState().reset())
  afterEach(() => useResidentStore.getState().reset())

  it('muestra el estado vacío cuando no hay timbres', () => {
    renderHome()
    expect(screen.getByText(/no hay timbres por ahora/i)).toBeInTheDocument()
  })

  it('lista sólo los timbres sonando, con enlace al detalle', () => {
    useResidentStore.setState({
      rings: {
        r1: ring({ visitorName: 'Juan' }),
        r2: ring({ id: 'r2', visitorName: 'Ana', status: 'answered' }),
      },
    })
    renderHome()

    const link = screen.getByRole('link', { name: /juan/i })
    expect(link).toHaveAttribute('href', '/app/incoming/r1')
    // Un timbre ya atendido no aparece en la lista de entrantes.
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
  })
})
