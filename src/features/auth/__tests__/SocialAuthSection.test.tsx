import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Config mockeada y mutable: controlamos la presencia de credenciales de Google por test.
const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    apiUrl: 'http://localhost:8080',
    appUrl: 'http://localhost:5173',
    iceServers: [] as unknown[],
    google: null as { clientId: string; authPath: string } | null,
  },
}))

vi.mock('@/config/env', () => ({ config: mockConfig }))

import { hasSocialProviders } from '@/features/auth/social/googleClient'
import { SocialAuthSection } from '@/features/auth/social/SocialAuthSection'

afterEach(() => {
  mockConfig.google = null
})

describe('SocialAuthSection', () => {
  it('no renderiza nada cuando no hay credenciales sociales', () => {
    mockConfig.google = null
    const { container } = render(<SocialAuthSection />)
    expect(hasSocialProviders()).toBe(false)
    expect(container).toBeEmptyDOMElement()
  })

  it('aparece (divisor incluido) en cuanto hay un client id de Google', () => {
    mockConfig.google = { clientId: 'test-client-id', authPath: '/auth/google' }
    render(<SocialAuthSection />)
    expect(hasSocialProviders()).toBe(true)
    expect(screen.getByText('o')).toBeInTheDocument()
  })
})
