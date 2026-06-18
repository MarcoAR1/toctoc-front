import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/store'

/** Protege las rutas de residente/admin: sin token, redirige al login (magic link). */
export function RequireAuth() {
  const token = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
