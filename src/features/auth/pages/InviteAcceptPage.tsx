import { useSearchParams } from 'react-router-dom'

import { Placeholder } from '@/components/common/Placeholder'

/** Self-claim de invitación (POST /invitations/accept { token }). Implementación real en M4. */
export function InviteAcceptPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  return (
    <Placeholder
      title="Aceptar invitación"
      milestone="M4"
      description={token ? 'Confirmando tu invitación.' : 'Falta el token en la URL.'}
    >
      <p>
        Canjeará <code>POST /invitations/accept</code> (find-or-create del usuario + permiso + JWT en un
        clic).
      </p>
    </Placeholder>
  )
}
