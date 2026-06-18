import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Send } from 'lucide-react'

import { friendlyMessage } from '@/api/errors'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/features/auth/store'
import {
  CLAIM_CATEGORY_LABEL,
  CLAIM_PRIORITY_LABEL,
  CLAIM_PRIORITY_VARIANT,
  CLAIM_STATUS_BADGE,
  useAddClaimComment,
  useCancelClaim,
  useClaim,
  useClaimComments,
  useReopenClaim,
  type Claim,
  type ClaimComment,
} from '@/features/resident/claims'

const DATE_FMT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const formatWhen = (iso?: string) => (iso ? DATE_FMT.format(new Date(iso)) : '')

const CAN_CANCEL: ReadonlySet<Claim['status']> = new Set(['open', 'in_progress'])
const CAN_REOPEN: ReadonlySet<Claim['status']> = new Set(['resolved', 'closed'])

function CommentBubble({ comment, mine }: { comment: ClaimComment; mine: boolean }) {
  return (
    <div className={mine ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
      <div
        className={
          mine
            ? 'bg-primary text-primary-foreground max-w-[85%] rounded-lg rounded-br-sm px-3 py-2 text-sm'
            : 'bg-muted max-w-[85%] rounded-lg rounded-bl-sm px-3 py-2 text-sm'
        }
      >
        {comment.body}
      </div>
      <span className="text-muted-foreground mt-0.5 text-[11px]">
        {mine ? 'Vos' : 'Administración'}
        {comment.createdAt && ` · ${formatWhen(comment.createdAt)}`}
      </span>
    </div>
  )
}

/** Detalle de un reclamo: estado, datos, acciones del autor y el hilo de comentarios. */
export function ClaimDetailPage() {
  const { claimId } = useParams()
  const navigate = useNavigate()
  const myId = useAuthStore((s) => s.user?.id)
  const claim = useClaim(claimId)
  const comments = useClaimComments(claimId)
  const cancel = useCancelClaim()
  const reopen = useReopenClaim()
  const addComment = useAddClaimComment(claimId ?? '')
  const [body, setBody] = useState('')

  async function onCancel() {
    if (!claimId) return
    try {
      await cancel.mutateAsync(claimId)
      toast.success('Reclamo cancelado')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  async function onReopen() {
    if (!claimId) return
    try {
      await reopen.mutateAsync(claimId)
      toast.success('Reclamo reabierto')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  async function onComment(event: FormEvent) {
    event.preventDefault()
    const text = body.trim()
    if (!text) return
    try {
      await addComment.mutateAsync({ body: text })
      setBody('')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  const data = claim.data
  const status = data && CLAIM_STATUS_BADGE[data.status]
  const transitionPending = cancel.isPending || reopen.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/claims')} aria-label="Volver">
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold">Reclamo</h1>
      </div>

      {claim.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : claim.isError || !data ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(claim.error)}
        </p>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold">{data.subject}</h2>
                {status && <Badge variant={status.variant}>{status.label}</Badge>}
              </div>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{data.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{CLAIM_CATEGORY_LABEL[data.category]}</Badge>
                <Badge variant={CLAIM_PRIORITY_VARIANT[data.priority]}>
                  Prioridad {CLAIM_PRIORITY_LABEL[data.priority].toLowerCase()}
                </Badge>
                {data.createdAt && (
                  <span className="text-muted-foreground">{formatWhen(data.createdAt)}</span>
                )}
              </div>
              {data.resolution && (
                <div className="bg-muted rounded-md p-3 text-sm">
                  <span className="font-medium">Resolución: </span>
                  {data.resolution}
                </div>
              )}

              {(CAN_CANCEL.has(data.status) || CAN_REOPEN.has(data.status)) && (
                <div className="flex gap-2 pt-1">
                  {CAN_CANCEL.has(data.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={onCancel}
                      disabled={transitionPending}
                    >
                      {cancel.isPending && <Spinner className="size-4" />}
                      Cancelar reclamo
                    </Button>
                  )}
                  {CAN_REOPEN.has(data.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={onReopen}
                      disabled={transitionPending}
                    >
                      {reopen.isPending && <Spinner className="size-4" />}
                      Reabrir
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Conversación</h2>

            {comments.isPending ? (
              <Skeleton className="h-20 w-full" />
            ) : comments.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {friendlyMessage(comments.error)}
              </p>
            ) : (comments.data?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm">Todavía no hay mensajes.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.data!.map((comment) => (
                  <CommentBubble key={comment.id} comment={comment} mine={comment.authorId === myId} />
                ))}
              </div>
            )}

            <form onSubmit={onComment} className="flex items-end gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={1}
                placeholder="Escribí un mensaje…"
                aria-label="Mensaje"
                className="border-input bg-background focus-visible:ring-ring/50 min-h-9 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Enviar mensaje"
                disabled={addComment.isPending || body.trim().length === 0}
              >
                {addComment.isPending ? <Spinner className="size-4" /> : <Send className="size-4" />}
              </Button>
            </form>
          </section>
        </>
      )}
    </div>
  )
}
