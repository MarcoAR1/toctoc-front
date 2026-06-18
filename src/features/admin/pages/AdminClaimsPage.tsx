import { useState } from 'react'
import { toast } from 'sonner'
import { Wrench } from 'lucide-react'

import { friendlyMessage } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  useAssignClaim,
  useClaimsBoard,
  useCloseClaim,
  useResolveClaim,
  type ClaimStatusFilter,
} from '@/features/admin/claims'
import { useAdminProperties } from '@/features/admin/properties'
import { ADMIN_ROLE_LABEL } from '@/features/admin/invitations'
import { usePropertyAdmins, type PropertyAdmin } from '@/features/admin/people'
import {
  CLAIM_CATEGORY_LABEL,
  CLAIM_PRIORITY_LABEL,
  CLAIM_PRIORITY_VARIANT,
  CLAIM_STATUS_BADGE,
  type Claim,
} from '@/features/resident/claims'

const DATE_FMT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const SELECT_CLASS =
  'border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]'
const TEXTAREA_CLASS =
  'border-input bg-background focus-visible:ring-ring/50 min-h-16 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]'

const STATUS_FILTERS: { value: ClaimStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'closed', label: 'Cerrados' },
  { value: 'cancelled', label: 'Cancelados' },
]

/** Acciones de gestión de un reclamo: asignar a un admin, resolver (con resolución opcional) y cerrar. */
function ClaimActions({ claim, admins }: { claim: Claim; admins: PropertyAdmin[] }) {
  const [resolving, setResolving] = useState(false)
  const [resolution, setResolution] = useState('')
  const [assignee, setAssignee] = useState('')
  const assign = useAssignClaim()
  const resolve = useResolveClaim()
  const close = useCloseClaim()

  const assignable = admins.filter((a) => a.status === 'active')
  const effectiveAssignee = assignee || assignable[0]?.userId || ''
  const busy = assign.isPending || resolve.isPending || close.isPending

  async function onAssign() {
    try {
      await assign.mutateAsync({ claimId: claim.id, assigneeUserId: effectiveAssignee })
      toast.success('Reclamo asignado')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  async function onResolve() {
    try {
      await resolve.mutateAsync({ claimId: claim.id, resolution: resolution.trim() || undefined })
      toast.success('Reclamo resuelto')
      setResolving(false)
      setResolution('')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  async function onClose() {
    try {
      await close.mutateAsync(claim.id)
      toast.success('Reclamo cerrado')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Asignar a</span>
        <div className="flex gap-2">
          <select
            aria-label="Asignar a"
            value={effectiveAssignee}
            onChange={(e) => setAssignee(e.target.value)}
            className={`${SELECT_CLASS} min-w-0 flex-1`}
            disabled={assignable.length === 0}
          >
            {assignable.length === 0 ? (
              <option value="">Sin co-admins disponibles</option>
            ) : (
              assignable.map((a) => (
                <option key={a.userId} value={a.userId}>
                  {ADMIN_ROLE_LABEL[a.role]} · {a.userId}
                </option>
              ))
            )}
          </select>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={onAssign}
            disabled={!effectiveAssignee || busy}
          >
            {assign.isPending && <Spinner className="size-4" />}
            Asignar
          </Button>
        </div>
      </div>

      {resolving ? (
        <div className="flex flex-col gap-2">
          <textarea
            aria-label="Resolución"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={2}
            placeholder="Resolución (opcional)"
            className={TEXTAREA_CLASS}
          />
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={onResolve} disabled={busy}>
              {resolve.isPending && <Spinner className="size-4" />}
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setResolving(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setResolving(true)} disabled={busy}>
            Resolver
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onClose} disabled={busy}>
            {close.isPending && <Spinner className="size-4" />}
            Cerrar
          </Button>
        </div>
      )}
    </div>
  )
}

/** Tarjeta de un reclamo en el board, con sus acciones de gestión desplegables. */
function AdminClaimCard({ claim, admins }: { claim: Claim; admins: PropertyAdmin[] }) {
  const [managing, setManaging] = useState(false)
  const status = CLAIM_STATUS_BADGE[claim.status]
  const terminal = claim.status === 'closed' || claim.status === 'cancelled'

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{claim.subject}</p>
            <p className="text-muted-foreground line-clamp-2 text-sm">{claim.description}</p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <Badge variant={CLAIM_PRIORITY_VARIANT[claim.priority]}>
            {CLAIM_PRIORITY_LABEL[claim.priority]}
          </Badge>
          <span>{CLAIM_CATEGORY_LABEL[claim.category]}</span>
          {claim.assignedTo && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Asignado a {claim.assignedTo}</span>
            </>
          )}
          {claim.createdAt && (
            <>
              <span aria-hidden="true">·</span>
              <span>{DATE_FMT.format(new Date(claim.createdAt))}</span>
            </>
          )}
        </div>

        {claim.resolution && (
          <p className="text-sm">
            <span className="font-medium">Resolución:</span> {claim.resolution}
          </p>
        )}

        {!terminal &&
          (managing ? (
            <div className="flex flex-col gap-2">
              <ClaimActions claim={claim} admins={admins} />
              <Button size="sm" variant="ghost" className="self-start" onClick={() => setManaging(false)}>
                Listo
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 self-start"
              onClick={() => setManaging(true)}
            >
              <Wrench className="size-4" aria-hidden="true" />
              Gestionar
            </Button>
          ))}
      </CardContent>
    </Card>
  )
}

/** Board de reclamos de la propiedad (admin): selector de propiedad, filtro por estado y gestión. */
export function AdminClaimsPage() {
  const properties = useAdminProperties()
  const propertyList = properties.data ?? []
  const [propertyId, setPropertyId] = useState('')
  const [status, setStatus] = useState<ClaimStatusFilter>('all')

  const effectivePropertyId = propertyId || propertyList[0]?.id || ''
  const claims = useClaimsBoard(effectivePropertyId || undefined, status)
  const admins = usePropertyAdmins(effectivePropertyId)
  const adminList = admins.data ?? []
  const items = claims.data ?? []

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Reclamos</h1>

      {properties.isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : properties.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(properties.error)}
        </p>
      ) : propertyList.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No tenés propiedades para gestionar.
          </CardContent>
        </Card>
      ) : (
        <>
          {propertyList.length > 1 && (
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">Propiedad</span>
              <select
                aria-label="Propiedad"
                value={effectivePropertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className={SELECT_CLASS}
              >
                {propertyList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div role="tablist" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                role="tab"
                aria-selected={status === f.value}
                size="sm"
                variant={status === f.value ? 'default' : 'outline'}
                onClick={() => setStatus(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {claims.isPending ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : claims.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {friendlyMessage(claims.error)}
            </p>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center text-sm">
                No hay reclamos en este estado.
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((claim) => (
                <li key={claim.id}>
                  <AdminClaimCard claim={claim} admins={adminList} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
