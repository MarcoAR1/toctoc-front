import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renderiza su contenido como botón accesible', () => {
    render(<Button>Tocar el timbre</Button>)
    expect(screen.getByRole('button', { name: 'Tocar el timbre' })).toBeInTheDocument()
  })

  it('aplica la variante destructive', () => {
    render(<Button variant="destructive">Borrar</Button>)
    expect(screen.getByRole('button', { name: 'Borrar' })).toHaveClass('bg-destructive')
  })
})
