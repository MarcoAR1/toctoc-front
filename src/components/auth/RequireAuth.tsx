import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useMe } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/store'

/** Protege las rutas de residente/admin: sin token, redirige al login (magic link). */
export function RequireAuth() {
  const token = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  // Hidrata/revalida la sesión (GET /auth/me) en segundo plano. Si el token venció, el middleware
  // del cliente limpia la sesión y caemos al redirect de abajo en el siguiente render.
  useMe()

  if (!token) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
