import { Link } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo className="size-10" />
      <h1 className="text-2xl font-bold">404 — Página no encontrada</h1>
      <p className="text-muted-foreground max-w-sm">
        La ruta que buscás no existe o el enlace expiró.
      </p>
      <Button asChild>
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  )
}
