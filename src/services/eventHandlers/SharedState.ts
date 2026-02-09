/**
 * Shared state container for all event handlers.
 * Centralizes state management to avoid duplication across handlers.
 */

import * as THREE from 'three';
import type { Ref } from 'vue';
import type { ViewMode } from '../../constants/camera';
import type { GroupConstraint } from '../../utils/groupConstraints';
import type { MeasurementSystem } from '../measurementSystem';
import type { SimpleWallCulling } from '../simpleWallCulling';
import type { RotationArrows } from '../rotationArrows';
import type { SceneEventBus } from '../sceneEventBus';
import type {
  HandlerContext,
  UpdateData,
  SaveToHistoryFunction,
  SetItemsFunction,
  GetItemsFunction,
  DeleteItemFunction,
} from './types';
import { INTERACTION_CONSTANTS } from './types';

/**
 * SharedState holds all state that needs to be accessed by multiple handlers.
 * It also provides the HandlerContext for dependency injection.
 */
export class SharedState {
  // ============================================================================
  // CONTEXT (Injected dependencies)
  // ============================================================================
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly roomWidthRef: Ref<number>;
  public readonly roomHeightRef: Ref<number>;
  public readonly notchWidthRef: Ref<number>;
  public readonly notchHeightRef: Ref<number>;
  public readonly setItems: SetItemsFunction;
  public readonly getItems: GetItemsFunction;
  public readonly deleteItem: DeleteItemFunction;
  public readonly preventCollisionPlacementRef: Ref<boolean>;
  public readonly saveToHistory: SaveToHistoryFunction;
  public readonly currentFloorTextureRef: Ref<number>;
  public readonly currentWallTextureRef: Ref<number>;

  // ============================================================================
  // RAYCASTING
  // ============================================================================
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;

  // ============================================================================
  // MOUSE TRACKING
  // ============================================================================
  public mouseX: number = 0;
  public mouseY: number = 0;
  public mouseDownPosition: THREE.Vector2;
  public hasMouseMoved: boolean = false;
  public wasEmptySpaceClicked: boolean = false;

  // ============================================================================
  // SELECTION STATE
  // ============================================================================
  public selectedObject: THREE.Object3D | null = null;
  public selectedObjects: Map<number, THREE.Object3D> = new Map();
  public isMultiSelectMode: boolean = false;
  public wasAlreadySelected: boolean = false;

  // ============================================================================
  // DRAG STATE
  // ============================================================================
  public isDragging: boolean = false;
  public isDragOperation: boolean = false;
  public dragPlane: THREE.Plane;
  public dragOffset: THREE.Vector3;
  public originalDragPosition: THREE.Vector3;
  public originalDragRotation: number = 0;
  public pendingUpdates: Map<number, UpdateData> = new Map();

  // ============================================================================
  // MULTI-SELECT DRAG STATE
  // ============================================================================
  public multiSelectStartPositions: Map<number, THREE.Vector3> = new Map();
  public multiSelectStartRotations: Map<number, number> = new Map();
  public multiSelectLocalOffsets: Map<number, THREE.Vector3> = new Map();
  public multiSelectLocalRotations: Map<number, number> = new Map();
  public groupConstraint: GroupConstraint | null = null;

  // ============================================================================
  // CAMERA ROTATION STATE
  // ============================================================================
  public isRotating: boolean = false;
  public targetCameraPosition: THREE.Vector3;

  // ============================================================================
  // OBJECT ROTATION STATE
  // ============================================================================
  public isObjectRotating: boolean = false;
  public rotationStartAngle: number = 0;
  public objectStartRotation: number = 0;

  // ============================================================================
  // HEIGHT/SCALE STATE
  // ============================================================================
  public isHeightAdjusting: boolean = false;
  public isScaling: boolean = false;
  public heightStartY: number = 0;
  public scaleStart: number = 1;
  public mouseStartY: number = 0;

  // ============================================================================
  // TOUCH STATE
  // ============================================================================
  public lastTouchDistance: number = 0;
  public lastTouchTime: number = 0;
  public isTouchDevice: boolean = false;

  // ============================================================================
  // VIEW MODE
  // ============================================================================
  public viewMode: ViewMode = '3d';
  public orthographicCamera: THREE.OrthographicCamera | null = null;

  // ============================================================================
  // SERVICES
  // ============================================================================
  public measurementSystem: MeasurementSystem | null = null;
  public wallCulling: SimpleWallCulling | null = null;
  public rotationArrows: RotationArrows | null = null;
  public eventBus: SceneEventBus | null = null;
  public eventBusUnsubscribers: (() => void)[] = [];

