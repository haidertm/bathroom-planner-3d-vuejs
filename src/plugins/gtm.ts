import { createGtm } from '@gtm-support/vue-gtm'
import type { App } from 'vue'
import type { Router } from 'vue-router'

/**
 * Initialize GTM plugin immediately.
 * Called from main.ts on first user interaction.
 */
export function initGTM(app: App, router: Router) {
  const gtmId = import.meta.env.VITE_GTM_ID

  if (!gtmId) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ GTM ID not provided. Skipping GTM initialization.')
      console.info('💡 Add VITE_GTM_ID to your .env file to enable GTM')
    }
    return
  }

  app.use(
    createGtm({
      id: gtmId,
      defer: true,
      enabled: true,
      debug: import.meta.env.DEV,
      loadScript: true,
      vueRouter: router as any,
      trackOnNextTick: false,
    })
  )

  if (import.meta.env.DEV) {
    console.info('🔍 GTM loaded after user interaction')
  }
}
