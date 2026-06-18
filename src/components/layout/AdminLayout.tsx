import { Building2, ClipboardList } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { useAdminRealtime } from '@/features/admin/useAdminRealtime'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: 'Propiedades', icon: Building2, end: true },
  { to: '/admin/claims', label: 'Reclamos', icon: ClipboardList, end: false },
]

/** Layout del panel admin: desktop-first con sidebar. */
export function AdminLayout() {
  // Socket autenticado del admin: refresca el board y el hilo de reclamos en vivo.
  const { connected } = useAdminRealtime()

  return (
    <div className="bg-background min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r md:flex md:flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <Logo className="size-7" />
          <span className="font-semibold">TocToc Admin</span>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Logo className="size-6" />
            <span className="font-semibold">Admin</span>
          </div>
          <span className="text-muted-foreground hidden text-sm md:inline">Panel de administración</span>
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
        <main className="flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
