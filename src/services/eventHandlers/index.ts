/**
 * Event Handlers Module
 *
 * This module provides event handling for the bathroom planner 3D scene.
 * The architecture has been refactored from a monolithic EventHandlers class
 * to a modular system with focused handlers coordinated by InteractionCoordinator.
 *
 * Architecture:
 * - InteractionCoordinator: Main coordinator that wires all handlers together
 * - SharedState: Centralized state container for all handlers
 * - Handlers:
 *   - CameraHandler: Camera orbit, zoom, pan, and view mode
 *   - SelectionHandler: Object selection, multi-select, highlighting
 *   - DragHandler: Object dragging, collision detection
 *   - RotationHandler: Object rotation, rotation arrows
 *   - HeightScaleHandler: Height adjustment, scaling
 *
 * Usage:
 *   // New modular approach (recommended for new code)
 *   import { InteractionCoordinator } from '../services/eventHandlers';
 *
 *   // Backward compatible (existing code)
 *   import { EventHandlers } from '../services/eventHandlers';
 */

// Re-export the original EventHandlers for backward compatibility
export { EventHandlers } from '../eventHandlers';

// Export the new InteractionCoordinator as an alternative
export { InteractionCoordinator } from './InteractionCoordinator';
export type { InteractionCoordinatorOptions } from './InteractionCoordinator';

// Export types for external use
export type {
  EventHandlerOptions,
  HandlerContext,
  EventHandlerCallbacks,
  UpdateData,
  IntersectionResult,
} from './types';

// Export SharedState for testing and advanced use cases
export { SharedState } from './SharedState';

// Export individual handlers for direct use if needed
export { CameraHandler } from './handlers/CameraHandler';
export { SelectionHandler } from './handlers/SelectionHandler';
export { HeightScaleHandler } from './handlers/HeightScaleHandler';
export { RotationHandler } from './handlers/RotationHandler';
export { DragHandler } from './handlers/DragHandler';
