import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { MessageSquare, Send, Wrench } from 'lucide-react'

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
import { useAuthStore } from '@/features/auth/store'
import {
  CLAIM_CATEGORY_LABEL,
  CLAIM_PRIORITY_LABEL,
  CLAIM_PRIORITY_VARIANT,
  CLAIM_STATUS_BADGE,
  useAddClaimComment,
  useClaimComments,
  type Claim,
  type ClaimComment,
} from '@/features/resident/claims'
import { cn } from '@/lib/utils'

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

const formatWhen = (iso?: string) => (iso ? DATE_FMT.format(new Date(iso)) : '')

/** Una entrada del hilo: resalta las notas internas y etiqueta al autor (vos / equipo / residente). */
function CommentItem({
  comment,
  mine,
  authorLabel,
}: {
  comment: ClaimComment
  mine: boolean
  authorLabel: string
}) {
  return (
    <div
      className={cn(
        'rounded-md border p-2.5 text-sm',
        comment.internal && 'border-warning/50 bg-warning/10',
      )}
    >
      <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-medium">{mine ? 'Vos' : authorLabel}</span>
        {comment.internal && <Badge variant="warning">Nota interna</Badge>}
        {comment.createdAt && <span>{formatWhen(comment.createdAt)}</span>}
      </div>
      <p className="whitespace-pre-wrap">{comment.body}</p>
    </div>
  )
}

/** Hilo del reclamo: respuestas públicas + notas internas, con composer admin (toggle interno). */
function ClaimThread({ claimId, admins }: { claimId: string; admins: PropertyAdmin[] }) {
  const myId = useAuthStore((s) => s.user?.id)
  const comments = useClaimComments(claimId)
  const addComment = useAddClaimComment(claimId)
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)

  const items = comments.data ?? []
  const authorLabel = (authorId: string) => {
    const role = admins.find((a) => a.userId === authorId)?.role
    return role ? ADMIN_ROLE_LABEL[role] : 'Residente'
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const text = body.trim()
    if (!text) return
    try {
      await addComment.mutateAsync({ body: text, internal })
      setBody('')
      setInternal(false)
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      {comments.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : comments.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(comments.error)}
        </p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Todavía no hay mensajes.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                mine={Boolean(myId) && comment.authorId === myId}
                authorLabel={authorLabel(comment.authorId)}
              />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <textarea
          aria-label="Mensaje"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder={internal ? 'Nota interna para el equipo…' : 'Respondé al residente…'}
          className={TEXTAREA_CLASS}
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={internal}
              onChange={(e) => setInternal(e.target.checked)}
              className="size-4"
            />
            Nota interna
          </label>
          <Button
            type="submit"
            size="sm"
            className="gap-1.5"
            disabled={addComment.isPending || body.trim().length === 0}
          >
            {addComment.isPending ? <Spinner className="size-4" /> : <Send className="size-4" />}
            Enviar
          </Button>
        </div>
      </form>
    </div>
  )
}

/** Tarjeta de un reclamo en el board, con sus acciones de gestión y el hilo desplegables. */
function AdminClaimCard({ claim, admins }: { claim: Claim; admins: PropertyAdmin[] }) {
  const [managing, setManaging] = useState(false)
  const [showComments, setShowComments] = useState(false)
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

        <div className="flex flex-wrap gap-2">
          {!terminal && !managing && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setManaging(true)}
            >
              <Wrench className="size-4" aria-hidden="true" />
              Gestionar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            aria-expanded={showComments}
            onClick={() => setShowComments((v) => !v)}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            Conversación
          </Button>
        </div>

        {managing && !terminal && (
          <div className="flex flex-col gap-2">
            <ClaimActions claim={claim} admins={admins} />
            <Button size="sm" variant="ghost" className="self-start" onClick={() => setManaging(false)}>
              Listo
            </Button>
          </div>
        )}

        {showComments && <ClaimThread claimId={claim.id} admins={admins} />}
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
