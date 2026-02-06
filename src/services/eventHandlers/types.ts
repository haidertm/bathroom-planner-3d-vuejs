/**
 * Type definitions for the EventHandlers system.
 * Extracted from eventHandlers.ts for better modularity.
 */

import * as THREE from 'three';
import type { Ref } from 'vue';
import type { BathroomPlannerState } from '../../composables/useUndoRedo';
import type { BathroomItem } from '../../utils/constraints';
import type { Position as PositionArrayType } from '../../models/bathroomFixtures';
import type { ViewMode } from '../../constants/camera';

// ============================================================================
// INTERSECTION & UPDATE TYPES
// ============================================================================

export interface IntersectionResult {
  object: THREE.Object3D;
  point: THREE.Vector3;
}

export interface UpdateData {
  position?: PositionArrayType;
  rotation?: number;
  scale?: number;
  [key: string]: any;
}

// ============================================================================
// FUNCTION TYPES
// ============================================================================

export type SaveToHistoryFunction = (state: BathroomPlannerState) => void;
export type SetItemsFunction = (updater: (items: BathroomItem[]) => BathroomItem[]) => void;
export type GetItemsFunction = () => BathroomItem[];
export type DeleteItemFunction = (itemId: number) => void;

// ============================================================================
// CALLBACK TYPES
// ============================================================================

export interface EventHandlerCallbacks {
  onItemSelected?: (itemId: number) => void;
  onItemDeselected?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onShowToast?: (message: string, type?: 'info' | 'warning' | 'error') => void;
}

// ============================================================================
// CONSTRUCTOR OPTIONS
// ============================================================================

export interface EventHandlerOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  roomWidthRef: Ref<number>;
  roomHeightRef: Ref<number>;
  notchWidthRef: Ref<number>;
  notchHeightRef: Ref<number>;
  setItems: SetItemsFunction;
  getItems: GetItemsFunction;
  deleteItem: DeleteItemFunction;
  preventCollisionPlacementRef: Ref<boolean>;
  saveToHistory: SaveToHistoryFunction;
  currentFloorTextureRef: Ref<number>;
  currentWallTextureRef: Ref<number>;
}

// ============================================================================
// HANDLER CONTEXT (Shared dependencies for all handlers)
// ============================================================================

export interface HandlerContext {
  // Core Three.js objects
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  // Room dimensions
  roomWidthRef: Ref<number>;
  roomHeightRef: Ref<number>;
  notchWidthRef: Ref<number>;
  notchHeightRef: Ref<number>;

  // Item management
  setItems: SetItemsFunction;
  getItems: GetItemsFunction;
  deleteItem: DeleteItemFunction;

  // Settings
  preventCollisionPlacementRef: Ref<boolean>;

  // History
  saveToHistory: SaveToHistoryFunction;
  currentFloorTextureRef: Ref<number>;
  currentWallTextureRef: Ref<number>;
}

// ============================================================================
// INTERACTION STATE
// ============================================================================

export interface InteractionState {
  // Mouse tracking
  mouse: THREE.Vector2;
  mouseX: number;
  mouseY: number;
  mouseDownPosition: THREE.Vector2;
  hasMouseMoved: boolean;
  wasEmptySpaceClicked: boolean;

  // Selection
  selectedObject: THREE.Object3D | null;
  selectedObjects: Map<number, THREE.Object3D>;
  isMultiSelectMode: boolean;
  wasAlreadySelected: boolean;

  // Drag state
  isDragging: boolean;
  isDragOperation: boolean;
  dragPlane: THREE.Plane;
  dragOffset: THREE.Vector3;
  originalDragPosition: THREE.Vector3;
  originalDragRotation: number;
  pendingUpdates: Map<number, UpdateData>;

  // Multi-select drag state
  multiSelectStartPositions: Map<number, THREE.Vector3>;
  multiSelectStartRotations: Map<number, number>;
  multiSelectLocalOffsets: Map<number, THREE.Vector3>;
  multiSelectLocalRotations: Map<number, number>;

  // Camera rotation state
  isRotating: boolean;
  targetCameraPosition: THREE.Vector3;

  // Object rotation state
  isObjectRotating: boolean;
  rotationStartAngle: number;
  objectStartRotation: number;

  // Height/scale state
  isHeightAdjusting: boolean;
  isScaling: boolean;
  heightStartY: number;
  scaleStart: number;
  mouseStartY: number;

  // Touch state
  lastTouchDistance: number;
  lastTouchTime: number;
  isTouchDevice: boolean;

  // View mode
  viewMode: ViewMode;
  orthographicCamera: THREE.OrthographicCamera | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const INTERACTION_CONSTANTS = {
  MOUSE_MOVE_THRESHOLD: 5,
  MIN_CAMERA_HEIGHT: 50, // 50cm minimum height above floor
  MAX_PHI_ANGLE: Math.PI / 2 - 0.1, // Slightly less than horizontal
  MEASUREMENT_UPDATE_THRESHOLD: 16, // ~60fps throttling
} as const;
