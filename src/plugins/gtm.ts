import { createGtm } from '@gtm-support/vue-gtm'
import type { App } from 'vue'
import type { Router } from 'vue-router'

/**
 * Polyfill for requestIdleCallback (Safari compatibility)
 */
const requestIdleCallbackPolyfill = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options)
  }
  // Fallback: use setTimeout with a reasonable delay
  const start = Date.now()
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    })
  }, 1) as unknown as number
}

/**
 * Cancel idle callback (with polyfill support)
 */
const cancelIdleCallbackPolyfill = (id: number) => {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(id)
  } else {
    clearTimeout(id)
  }
}

/**
 * Initialize GTM with advanced lazy loading strategy
 *
 * Performance Strategy:
 * 1. Waits for user interaction (scroll, mousemove, touchstart, click)
 * 2. OR uses requestIdleCallback to load during browser idle time
 * 3. Fallback timeout of 5 seconds if neither occurs
 *
 * This ensures GTM never blocks critical rendering or user interactions,
 * which is crucial for 3D applications like the bathroom planner.
 *
 * @param app - Vue application instance
 * @param router - Vue Router instance for automatic page tracking
 */
export function setupGTM(app: App, router: Router) {
  const gtmId = import.meta.env.VITE_GTM_ID

  // Skip GTM initialization if no ID provided
  if (!gtmId) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ GTM ID not provided. Skipping GTM initialization.')
      console.info('💡 Add VITE_GTM_ID to your .env file to enable GTM')
    }
    return
  }

  let gtmLoaded = false
  const FALLBACK_TIMEOUT = 5000 // 5 seconds
  const IDLE_TIMEOUT = 3000 // 3 seconds for requestIdleCallback

  /**
   * Loads GTM script and initializes the plugin
   */
  const loadGTM = () => {
    if (gtmLoaded) return
    gtmLoaded = true

    // Clean up event listeners
    window.removeEventListener('scroll', handleUserInteraction)
    window.removeEventListener('mousemove', handleUserInteraction)
    window.removeEventListener('touchstart', handleUserInteraction)
    window.removeEventListener('click', handleUserInteraction)

    // Clear timeouts
    clearTimeout(fallbackTimeout)
    if (idleCallbackId !== undefined) {
      cancelIdleCallbackPolyfill(idleCallbackId)
    }

    // Initialize GTM plugin
    app.use(
      createGtm({
        id: gtmId,
        defer: true, // Use defer attribute for better performance
        enabled: true,
        debug: import.meta.env.DEV, // Enable debug mode in development
        loadScript: true, // Let the plugin load the script
        vueRouter: router, // Auto-track page views
        trackOnNextTick: false, // Track immediately for better accuracy
      })
    )

    if (import.meta.env.DEV) {
      console.log('✅ GTM loaded successfully:', gtmId)
      console.info('🔍 GTM Debug mode enabled - check console for tracking events')
    }
  }

  /**
   * Handler for user interaction events
   */
  const handleUserInteraction = () => {
    if (import.meta.env.DEV) {
      console.log('👆 User interaction detected - loading GTM')
    }
    loadGTM()
  }

  // Set up event listeners for user interaction
  // { passive: true } improves scroll performance
  // { once: true } auto-removes listener after first trigger
  const eventOptions: AddEventListenerOptions = { passive: true, once: true }
  window.addEventListener('scroll', handleUserInteraction, eventOptions)
  window.addEventListener('mousemove', handleUserInteraction, eventOptions)
  window.addEventListener('touchstart', handleUserInteraction, eventOptions)
  window.addEventListener('click', handleUserInteraction, eventOptions)

  // Use requestIdleCallback to load during idle time
  let idleCallbackId: number | undefined
  idleCallbackId = requestIdleCallbackPolyfill(
    () => {
      if (import.meta.env.DEV) {
        console.log('⏰ Browser idle detected - loading GTM')
      }
      loadGTM()
    },
    { timeout: IDLE_TIMEOUT }
  )

  // Fallback timeout to ensure GTM loads even if user is completely idle
  const fallbackTimeout = setTimeout(() => {
    if (import.meta.env.DEV) {
      console.log('⏱️ Fallback timeout reached - loading GTM')
    }
    loadGTM()
  }, FALLBACK_TIMEOUT)
}
