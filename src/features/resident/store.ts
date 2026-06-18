import { create } from 'zustand'

import type { Ring } from '@/features/visitor/api'

interface ResidentState {
  /** Estado del socket autenticado del residente (room `user:{userId}`). */
  connected: boolean
  /** Timbres recibidos por realtime, indexados por id (incluye los ya resueltos hasta refrescar). */
  rings: Record<string, Ring>
  setConnected: (connected: boolean) => void
  upsertRing: (ring: Ring) => void
  reset: () => void
}

/** Estado en vivo del residente: conexión del socket + timbres entrantes empujados por el backend. */
export const useResidentStore = create<ResidentState>((set) => ({
  connected: false,
  rings: {},
  setConnected: (connected) => set({ connected }),
  upsertRing: (ring) => set((s) => ({ rings: { ...s.rings, [ring.id]: ring } })),
  reset: () => set({ rings: {}, connected: false }),
}))

/** Timbres que están sonando ahora mismo, del más nuevo al más viejo. */
export function ringingRings(rings: Record<string, Ring>): Ring[] {
  return Object.values(rings)
    .filter((r) => r.status === 'ringing')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}
