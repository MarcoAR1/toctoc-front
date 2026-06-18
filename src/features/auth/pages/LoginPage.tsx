import { useState, type FormEvent } from 'react'
import { MailCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useRequestMagicLink } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/store'
import { SocialAuthSection } from '@/features/auth/social/SocialAuthSection'

/**
 * Login/alta sin contraseña: pide un magic link (POST /auth/magic-link) y muestra el estado
 * "revisá tu correo" con opción de reenviar. Debajo aparece la sección social (Google) si está
 * configurada. El canje del enlace ocurre en `VerifyPage`.
 */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const requestMagicLink = useRequestMagicLink()
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((s) => s.accessToken)

  // Destino tras autenticar: la ruta protegida que disparó el redirect, o el home del residente.
  const from = (location.state as { from?: string } | null)?.from ?? '/app'

  // Con sesión activa (o recién logueado con Google) no tiene sentido mostrar el login.
  if (token) return <Navigate to={from} replace />

  function sendLink(target: string) {
    requestMagicLink.mutate(target, { onSuccess: () => setSentTo(target) })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (trimmed) sendLink(trimmed)
  }

  if (sentTo) {
    return (
      <Card>
        <CardHeader>
          <div className="bg-primary/10 text-primary mb-1 flex size-10 items-center justify-center rounded-full">
            <MailCheck className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>Revisá tu correo</CardTitle>
          <CardDescription>
            Te enviamos un enlace de acceso a <span className="text-foreground font-medium">{sentTo}</span>.
            Abrilo en este dispositivo para entrar. Puede tardar un minuto.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => sendLink(sentTo)}
            disabled={requestMagicLink.isPending}
          >
            {requestMagicLink.isPending && <Spinner className="size-4" />}
            Reenviar enlace
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSentTo(null)
              requestMagicLink.reset()
            }}
          >
            Usar otro correo
          </Button>
          {requestMagicLink.isError && (
            <p className="text-destructive text-sm" role="alert">
              {friendlyMessage(requestMagicLink.error)}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Te enviamos un enlace de acceso a tu correo. Sin contraseñas.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@ejemplo.com"
              autoComplete="email"
              required
            />
          </div>
          <Button type="submit" disabled={!email.trim() || requestMagicLink.isPending}>
            {requestMagicLink.isPending && <Spinner className="size-4" />}
            Enviar enlace
          </Button>
          {requestMagicLink.isError && (
            <p className="text-destructive text-sm" role="alert">
              {friendlyMessage(requestMagicLink.error)}
            </p>
          )}
        </form>
        <SocialAuthSection
          onSuccess={() => navigate(from, { replace: true })}
          onError={(message) => toast.error(message)}
        />
      </CardContent>
    </Card>
  )
}
