import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/components/theme/theme-context'

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner theme={resolvedTheme} className="toaster group" position="top-center" richColors {...props} />
  )
}

export { Toaster }
