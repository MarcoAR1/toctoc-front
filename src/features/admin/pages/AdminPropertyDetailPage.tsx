import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Plus } from 'lucide-react'

import { friendlyMessage } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  DIRECTORY_VISIBILITY_LABEL,
  PROPERTY_STATUS_BADGE,
  PROPERTY_TYPE_LABEL,
  useAddUnit,
  useProperty,
  usePropertyUnits,
  type Unit,
} from '@/features/admin/properties'

/** Formulario para agregar una unidad a la propiedad. */
function NewUnitForm({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const addUnit = useAddUnit(propertyId)
  const [label, setLabel] = useState('')
  const [directoryName, setDirectoryName] = useState('')

  const canSubmit = label.trim().length > 0

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    try {
      await addUnit.mutateAsync({
        label: label.trim(),
        directoryName: directoryName.trim() || undefined,
      })
      toast.success('Unidad agregada')
      onClose()
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="unit-label">Etiqueta</Label>
              <Input
                id="unit-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej: 4B"
                maxLength={40}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="unit-directory">Nombre en directorio</Label>
              <Input
                id="unit-directory"
                value={directoryName}
                onChange={(e) => setDirectoryName(e.target.value)}
                placeholder="Ej: Familia Pérez"
                maxLength={80}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || addUnit.isPending} className="gap-2">
              {addUnit.isPending && <Spinner className="size-4" />}
              Agregar unidad
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/** Fila de una unidad en la lista del detalle. */
function UnitRow({ unit }: { unit: Unit }) {
  return (
    <div className="bg-card flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{unit.label}</p>
        {unit.directoryName && (
          <p className="text-muted-foreground truncate text-xs">{unit.directoryName}</p>
        )}
      </div>
      {unit.status === 'disabled' && <Badge variant="secondary">Deshabilitada</Badge>}
    </div>
  )
}

function UnitsSection({ propertyId }: { propertyId: string }) {
  const [adding, setAdding] = useState(false)
  const units = usePropertyUnits(propertyId)
  const items = units.data?.items ?? []

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">
          Unidades{units.data ? ` (${units.data.total})` : ''}
        </h2>
        {!adding && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Agregar
          </Button>
        )}
      </div>

      {adding && <NewUnitForm propertyId={propertyId} onClose={() => setAdding(false)} />}

      {units.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[58px] w-full" />
          ))}
        </div>
      ) : units.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(units.error)}
        </p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Esta propiedad todavía no tiene unidades.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((unit) => (
            <li key={unit.id}>
              <UnitRow unit={unit} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Detalle de una propiedad: cabecera + unidades (alta incluida). */
export function AdminPropertyDetailPage() {
  const { id } = useParams()
  const property = useProperty(id)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Volver">
          <Link to="/admin">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Propiedad</h1>
      </div>

      {property.isPending ? (
        <Skeleton className="h-28 w-full" />
      ) : property.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(property.error)}
        </p>
      ) : property.data ? (
        <>
          <Card>
            <CardContent className="flex flex-col gap-2 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{property.data.name}</h2>
                <Badge variant={PROPERTY_STATUS_BADGE[property.data.status].variant}>
                  {PROPERTY_STATUS_BADGE[property.data.status].label}
                </Badge>
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
                <span>{PROPERTY_TYPE_LABEL[property.data.type]}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{property.data.code}</span>
                <span aria-hidden="true">·</span>
                <span>{DIRECTORY_VISIBILITY_LABEL[property.data.directoryVisibility]}</span>
              </div>
            </CardContent>
          </Card>

          <UnitsSection propertyId={property.data.id} />
        </>
      ) : null}
    </div>
  )
}
