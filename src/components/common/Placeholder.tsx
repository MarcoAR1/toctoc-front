import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Tarjeta placeholder para pantallas todavía no implementadas.
 * Se reemplazará por la UI real de cada feature en los hitos M1–M5.
 */
export function Placeholder({
  title,
  description,
  milestone,
  children,
}: {
  title: string
  description?: string
  milestone?: string
  children?: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          {milestone ? <Badge variant="secondary">{milestone}</Badge> : null}
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent className="text-muted-foreground text-sm">{children}</CardContent> : null}
    </Card>
  )
}
