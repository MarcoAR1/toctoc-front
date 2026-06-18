import { Placeholder } from '@/components/common/Placeholder'

/** Home del residente: unidades, accesos rápidos, estado de conexión. */
export function ResidentHomePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Inicio</h1>
        <p className="text-muted-foreground text-sm">Tus unidades y actividad reciente.</p>
      </div>
      <Placeholder title="Mis propiedades" milestone="M2" description="GET /properties (donde sos miembro).">
        <p>Acceso a historial de timbres y accesos por unidad, e invitar residentes.</p>
      </Placeholder>
    </div>
  )
}
