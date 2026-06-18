import { Placeholder } from '@/components/common/Placeholder'

/** Listado de propiedades del admin + onboarding. */
export function AdminPropertiesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Propiedades</h1>
        <p className="text-muted-foreground text-sm">Edificios, casas, dúplex y complejos.</p>
      </div>
      <Placeholder title="Mis propiedades" milestone="M1 / M4" description="GET /properties · POST /properties (onboarding).">
        <p>Crear propiedad, cargar unidades, ver/imprimir/rotar el QR y gestionar residentes y staff.</p>
      </Placeholder>
    </div>
  )
}
