import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { friendlyMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { usePropertyDirectory, type DirectoryUnit } from '@/features/visitor/api'
import { RingForm } from '@/features/visitor/components/RingForm'

/** Coincidencia best-effort de un deep-link `/r/:code/:unitCode` contra el directorio público. */
function matchUnit(units: DirectoryUnit[], unitCode: string | undefined): DirectoryUnit | null {
  if (!unitCode) return null
  const needle = unitCode.trim().toLowerCase()
  return (
    units.find(
      (u) => u.label.toLowerCase() === needle || u.directoryName?.toLowerCase() === needle,
    ) ?? null
  )
}

/** Directorio del visitante: resuelve la propiedad por código y permite elegir la unidad. */
export function DirectoryPage() {
  const { code, unitCode } = useParams()
  const directory = usePropertyDirectory(code)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DirectoryUnit | null>(null)

  const units = useMemo(() => directory.data?.units ?? [], [directory.data])

  // Deep-link a una unidad: preseleccionar una sola vez cuando llega el directorio.
  const deepLinked = useMemo(() => matchUnit(units, unitCode), [units, unitCode])
  const autoSelected = useRef(false)
  useEffect(() => {
    if (!autoSelected.current && deepLinked) {
      autoSelected.current = true
      setSelected(deepLinked)
    }
  }, [deepLinked])

  if (directory.isLoading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
          <Spinner className="size-4" />
          Buscando la propiedad…
        </CardContent>
      </Card>
    )
  }

  if (directory.isError || !directory.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No encontramos la propiedad</CardTitle>
          <CardDescription>
            {directory.error ? friendlyMessage(directory.error) : 'El código puede ser inválido.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/r">Ingresar otro código</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { property } = directory.data

  if (selected) {
    return (
      <RingForm
        unit={selected}
        propertyName={property.name}
        onBack={unitCode ? undefined : () => setSelected(null)}
      />
    )
  }

  // Directorio privado (code_only): no se listan unidades.
  if (units.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{property.name}</CardTitle>
          <CardDescription>El directorio de esta propiedad es privado.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          <p>Usá el QR o el enlace directo de la unidad para tocar el timbre.</p>
        </CardContent>
      </Card>
    )
  }

  const term = search.trim().toLowerCase()
  const filtered = term
    ? units.filter(
        (u) => u.label.toLowerCase().includes(term) || u.directoryName?.toLowerCase().includes(term),
      )
    : units

  return (
    <Card>
      <CardHeader>
        <CardTitle>{property.name}</CardTitle>
        <CardDescription>Elegí la unidad a la que querés tocar el timbre.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {units.length > 6 && (
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar unidad…"
              className="pl-9"
              aria-label="Buscar unidad"
            />
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {filtered.map((unit) => (
            <li key={unit.id}>
              <Button
                variant="outline"
                className="h-auto w-full justify-between px-4 py-3"
                onClick={() => setSelected(unit)}
              >
                <span className="flex flex-col items-start">
                  <span className="font-medium">{unit.directoryName ?? unit.label}</span>
                  {unit.directoryName && (
                    <span className="text-muted-foreground text-xs">{unit.label}</span>
                  )}
                </span>
                <ChevronRight className="text-muted-foreground size-4" />
              </Button>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No hay unidades que coincidan con “{search}”.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
