import { QueryClient } from '@tanstack/react-query'

import { ApiRequestError } from '@/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No reintentar errores de cliente (4xx); sí reintentar transitorios.
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError && error.code >= 400 && error.code < 500) return false
        return failureCount < 2
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})
