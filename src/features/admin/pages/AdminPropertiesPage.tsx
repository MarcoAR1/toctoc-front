import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, Plus } from 'lucide-react'

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
  useAdminProperties,
  useCreateProperty,
  type DirectoryVisibility,
  type Property,
  type PropertyType,
} from '@/features/admin/properties'

const TYPES = Object.keys(PROPERTY_TYPE_LABEL) as PropertyType[]
const VISIBILITIES = Object.keys(DIRECTORY_VISIBILITY_LABEL) as DirectoryVisibility[]
const SELECT_CLASS =
  'border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]'

/** Tarjeta-enlace de una propiedad en la lista. */
function PropertyRow({ property }: { property: Property }) {
  const status = PROPERTY_STATUS_BADGE[property.status]
  return (
    <Link
      to={`/admin/properties/${property.id}`}
      className="bg-card hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-colors"
    >
      <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
        <Building2 className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{property.name}</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          <span>{PROPERTY_TYPE_LABEL[property.type]}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{property.code}</span>
        </div>
      </div>
    </Link>
  )
}

/** Formulario de alta express de una propiedad (onboarding). */
function NewPropertyForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const createProperty = useCreateProperty()

  const [type, setType] = useState<PropertyType>('building')
  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState<DirectoryVisibility>('listed')

  const canSubmit = name.trim().length > 0

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    try {
      const property = await createProperty.mutateAsync({
        type,
        name: name.trim(),
        directoryVisibility: visibility,
      })
      toast.success('Propiedad creada')
      navigate(`/admin/properties/${property.id}`)
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="property-name">Nombre</Label>
            <Input
              id="property-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Edificio Roca 123"
              maxLength={120}
              required
            />
          </div>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium">Tipo</span>
              <select
                aria-label="Tipo"
                value={type}
                onChange={(e) => setType(e.target.value as PropertyType)}
                className={SELECT_CLASS}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PROPERTY_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium">Directorio</span>
              <select
                aria-label="Directorio"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as DirectoryVisibility)}
                className={SELECT_CLASS}
              >
                {VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {DIRECTORY_VISIBILITY_LABEL[v]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-muted-foreground text-xs">
            Las unidades se crean automáticamente según el tipo (casa: 1, dúplex: 2). En edificios y
            complejos se cargan después desde el detalle.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || createProperty.isPending} className="gap-2">
              {createProperty.isPending && <Spinner className="size-4" />}
              Crear propiedad
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/** Listado de propiedades del admin + onboarding express. */
export function AdminPropertiesPage() {
  const [creating, setCreating] = useState(false)
  const properties = useAdminProperties()

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Propiedades</h1>
          <p className="text-muted-foreground text-sm">Edificios, casas, dúplex y complejos.</p>
        </div>
        {!creating && (
          <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nueva
          </Button>
        )}
      </div>

      {creating && <NewPropertyForm onClose={() => setCreating(false)} />}

      {properties.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[66px] w-full" />
          ))}
        </div>
      ) : properties.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(properties.error)}
        </p>
      ) : (properties.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            Todavía no administrás ninguna propiedad.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {(properties.data ?? []).map((property) => (
            <li key={property.id}>
              <PropertyRow property={property} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
