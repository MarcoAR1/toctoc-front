import { Placeholder } from '@/components/common/Placeholder'

/** Login/alta por magic link (POST /auth/magic-link). Implementación real en M2. */
export function LoginPage() {
  return (
    <Placeholder
      title="Iniciar sesión"
      milestone="M2"
      description="Acceso sin contraseña por enlace mágico."
    >
      <p>
        Pedirá el correo y disparará <code>POST /auth/magic-link</code>; el enlace se canjea en{' '}
        <code>/auth/verify</code>.
      </p>
    </Placeholder>
  )
}
