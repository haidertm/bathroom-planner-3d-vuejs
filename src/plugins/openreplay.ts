import OpenReplay from '@openreplay/tracker'
import trackerAssist from '@openreplay/tracker-assist'
import type { App } from 'vue'
import type { Router } from 'vue-router'

// Global OpenReplay instance
let tracker: OpenReplay | null = null
let trackerLoading = false
let canvasObserver: MutationObserver | null = null
let canvasRestartInterval: ReturnType<typeof setInterval> | null = null
let visibilityChangeHandler: (() => void) | null = null


/**
 * Initialize OpenReplay with canvas capture support
 */
export function setupOpenReplay(_app: App, router: Router) {
    const projectKey = import.meta.env.VITE_OPENREPLAY_PROJECT_KEY
    const projectId = import.meta.env.VITE_OPENREPLAY_PROJECT_ID
    const ingestPoint = import.meta.env.VITE_OPENREPLAY_INGEST_POINT
    const assistSocketHost = import.meta.env.VITE_OPENREPLAY_ASSIST_URL

    // Skip if no project key
    if (!projectKey) {
        if (import.meta.env.DEV) {
            console.warn('⚠️ OpenReplay project key not provided')
        }
        return
    }

    // Simple lazy loading - wait for user interaction
    const loadOpenReplay = () => {
        if (tracker || trackerLoading) {
            if (import.meta.env.DEV) {
                console.warn('⚠️ OpenReplay already initialised or in progress. Skipping duplicate load.')
            }
            return
        }
        trackerLoading = true
        try {
            const trackerOptions: ConstructorParameters<typeof OpenReplay>[0] = {
                projectKey,
                obscureTextEmails: true,
                obscureInputEmails: true,
                respectDoNotTrack: false,
                __DISABLE_SECURE_MODE: import.meta.env.DEV, // Only disable in dev, not production
                consoleMethods: ['error', 'warn'],
                canvas: {
                    useAnimationFrame: true,
                },
            }

            if (ingestPoint) {
                trackerOptions.ingestPoint = ingestPoint
            }

            // Determine assist socket host
            let finalAssistSocketHost: string | undefined
            if (assistSocketHost) {
                try {
                    const normalizedAssistURL = new URL(assistSocketHost)
                    finalAssistSocketHost = normalizedAssistURL.origin
                } catch (error) {
                    console.warn('⚠️ Invalid VITE_OPENREPLAY_ASSIST_URL value. Expected a full URL.', error)
                }
            } else if (ingestPoint) {
                // Derive assist URL from ingest point for self-hosted deployments
                try {
                    const ingestURL = new URL(ingestPoint)
                    // Use the same host as ingest point, ensure HTTPS
                    finalAssistSocketHost = `https://${ingestURL.host}`
                } catch (error) {
                    console.warn('⚠️ Failed to derive assist URL from ingest point:', error)
                }
            }

            if (finalAssistSocketHost) {
                trackerOptions.assistSocketHost = finalAssistSocketHost
            }

            tracker = new OpenReplay(trackerOptions)

            // Configure tracker-assist with secure WebSocket
            const assistOptions: Parameters<typeof trackerAssist>[0] = {}
            if (finalAssistSocketHost) {
                // Ensure we use secure WebSocket (wss://)
                const wsHost = finalAssistSocketHost.replace('http://', 'https://')
                assistOptions.socketHost = wsHost
            }
            tracker.use(trackerAssist(assistOptions))

            tracker.start()
                .then((result) => {
                    trackerLoading = false
                    if (result?.success) {
                        // Initial canvas restart sequence
                        setTimeout(() => {
                            tracker?.restartCanvasTracking()
                        }, 500)

                        setTimeout(() => {
                            tracker?.restartCanvasTracking()
                        }, 1500)

                        setTimeout(() => {
                            tracker?.restartCanvasTracking()
                        }, 3000)

                        // Setup continuous canvas monitoring
                        setupCanvasMonitoring()

                        // Periodic canvas restart to handle WebGL context issues
                        startPeriodicCanvasRestart()

                        const sessionID = tracker?.getSessionID()
                        if (sessionID && typeof window !== 'undefined') {
                            const sessionInfo = tracker?.getSessionInfo()
                            const urlProjectIdentifier =
                                sessionInfo?.projectID ||
                                projectId ||
                                trackerOptions.projectKey

                            let baseURL = 'https://app.openreplay.com'
                            if (ingestPoint && ingestPoint.includes('ingest')) {
                                baseURL = ingestPoint.replace('/ingest', '')
                            }

                            const sessionURL = `${baseURL}/${urlProjectIdentifier}/session/${sessionID}`

                            // Set metadata in OpenReplay - this will show in Session Info section
                            tracker?.setMetadata('sessionURL', sessionURL)
                            tracker?.setMetadata('sessionID', sessionID)
                            tracker?.setMetadata('projectID', urlProjectIdentifier)

                            if (window.dataLayer) {
                                window.dataLayer.push({
                                    event: 'openreplay_session_started',
                                    openreplay_session_id: sessionID,
                                    openreplay_session_url: sessionURL,
                                })
                            }

                            // Send OpenReplay session data to Clarity for Events tab filtering
                            const sendToClarityWithRetry = (attempt = 1, maxAttempts = 10) => {
                                if (window.clarity) {
                                    try {
                                        // Force production URL if it's localhost
                                        let finalSessionURL = sessionURL;
                                        if (sessionURL.includes('localhost')) {
                                            const sessionIdMatch = sessionURL.match(/\/session\/([a-zA-Z0-9]+)/);
                                            if (sessionIdMatch) {
                                                finalSessionURL = `https://app.openreplay.com/${urlProjectIdentifier}/session/${sessionIdMatch[1]}`;
                                            }
                                        }

                                        // Set custom tags for Clarity Events tab filtering only
                                        window.clarity('set', 'OpenReplay_URL', finalSessionURL)
                                        window.clarity('set', 'OpenReplay_ID', sessionID)

                                        console.info('🎬 OpenReplay:', finalSessionURL)
                                    } catch (error) {
                                        console.error('❌ Clarity integration error:', error)
                                    }
                                } else if (attempt < maxAttempts) {
                                    setTimeout(() => sendToClarityWithRetry(attempt + 1, maxAttempts), 500)
                                } else {
                                    console.warn('⚠️ Clarity not available after ' + maxAttempts + ' attempts.')
                                }
                            }

                            sendToClarityWithRetry()
                        }
                    } else if (import.meta.env.DEV) {
                        console.warn('⚠️ OpenReplay start did not succeed:', result?.reason)
                    }
                })
                .catch((error) => {
                    trackerLoading = false
                    console.error('❌ OpenReplay start failed:', error)
                })

            // Track route changes
            router.afterEach((to) => {
                if (tracker) {
                    tracker.setMetadata('route', to.path)
                    tracker.setMetadata('routeName', to.name?.toString() || 'unknown')
                }
            })

            if (import.meta.env.DEV) {
                (window as any).__OPENREPLAY__ = tracker
                console.info('🎥 Session recording started')
                console.info('🖼️ Canvas recording enabled')
            }
        } catch (error) {
            trackerLoading = false
            console.error('❌ Failed to initialize OpenReplay:', error)
        }
    }

    // Load on first user interaction
    const handleInteraction = () => {
        loadOpenReplay()
    }

    const eventOptions: AddEventListenerOptions = { passive: true, once: true }
    window.addEventListener('scroll', handleInteraction, eventOptions)
    window.addEventListener('mousemove', handleInteraction, eventOptions)
    window.addEventListener('click', handleInteraction, eventOptions)

    // Fallback timeout
    setTimeout(() => {
        loadOpenReplay()
    }, 5000)
}

