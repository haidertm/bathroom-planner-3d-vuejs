import posthog from 'posthog-js'
import type { App } from 'vue'
import type { Router } from 'vue-router'

/**
 * Initialize PostHog product analytics.
 *
 * Captures page views, errors, and user interactions automatically.
 * Page navigation is tracked via the Vue Router afterEach hook.
 * Vue component errors are captured via app.config.errorHandler.
 *
 * Skips initialization if the API key is not provided.
 */
export function setupPostHog(app: App, router: Router): void {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY

  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ PostHog API key not provided. Skipping initialization.')
      console.info('💡 Add VITE_POSTHOG_KEY to your .env file to enable PostHog')
    }
    return
  }

  posthog.init(apiKey, {
    api_host: 'https://us.i.posthog.com',
    autocapture: true,
    rageclick: true,
    capture_dead_clicks: true,
    capture_performance: true,
    capture_exceptions: true,
    enable_recording_console_log: true,
    session_recording: {
      recordHeaders: true,
      recordBody: true,
    },
  })

  // Capture Vue component errors in PostHog error tracking
  app.config.errorHandler = (err, instance, info) => {
    posthog.captureException(err as Error, {
      vue_component: instance?.$options?.name || 'Unknown',
      vue_info: info,
    })
    if (import.meta.env.DEV) {
      console.error(err)
    }
  }

  // Track SPA route changes
  router.afterEach((to) => {
    posthog.capture('$pageview', { path: to.fullPath })
  })

  if (import.meta.env.DEV) {
    console.log('✅ PostHog initialized')
  }
}

/**
 * Get the PostHog instance for manual event tracking in components.
 */
export function getPostHog() {
  return posthog
}
