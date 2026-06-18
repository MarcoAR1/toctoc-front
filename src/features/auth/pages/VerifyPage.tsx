import { useEffect, useRef } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useVerifyMagicLink } from '@/features/auth/api'

/** A dónde mandamos tras verificar. Sólo aceptamos rutas internas (evita open-redirect). */
function safeRedirect(from: string | null): string {
  return from && from.startsWith('/') && !from.startsWith('//') ? from : '/app'
}

/**
 * Canje del magic link: toma `?token` de la URL, lo intercambia por una sesión
 * (POST /auth/verify), la persiste y redirige al destino original (`?from`) o a `/app`.
 */
export function VerifyPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const redirectTo = safeRedirect(params.get('from'))
  const verify = useVerifyMagicLink()

  // Disparamos el canje una sola vez por token (StrictMode monta dos veces en dev).
  const triedToken = useRef<string | null>(null)
  useEffect(() => {
    if (token && triedToken.current !== token) {
      triedToken.current = token
      verify.mutate(token)
    }
  }, [token, verify])

  if (verify.isSuccess) {
    return <Navigate to={redirectTo} replace />
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enlace inválido</CardTitle>
          <CardDescription>Falta el token de acceso en el enlace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/auth/login">Volver a iniciar sesión</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (verify.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No pudimos verificar tu enlace</CardTitle>
          <CardDescription>
            {friendlyMessage(verify.error)} El enlace pudo expirar o ya haberse usado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/auth/login">Pedir un enlace nuevo</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificando acceso…</CardTitle>
        <CardDescription>Validando tu enlace de acceso.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
        <Spinner className="size-4" />
        Un momento, estamos confirmando tu identidad.
      </CardContent>
    </Card>
  )
}
