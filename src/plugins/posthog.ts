import posthog from 'posthog-js'
import type { CapturedNetworkRequest } from 'posthog-js'
import type { App } from 'vue'

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token']
const SENSITIVE_BODY_KEYS = /password|secret|token|credential|ssn|credit.?card/i

/**
 * Strip sensitive headers and body fields from captured network requests.
 */
function maskNetworkRequest(request: CapturedNetworkRequest): CapturedNetworkRequest | undefined {
  if (request.requestHeaders) {
    for (const key of Object.keys(request.requestHeaders)) {
      if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
        request.requestHeaders[key] = '[REDACTED]'
      }
    }
  }

  if (request.responseHeaders) {
    for (const key of Object.keys(request.responseHeaders)) {
      if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
        request.responseHeaders[key] = '[REDACTED]'
      }
    }
  }

  if (request.requestBody && typeof request.requestBody === 'string') {
    try {
      const body = JSON.parse(request.requestBody)
      for (const key of Object.keys(body)) {
        if (SENSITIVE_BODY_KEYS.test(key)) {
          body[key] = '[REDACTED]'
        }
      }
      request.requestBody = JSON.stringify(body)
    } catch {
      // Not JSON — leave as-is
    }
  }

  return request
}

/**
 * Initialize PostHog immediately.
 * Call this only after confirming a real user interaction.
 */
export function initPostHog(app: App): void {
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
    capture_pageview: 'history_change',
    enable_recording_console_log: true,
    session_recording: {
      recordHeaders: true,
      recordBody: true,
      maskCapturedNetworkRequestFn: maskNetworkRequest,
    },
  })

  // Capture Vue component errors in PostHog while preserving any existing handler
  const prevHandler = app.config.errorHandler
  app.config.errorHandler = (err, instance, info) => {
    posthog.captureException(err as Error, {
      vue_component: instance?.$options?.name || 'Unknown',
      vue_info: info,
    })
    if (prevHandler) {
      prevHandler(err, instance, info)
    } else if (import.meta.env.DEV) {
      console.error(err)
    }
  }

  if (import.meta.env.DEV) {
    console.log('✅ PostHog loaded after user interaction')
  }
}

/**
 * Get the PostHog instance for manual event tracking in components.
 */
export function getPostHog() {
  return posthog
}
