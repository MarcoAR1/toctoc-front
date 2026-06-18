import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft,
  Download,
  Link2,
  Mail,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react'

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
  useDisableProperty,
  useEnableProperty,
  useProperty,
  usePropertyQr,
  usePropertyUnits,
  useRotateCode,
  useUpdateProperty,
  type DirectoryVisibility,
  type Property,
  type Unit,
} from '@/features/admin/properties'
import {
  ADMIN_ROLE_LABEL,
  INVITATION_TYPE_LABEL,
  MANAGEABLE_ADMIN_ROLES,
  MEMBERSHIP_ROLE_LABEL,
  useInvitations,
  useInviteAdmin,
  useInviteResident,
  useRevokeInvitation,
  type Invitation,
  type ManageableAdminRole,
  type MembershipRole,
} from '@/features/admin/invitations'
import {
  PERSON_STATUS_LABEL,
  usePropertyAdmins,
  useRevokeAdmin,
  useRevokeMembership,
  useUnitMemberships,
  type PropertyAdmin,
} from '@/features/admin/people'

const VISIBILITIES = Object.keys(DIRECTORY_VISIBILITY_LABEL) as DirectoryVisibility[]
const MEMBERSHIP_ROLES = Object.keys(MEMBERSHIP_ROLE_LABEL) as MembershipRole[]
const EXPIRY_FMT = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' })
const SELECT_CLASS =
  'border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]'

