/**
 * Type-safe event bus for decoupling SceneManager and EventHandlers.
 * Uses native EventTarget for minimal overhead and browser compatibility.
 */

import * as THREE from 'three';
import type { ViewMode } from '../constants/camera';

// ============================================================================
// EVENT PAYLOAD TYPES
// ============================================================================

/**
 * Events emitted by EventHandlers (consumed by SceneManager)
 */
export interface SceneEventPayloads {
  // High-frequency: called during drag (every frame)
  'schematic:update': { itemId: number };

  // Medium-frequency: user pan/zoom interactions
  'camera:pan2d': { deltaX: number; deltaZ: number };
  'camera:zoom2d': { delta: number };
}

/**
 * Events emitted by SceneManager (consumed by EventHandlers)
 */
export interface EventHandlerPayloads {
  // Low-frequency: view mode transitions
  'view:modeChanged': { mode: ViewMode };
  'camera:orthographicReady': { camera: THREE.OrthographicCamera };
  'camera:syncPosition': Record<string, never>;
}

// Combined map for type inference
export type AllEventPayloads = SceneEventPayloads & EventHandlerPayloads;

// ============================================================================
// TYPE-SAFE EVENT BUS
// ============================================================================

type EventCallback<T> = (payload: T) => void;
type UnsubscribeFn = () => void;

/**
 * Type-safe event bus using native EventTarget.
 *
 * Performance considerations:
 * - Uses native EventTarget for minimal overhead
 * - Event listeners are synchronous (no promise overhead)
 * - Payload is passed via CustomEvent.detail (no serialization)
 *
 * Usage:
 *   const bus = new SceneEventBus();
 *   const unsub = bus.on('schematic:update', ({ itemId }) => { ... });
 *   bus.emit('schematic:update', { itemId: 42 });
 *   unsub(); // cleanup
 */
export class SceneEventBus {
  private target: EventTarget;
  private listenerMap: Map<string, Map<EventCallback<unknown>, EventListener>>;

  constructor() {
    this.target = new EventTarget();
    this.listenerMap = new Map();
  }

  /**
   * Subscribe to an event with type-safe payload.
   * Returns an unsubscribe function for cleanup.
   */
  on<K extends keyof AllEventPayloads>(
    event: K,
    callback: EventCallback<AllEventPayloads[K]>
  ): UnsubscribeFn {
    const listener: EventListener = (e: Event) => {
      const customEvent = e as CustomEvent<AllEventPayloads[K]>;
      try {
        callback(customEvent.detail);
      } catch (error) {
        console.error(`[SceneEventBus] Error in listener for "${event}":`, error);
      }
    };

    // Store mapping for later removal
    if (!this.listenerMap.has(event)) {
      this.listenerMap.set(event, new Map());
    }
    this.listenerMap.get(event)!.set(callback as EventCallback<unknown>, listener);

    this.target.addEventListener(event, listener);

    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe a specific callback from an event.
   */
  off<K extends keyof AllEventPayloads>(
    event: K,
    callback: EventCallback<AllEventPayloads[K]>
  ): void {
    const eventListeners = this.listenerMap.get(event);
    if (!eventListeners) return;

    const listener = eventListeners.get(callback as EventCallback<unknown>);
    if (listener) {
      this.target.removeEventListener(event, listener);
      eventListeners.delete(callback as EventCallback<unknown>);
    }
  }

  /**
   * Emit an event with type-safe payload.
   * Synchronous dispatch for performance.
   */
  emit<K extends keyof AllEventPayloads>(
    event: K,
    payload: AllEventPayloads[K]
  ): void {
    try {
      const customEvent = new CustomEvent(event, { detail: payload });
      this.target.dispatchEvent(customEvent);
    } catch (error) {
      console.error(`[SceneEventBus] Error emitting event "${event}":`, error);
    }
  }

  /**
   * Subscribe to an event for a single invocation.
   */
  once<K extends keyof AllEventPayloads>(
    event: K,
    callback: EventCallback<AllEventPayloads[K]>
  ): UnsubscribeFn {
    const wrappedCallback: EventCallback<AllEventPayloads[K]> = (payload) => {
      this.off(event, wrappedCallback);
      callback(payload);
    };
    return this.on(event, wrappedCallback);
  }

  /**
   * Remove all listeners for a specific event.
   */
  removeAllListeners<K extends keyof AllEventPayloads>(event: K): void {
    const eventListeners = this.listenerMap.get(event);
    if (!eventListeners) return;

    eventListeners.forEach((listener) => {
      this.target.removeEventListener(event, listener);
    });
    this.listenerMap.delete(event);
  }

  /**
   * Dispose all listeners. Call on cleanup.
   */
  dispose(): void {
    this.listenerMap.forEach((eventListeners, event) => {
      eventListeners.forEach((listener) => {
        this.target.removeEventListener(event, listener);
      });
    });
    this.listenerMap.clear();
  }
}

/**
 * Factory function for creating event bus instance.
 */
export function createSceneEventBus(): SceneEventBus {
  return new SceneEventBus();
}
