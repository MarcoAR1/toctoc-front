import { LogOut } from 'lucide-react'

import { Placeholder } from '@/components/common/Placeholder'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/features/auth/api'

/** Ajustes del residente: dispositivos, push, no molestar, cerrar sesión. */
export function SettingsPage() {
  const logout = useLogout()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Ajustes</h1>
      <Placeholder title="Dispositivos y notificaciones" milestone="M2 / M5" description="Push, no molestar e invitaciones.">
        <p>
          <code>GET/POST/DELETE /devices</code> · "No molestar" (<code>dnd</code>) ·{' '}
          <code>/invitations</code>.
        </p>
      </Placeholder>
      <Button variant="outline" onClick={logout}>
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    </div>
  )
}
