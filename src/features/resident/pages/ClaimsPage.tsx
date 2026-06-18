import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { friendlyMessage } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CLAIM_CATEGORY_LABEL,
  CLAIM_PRIORITY_LABEL,
  CLAIM_STATUS_BADGE,
  useMyClaims,
  type Claim,
} from '@/features/resident/claims'
import { useUnitSelection } from '@/features/resident/units'

const DATE_FMT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const formatWhen = (iso?: string) => (iso ? DATE_FMT.format(new Date(iso)) : '')
const byNewest = (a: Claim, b: Claim) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

/** Tarjeta-enlace de un reclamo en la lista. */
function ClaimRow({ claim }: { claim: Claim }) {
  const status = CLAIM_STATUS_BADGE[claim.status]
  return (
    <Link
      to={`/app/claims/${claim.id}`}
      className="bg-card hover:bg-accent flex flex-col gap-1.5 rounded-lg border p-3 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium">{claim.subject}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
        <span>{CLAIM_CATEGORY_LABEL[claim.category]}</span>
        <span aria-hidden="true">·</span>
        <span>Prioridad {CLAIM_PRIORITY_LABEL[claim.priority].toLowerCase()}</span>
        {claim.createdAt && (
          <>
            <span aria-hidden="true">·</span>
            <span>{formatWhen(claim.createdAt)}</span>
          </>
        )}
      </div>
    </Link>
  )
}

function ClaimList({ query }: { query: ReturnType<typeof useMyClaims> }) {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[68px] w-full" />
        ))}
      </div>
    )
  }
  if (query.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {friendlyMessage(query.error)}
      </p>
    )
  }
  const items = [...(query.data ?? [])].sort(byNewest)
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Todavía no abriste reclamos.
        </CardContent>
      </Card>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((claim) => (
        <li key={claim.id}>
          <ClaimRow claim={claim} />
        </li>
      ))}
    </ul>
  )
}

/** Lista de los reclamos del residente en una propiedad, con acceso a crear uno nuevo. */
export function ClaimsPage() {
  const selection = useUnitSelection()
  const { properties, propertyList, selectedPropertyId, selectProperty } = selection
  const claims = useMyClaims(selectedPropertyId)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Reclamos</h1>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/app/claims/new">
            <Plus className="size-4" aria-hidden="true" />
            Nuevo
          </Link>
        </Button>
      </div>

      {properties.isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : properties.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(properties.error)}
        </p>
      ) : propertyList.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No tenés propiedades asociadas.
          </CardContent>
        </Card>
      ) : (
        <>
          {propertyList.length > 1 && (
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">Propiedad</span>
              <select
                value={selectedPropertyId ?? ''}
                onChange={(e) => selectProperty(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
              >
                {propertyList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <ClaimList query={claims} />
        </>
      )}
    </div>
  )
}
