import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { AppProviders } from '@/app/providers'
import '@/styles/globals.css'

// Registra el service worker de la PWA (auto-update).
registerSW({ immediate: true })

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('No se encontró el elemento #root')

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
)
