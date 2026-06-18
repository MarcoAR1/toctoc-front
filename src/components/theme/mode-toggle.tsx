import { Laptop, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme, type Theme } from '@/components/theme/theme-context'

const ORDER: Theme[] = ['light', 'dark', 'system']
const ICONS = { light: Sun, dark: Moon, system: Laptop } as const

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  const Icon = ICONS[theme]
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`Tema actual: ${theme}. Cambiar a ${next}.`}
      title={`Tema: ${theme}`}
    >
      <Icon className="size-5" />
    </Button>
  )
}