/** Formulario para editar nombre y visibilidad del directorio de la propiedad. */
function EditPropertyForm({ property, onClose }: { property: Property; onClose: () => void }) {
  const updateProperty = useUpdateProperty(property.id)
  const [name, setName] = useState(property.name)
  const [visibility, setVisibility] = useState<DirectoryVisibility>(property.directoryVisibility)

  const canSubmit = name.trim().length > 0

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    try {
      await updateProperty.mutateAsync({ name: name.trim(), directoryVisibility: visibility })
      toast.success('Propiedad actualizada')
      onClose()
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </div>
          <label className="flex flex-col gap-1.5">
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || updateProperty.isPending} className="gap-2">
              {updateProperty.isPending && <Spinner className="size-4" />}
              Guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/** Cabecera de la propiedad con acciones de edición y habilitar/deshabilitar. */
function PropertyOverview({ property }: { property: Property }) {
  const [editing, setEditing] = useState(false)
  const disableProperty = useDisableProperty(property.id)
  const enableProperty = useEnableProperty(property.id)
  const status = PROPERTY_STATUS_BADGE[property.status]
  const isDisabled = property.status === 'disabled'
  const toggling = disableProperty.isPending || enableProperty.isPending

  async function toggleStatus() {
    try {
      if (isDisabled) {
        await enableProperty.mutateAsync()
        toast.success('Propiedad habilitada')
      } else {
        await disableProperty.mutateAsync()
        toast.success('Propiedad deshabilitada')
      }
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{property.name}</h2>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
            <span>{PROPERTY_TYPE_LABEL[property.type]}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{property.code}</span>
            <span aria-hidden="true">·</span>
            <span>{DIRECTORY_VISIBILITY_LABEL[property.directoryVisibility]}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Editar
            </Button>
            <Button
              size="sm"
              variant={isDisabled ? 'outline' : 'destructive'}
              className="gap-1.5"
              onClick={toggleStatus}
              disabled={toggling}
            >
              {toggling ? (
                <Spinner className="size-4" />
              ) : (
                <Power className="size-4" aria-hidden="true" />
              )}
              {isDisabled ? 'Habilitar' : 'Deshabilitar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {editing && <EditPropertyForm property={property} onClose={() => setEditing(false)} />}
    </div>
  )
}

/** Tarjeta del QR público: ver, copiar enlace, descargar (SVG) y rotar el código. */
function QrSection({ property }: { property: Property }) {
  const qr = usePropertyQr(property.id)
  const rotateCode = useRotateCode(property.id)
  const [confirmingRotate, setConfirmingRotate] = useState(false)
  const svgWrapperRef = useRef<HTMLDivElement>(null)

  function downloadSvg() {
    const svg = svgWrapperRef.current?.querySelector('svg')
    if (!svg || !qr.data) return
    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `toctoc-qr-${qr.data.code}.svg`
    a.click()
    URL.revokeObjectURL(href)
  }

  async function copyLink() {
    if (!qr.data) return
    try {
      await navigator.clipboard.writeText(qr.data.url)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  async function confirmRotate() {
    try {
      await rotateCode.mutateAsync()
      toast.success('Código rotado')
      setConfirmingRotate(false)
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Código QR</h2>
      <Card>
        <CardContent className="pt-6">
          {qr.isPending ? (
            <Skeleton className="h-44 w-full" />
          ) : qr.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {friendlyMessage(qr.error)}
            </p>
          ) : qr.data ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div ref={svgWrapperRef} className="rounded-lg border bg-white p-3">
                <QRCodeSVG value={qr.data.url} size={160} marginSize={1} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium">Código</span>
                  <span className="font-mono text-lg">{qr.data.code}</span>
                  <span className="text-muted-foreground text-xs break-all">{qr.data.url}</span>
                </div>
                {property.status === 'disabled' && (
                  <p className="text-muted-foreground text-xs">
                    La propiedad está deshabilitada: el QR no resuelve hasta reactivarla.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={copyLink}>
                    <Link2 className="size-4" aria-hidden="true" />
                    Copiar enlace
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadSvg}>
                    <Download className="size-4" aria-hidden="true" />
                    Descargar
                  </Button>
                </div>

                {confirmingRotate ? (
                  <div className="flex flex-col gap-2 rounded-md border p-3">
                    <p className="text-sm">¿Rotar el código? El QR actual dejará de funcionar.</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={confirmRotate}
                        disabled={rotateCode.isPending}
                      >
                        {rotateCode.isPending && <Spinner className="size-4" />}
                        Confirmar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmingRotate(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 self-start"
                    onClick={() => setConfirmingRotate(true)}
                  >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Rotar código
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}

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

/** Residentes (membresías) de una unidad, con la acción de remover a cada uno. */
function UnitMembers({ unitId }: { unitId: string }) {
  const members = useUnitMemberships(unitId)
  const revoke = useRevokeMembership(unitId)
  const items = members.data ?? []

  async function onRevoke(membershipId: string) {
    try {
      await revoke.mutateAsync(membershipId)
      toast.success('Residente removido')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  if (members.isPending) return <Skeleton className="h-10 w-full" />
  if (members.isError)
    return (
      <p className="text-destructive text-sm" role="alert">
        {friendlyMessage(members.error)}
      </p>
    )
  if (items.length === 0)
    return <p className="text-muted-foreground text-sm">Esta unidad todavía no tiene residentes.</p>

  return (
    <ul className="flex flex-col gap-2 border-t pt-3">
      {items.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs">{m.userId}</p>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
              <span>{MEMBERSHIP_ROLE_LABEL[m.role]}</span>
              {m.status !== 'active' && (
                <Badge variant="secondary">{PERSON_STATUS_LABEL[m.status]}</Badge>
              )}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Remover residente"
            onClick={() => onRevoke(m.id)}
            disabled={revoke.isPending || m.status === 'revoked'}
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}

/** Fila de una unidad en la lista del detalle, con sus residentes desplegables. */
function UnitRow({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{unit.label}</p>
          {unit.directoryName && (
            <p className="text-muted-foreground truncate text-xs">{unit.directoryName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unit.status === 'disabled' && <Badge variant="secondary">Deshabilitada</Badge>}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Users className="size-4" aria-hidden="true" />
            Residentes
          </Button>
        </div>
      </div>
      {open && <UnitMembers unitId={unit.id} />}
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

/** Fila de una invitación pendiente con su acción de revocar. */
function InvitationRow({
  invitation,
  onRevoke,
  revoking,
}: {
  invitation: Invitation
  onRevoke: () => void
  revoking: boolean
}) {
  const roleLabel =
    invitation.type === 'unit_resident'
      ? invitation.membershipRole && MEMBERSHIP_ROLE_LABEL[invitation.membershipRole]
      : invitation.adminRole && ADMIN_ROLE_LABEL[invitation.adminRole]
  return (
    <div className="bg-card flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          <Badge variant="secondary">{INVITATION_TYPE_LABEL[invitation.type]}</Badge>
          {roleLabel && <span>{roleLabel}</span>}
          <span aria-hidden="true">·</span>
          <span>Vence {EXPIRY_FMT.format(new Date(invitation.expiresAt))}</span>
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Revocar invitación"
        onClick={onRevoke}
        disabled={revoking}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

/** Invitaciones por email: invitar residente (a una unidad) o co-admin, y listar/revocar pendientes. */
function InvitationsSection({ property }: { property: Property }) {
  const [inviting, setInviting] = useState(false)
  const [mode, setMode] = useState<'resident' | 'admin'>('resident')
  const [email, setEmail] = useState('')
  const [unitId, setUnitId] = useState('')
  const [residentRole, setResidentRole] = useState<MembershipRole>('tenant')
  const [adminRole, setAdminRole] = useState<ManageableAdminRole>('manager')

  const units = usePropertyUnits(property.id)
  const unitList = units.data?.items ?? []
  const invitations = useInvitations(property.id)
  const inviteResident = useInviteResident(property.id)
  const inviteAdmin = useInviteAdmin(property.id)
  const revoke = useRevokeInvitation(property.id)

  const effectiveUnitId = unitId || unitList[0]?.id || ''
  const emailOk = /\S+@\S+/.test(email)
  const canSubmit = emailOk && (mode === 'admin' || Boolean(effectiveUnitId))
  const submitting = inviteResident.isPending || inviteAdmin.isPending
  const pending = invitations.data ?? []

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    try {
      if (mode === 'resident') {
        await inviteResident.mutateAsync({ unitId: effectiveUnitId, email: email.trim(), role: residentRole })
      } else {
        await inviteAdmin.mutateAsync({ email: email.trim(), role: adminRole })
      }
      toast.success('Invitación enviada')
      setEmail('')
      setInviting(false)
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  async function onRevoke(id: string) {
    try {
      await revoke.mutateAsync(id)
      toast.success('Invitación revocada')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Invitaciones</h2>
        {!inviting && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setInviting(true)}>
            <Mail className="size-4" aria-hidden="true" />
            Invitar
          </Button>
        )}
      </div>

      {inviting && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Tipo</span>
                <select
                  aria-label="Tipo de invitación"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'resident' | 'admin')}
                  className={SELECT_CLASS}
                >
                  <option value="resident">Residente (a una unidad)</option>
                  <option value="admin">Co-admin (de la propiedad)</option>
                </select>
              </label>

              {mode === 'resident' ? (
                <div className="flex gap-3">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm font-medium">Unidad</span>
                    <select
                      aria-label="Unidad"
                      value={effectiveUnitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      className={SELECT_CLASS}
                      disabled={unitList.length === 0}
                    >
                      {unitList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm font-medium">Rol</span>
                    <select
                      aria-label="Rol"
                      value={residentRole}
                      onChange={(e) => setResidentRole(e.target.value as MembershipRole)}
                      className={SELECT_CLASS}
                    >
                      {MEMBERSHIP_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {MEMBERSHIP_ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Rol</span>
                  <select
                    aria-label="Rol"
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value as ManageableAdminRole)}
                    className={SELECT_CLASS}
                  >
                    {MANAGEABLE_ADMIN_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ADMIN_ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vecino@example.com"
                />
              </div>

              {mode === 'resident' && unitList.length === 0 && (
                <p className="text-destructive text-sm">Cargá una unidad antes de invitar residentes.</p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setInviting(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!canSubmit || submitting} className="gap-2">
                  {submitting && <Spinner className="size-4" />}
                  Enviar invitación
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {invitations.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : invitations.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(invitations.error)}
        </p>
      ) : pending.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-center text-sm">
            No hay invitaciones pendientes.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {pending.map((inv) => (
            <li key={inv.id}>
              <InvitationRow
                invitation={inv}
                onRevoke={() => onRevoke(inv.id)}
                revoking={revoke.isPending}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Fila de un co-admin con su rol y la acción de revocar (el `owner` no se puede revocar). */
function AdminRow({
  admin,
  onRevoke,
  revoking,
}: {
  admin: PropertyAdmin
  onRevoke: () => void
  revoking: boolean
}) {
  const isOwner = admin.role === 'owner'
  return (
    <div className="bg-card flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate font-mono text-xs">{admin.userId}</p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          <Badge variant={isOwner ? 'default' : 'secondary'}>{ADMIN_ROLE_LABEL[admin.role]}</Badge>
          {admin.status !== 'active' && <span>{PERSON_STATUS_LABEL[admin.status]}</span>}
        </div>
      </div>
      {!isOwner && (
        <Button
          size="icon"
          variant="ghost"
          aria-label="Revocar co-admin"
          onClick={onRevoke}
          disabled={revoking || admin.status === 'revoked'}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  )
}

/** Equipo de la propiedad: co-admins activos (owner, managers y encargados) con opción de revocar. */
function AdminsSection({ propertyId }: { propertyId: string }) {
  const admins = usePropertyAdmins(propertyId)
  const revoke = useRevokeAdmin(propertyId)
  const items = admins.data ?? []

  async function onRevoke(adminId: string) {
    try {
      await revoke.mutateAsync(adminId)
      toast.success('Co-admin revocado')
    } catch (err) {
      toast.error(friendlyMessage(err))
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Equipo</h2>
      {admins.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : admins.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {friendlyMessage(admins.error)}
        </p>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-center text-sm">
            Todavía no hay co-admins.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((a) => (
            <li key={a.id}>
              <AdminRow admin={a} onRevoke={() => onRevoke(a.id)} revoking={revoke.isPending} />
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
          <PropertyOverview property={property.data} />
          <QrSection property={property.data} />
          <UnitsSection propertyId={property.data.id} />
          <AdminsSection propertyId={property.data.id} />
          <InvitationsSection property={property.data} />
        </>
      ) : null}
    </div>
  )
}
