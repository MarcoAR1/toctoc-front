import { useParams } from 'react-router-dom'

import { Placeholder } from '@/components/common/Placeholder'

/** Pantalla "esperando" del visitante tras tocar el timbre. */
export function RingWaitingPage() {
  const { ringId } = useParams()
  return (
    <Placeholder
      title="Tocando…"
      milestone="M1"
      description="Esperando que el residente atienda."
    >
      <p>
        Seguirá el timbre <code>{ringId}</code> por socket anónimo (<code>ring:subscribe</code>) con
        fallback a <code>GET /rings/{'{id}'}</code>. Permite cancelar o escalar a llamada en vivo.
      </p>
    </Placeholder>
  )
}
