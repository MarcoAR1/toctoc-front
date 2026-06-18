import { ArrowRight, Building2, DoorOpen, QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/brand/Logo'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PERSONAS = [
  {
    to: '/r',
    title: 'Soy visitante',
    description: 'Escaneá el QR o ingresá el código para tocar el timbre.',
    icon: QrCode,
    cta: 'Tocar el timbre',
  },
  {
    to: '/app',
    title: 'Soy residente',
    description: 'Atendé el timbre, hablá con la visita y abrí la puerta.',
    icon: DoorOpen,
    cta: 'Entrar a mi app',
  },
  {
    to: '/admin',
    title: 'Administración',
    description: 'Gestioná propiedades, unidades, QR y residentes.',
    icon: Building2,
    cta: 'Ir al panel',
  },
]

export function LandingPage() {
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Logo className="size-8" />
          <span className="text-lg font-semibold">TocToc</span>
        </div>
        <ModeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10">
        <section className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            El timbre de tu edificio, ahora en el teléfono.
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Poné un QR en la entrada: el visitante escanea, toca el timbre y vos lo ves, hablás y le
            abrís la puerta. Sin porteros físicos.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {PERSONAS.map(({ to, title, description, icon: Icon, cta }) => (
            <Card key={to} className="flex flex-col justify-between">
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={to}>
                    {cta}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="text-muted-foreground mx-auto w-full max-w-5xl px-4 py-6 text-sm">
        TocToc — capa de llegadas y accesos para edificios, casas y complejos.
      </footer>
    </div>
  )
}
