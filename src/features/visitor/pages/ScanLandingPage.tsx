import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Entrada del visitante por código manual (fallback del QR). */
export function ScanLandingPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean) navigate(`/r/${clean}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tocar el timbre</CardTitle>
        <CardDescription>
          Escaneá el QR de la entrada con tu cámara, o ingresá el código de la propiedad.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Código de la propiedad</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: UN2SSCJ"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={12}
            />
          </div>
          <Button type="submit" disabled={!code.trim()}>
            Continuar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
