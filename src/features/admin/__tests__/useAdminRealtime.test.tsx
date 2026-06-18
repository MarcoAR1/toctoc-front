import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAdminRealtime } from '@/features/admin/useAdminRealtime'
import { useAuthStore } from '@/features/auth/store'

const { socketHandlers, off, toastMock } = vi.hoisted(() => ({
  socketHandlers: new Map<string, (...args: unknown[]) => void>(),
  off: vi.fn(),
  toastMock: vi.fn(),
}))
vi.mock('@/realtime/socket', () => ({
  createSocket: () => ({
    on: (event: string, cb: (...args: unknown[]) => void) => socketHandlers.set(event, cb),
    off,
    disconnect: vi.fn(),
  }),
}))
vi.mock('sonner', () => ({ toast: toastMock }))

const CLAIM = { id: 'c1', propertyId: 'p1', subject: 'Gotera en la cocina', status: 'open' }

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const view = renderHook(() => useAdminRealtime(), { wrapper })
  return { queryClient, invalidateSpy, view }
}

describe('useAdminRealtime', () => {
  beforeEach(() => {
    socketHandlers.clear()
    off.mockReset()
    toastMock.mockReset()
    useAuthStore.setState({ accessToken: 't', user: { id: 'admin-me', email: 'admin@toctoc.app' } })
  })
  afterEach(() => {
    socketHandlers.clear()
    useAuthStore.getState().clear()
  })

  it('al llegar claim.created cachea el reclamo, refresca el board y el hilo, y avisa', async () => {
    const { queryClient, invalidateSpy } = setup()
    await waitFor(() => expect(socketHandlers.has('claim.created')).toBe(true))

    act(() => {
      socketHandlers.get('claim.created')?.(CLAIM)
    })

    expect(queryClient.getQueryData(['claim', 'c1'])).toEqual(CLAIM)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'claims', 'p1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['claim', 'c1', 'comments'] })
    expect(toastMock).toHaveBeenCalledWith('Nuevo reclamo', { description: 'Gotera en la cocina' })
  })

  it('claim.comment refresca el board y el hilo del reclamo comentado', async () => {
    const { queryClient, invalidateSpy } = setup()
    await waitFor(() => expect(socketHandlers.has('claim.comment')).toBe(true))

    act(() => {
      socketHandlers.get('claim.comment')?.(CLAIM)
    })

    expect(queryClient.getQueryData(['claim', 'c1'])).toEqual(CLAIM)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'claims', 'p1'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['claim', 'c1', 'comments'] })
  })

  it('suscribe los eventos claim.* y los desuscribe al desmontar', async () => {
    const { view } = setup()
    await waitFor(() => expect(socketHandlers.has('claim.assigned')).toBe(true))
    for (const event of ['claim.created', 'claim.assigned', 'claim.resolved', 'claim.closed', 'claim.reopened', 'claim.cancelled', 'claim.comment']) {
      expect(socketHandlers.has(event)).toBe(true)
    }

    view.unmount()

    const offEvents = off.mock.calls.map((c) => c[0])
    for (const event of ['claim.created', 'claim.comment']) {
      expect(offEvents).toContain(event)
    }
  })
})
