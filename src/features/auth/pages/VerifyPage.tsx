import { useSearchParams } from 'react-router-dom'

import { Placeholder } from '@/components/common/Placeholder'

/** Canje del magic link (POST /auth/verify { token }). Implementación real en M2. */
export function VerifyPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  return (
    <Placeholder
      title="Verificando acceso…"
      milestone="M2"
      description={token ? 'Validando tu enlace de acceso.' : 'Falta el token en la URL.'}
    >
      <p>
        Canjeará <code>POST /auth/verify</code> con el token de la query y guardará el{' '}
        <code>accessToken</code> en la sesión.
      </p>
    </Placeholder>
  )
}
