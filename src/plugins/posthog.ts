import posthog from 'posthog-js'
import type { App } from 'vue'

/**
 * Initialize PostHog analytics with session recording
 */
export function setupPostHog(app: App) {
    const posthogKey = import.meta.env.VITE_POSTHOG_KEY

    if (!posthogKey) {
        if (import.meta.env.DEV) {
            console.warn('PostHog key not provided')
        }
        return
    }

    posthog.init(posthogKey, {
        api_host: 'https://us.i.posthog.com',
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
        capture_exceptions: true,
        session_recording: {
            recordHeaders: true,
            recordBody: true,
            maskAllInputs: false,
        },
        mask_personal_data_properties: true,
        custom_personal_data_properties: ['email'],
        loaded: (ph) => {
            if (import.meta.env.DEV) {
                console.log('PostHog loaded, session ID:', ph.get_session_id())
            }
        },
    })

    // Vue error handler integration
    const existingHandler = app.config.errorHandler
    app.config.errorHandler = (err, instance, info) => {
        posthog.capture('$exception', {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            source: 'vue_error_handler',
            info,
        })
        if (existingHandler) {
            existingHandler(err, instance, info)
        } else {
            console.error(err)
        }
    }

    if (import.meta.env.DEV) {
        console.log('PostHog initialized')
    }
}

/**
 * Get the PostHog instance
 */
export function getPostHog() {
    return posthog
}