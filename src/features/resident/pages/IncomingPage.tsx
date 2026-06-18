import { useParams } from 'react-router-dom'

import { Placeholder } from '@/components/common/Placeholder'

/** Pantalla crítica: timbre/llamada entrante (atender / rechazar / abrir). */
export function IncomingPage() {
  const { id } = useParams()
  return (
    <Placeholder
      title="Timbre entrante"
      milestone="M2"
      description="Foto del visitante, motivo y unidad. Atender, rechazar o abrir."
    >
      <p>
        Unifica push (<code>ring.created</code> / <code>call.incoming</code>) y realtime. Evento{' '}
        <code>{id}</code>. El primero que atiende gana (<code>ring.updated</code> / <code>call.taken</code>).
      </p>
    </Placeholder>
  )
}
