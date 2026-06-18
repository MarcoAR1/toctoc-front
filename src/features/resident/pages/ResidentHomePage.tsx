import { useMemo } from 'react'
import { BellRing, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card, CardContent } from '@/components/ui/card'
import { ringingRings, useResidentStore } from '@/features/resident/store'
import type { Ring } from '@/features/visitor/api'

const REASON_LABEL: Record<Ring['reason'], string> = {
  visit: 'Visita',
  delivery: 'Entrega',
  service: 'Servicio',
}

/** Home del residente: timbres entrantes en vivo (empujados por el socket). */
export function ResidentHomePage() {
  const rings = useResidentStore((s) => s.rings)
  const incoming = useMemo(() => ringingRings(rings), [rings])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Inicio</h1>
        <p className="text-muted-foreground text-sm">
          {incoming.length > 0
            ? `${incoming.length} timbre${incoming.length > 1 ? 's' : ''} sonando ahora`
            : 'Te avisamos apenas alguien toque el timbre.'}
        </p>
      </div>

      {incoming.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
            <BellRing className="size-8 opacity-50" aria-hidden="true" />
            <p>No hay timbres por ahora.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {incoming.map((ring) => (
            <li key={ring.id}>
              <Link
                to={`/app/incoming/${ring.id}`}
                className="bg-card hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                  <BellRing className="size-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {ring.visitorName?.trim() || 'Visitante'}
                  </span>
                  <span className="text-muted-foreground text-xs">{REASON_LABEL[ring.reason]}</span>
                </span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
