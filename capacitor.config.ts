import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Configuración de Capacitor (wrapper móvil de la PWA).
 * Las plataformas nativas (android/ios) se agregan más adelante con:
 *   npx cap add android   /   npx cap add ios
 * y se sincronizan con: npm run cap:sync (tras `npm run build`).
 */
const config: CapacitorConfig = {
  appId: 'com.toctoc.app',
  appName: 'TocToc',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
