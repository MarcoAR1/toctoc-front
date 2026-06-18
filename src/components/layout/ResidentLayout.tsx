import { Clock, Home, LifeBuoy, Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { ResidentCallOverlay } from '@/features/resident/CallOverlay'
import { useResidentRealtime } from '@/features/resident/useResidentRealtime'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/app', label: 'Inicio', icon: Home, end: true },
  { to: '/app/history', label: 'Historial', icon: Clock, end: false },
  { to: '/app/claims', label: 'Reclamos', icon: LifeBuoy, end: false },
  { to: '/app/settings', label: 'Ajustes', icon: Settings, end: false },
]

/** Layout del residente: app shell mobile con navegación inferior. */
export function ResidentLayout() {
  // Conecta el socket autenticado y captura timbres entrantes mientras el residente usa la app.
  const { connected } = useResidentRealtime()

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="safe-top bg-background/80 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Logo className="size-7" />
          <span className="font-semibold">TocToc</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span
              className={cn('size-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-amber-500')}
              aria-hidden="true"
            />
            {connected ? 'En vivo' : 'Conectando…'}
          </span>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-24">
        <Outlet />
      </main>

      <ResidentCallOverlay />

      <nav className="safe-bottom bg-background/95 fixed inset-x-0 bottom-0 z-10 border-t backdrop-blur">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
