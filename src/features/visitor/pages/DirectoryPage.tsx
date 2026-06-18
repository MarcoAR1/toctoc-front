import { useParams } from 'react-router-dom'

import { Placeholder } from '@/components/common/Placeholder'

/** Directorio de unidades del visitante (GET /properties/by-code/{code}). */
export function DirectoryPage() {
  const { code, unitCode } = useParams()
  return (
    <Placeholder
      title="Directorio"
      milestone="M1"
      description="Elegí la unidad a la que querés tocar el timbre."
    >
      <p>
        Resolverá <code>GET /properties/by-code/{code}</code>
        {unitCode ? (
          <>
            {' '}
            y saltará directo al timbre de la unidad <code>{unitCode}</code>.
          </>
        ) : (
          ' y listará las unidades.'
        )}
      </p>
    </Placeholder>
  )
}
