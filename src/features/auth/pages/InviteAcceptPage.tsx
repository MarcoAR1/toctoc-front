import { useEffect, useRef } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useAcceptInvitation } from '@/features/auth/api'

/**
 * Self-claim de invitación: toma `?token` del enlace del email, lo canjea
 * (POST /invitations/accept), persiste la sesión y entra. Un co-admin va al panel (`/admin`);
 * un residente, a la app (`/app`).
 */
export function InviteAcceptPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const accept = useAcceptInvitation()

  // Canjeamos el token una sola vez (StrictMode monta dos veces en dev).
  const triedToken = useRef<string | null>(null)
  useEffect(() => {
    if (token && triedToken.current !== token) {
      triedToken.current = token
      accept.mutate(token)
    }
  }, [token, accept])

  if (accept.isSuccess) {
    const dest = accept.data.invitation.type === 'property_admin' ? '/admin' : '/app'
    return <Navigate to={dest} replace />
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitación inválida</CardTitle>
          <CardDescription>Falta el token en el enlace de la invitación.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/auth/login">Ir a iniciar sesión</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (accept.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No pudimos aceptar la invitación</CardTitle>
          <CardDescription>
            {friendlyMessage(accept.error)} El enlace pudo expirar, ya usarse o haber sido revocado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/auth/login">Ir a iniciar sesión</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aceptando invitación…</CardTitle>
        <CardDescription>Estamos confirmando tu acceso.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner className="size-4" />
        Un momento, te estamos dando de alta.
      </CardContent>
    </Card>
  )
}
