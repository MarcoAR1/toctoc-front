import { Placeholder } from '@/components/common/Placeholder'

/** Historial de timbres / accesos / llamadas del residente. */
export function HistoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Historial</h1>
      <Placeholder title="Actividad" milestone="M2" description="Timbres, accesos y llamadas (más reciente primero).">
        <p>
          <code>GET /rings?unitId=</code> · <code>GET /access?unitId=</code> ·{' '}
          <code>GET /calls/by-unit?unitId=</code>.
        </p>
      </Placeholder>
    </div>
  )
}