/**
 * Get the OpenReplay tracker instance
 */
export function getOpenReplayTracker(): OpenReplay | null {
    return tracker
}

/**
 * Manually force canvas tracking restart
 * Call this after your Three.js canvas is created
 */
export function forceCanvasRestart() {
    if (tracker?.restartCanvasTracking) {
        tracker.restartCanvasTracking()
    } else if (import.meta.env.DEV) {
        console.warn('⚠️ OpenReplay tracker not ready')
    }
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, payload?: Record<string, any>) {
    if (tracker) {
        tracker.event(eventName, payload)
    } else if (import.meta.env.DEV) {
        console.warn('⚠️ OpenReplay not initialized. Event not tracked:', eventName)
    }
}

/**
 * Set session metadata
 */
export function setMetadata(key: string, value: string) {
    if (tracker) {
        tracker.setMetadata(key, value)
    }
}

/**
 * Identify the current user
 */
export function identifyUser(userId: string, userUUID: string) {
    if (tracker) {
        tracker.setUserID(userUUID)
        tracker.setMetadata('userID', userId)
    }
}

/**
 * Setup MutationObserver to detect canvas element changes
 * This handles cases where Three.js canvas is recreated
 */
function setupCanvasMonitoring() {
    if (canvasObserver) {
        canvasObserver.disconnect()
    }

    canvasObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // Check for added canvas elements
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLCanvasElement ||
                        (node instanceof Element && node.querySelector('canvas'))) {
                        // Delay to ensure canvas is fully initialized
                        setTimeout(() => {
                            tracker?.restartCanvasTracking()
                        }, 100)
                    }
                })
            }

            // Check for attribute changes on canvas (e.g., size changes)
            if (mutation.type === 'attributes' && mutation.target instanceof HTMLCanvasElement) {
                setTimeout(() => {
                    tracker?.restartCanvasTracking()
                }, 100)
            }
        }
    })

    canvasObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['width', 'height']
    })
}

