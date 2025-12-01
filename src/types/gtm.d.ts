/**
 * TypeScript definitions for GTM integration
 */

/**
 * Interface for GTM event tracking properties
 */
export interface GtmTrackEventProperties {
  /** Event type - defaults to 'interaction' */
  event?: string
  /** Event category (e.g., 'Product', 'User Action', 'Design') */
  category: string
  /** Action performed (e.g., 'Click', 'View', 'Submit', 'Add', 'Remove') */
  action: string
  /** Optional label for additional context */
  label?: string
  /** Optional numerical value */
  value?: number
  /** If true, won't affect bounce rate */
  noninteraction?: boolean
  /** Any custom properties */
  [key: string]: any
}

/**
 * Augment Vue ComponentCustomProperties to include $gtm
 */
declare module 'vue' {
  interface ComponentCustomProperties {
    $gtm: {
      enabled: () => boolean
      trackEvent: (properties: GtmTrackEventProperties) => void
      trackView: (screenName: string, path?: string) => void
    }
  }
}

/**
 * Augment Window interface to include dataLayer
 */
declare global {
  interface Window {
    dataLayer: any[]
  }
}

export {}
