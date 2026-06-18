import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { UnitPicker } from '@/features/resident/UnitPicker'
import {
  CLAIM_CATEGORY_LABEL,
  CLAIM_PRIORITY_LABEL,
  useFileClaim,
  type ClaimCategory,
  type ClaimPriority,
} from '@/features/resident/claims'
import { useUnitSelection } from '@/features/resident/units'

const CATEGORIES = Object.keys(CLAIM_CATEGORY_LABEL) as ClaimCategory[]
const PRIORITIES = Object.keys(CLAIM_PRIORITY_LABEL) as ClaimPriority[]
const SELECT_CLASS =
  'border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]'

/** Formulario para abrir un reclamo sobre una unidad del residente. */
export function NewClaimPage() {
  const navigate = useNavigate()
  const selection = useUnitSelection()
  const { properties, units, propertyList, unitList, selectedPropertyId, selectedUnitId } = selection
  const fileClaim = useFileClaim()

  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ClaimCategory>('maintenance')
  const [priority, setPriority] = useState<ClaimPriority>('medium')

  const canSubmit =
    subject.trim().length > 0 &&
    description.trim().length > 0 &&
    Boolean(selectedPropertyId) &&
    Boolean(selectedUnitId)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || !selectedPropertyId || !selectedUnitId) return
    try {
      const claim = await fileClaim.mutateAsync({
        propertyId: selectedPropertyId,
        unitId: selectedUnitId,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      })
      toast.success('Reclamo enviado')
      navigate(`/app/claims/${claim.id}`, { replace: true })
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/claims')} aria-label="Volver">
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold">Nuevo reclamo</h1>
      </div>

      {properties.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : propertyList.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No tenés propiedades asociadas.
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <UnitPicker selection={selection} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Gotera en la cocina"
              maxLength={120}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Contanos qué pasa…"
              className="border-input bg-background focus-visible:ring-ring/50 min-h-24 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              required
            />
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium">Categoría</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ClaimCategory)}
                className={SELECT_CLASS}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CLAIM_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium">Prioridad</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ClaimPriority)}
                className={SELECT_CLASS}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {CLAIM_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {units.isPending && <Skeleton className="h-4 w-40" />}
          {!units.isPending && unitList.length === 0 && (
            <p className="text-destructive text-sm">Esta propiedad todavía no tiene unidades.</p>
          )}

          <Button type="submit" disabled={!canSubmit || fileClaim.isPending} className="gap-2">
            {fileClaim.isPending && <Spinner className="size-4" />}
            Enviar reclamo
          </Button>
        </form>
      )}
    </div>
  )
}