/**
 * Start periodic canvas restart to handle WebGL context loss/restore
 */
function startPeriodicCanvasRestart() {
    if (canvasRestartInterval) {
        clearInterval(canvasRestartInterval)
    }

    const intervalMs = 10000

    // Check and restart canvas tracking periodically
    canvasRestartInterval = setInterval(() => {
        const canvases = document.querySelectorAll('canvas')
        if (canvases.length > 0 && tracker) {
            tracker.restartCanvasTracking()
        }
    }, intervalMs)

    // Setup visibility change handler
    if (visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', visibilityChangeHandler)
    }

    visibilityChangeHandler = () => {
        if (document.visibilityState === 'visible' && tracker) {
            setTimeout(() => tracker?.restartCanvasTracking(), 100)
            setTimeout(() => tracker?.restartCanvasTracking(), 500)
            setTimeout(() => tracker?.restartCanvasTracking(), 1000)
        }
    }
    document.addEventListener('visibilitychange', visibilityChangeHandler)

    // Also restart on window focus
    window.addEventListener('focus', () => {
        if (tracker) {
            setTimeout(() => tracker?.restartCanvasTracking(), 100)
            setTimeout(() => tracker?.restartCanvasTracking(), 500)
        }
    })
}

/**
 * Handle WebGL context lost event
 * Call this from your Three.js setup
 */
export function handleWebGLContextLost() {
    // WebGL context lost - will restart canvas tracking on restore
}

/**
 * Handle WebGL context restored event
 * Call this from your Three.js setup
 */
export function handleWebGLContextRestored() {
    // Delay to ensure context is fully restored
    setTimeout(() => {
        tracker?.restartCanvasTracking()
    }, 500)
}

/**
 * Clean up OpenReplay resources
 * Call this on app unmount
 */
export function cleanupOpenReplay() {
    if (canvasObserver) {
        canvasObserver.disconnect()
        canvasObserver = null
    }
    if (canvasRestartInterval) {
        clearInterval(canvasRestartInterval)
        canvasRestartInterval = null
    }
    if (visibilityChangeHandler) {
        document.removeEventListener('visibilitychange', visibilityChangeHandler)
        visibilityChangeHandler = null
    }
    if (tracker) {
        tracker.stop()
        tracker = null
    }
}

/**
 * Check if OpenReplay is currently active
 */
export function isOpenReplayActive(): boolean {
    return tracker !== null && !trackerLoading
}

/**
 * Get current session ID
 */
export function getSessionID(): string | undefined {
    const sessionId = tracker?.getSessionID()
    return sessionId ?? undefined
}
