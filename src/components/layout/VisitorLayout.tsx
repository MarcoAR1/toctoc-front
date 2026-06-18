import { Outlet } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'

/** Layout del visitante: mobile-first, sin sesión. */
export function VisitorLayout() {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="safe-top flex items-center gap-2 border-b px-4 py-3">
        <Logo className="size-7" />
        <span className="font-semibold">TocToc</span>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
