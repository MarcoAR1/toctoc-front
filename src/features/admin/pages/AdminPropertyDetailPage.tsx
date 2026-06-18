import { useParams } from 'react-router-dom'

import { Placeholder } from '@/components/common/Placeholder'

/** Detalle de propiedad: unidades, QR, residentes, admins, bitácoras. */
export function AdminPropertyDetailPage() {
  const { id } = useParams()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Propiedad</h1>
      <Placeholder
        title={`Detalle ${id ?? ''}`}
        milestone="M1 / M4"
        description="Unidades, QR (ver/imprimir/rotar), residentes, admins y bitácoras."
      >
        <p>
          <code>GET /properties/{'{id}'}/units</code> · <code>/qr</code> · <code>/memberships</code> ·{' '}
          <code>/admins</code> · bitácoras de <code>rings</code>/<code>access</code>/<code>calls</code>.
        </p>
      </Placeholder>
    </div>
  )
}
