/**
 * TypeScript definitions for OpenReplay integration
 */

import type OpenReplay from '@openreplay/tracker'

/**
 * Interface for OpenReplay custom event properties
 */
export interface OpenReplayEventProperties {
  /** Event name */
  name: string
  /** Optional event payload (must be JSON-serializable) */
  payload?: Record<string, any>
}

/**
 * Interface for OpenReplay metadata
 */
export interface OpenReplayMetadata {
  key: string
  value: string
}

/**
 * Augment Window interface to include OpenReplay tracker, GTM dataLayer, and Clarity
 */
declare global {
  interface Window {
    __OPENREPLAY__?: OpenReplay
    /** Google Tag Manager dataLayer for pushing events and variables */
    dataLayer?: Array<Record<string, any>>
    /** Microsoft Clarity API for custom tags and events */
    clarity?: {
      /** Set custom session tag */
      (command: 'set', key: string, value: string): void
      /** Identify user with custom ID and metadata */
      (command: 'identify', customId: string, customSessionId?: string, customPageId?: string, friendlyName?: string): void
      /** Track custom event */
      (command: 'event', eventName: string): void
    }
  }
}

export { }