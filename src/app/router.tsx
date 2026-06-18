import { createBrowserRouter } from 'react-router-dom'

import { RequireAuth } from '@/components/auth/RequireAuth'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ResidentLayout } from '@/components/layout/ResidentLayout'
import { VisitorLayout } from '@/components/layout/VisitorLayout'
import { InviteAcceptPage } from '@/features/auth/pages/InviteAcceptPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { VerifyPage } from '@/features/auth/pages/VerifyPage'
import { AdminPropertiesPage } from '@/features/admin/pages/AdminPropertiesPage'
import { AdminPropertyDetailPage } from '@/features/admin/pages/AdminPropertyDetailPage'
import { ClaimDetailPage } from '@/features/resident/pages/ClaimDetailPage'
import { ClaimsPage } from '@/features/resident/pages/ClaimsPage'
import { HistoryPage } from '@/features/resident/pages/HistoryPage'
import { IncomingPage } from '@/features/resident/pages/IncomingPage'
import { NewClaimPage } from '@/features/resident/pages/NewClaimPage'
import { ResidentHomePage } from '@/features/resident/pages/ResidentHomePage'
import { SettingsPage } from '@/features/resident/pages/SettingsPage'
import { DirectoryPage } from '@/features/visitor/pages/DirectoryPage'
import { RingWaitingPage } from '@/features/visitor/pages/RingWaitingPage'
import { ScanLandingPage } from '@/features/visitor/pages/ScanLandingPage'
import { LandingPage } from '@/routes/LandingPage'
import { NotFoundPage } from '@/routes/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },

  // Visitante (público, sin login)
  {
    element: <VisitorLayout />,
    children: [
      { path: '/r', element: <ScanLandingPage /> },
      { path: '/r/:code', element: <DirectoryPage /> },
      { path: '/r/:code/:unitCode', element: <DirectoryPage /> },
      { path: '/ring/:ringId', element: <RingWaitingPage /> },
    ],
  },

  // Auth (público): login magic link, verificación, aceptar invitación
  {
    element: <AuthLayout />,
    children: [
      { path: '/auth/login', element: <LoginPage /> },
      { path: '/auth/verify', element: <VerifyPage /> },
      { path: '/invite/accept', element: <InviteAcceptPage /> },
    ],
  },

  // Rutas protegidas (residente + admin) detrás del JWT
  {
    element: <RequireAuth />,
    children: [
      {
        element: <ResidentLayout />,
        children: [
          { path: '/app', element: <ResidentHomePage /> },
          { path: '/app/incoming/:id', element: <IncomingPage /> },
          { path: '/app/history', element: <HistoryPage /> },
          { path: '/app/claims', element: <ClaimsPage /> },
          { path: '/app/claims/new', element: <NewClaimPage /> },
          { path: '/app/claims/:claimId', element: <ClaimDetailPage /> },
          { path: '/app/settings', element: <SettingsPage /> },
        ],
      },
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <AdminPropertiesPage /> },
          { path: '/admin/properties/:id', element: <AdminPropertyDetailPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
