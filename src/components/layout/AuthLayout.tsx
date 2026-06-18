import { Outlet } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'

/** Layout centrado para login (magic link), verificación e invitaciones. */
export function AuthLayout() {
  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <Logo className="size-8" />
        <span className="text-lg font-semibold">TocToc</span>
      </div>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}
