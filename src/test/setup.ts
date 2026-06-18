import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Con `globals: false`, Testing Library no registra su cleanup automático: sin esto los
// componentes renderizados se acumulan en el DOM entre tests del mismo archivo.
afterEach(() => cleanup())

// jsdom no implementa matchMedia; lo necesita el ThemeProvider.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
