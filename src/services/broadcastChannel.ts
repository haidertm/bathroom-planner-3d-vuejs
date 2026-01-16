// BroadcastChannel Service for Cross-Tab Synchronization
// Enables real-time sync between browser tabs sharing the same origin

import type { AdminProduct, AdminStats } from '../types/admin';

// Message types for different sync events
export type BroadcastMessageType =
  | 'product-created'
  | 'product-updated'
  | 'product-deleted'
  | 'product-toggled'
  | 'cache-synced'
  | 'cache-invalidated';

export interface BroadcastMessage {
  type: BroadcastMessageType;
  payload?: {
    product?: AdminProduct;
    productId?: string;
    products?: AdminProduct[];
    stats?: AdminStats;
  };
  timestamp: number;
  tabId: string;
}

// Unique ID for this tab (to ignore own messages if needed)
const TAB_ID = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Channel name
const CHANNEL_NAME = 'bathroom-planner-sync';

// Singleton channel instance
let channel: BroadcastChannel | null = null;

// Registered listeners
type MessageHandler = (message: BroadcastMessage) => void;
const listeners: Set<MessageHandler> = new Set();

/**
 * Check if BroadcastChannel is supported
 */
export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

/**
 * Get or create the broadcast channel
 */
function getChannel(): BroadcastChannel | null {
  if (!isBroadcastChannelSupported()) {
    if (import.meta.env.DEV) {
      console.warn('[BroadcastChannel] Not supported in this browser');
    }
    return null;
  }

  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);

    // Set up message handler
    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const message = event.data;

      if (import.meta.env.DEV) {
        console.log('[BroadcastChannel] Received:', message.type, message);
      }

      // Notify all registered listeners
      listeners.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('[BroadcastChannel] Handler error:', error);
        }
      });
    };

    if (import.meta.env.DEV) {
      console.log('[BroadcastChannel] Initialized with tabId:', TAB_ID);
    }
  }

  return channel;
}

/**
 * Broadcast a message to all other tabs
 */
export function broadcast(
  type: BroadcastMessageType,
  payload?: BroadcastMessage['payload']
): void {
  const ch = getChannel();
  if (!ch) return;

  const message: BroadcastMessage = {
    type,
    payload,
    timestamp: Date.now(),
    tabId: TAB_ID,
  };

  try {
    ch.postMessage(message);
    if (import.meta.env.DEV) {
      console.log('[BroadcastChannel] Sent:', type, payload);
    }
  } catch (error) {
    console.error('[BroadcastChannel] Failed to send:', error);
  }
}

/**
 * Subscribe to broadcast messages
 * Returns unsubscribe function
 */
export function subscribe(handler: MessageHandler): () => void {
  // Ensure channel is initialized
  getChannel();

  listeners.add(handler);

  // Return unsubscribe function
  return () => {
    listeners.delete(handler);
  };
}

/**
 * Get current tab ID
 */
export function getTabId(): string {
  return TAB_ID;
}

/**
 * Check if message is from current tab
 */
export function isOwnMessage(message: BroadcastMessage): boolean {
  return message.tabId === TAB_ID;
}

/**
 * Close the channel (cleanup)
 */
export function closeChannel(): void {
  if (channel) {
    channel.close();
    channel = null;
    listeners.clear();
    if (import.meta.env.DEV) {
      console.log('[BroadcastChannel] Closed');
    }
  }
}

// Convenience functions for specific events
export const broadcastProductCreated = (product: AdminProduct) =>
  broadcast('product-created', { product });

export const broadcastProductUpdated = (product: AdminProduct) =>
  broadcast('product-updated', { product });

export const broadcastProductDeleted = (productId: string) =>
  broadcast('product-deleted', { productId });

export const broadcastProductToggled = (product: AdminProduct) =>
  broadcast('product-toggled', { product });

export const broadcastCacheSynced = (products: AdminProduct[], stats?: AdminStats) =>
  broadcast('cache-synced', { products, stats });

export const broadcastCacheInvalidated = () =>
  broadcast('cache-invalidated');
