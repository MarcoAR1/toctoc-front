import { GoogleSignInButton, type SocialAuthCallbacks } from '@/features/auth/social/GoogleSignInButton'
import { hasSocialProviders } from '@/features/auth/social/googleClient'

/**
 * Sección de proveedores sociales. Se renderiza SOLO si hay alguno configurado, con un divisor "o".
 * Para sumar proveedores (Apple, etc.), agregá su botón acá y su flag a `hasSocialProviders`.
 */
export function SocialAuthSection(props: SocialAuthCallbacks) {
  if (!hasSocialProviders()) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">o</span>
        <span className="bg-border h-px flex-1" />
      </div>
      <GoogleSignInButton {...props} />
    </div>
  )
}
