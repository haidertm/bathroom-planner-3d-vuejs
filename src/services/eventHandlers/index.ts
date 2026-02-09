/**
 * Event Handlers Module
 *
 * This module provides event handling for the bathroom planner 3D scene.
 *
 * Current Status:
 * - EventHandlers: The original monolithic class with full drag/constraint logic
 * - InteractionCoordinator: New modular system (work in progress, drag logic incomplete)
 *
 * Usage:
 *   // Use EventHandlers for full functionality (recommended)
 *   import { EventHandlers } from '../services/eventHandlers';
 *
 *   // InteractionCoordinator available for future migration
 *   import { InteractionCoordinator } from '../services/eventHandlers';
 */

// Re-export the original EventHandlers (full functionality)
export { EventHandlers } from '../eventHandlers';

// Export the new InteractionCoordinator (work in progress)
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