  // @deprecated - Use event bus instead. Kept for backward compatibility.
  public sceneManager: any = null;

  // ============================================================================
  // MEASUREMENT THROTTLING
  // ============================================================================
  public lastMeasurementUpdate: number = 0;
  public measurementUpdateThreshold: number = INTERACTION_CONSTANTS.MEASUREMENT_UPDATE_THRESHOLD;
  public pendingMeasurementTimeout: NodeJS.Timeout | null = null;

  // ============================================================================
  // DEBUG
  // ============================================================================
  public dragPlaneHelper: THREE.Mesh | null = null;
  public showDragPlaneDebug: boolean = false;
  public debugIntersectionPoint: THREE.Mesh | null = null;

  // ============================================================================
  // CALLBACKS
  // ============================================================================
  public onItemSelected?: (itemId: number) => void;
  public onItemDeselected?: () => void;
  public onDragStart?: () => void;
  public onDragEnd?: () => void;
  public onShowToast: ((message: string, type?: 'info' | 'warning' | 'error') => void) | null = null;

  // ============================================================================
  // CONSTANTS
  // ============================================================================
  public readonly MOUSE_MOVE_THRESHOLD = INTERACTION_CONSTANTS.MOUSE_MOVE_THRESHOLD;
  public readonly MIN_CAMERA_HEIGHT = INTERACTION_CONSTANTS.MIN_CAMERA_HEIGHT;
  public readonly MAX_PHI_ANGLE = INTERACTION_CONSTANTS.MAX_PHI_ANGLE;

  constructor(context: HandlerContext) {
    // Store context
    this.scene = context.scene;
    this.camera = context.camera;
    this.renderer = context.renderer;
    this.roomWidthRef = context.roomWidthRef;
    this.roomHeightRef = context.roomHeightRef;
    this.notchWidthRef = context.notchWidthRef;
    this.notchHeightRef = context.notchHeightRef;
    this.setItems = context.setItems;
    this.getItems = context.getItems;
    this.deleteItem = context.deleteItem;
    this.preventCollisionPlacementRef = context.preventCollisionPlacementRef;
    this.saveToHistory = context.saveToHistory;
    this.currentFloorTextureRef = context.currentFloorTextureRef;
    this.currentWallTextureRef = context.currentWallTextureRef;

    // Initialize Three.js objects
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mouseDownPosition = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();
    this.originalDragPosition = new THREE.Vector3();
    this.targetCameraPosition = context.camera.position.clone();

    // Detect touch device
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get the handler context for dependency injection.
   */
  public getContext(): HandlerContext {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      roomWidthRef: this.roomWidthRef,
      roomHeightRef: this.roomHeightRef,
      notchWidthRef: this.notchWidthRef,
      notchHeightRef: this.notchHeightRef,
      setItems: this.setItems,
      getItems: this.getItems,
      deleteItem: this.deleteItem,
      preventCollisionPlacementRef: this.preventCollisionPlacementRef,
      saveToHistory: this.saveToHistory,
      currentFloorTextureRef: this.currentFloorTextureRef,
      currentWallTextureRef: this.currentWallTextureRef,
    };
  }

  /**
   * Get the current items from the store.
   */
  public getCurrentItems() {
    return this.getItems();
  }

  /**
   * Check if any interaction is active.
   */
  public isAnyInteractionActive(): boolean {
    return this.isDragging || this.isRotating || this.isObjectRotating ||
           this.isHeightAdjusting || this.isScaling;
  }

  /**
   * Reset all interaction states.
   */
  public resetAllInteractionStates(): void {
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;
    this.isDragOperation = false;
    this.hasMouseMoved = false;
  }

  /**
   * Get the active camera based on view mode.
   */
  public getActiveCamera(): THREE.Camera {
    if (this.viewMode === '2d' && this.orthographicCamera) {
      return this.orthographicCamera;
    }
    return this.camera;
  }

  /**
   * Dispose of resources.
   */
  public dispose(): void {
    // Clean up event bus subscriptions
    this.eventBusUnsubscribers.forEach(unsub => unsub());
    this.eventBusUnsubscribers = [];

    // Clear pending timeout
    if (this.pendingMeasurementTimeout) {
      clearTimeout(this.pendingMeasurementTimeout);
      this.pendingMeasurementTimeout = null;
    }

    // Clear maps
    this.selectedObjects.clear();
    this.pendingUpdates.clear();
    this.multiSelectStartPositions.clear();
    this.multiSelectStartRotations.clear();
    this.multiSelectLocalOffsets.clear();
    this.multiSelectLocalRotations.clear();
  }
}
