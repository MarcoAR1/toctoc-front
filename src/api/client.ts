import createClient, { type Middleware } from 'openapi-fetch'

import type { paths } from '@/api/schema'
import { ApiRequestError, isApiError } from '@/api/errors'
import { config } from '@/config/env'
import { getAccessToken, useAuthStore } from '@/features/auth/store'

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = getAccessToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  onResponse({ response }) {
    // Token vencido/ inválido: limpiamos la sesión; las rutas protegidas redirigen al login.
    if (response.status === 401) useAuthStore.getState().clear()
    return response
  },
}

/** Cliente HTTP tipado contra el OpenAPI del backend TocToc. */
export const api = createClient<paths>({ baseUrl: config.apiUrl })
api.use(authMiddleware)

/**
 * Desempaqueta una respuesta de openapi-fetch ({ data, error }).
 * Lanza ApiRequestError si hay error (ideal para queryFn/mutationFn de TanStack Query).
 */
export function unwrap<T>(result: { data?: T; error?: unknown }): T {
  if (result.error !== undefined && result.error !== null) {
    if (isApiError(result.error)) throw new ApiRequestError(result.error)
    throw new Error('Respuesta no esperada del servidor')
  }
  return result.data as T
}
