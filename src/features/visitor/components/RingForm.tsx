import { useState, type FormEvent } from 'react'
import { ArrowLeft, BellRing } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useCreateRing, type DirectoryUnit, type RingReason } from '@/features/visitor/api'

const REASONS: { value: RingReason; label: string }[] = [
  { value: 'visit', label: 'Visita' },
  { value: 'delivery', label: 'Entrega' },
  { value: 'service', label: 'Servicio' },
]

interface RingFormProps {
  unit: DirectoryUnit
  propertyName: string
  /** Volver al directorio (oculto en deep-links a una unidad). */
  onBack?: () => void
}

/** Compone el timbrazo (motivo + nombre + mensaje) y dispara `POST /rings`. */
export function RingForm({ unit, propertyName, onBack }: RingFormProps) {
  const navigate = useNavigate()
  const createRing = useCreateRing()
  const [reason, setReason] = useState<RingReason>('visit')
  const [visitorName, setVisitorName] = useState('')
  const [message, setMessage] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    createRing.mutate(
      {
        unitId: unit.id,
        reason,
        visitorName: visitorName.trim() || undefined,
        message: message.trim() || undefined,
      },
      { onSuccess: (ring) => navigate(`/ring/${ring.id}`) },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{unit.directoryName ?? unit.label}</CardTitle>
        <CardDescription>
          {propertyName}
          {unit.directoryName ? ` · ${unit.label}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Motivo</Label>
            <div className="grid grid-cols-3 gap-2">
              {REASONS.map((r) => (
                <Button
                  key={r.value}
                  type="button"
                  variant={reason === r.value ? 'default' : 'outline'}
                  onClick={() => setReason(r.value)}
                  aria-pressed={reason === r.value}
                  className={cn(reason === r.value && 'pointer-events-none')}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visitorName">Tu nombre (opcional)</Label>
            <Input
              id="visitorName"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Ej: Juan"
              autoComplete="name"
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">Mensaje (opcional)</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej: dejo un paquete en portería"
              maxLength={200}
            />
          </div>

          <Button type="submit" disabled={createRing.isPending}>
            {createRing.isPending ? <Spinner className="size-4" /> : <BellRing className="size-4" />}
            Tocar el timbre
          </Button>

          {createRing.isError && (
            <p className="text-destructive text-sm" role="alert">
              {friendlyMessage(createRing.error)}
            </p>
          )}
        </form>

        {onBack && (
          <Button variant="ghost" onClick={onBack} disabled={createRing.isPending}>
            <ArrowLeft className="size-4" />
            Elegir otra unidad
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
