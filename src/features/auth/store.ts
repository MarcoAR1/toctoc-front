import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  name?: string
  roles?: string[]
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  setSession: (accessToken: string, user: AuthUser) => void
  setUser: (user: AuthUser | null) => void
  clear: () => void
}

/**
 * Sesión del residente/admin (JWT del magic link). Persistida en localStorage.
 * El visitante NO usa este store (entra sin login).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null }),
    }),
    { name: 'toctoc-auth' },
  ),
)

/** Lectura sincrónica del token fuera de React (cliente fetch / socket). */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken
}
