/** Forma uniforme de error del backend TocToc: { name, code, message }. */
export interface ApiError {
  name: string
  code: number
  message: string
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'number' &&
    'message' in value
  )
}

/** Error tipado lanzado por el cliente HTTP (compatible con TanStack Query). */
export class ApiRequestError extends Error {
  readonly code: number

  constructor(error: ApiError) {
    super(error.message)
    this.name = error.name || 'ApiRequestError'
    this.code = error.code
  }
}

/** Mensaje amigable por código HTTP, para mostrar en UI. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof ApiRequestError || isApiError(error)) {
    switch (error.code) {
      case 401:
        return 'Tu sesión expiró. Volvé a iniciar sesión.'
      case 403:
        return 'No tenés permiso para esta acción.'
      case 404:
        return 'No se encontró el recurso (puede haber expirado).'
      case 409:
        return 'Ya fue resuelto por otra persona.'
      default:
        return error.message || 'Ocurrió un error inesperado.'
    }
  }
  return 'Error de red. Revisá tu conexión e intentá de nuevo.'
}
