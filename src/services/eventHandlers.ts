// src/services/eventHandlers.ts
import * as THREE from 'three';
import type { Ref } from 'vue';
import { ref } from 'vue';
import type { BathroomPlannerState } from '../composables/useUndoRedo';
import {
  getTouchDistance,
  highlightObject,
  setOutlineColor,
  updateMousePosition,
  updateTouchPosition
} from '../utils/helpers';
import {
  type BathroomItem, constrainToCorner,
  constrainToRoom,
  constrainToWalls,
  getDimensions,
  getInteriorBoundaries,
  wouldCollideWithExisting,
  wouldCollideWithExistingOrWalls
} from '../utils/constraints';
import { SCALE_LIMITS, WALL_SETTINGS, WallType } from '../constants/dimensions';
import type { ComponentType } from '../constants/components';
import { CAMERA_CONTROLS, LOOK_AT, type ViewMode } from '../constants/camera';
import { canMoveVertically, canRotateFreely, getMovementConfig } from '../utils/models';
import { MeasurementSystem } from './measurementSystem.ts';
import { type Position as PositionArrayType } from '../models/bathroomFixtures.ts';
import { type Position as PositionObjectType } from '../utils/constraints.ts';
import { SimpleWallCulling } from '../services/simpleWallCulling.ts';
import { RotationArrows } from './rotationArrows';
import {
  type GroupConstraint,
  ConstraintPriority,
  analyzeGroupConstraints,
  snapRotationTo90Degrees
} from '../utils/groupConstraints';

interface IntersectionResult {
  object: THREE.Object3D;
  point: THREE.Vector3;
}

interface UpdateData {
  position?: PositionArrayType;
  rotation?: number;
  scale?: number;

  [key: string]: any;
}

type SaveToHistoryFunction = (state: BathroomPlannerState) => void;

// Function type definitions
type SetItemsFunction = (updater: (items: BathroomItem[]) => BathroomItem[]) => void;
type GetItemsFunction = () => BathroomItem[];
type DeleteItemFunction = (itemId: number) => void;

export class EventHandlers {
  private saveToHistory: SaveToHistoryFunction;
  private currentFloorTextureRef: Ref<number>;
  private currentWallTextureRef: Ref<number>;
  // Core Three.js objects
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private roomWidthRef: Ref<number>;
  private roomHeightRef: Ref<number>;
  private notchWidthRef: Ref<number>;  // For L-shaped rooms
  private notchHeightRef: Ref<number>; // For L-shaped rooms
  private setItems: SetItemsFunction;
  private getItems: GetItemsFunction;
  private deleteItem: DeleteItemFunction;
  private preventCollisionPlacementRef: Ref<boolean>; // NEW: Collision prevention setting

  // Movement tracking
  private mouseDownPosition: THREE.Vector2;
  private hasMouseMoved: boolean;
  private wasEmptySpaceClicked: boolean;
  private readonly MOUSE_MOVE_THRESHOLD = 5;

  // Camera constraints - UPDATED FOR CENTIMETERS
  private readonly MIN_CAMERA_HEIGHT = 50; // 50cm minimum height above floor
  private readonly MAX_PHI_ANGLE = Math.PI / 2 - 0.1; // Slightly less than horizontal to stay above floor

  // Interaction state
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedObject: THREE.Object3D | null;
  private isDragging: boolean;
  private isRotating: boolean;
  private isObjectRotating: boolean;
  private isHeightAdjusting: boolean;
  private isScaling: boolean;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private rotationStartAngle: number;
  private objectStartRotation: number;
  private heightStartY: number;
  private scaleStart: number;
  private mouseStartY: number;
  private mouseX: number;
  private mouseY: number;
  private measurementSystem: MeasurementSystem | null = null;
  private lastMeasurementUpdate: number = 0;
  private measurementUpdateThreshold: number = 16; // ~60fps throttling
  private pendingMeasurementTimeout: NodeJS.Timeout | null = null;
  // private pendingMeasurementUpdate: boolean = false;

  // Store original position for collision snap-back
  private originalDragPosition: THREE.Vector3;
  private originalDragRotation: number;

  // Touch variables
  private lastTouchDistance: number;
  private lastTouchTime: number;
  private isTouchDevice: boolean;

  // Drag operation tracking
  private isDragOperation: boolean;
  private pendingUpdates: Map<number, UpdateData>;

  // Smooth zoom properties using constants
  private targetCameraPosition: THREE.Vector3;
  private wallCulling: SimpleWallCulling | null = null;
  private dragPlaneHelper: THREE.Mesh | null = null;
  private showDragPlaneDebug: boolean = false; // Toggle this for debug visualization
  // Also add intersection point visualization in handleMouseMove:
  private debugIntersectionPoint: THREE.Mesh | null = null;
  private rotationArrows: RotationArrows | null = null;
  public onItemSelected?: (itemId: number) => void;
  public onItemDeselected?: () => void;
  public onDragStart?: () => void;
  public onDragEnd?: () => void;

  // Multi-selection state
  private selectedObjects: Map<number, THREE.Object3D> = new Map();
  private isMultiSelectMode: boolean = false;
  private multiSelectStartPositions: Map<number, THREE.Vector3> = new Map();
  private multiSelectStartRotations: Map<number, number> = new Map();
  private multiSelectLocalOffsets: Map<number, THREE.Vector3> = new Map();
  private multiSelectLocalRotations: Map<number, number> = new Map();
  private wasAlreadySelected: boolean = false;
  // Group constraint for multi-selection (cached on drag start)
  private groupConstraint: GroupConstraint | null = null;

  // 2D/3D View Mode
  private viewMode: ViewMode = '3d';
  public orthographicCamera: THREE.OrthographicCamera | null = null; // Public for SceneManager access
  private sceneManager: any = null; // Reference to SceneManager for 2D zoom

  /**
   * Toggle multi-selection mode
   */
  public setMultiSelectMode(enabled: boolean): void {
    this.isMultiSelectMode = enabled;
  }

  /**
   * Select all items in the current suite
   */
  public selectAllItems(): void {
    const items = this.getCurrentItems();
    this.clearSelection();

    items.forEach(item => {
      const object = this.findObjectInScene(item.id);
      if (object) {
        this.selectedObjects.set(item.id, object);
      }
    });

    this.updateMultiSelectionHighlight();
  }

  /**
   * Helper to find a Three.js object by its itemId
   */
  private findObjectInScene(itemId: number): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    this.scene.traverse(obj => {
      if (obj.userData.isBathroomItem && obj.userData.itemId === itemId) {
        found = obj;
      }
    });
    return found;
  }

  /**
   * Update highlighting for all selected objects
   */
  private updateMultiSelectionHighlight(): void {
    const objects = Array.from(this.selectedObjects.values());
    import('../utils/helpers').then(helpers => {
      helpers.highlightObjects(objects, true);
    });

    // Update rotation arrows for the "primary" selected object
    if (this.selectedObjects.size === 1) {
      this.selectedObject = objects[0];
      if (this.rotationArrows) {
        const itemId = this.selectedObject.userData.itemId;
        const currentItem = this.getCurrentItemData(itemId);
        const movementConfig = getMovementConfig(this.selectedObject.userData.type, currentItem);
        if (movementConfig?.allowFreeRotation) {
          this.rotationArrows.setSelectedObject(this.selectedObject);
        }
      }
    } else {
      // Hide rotation arrows if multiple objects are selected
      if (this.rotationArrows) {
        this.rotationArrows.setSelectedObject(null);
      }
    }
  }
  /**
   * Update highlighting for all selected objects
   */
  private updateHighlight(highlight: boolean = true): void {
    if (this.isMultiSelectMode || this.selectedObjects.size > 0) {
      const objects = Array.from(this.selectedObjects.values());
      import('../utils/helpers').then(helpers => {
        helpers.highlightObjects(objects, highlight);
      });
    } else if (this.selectedObject) {
      import('../utils/helpers').then(helpers => {
        helpers.highlightObject(this.selectedObject, highlight);
      });
    } else {
      import('../utils/helpers').then(helpers => {
        helpers.highlightObjects([], false);
      });
    }
  }

  constructor(

    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    roomWidthRef: Ref<number>,
    roomHeightRef: Ref<number>,
    notchWidthRef: Ref<number>,   // For L-shaped rooms
    notchHeightRef: Ref<number>,  // For L-shaped rooms
    setItems: SetItemsFunction,
    getItems: GetItemsFunction,
    deleteItem: DeleteItemFunction,
    preventCollisionPlacementRef: Ref<boolean> = ref(true),// NEW: Accept collision prevention setting
    saveToHistory: SaveToHistoryFunction,
    currentFloorTextureRef: Ref<number>,
    currentWallTextureRef: Ref<number>
  ) {
    // Assign core objects
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.roomWidthRef = roomWidthRef;
    this.roomHeightRef = roomHeightRef;
    this.notchWidthRef = notchWidthRef;   // For L-shaped rooms
    this.notchHeightRef = notchHeightRef; // For L-shaped rooms
    this.setItems = setItems;
    this.getItems = getItems;
    this.deleteItem = deleteItem;
    this.preventCollisionPlacementRef = preventCollisionPlacementRef; // NEW: Store collision prevention setting

    // Initialize interaction state
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedObject = null;
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();
    this.rotationStartAngle = 0;
    this.objectStartRotation = 0;
    this.heightStartY = 0;
    this.scaleStart = 1;
    this.mouseStartY = 0;
    this.mouseX = 0;
    this.mouseY = 0;

    // Initialize original position tracking
    this.originalDragPosition = new THREE.Vector3();
    this.originalDragRotation = 0;

    // Initialize touch variables
    this.lastTouchDistance = 0;
    this.lastTouchTime = 0;
    this.isTouchDevice = 'ontouchstart' in window;

    // Initialize drag operation tracking
    this.isDragOperation = false;
    this.pendingUpdates = new Map<number, UpdateData>();

    // Initialize target camera position
    this.targetCameraPosition = this.camera.position.clone();

    // Initialize new tracking properties
    this.mouseDownPosition = new THREE.Vector2();
    this.hasMouseMoved = false;
    this.wasEmptySpaceClicked = false;

    this.saveToHistory = saveToHistory;
    this.currentFloorTextureRef = currentFloorTextureRef;
    this.currentWallTextureRef = currentWallTextureRef;

    // Bind methods
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    // 🔧 FIX: Bind the new visibility change handler
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.rotationArrows = new RotationArrows(this.scene, this.camera, this.renderer);

    // Simple animation loop ONLY for zoom
    this.startSimpleZoomAnimation();
    this.rotationArrows.setRotationChangeCallback((rotation: number) => {
      if (this.selectedObject) {
        // Batch arrow-driven rotations like a drag op
        if (!this.isDragOperation) {
          this.isDragOperation = true;
          this.pendingUpdates.clear();
        }
        const itemId = this.selectedObject.userData.itemId as number;
        const objectType = this.selectedObject.userData.type as ComponentType;

        // Update the object's rotation
        this.selectedObject.rotation.y = rotation;

        // ✅ GENERIC: Check for ANY object that has free rotation and doesn't snap to walls
        const currentItem = this.getCurrentItemData(itemId);
        const movementConfig = getMovementConfig(objectType, currentItem);

        // Apply rotation-aware positioning for all freestanding objects
        if (movementConfig.allowFreeRotation) {
          if (!movementConfig.snapToWall) {
            const currentPos = this.selectedObject.position.clone();
            const correctedPos = this.constrainFreeRotationObjectPosition(currentPos, objectType, currentItem);
            const EPS = 0.1; // cm

            if (Math.abs(correctedPos.x - currentPos.x) > EPS || Math.abs(correctedPos.z - currentPos.z) > EPS) {
              this.selectedObject.position.copy(correctedPos);

              // Update data model with both rotation and corrected position
              this.queueUpdate(itemId, {
                rotation: rotation,
                position: [correctedPos.x, correctedPos.y, correctedPos.z]
              });
            } else {
              // Position didn't need adjustment, just update rotation
              this.queueUpdate(itemId, { rotation });
            }
          } else {
            // Wall-mounted or non-free-rotation objects - just update rotation
            this.queueUpdate(itemId, { rotation });
          }

          // Update arrow positions to follow the object
          this.rotationArrows?.updateArrowPositions();

          // Update schematic overlay rotation in 2D mode
          if (this.sceneManager?.updateSchematicPosition) {
            this.sceneManager.updateSchematicPosition(itemId);
          }
        }
      }
    });


    this.rotationArrows.setRotationCompleteCallback((_rotation: number) => {
      if (this.selectedObject) {
        this.applyPendingUpdates();
        this.isDragOperation = false;
      }
    });
  }

  // Add this method to create/update the drag plane visualization:
  private updateDragPlaneVisualization(): void {
    if (!this.showDragPlaneDebug) {
      if (this.dragPlaneHelper) {
        this.scene.remove(this.dragPlaneHelper);
        this.dragPlaneHelper = null;
      }
      return;
    }

    // Remove old helper if it exists
    if (this.dragPlaneHelper) {
      this.scene.remove(this.dragPlaneHelper);
    }

    // Create a visual representation of the drag plane
    const planeSize = 500; // 5m x 5m visual plane
    const geometry = new THREE.PlaneGeometry(planeSize, planeSize);

    // Create semi-transparent material
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green color
      opacity: 0.3,
      transparent: true,
      side: THREE.DoubleSide,
      wireframe: false
    });

    this.dragPlaneHelper = new THREE.Mesh(geometry, material);

    // Position the plane helper based on the drag plane
    const normal = this.dragPlane.normal;
    const constant = this.dragPlane.constant;

    // Calculate a point on the plane
    const pointOnPlane = normal.clone().multiplyScalar(-constant);
    this.dragPlaneHelper.position.copy(pointOnPlane);

    // Orient the plane to match the drag plane normal
    this.dragPlaneHelper.lookAt(pointOnPlane.clone().add(normal));

    // Add edge highlighting
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const edgeLines = new THREE.LineSegments(edges, lineMaterial);
    this.dragPlaneHelper.add(edgeLines);

    // Add normal vector visualization
    const arrowHelper = new THREE.ArrowHelper(
      normal,
      pointOnPlane,
      100, // Arrow length
      0xff0000, // Red color for normal
      20, // Head length
      10  // Head width
    );
    this.scene.add(arrowHelper);

    // Store arrow helper reference for cleanup
    (this.dragPlaneHelper as any).arrowHelper = arrowHelper;

    this.scene.add(this.dragPlaneHelper);
  }

  private updateIntersectionPointVisualization(point: THREE.Vector3): void {
    if (!this.showDragPlaneDebug) {
      if (this.debugIntersectionPoint) {
        this.scene.remove(this.debugIntersectionPoint);
        this.debugIntersectionPoint = null;
      }
      return;
    }

    // Remove old helper if it exists
    if (this.debugIntersectionPoint) {
      this.scene.remove(this.debugIntersectionPoint);
    }

    // Create a sphere at the intersection point
    const geometry = new THREE.SphereGeometry(5, 16, 16); // 5cm radius sphere
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff, // Magenta for intersection point
      opacity: 0.8,
      transparent: true
    });

    this.debugIntersectionPoint = new THREE.Mesh(geometry, material);
    this.debugIntersectionPoint.position.copy(point);
    this.scene.add(this.debugIntersectionPoint);
  }

  public setWallCulling(wallCulling: SimpleWallCulling): void {
    this.wallCulling = wallCulling;
  }

  /**
   * Set the current view mode (2D or 3D)
   * Called by SceneManager when switching views
   */
  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;

    // Update rotation arrows camera for proper raycasting in 2D/3D mode
    if (this.rotationArrows) {
      const activeCamera = mode === '2d' && this.orthographicCamera
        ? this.orthographicCamera
        : this.camera;
      this.rotationArrows.setActiveCamera(activeCamera);
    }
  }

  /**
   * Get current view mode
   */
  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  /**
   * Set reference to SceneManager for 2D zoom control
   */
  public setSceneManager(sceneManager: any): void {
    this.sceneManager = sceneManager;
    if (sceneManager?.orthographicCamera) {
      this.orthographicCamera = sceneManager.orthographicCamera;
    }
  }

  /**
   * Set orthographic camera reference
   */
  public setOrthographicCamera(camera: THREE.OrthographicCamera): void {
    this.orthographicCamera = camera;
  }

  /**
   * Check if height adjustment is allowed (disabled in 2D mode)
   */
  private canAdjustHeight(): boolean {
    return this.viewMode === '3d';
  }

  /**
   * Get the active camera based on current view mode
   * Returns orthographic camera in 2D mode, perspective camera in 3D mode
   */
  private getActiveCamera(): THREE.Camera {
    if (this.viewMode === '2d' && this.orthographicCamera) {
      return this.orthographicCamera;
    }
    return this.camera;
  }

  public update(): void {
    // Update rotation arrows
    if (this.rotationArrows) {
      this.rotationArrows.update();
    }
  }

  private startSimpleZoomAnimation(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      const distance = this.camera.position.distanceTo(this.targetCameraPosition);
      if (distance > 0.1) {
        this.camera.position.lerp(this.targetCameraPosition, CAMERA_CONTROLS.ZOOM_SMOOTHING);
        this.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
      }
    };
    animate();
  }

  // Sync target camera position with current camera position (call after setCameraPreset)
  public syncTargetCameraPosition(): void {
    this.targetCameraPosition.copy(this.camera.position);
  }

  // Method to get current items for collision detection
  private getCurrentItems(): BathroomItem[] {
    return this.getItems();
  }

  // REPLACE the checkCollisionState method in your EventHandlers class
  private checkCollisionState(
    position: PositionObjectType,
    objectType: ComponentType,
    objectScale: number,
    itemId: number,
    currentItem?: BathroomItem,
    rotation?: number
  ): boolean {
    // When multi-select is active with multiple items, exclude other selected items
    // to prevent false collision detection with their old positions
    const currentItems = this.selectedObjects.size > 1
      ? this.getVirtualItemsExcludingSelected()
      : this.getVirtualItems();

    // 🔧 Use collision detection that includes walls, L-shape notch, and supports rotation-aware bounds
    return wouldCollideWithExistingOrWalls(
      position,
      objectType,
      objectScale,
      itemId,
      currentItems,
      this.roomWidthRef.value,
      this.roomHeightRef.value,
      currentItem,
      rotation,
      this.notchWidthRef.value,
      this.notchHeightRef.value
    );
  }

  // Add method to set measurement system reference
  public setMeasurementSystem(measurementSystem: MeasurementSystem): void {
    this.measurementSystem = measurementSystem;
  }

  // 🆕 NEW: Get current item data for movement configuration
  private getCurrentItemData(objectId: number): BathroomItem | undefined {
    const currentItems = this.getCurrentItems();
    return currentItems.find(item => item.id === objectId);
  }

  private updateMeasurementsThrottled(): void {
    const now = performance.now();

    // Only update if enough time has passed
    if (now - this.lastMeasurementUpdate >= this.measurementUpdateThreshold) {
      if (this.measurementSystem && this.selectedObject) {
        this.measurementSystem.forceUpdateMeasurements();
        this.lastMeasurementUpdate = now;
      }
    }
    // Clear any pending debounced update
    if (this.pendingMeasurementTimeout) {
      clearTimeout(this.pendingMeasurementTimeout);
    }
    // Schedule a final update after interaction stops
    this.pendingMeasurementTimeout = setTimeout(() => {
      if (this.measurementSystem && this.selectedObject) {
        this.measurementSystem.forceUpdateMeasurements();
      }
    }, 100);
  }

  private getIntersectedObject(mouse: THREE.Vector2): IntersectionResult | null {
    this.raycaster.setFromCamera(mouse, this.getActiveCamera());


    // Raycast against all objects, but filter results by visibility
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    // Filter out invisible objects and sort by distance (closest first)
    const visibleIntersects = intersects
      .filter(intersect => intersect.object.visible)
      .sort((a, b) => a.distance - b.distance);

    // Process intersections in order of distance (closest first)
    for (const intersect of visibleIntersects) {
      const obj = intersect.object;

      // If it's a wall, block further object selection
      if (obj.userData.isWall) {
        return null; // Camera rotation
      }

      // Check if clicked on a 2D schematic overlay - return the linked bathroom object
      let schematicParent = obj;
      while (schematicParent.parent && !schematicParent.userData.isSchematic2D) {
        schematicParent = schematicParent.parent;
      }
      if (schematicParent.userData.isSchematic2D && schematicParent.userData.linkedModel) {
        return { object: schematicParent.userData.linkedModel, point: intersect.point };
      }

      // If it's a bathroom object, check if it's the parent or find the parent
      let bathroomObj = obj;
      while (bathroomObj.parent && !bathroomObj.userData.isBathroomItem) {
        bathroomObj = bathroomObj.parent;
      }

      if (bathroomObj.userData.isBathroomItem) {
        return { object: bathroomObj, point: intersect.point };
      }
    }

    return null;
  }

  // Method to apply pending updates after drag ends
  private applyPendingUpdates(): void {
    if (this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();

    // Apply all updates at once
    this.setItems((prevItems: BathroomItem[]) => {
      return prevItems.map(item => {
        const update = updates.find(([itemId]) => itemId === item.id);
        if (update) {
          return { ...item, ...update[1] };
        }
        return item;
      });
    });
    setTimeout(() => {
      const currentItems = this.getItems();
      this.saveToHistory({
        items: currentItems,
        roomWidth: this.roomWidthRef.value,
        roomHeight: this.roomHeightRef.value,
        currentFloorTexture: this.currentFloorTextureRef.value,
        currentWallTexture: this.currentWallTextureRef.value
      });
    }, 50);
  }

  // Method to queue updates during drag operations
  /**
   * Get items including pending updates for accurate collision detection during drag
   */
  private getVirtualItems(): BathroomItem[] {
    const items = this.getCurrentItems();
    if (this.pendingUpdates.size === 0) return items;

    return items.map(item => {
      const update = this.pendingUpdates.get(item.id);
      if (update) {
        return { ...item, ...update };
      }
      return item;
    });
  }

  /**
   * Get items excluding the currently selected group (for multi-select collision detection)
   * This prevents false collision detection between items in the same selection group
   */
  private getVirtualItemsExcludingSelected(): BathroomItem[] {
    const items = this.getVirtualItems();
    if (this.selectedObjects.size <= 1) return items;

    // Filter out items that are in the selected group
    const selectedIds = new Set(this.selectedObjects.keys());
    return items.filter(item => !selectedIds.has(item.id));
  }

  /**
   * Callback for showing toast notifications
   */
  public onShowToast: ((message: string, type?: 'info' | 'warning' | 'error') => void) | null = null;

  /**
   * Show a toast notification
   */


  private queueUpdate(itemId: number, updateData: UpdateData): void {
    if (this.isDragOperation) {
      // Store the update for later application
      this.pendingUpdates.set(itemId, {
        ...this.pendingUpdates.get(itemId),
        ...updateData
      });
    } else {
      // Not dragging: Apply immediately
      this.setItems((prev: BathroomItem[]) =>
        prev.map(item =>
          item.id === itemId ? { ...item, ...updateData } : item
        )
      );

      // For immediate updates, save to history right away
      // This handles non-drag operations like keyboard shortcuts
      setTimeout(() => {
        const currentItems = this.getItems();
        this.saveToHistory({
          items: currentItems,
          roomWidth: this.roomWidthRef.value,
          roomHeight: this.roomHeightRef.value,
          currentFloorTexture: this.currentFloorTextureRef.value,
          currentWallTexture: this.currentWallTextureRef.value
        });
      }, 50);
    }
  }

  // Keyboard event handler for delete functionality
  private handleKeyDown(event: KeyboardEvent): void {
    // Delete selected object when Delete or Backspace key is pressed
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedObject) {
      event.preventDefault();
      const itemId = this.selectedObject.userData.itemId as number;

      // FIXED: Use clearSelection method to properly clean up measurements
      this.clearSelection();

      // Delete the item
      if (this.deleteItem && itemId) {
        this.deleteItem(itemId);
      }
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    event.preventDefault();

    // ✅ FIX: If we're already dragging, ignore any mousedown events (especially right-click)
    // This prevents right-click from deselecting the object or interfering with the drag
    if (this.isDragging || this.isDragOperation) {
      return;
    }

    // Store initial mouse position to track movement
    this.mouseDownPosition.set(event.clientX, event.clientY);
    this.hasMouseMoved = false;
    this.wasEmptySpaceClicked = false;

    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    // Convert mouse position to Three.js Vector2
    const mousePos = updateMousePosition(event, this.renderer.domElement.getBoundingClientRect());
    this.mouse.set(mousePos.x, mousePos.y);

    const intersected = this.getIntersectedObject(this.mouse);

    // Selection logic
    if (intersected) {
      const itemId = intersected.object.userData.itemId;
      this.wasAlreadySelected = this.selectedObjects.has(itemId);

      if (this.isMultiSelectMode) {
        // Multi-select logic: Toggle selection
        if (!this.wasAlreadySelected) {
          this.selectedObjects.set(itemId, intersected.object);
          this.updateMultiSelectionHighlight();
        }
        // If already selected, we keep it for dragging and might deselect in mouseUp

        // The clicked object becomes the "primary" object for dragging
        this.selectedObject = intersected.object;
      } else {
        // Single select logic
        const previouslySelectedId = this.selectedObject?.userData?.itemId;
        if (!previouslySelectedId || previouslySelectedId !== itemId) {
          this.clearSelection();
          this.selectObject(intersected.object);
          this.selectedObjects.set(itemId, intersected.object);
        }
        this.selectedObject = intersected.object;
      }

      if (!this.selectedObject) return;

      // 🚀 FIXED: Get fresh items before updating measurement system
      const currentItems = this.getCurrentItems();
      if (this.measurementSystem) {
        // Update the measurement system with current items FIRST
        this.measurementSystem.updateExistingItems(currentItems);
        // THEN set the selected object
        this.measurementSystem.setSelectedObject(this.selectedObject);
      }

      // Emit event for measurement updates
      window.dispatchEvent(new CustomEvent('object-selected'));

      // ✅ NEW: Auto-move objects from hidden walls to visible walls
      const objectType = this.selectedObject.userData.type as ComponentType;
      const objectScale = this.selectedObject.scale.x;
      const currentItem = currentItems.find(item => item.id === itemId);
      const movementConfig = getMovementConfig(objectType, currentItem);

      if (this.rotationArrows) {
        const canRotateFreely = movementConfig?.allowFreeRotation === true;
        if (canRotateFreely) {
          this.rotationArrows.setSelectedObject(this.selectedObject);
        } else {
          this.rotationArrows.setSelectedObject(null); // Hide arrows for non-rotatable objects
        }
      }

      // Only do this for wall-bound objects that are NOT corner-install (bathtubs, showers, etc.)
      // Corner-install objects should stay in their corners, not move to opposite walls
      const isCornerInstall = movementConfig?.cornerInstallOnly &&
        (typeof movementConfig.cornerInstallOnly === 'boolean' || movementConfig.cornerInstallOnly.enabled);

      if (movementConfig?.snapToWall && !isCornerInstall && !this.isMultiSelectMode) {
        // Check which wall the object is currently on
        const currentWall = this.determineCurrentWall(this.selectedObject.position);

        // Check if this wall is visible
        if (this.wallCulling && this.wallCulling.enabled) {
          const wallVisibility = this.wallCulling.getWallVisibilityStatus();
          const visibleWalls = new Set(
            wallVisibility
              .filter(status => status.visible)
              .map(status => status.direction)
          );

          // ✅ ADD NOTCH WALLS to visible walls if notch exists
          const { notch } = getInteriorBoundaries(
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            this.notchWidthRef.value,
            this.notchHeightRef.value
          );
          if (notch) {
            visibleWalls.add('notch-east');
            visibleWalls.add('notch-south');
          }

          // If object is on a hidden wall, move it to the opposite visible wall
          if (!visibleWalls.has(currentWall)) {

            // Determine the best visible wall (usually opposite wall)
            const targetWall = this.getOppositeOrBestWall(currentWall, visibleWalls);

            // Find an empty space on the target wall (collision-aware)
            const newPosition = this.findEmptySpaceOnWall(
              targetWall,
              this.selectedObject.position,
              objectType,
              objectScale,
              itemId,
              currentItem
            );

            // Only move if a collision-free position was found
            if (newPosition) {
              // Apply the new position to Three.js object
              this.selectedObject.position.set(newPosition.x, newPosition.y, newPosition.z);

              // Apply the correct rotation for the new wall
              if (!movementConfig.allowFreeRotation) {
                this.selectedObject.rotation.y = newPosition.rotation;
              }

              // Update schematic overlay position in 2D mode
              if (this.sceneManager?.updateSchematicPosition) {
                this.sceneManager.updateSchematicPosition(itemId);
              }

              // Update the item data and save to history using queueUpdate
              // Since isDragOperation is false at this point, queueUpdate will apply immediately and save to history
              this.queueUpdate(itemId, {
                position: [newPosition.x, newPosition.y, newPosition.z],
                rotation: newPosition.rotation
              });
            } else {
            }
          }
        }
      }
      // ✅ END OF NEW SECTION

      // Check collision state immediately when object is selected
      const currentPosition = this.selectedObject.position;
      const isColliding = wouldCollideWithExisting(
        { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
        objectType,
        objectScale,
        itemId,
        currentItems,
        currentItem
      );

      // Highlight all selected objects
      this.updateHighlight(true);

      // Then set appropriate outline color based on current collision state
      setOutlineColor(isColliding);

      if ((event.ctrlKey || event.metaKey) && this.canAdjustHeight()) { // Ctrl/Cmd + click for height adjustment (3D mode only)

        this.isHeightAdjusting = true;
        this.isDragOperation = true; // Mark as drag operation
        this.heightStartY = this.selectedObject.position.y;
        this.mouseStartY = event.clientY;
        this.renderer.domElement.style.cursor = 'row-resize';
      } else if (event.altKey) { // Alt + click for scaling
        this.isScaling = true;
        this.isDragOperation = true; // Mark as drag operation
        this.scaleStart = this.selectedObject.scale.x;
        this.mouseStartY = event.clientY;
        this.renderer.domElement.style.cursor = 'nw-resize';
      } else { // Left click for dragging
        this.isDragging = true;
        this.isDragOperation = true; // Mark as drag operation

        // ✅ FIX: Calculate group constraint FIRST (before calculating offsets)
        // This allows us to snap the primary's rotation before offset calculation
        if (this.selectedObjects.size > 1) {
          this.groupConstraint = analyzeGroupConstraints(
            this.selectedObjects,
            (id) => this.getCurrentItemData(id),
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            this.notchWidthRef.value,
            this.notchHeightRef.value
          );
        } else {
          this.groupConstraint = null;
        }

        // Store start positions and local offsets for all selected objects for bulk move
        this.multiSelectStartPositions.clear();
        this.multiSelectStartRotations.clear();
        this.multiSelectLocalOffsets.clear();
        this.multiSelectLocalRotations.clear();

        // ✅ FIX: "Most restrictive wins" - if primary is freestanding but group has wall-snap,
        // snap the primary TO the wall BEFORE calculating offsets
        // This ensures both items have compatible wall-based coordinates
        const groupHasWallSnap = this.groupConstraint &&
          this.groupConstraint.movementType === ConstraintPriority.WALL_SNAP;
        const primaryIsFreestandingItem = !movementConfig.snapToWall &&
          !(movementConfig.cornerInstallOnly && typeof movementConfig.cornerInstallOnly === 'object' && movementConfig.cornerInstallOnly.enabled);

        let primaryPos = this.selectedObject.position.clone();
        let primaryRot = this.selectedObject.rotation.y;

        if (groupHasWallSnap && primaryIsFreestandingItem) {
          // Find the wall that wall-snap items are on
          let targetWall: WallType | null = null;
          this.selectedObjects.forEach((obj, id) => {
            if (targetWall) return;
            const itemData = this.getCurrentItemData(id);
            const itemMovement = getMovementConfig(obj.userData.type as ComponentType, itemData);
            if (itemMovement.snapToWall && !itemMovement.cornerInstallOnly) {
              targetWall = this.determineCurrentWall(obj.position);
            }
          });

          if (targetWall) {
            // Snap primary to the same wall as the wall-snap items
            const result = constrainToWalls(
              { x: primaryPos.x, y: primaryPos.y, z: primaryPos.z },
              this.roomWidthRef.value,
              this.roomHeightRef.value,
              {
                type: objectType,
                scale: objectScale,
                orientation: this.selectedObject.userData.orientation,
                item: currentItem,
                notchWidth: this.notchWidthRef.value,
                notchHeight: this.notchHeightRef.value
              },
              targetWall
            );

            // Update primary position and rotation to wall-snapped values
            primaryPos = new THREE.Vector3(result.position.x, result.position.y, result.position.z);
            primaryRot = result.rotation;

            // Actually move the object to the wall
            this.selectedObject.position.copy(primaryPos);
            this.selectedObject.rotation.y = primaryRot;
          }
        }

        this.selectedObjects.forEach((obj, id) => {
          this.multiSelectStartPositions.set(id, obj.position.clone());
          this.multiSelectStartRotations.set(id, obj.rotation.y);

          // Calculate local offset relative to primary object's (possibly snapped) position/rotation
          const offset = new THREE.Vector3().subVectors(obj.position, primaryPos);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -primaryRot);
          this.multiSelectLocalOffsets.set(id, offset);

          // Calculate local rotation relative to primary object
          const relRot = obj.rotation.y - primaryRot;
          this.multiSelectLocalRotations.set(id, relRot);
        });

        // Notify that dragging has started
        if (this.onDragStart) {
          this.onDragStart();
        }

        // Store original position for potential snap-back
        // Note: If we just moved the object, this will store the NEW position
        this.originalDragPosition.copy(this.selectedObject.position);
        this.originalDragRotation = this.selectedObject.rotation.y;

        // ✅ FIX: Use wall plane for drag offset when:
        // 1. Primary is wall-snap, OR
        // 2. Group has wall-snap constraint (freestanding primary is snapped to wall at drag start)
        const groupHasWallSnapForDrag = this.groupConstraint &&
          this.groupConstraint.movementType === ConstraintPriority.WALL_SNAP;
        const useWallPlaneForDrag = (movementConfig.snapToWall && !movementConfig.cornerInstallOnly) ||
          groupHasWallSnapForDrag;

        // ✅ FIX: For wall-mounted objects, calculate dragOffset using the wall plane
        if (useWallPlaneForDrag) {
          // 📐 2D MODE: Use floor plane for dragOffset calculation (matches drag handling)
          if (this.viewMode === '2d') {
            const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());
            const intersectPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(floorPlane, intersectPoint);
            // For 2D mode, only use X and Z offset (Y is locked)
            this.dragOffset.set(
              this.selectedObject.position.x - intersectPoint.x,
              0,
              this.selectedObject.position.z - intersectPoint.z
            );
          } else {
            // 3D MODE: Use wall plane intersection
            const currentWall = this.determineCurrentWall(this.selectedObject.position);
            const roomHalfWidth = this.roomWidthRef.value / 2;
            const roomHalfHeight = this.roomHeightRef.value / 2;

            // ✅ Get notch boundaries for L-shaped rooms
            const { notch } = getInteriorBoundaries(
              this.roomWidthRef.value,
              this.roomHeightRef.value,
              this.notchWidthRef.value,
              this.notchHeightRef.value
            );

            // Create the wall planes
            const wallPlanes: { [key: string]: THREE.Plane } = {
              north: new THREE.Plane(new THREE.Vector3(0, 0, 1), roomHalfHeight),
              south: new THREE.Plane(new THREE.Vector3(0, 0, -1), roomHalfHeight),
              east: new THREE.Plane(new THREE.Vector3(-1, 0, 0), roomHalfWidth),
              west: new THREE.Plane(new THREE.Vector3(1, 0, 0), roomHalfWidth)
            };

            // ✅ ADD NOTCH WALL PLANES for L-shaped rooms
            if (notch) {
              wallPlanes['notch-east'] = new THREE.Plane(new THREE.Vector3(-1, 0, 0), notch.maxX);
              wallPlanes['notch-south'] = new THREE.Plane(new THREE.Vector3(0, 0, -1), notch.maxZ);
            }

            const wallPlane = wallPlanes[currentWall];

            // Calculate intersection with wall plane
            this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());
            const intersectPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(wallPlane, intersectPoint);

            // Calculate dragOffset from wall plane intersection
            this.dragOffset.subVectors(this.selectedObject.position, intersectPoint);
          }
        } else {
          // For non-wall objects, use the standard drag plane
          this.updateDragPlane(this.selectedObject);

          this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());
          const intersectPoint = new THREE.Vector3();
          this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
          this.dragOffset.subVectors(this.selectedObject.position, intersectPoint);
        }

        this.renderer.domElement.style.cursor = 'grabbing';
      }

    } else {
      if (this.selectedObject) {
        this.clearSelection();
      }

      if (event.button === 0) { // Left click for camera rotation
        this.isRotating = true;
        this.renderer.domElement.style.cursor = 'grabbing';
      }

      // Emit event for measurement updates
      window.dispatchEvent(new CustomEvent('object-selected'));
    }
  }

  private selectObject(object: THREE.Object3D): void {

    // Clear previous selection first
    if (this.selectedObject && this.selectedObject !== object) {
      highlightObject(this.selectedObject, false);
      setOutlineColor(false);
    }

    this.selectedObject = object;
    highlightObject(object, true);

    // Set up rotation arrows if enabled
    if (this.rotationArrows) {
      this.rotationArrows.setSelectedObject(object);
    }

    // Set up measurement system
    if (this.measurementSystem) {
      this.measurementSystem.setSelectedObject(object);
    }

    // 🔧 FIX: Call onItemSelected callback to open variant drawer
    const itemId = object.userData.itemId;
    if (this.onItemSelected && itemId !== undefined) {
      this.onItemSelected(itemId);
    }
  }

  /**
   * Calculate position on a specific wall
   */
  private getPositionOnWall(
    wall: string,
    currentPosition: THREE.Vector3,
    objectType: ComponentType,
    objectScale: number,
    currentItem?: BathroomItem
  ): { x: number; y: number; z: number; rotation: number } {
    const roomHalfWidth = this.roomWidthRef.value / 2;
    const roomHalfHeight = this.roomHeightRef.value / 2;
    const dimensions = getDimensions(objectType, currentItem?.sku, currentItem?.model);
    const halfWidth = ((dimensions?.width || 50) * objectScale) / 2;
    const halfDepth = ((dimensions?.depth || 50) * objectScale) / 2;
    const wallBuffer = (currentItem?.model?.orientation?.wallBuffer ?? 0) * objectScale;

    let x = currentPosition.x;
    let y = currentPosition.y; // Preserve height
    let z = currentPosition.z;
    let rotation = 0;

    // ✅ Get notch boundaries for L-shaped rooms
    const { interior, notch } = getInteriorBoundaries(
      this.roomWidthRef.value,
      this.roomHeightRef.value,
      this.notchWidthRef.value,
      this.notchHeightRef.value
    );

    switch (wall) {
      case 'north':
        z = -roomHalfHeight + halfDepth + wallBuffer;
        x = Math.max(-roomHalfWidth + halfWidth, Math.min(roomHalfWidth - halfWidth, x));

        // ✅ CRITICAL: Check if X position is inside notch area
        if (notch && x >= notch.minX && x <= notch.maxX) {
          // Object would be in notch void - move it to notch.maxX boundary
          x = notch.maxX + halfWidth;
        }
        rotation = 0;
        break;

      case 'south':
        z = roomHalfHeight - halfDepth - wallBuffer;
        x = Math.max(-roomHalfWidth + halfWidth, Math.min(roomHalfWidth - halfWidth, x));

        // ✅ South wall typically doesn't need notch adjustment (notch is usually in north area)
        // But check anyway for flexibility
        if (notch && x >= notch.minX && x <= notch.maxX && z < notch.maxZ) {
          x = notch.maxX + halfWidth;
        }
        rotation = Math.PI;
        break;

      case 'east':
        x = roomHalfWidth - halfDepth - wallBuffer;
        z = Math.max(-roomHalfHeight + halfWidth, Math.min(roomHalfHeight - halfWidth, z));

        // ✅ CRITICAL FIX: Check if Z position is inside notch area
        if (notch && z >= notch.minZ && z <= notch.maxZ) {
          // Object would be in notch void - move it to notch.maxZ boundary (south of notch)
          z = notch.maxZ + halfWidth;
        }
        rotation = -Math.PI / 2;
        break;

      case 'west':
        x = -roomHalfWidth + halfDepth + wallBuffer;
        z = Math.max(-roomHalfHeight + halfWidth, Math.min(roomHalfHeight - halfWidth, z));

        // ✅ CRITICAL FIX: Check if Z position is inside notch area
        if (notch && z >= notch.minZ && z <= notch.maxZ) {
          // Object would be in notch void - move it to notch.maxZ boundary (south of notch)
          z = notch.maxZ + halfWidth;
        }
        rotation = Math.PI / 2;
        break;

      // ✅ NEW: Handle notch walls for L-shaped rooms
      case 'notch-east':
        if (notch) {
          // Position on the vertical notch edge (runs north-south at X = notch.maxX)
          x = notch.maxX + halfDepth + wallBuffer + 5;
          // Constrain Z to be within notch bounds and room bounds
          z = Math.max(
            notch.minZ + halfWidth,
            Math.min(interior.maxZ - halfWidth, z)
          );
          rotation = Math.PI / 2; // Face away from notch (toward east)
        }
        break;

      case 'notch-south':
        if (notch) {
          // Position on the horizontal notch edge (runs east-west at Z = notch.maxZ)
          z = notch.maxZ + halfDepth + wallBuffer + 5;
          // Constrain X to be within notch bounds and room bounds
          x = Math.max(
            notch.minX + halfWidth,
            Math.min(interior.maxX - halfWidth, x)
          );
          rotation = 0; // Face away from notch (toward south)
        }
        break;
    }

    return { x, y, z, rotation };
  }

  /**
   * Search horizontally for an empty space on a wall
   * Returns a position if found, null otherwise
   */
  private searchHorizontally(
    basePosition: { x: number; y: number; z: number; rotation: number },
    wall: WallType,
    objectType: ComponentType,
    objectScale: number,
    itemId: number,
    currentItem: BathroomItem | undefined,
    currentItems: BathroomItem[],
    halfWidth: number,
    searchStep: number,
    maxAttempts: number,
    roomHalfWidth: number,
    roomHalfHeight: number
  ): { x: number; y: number; z: number; rotation: number } | null {
    const testItem = currentItem ? { ...currentItem } : undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Try alternating left and right from base position
      // Pattern: +step, -step, +2*step, -2*step, +3*step, -3*step...
      const direction = (attempt % 2 === 0) ? 1 : -1;
      const magnitude = Math.ceil(attempt / 2);
      const offset = searchStep * magnitude * direction;

      let testX = basePosition.x;
      let testZ = basePosition.z;
      let testPosition: { x: number; y: number; z: number; rotation: number };

      // Adjust position based on wall orientation
      if (wall === 'north' || wall === 'south') {
        testX = basePosition.x + offset;

        // Clamp to wall boundaries with proper half-width
        testX = Math.max(-roomHalfWidth + halfWidth, Math.min(roomHalfWidth - halfWidth, testX));

        // Skip if we've hit the wall boundary and can't move further
        if ((direction > 0 && testX >= roomHalfWidth - halfWidth) ||
          (direction < 0 && testX <= -roomHalfWidth + halfWidth)) {
          continue;
        }

        testPosition = {
          x: testX,
          y: basePosition.y,
          z: basePosition.z,
          rotation: basePosition.rotation
        };
      } else { // east or west
        testZ = basePosition.z + offset;

        // For east/west walls, the object rotates, so we need to use halfWidth for Z constraint
        testZ = Math.max(-roomHalfHeight + halfWidth, Math.min(roomHalfHeight - halfWidth, testZ));

        // Skip if we've hit the wall boundary and can't move further
        if ((direction > 0 && testZ >= roomHalfHeight - halfWidth) ||
          (direction < 0 && testZ <= -roomHalfHeight + halfWidth)) {
          continue;
        }

        testPosition = {
          x: basePosition.x,
          y: basePosition.y,
          z: testZ,
          rotation: basePosition.rotation
        };
      }

      // Check if this position is collision-free with proper rotation (with room dimensions)
      const wouldCollide = wouldCollideWithExisting(
        { x: testPosition.x, y: testPosition.y, z: testPosition.z },
        objectType,
        objectScale,
        itemId,
        currentItems,
        testItem,
        this.roomWidthRef.value,
        this.roomHeightRef.value
      );

      if (!wouldCollide) {
        return testPosition;
      } else {
      }
    }

    return null;
  }

  /**
   * Search vertically for an empty space on a wall
   * Returns a position if found, null otherwise
   */
  private searchVertically(
    basePosition: { x: number; y: number; z: number; rotation: number },
    wall: WallType,
    objectType: ComponentType,
    objectScale: number,
    itemId: number,
    currentItem: BathroomItem | undefined,
    currentItems: BathroomItem[],
    halfWidth: number,
    searchStep: number,
    maxAttempts: number,
    roomHalfWidth: number,
    roomHalfHeight: number,
    dimensions: { width: number; height: number; depth: number; spawnHeight?: number; floorOffset?: number } | null
  ): { x: number; y: number; z: number; rotation: number } | null {
    const testItem = currentItem ? { ...currentItem } : undefined;
    const movementConfig = getMovementConfig(objectType, currentItem);

    if (!movementConfig?.allowVerticalMovement) {
      return null;
    }

    const objectHeight = ((dimensions?.height || 50) * objectScale);
    const spawnHeight = dimensions?.spawnHeight || 0;

    // ✅ CRITICAL: Get valid height constraints to prevent going through ceiling/floor
    const heightConstraints = this.getProperHeightConstraints(objectType, currentItem);

    // Try different heights: spawn height, then heights above and below
    const heightAttempts = [
      spawnHeight, // Try default spawn height
      spawnHeight + objectHeight + 10, // Try one object-height above (with 10cm spacing)
      spawnHeight - objectHeight - 10, // Try one object-height below (with 10cm spacing)
      spawnHeight + (objectHeight * 2) + 20, // Try two object-heights above
      spawnHeight - (objectHeight * 2) - 20, // Try two object-heights below
    ].filter(testY => testY >= heightConstraints.min && testY <= heightConstraints.max); // ✅ Filter to valid range

    for (const testY of heightAttempts) {
      // Skip if Y is same as base position (already tested)
      if (Math.abs(testY - basePosition.y) < 5) continue;

      // Check if this Y position alone is collision-free
      const testPositionAtNewHeight = {
        x: basePosition.x,
        y: testY,
        z: basePosition.z,
        rotation: basePosition.rotation
      };

      let wouldCollide = wouldCollideWithExisting(
        { x: testPositionAtNewHeight.x, y: testPositionAtNewHeight.y, z: testPositionAtNewHeight.z },
        objectType,
        objectScale,
        itemId,
        currentItems,
        testItem,
        this.roomWidthRef.value,
        this.roomHeightRef.value
      );

      if (!wouldCollide) {
        return testPositionAtNewHeight;
      }

      // If still colliding, try horizontal search at this new Y position
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const direction = (attempt % 2 === 0) ? 1 : -1;
        const magnitude = Math.ceil(attempt / 2);
        const offset = searchStep * magnitude * direction;

        let testX = basePosition.x;
        let testZ = basePosition.z;

        if (wall === 'north' || wall === 'south') {
          testX = basePosition.x + offset;
          testX = Math.max(-roomHalfWidth + halfWidth, Math.min(roomHalfWidth - halfWidth, testX));

          if ((direction > 0 && testX >= roomHalfWidth - halfWidth) ||
            (direction < 0 && testX <= -roomHalfWidth + halfWidth)) {
            continue;
          }
        } else { // east or west
          testZ = basePosition.z + offset;
          testZ = Math.max(-roomHalfHeight + halfWidth, Math.min(roomHalfHeight - halfWidth, testZ));

          if ((direction > 0 && testZ >= roomHalfHeight - halfWidth) ||
            (direction < 0 && testZ <= -roomHalfHeight + halfWidth)) {
            continue;
          }
        }

        const testPosition = {
          x: testX,
          y: testY,
          z: testZ,
          rotation: basePosition.rotation
        };

        wouldCollide = wouldCollideWithExisting(
          { x: testPosition.x, y: testPosition.y, z: testPosition.z },
          objectType,
          objectScale,
          itemId,
          currentItems,
          testItem,
          this.roomWidthRef.value,
          this.roomHeightRef.value
        );

        if (!wouldCollide) {
          return testPosition;
        }
      }
    }

    return null;
  }

  /**
   * Find an empty space on a wall for the object, avoiding collisions
   * Returns null if no collision-free space is available
   */
  private findEmptySpaceOnWall(
    wall: WallType,
    currentPosition: THREE.Vector3,
    objectType: ComponentType,
    objectScale: number,
    itemId: number,
    currentItem?: BathroomItem
  ): { x: number; y: number; z: number; rotation: number } | null {
    // Get initial position on wall
    const basePosition = this.getPositionOnWall(wall, currentPosition, objectType, objectScale, currentItem);

    // Check if base position is collision-free WITH the correct rotation for the target wall
    const currentItems = this.getCurrentItems();

    // Create a temporary test item with the target wall's rotation to check collisions accurately
    const testItem = currentItem ? { ...currentItem } : undefined;

    // ✅ CRITICAL FIX: Check vertical collision at base position (with room dimensions)
    let isColliding = wouldCollideWithExisting(
      { x: basePosition.x, y: basePosition.y, z: basePosition.z },
      objectType,
      objectScale,
      itemId,
      currentItems,
      testItem,
      this.roomWidthRef.value,
      this.roomHeightRef.value
    );

    if (!isColliding) {
      return basePosition; // Base position is fine
    }

    // Calculate dimensions for spacing
    const roomHalfWidth = this.roomWidthRef.value / 2;
    const roomHalfHeight = this.roomHeightRef.value / 2;
    const dimensions = getDimensions(objectType, currentItem?.sku, currentItem?.model);
    const objectWidth = ((dimensions?.width || 50) * objectScale);
    const halfWidth = objectWidth / 2;

    // Add spacing between objects to prevent touching
    const OBJECT_SPACING = 10; // 10cm gap between objects
    const step = objectWidth + OBJECT_SPACING;

    // For north/south walls, we move along X axis using object width
    // For east/west walls, we move along Z axis, but object is rotated 90°, so we use object width (not depth)
    const searchStep = step;

    const maxAttempts = 30; // Increased attempts for better coverage

    // Try horizontal search first
    const horizontalResult = this.searchHorizontally(
      basePosition,
      wall,
      objectType,
      objectScale,
      itemId,
      currentItem,
      currentItems,
      halfWidth,
      searchStep,
      maxAttempts,
      roomHalfWidth,
      roomHalfHeight
    );

    if (horizontalResult) {
      return horizontalResult;
    }

    // ✅ NEW: If horizontal search failed, try different Y positions (vertical search)

    const verticalResult = this.searchVertically(
      basePosition,
      wall,
      objectType,
      objectScale,
      itemId,
      currentItem,
      currentItems,
      halfWidth,
      searchStep,
      maxAttempts,
      roomHalfWidth,
      roomHalfHeight,
      dimensions
    );

    if (verticalResult) {
      return verticalResult;
    }

    // If no empty space found after all attempts (horizontal and vertical), return null
    console.warn(`⚠️ Could not find empty space on ${wall} wall after exhaustive search`);
    console.warn(`⚠️ Keeping object on current wall - no space available on target wall`);

    return null;
  }

  /**
   * Helper method to determine which wall an object is currently on
   */
  // Helper method to determine which wall an object is currently on
  private determineCurrentWall(position: THREE.Vector3): WallType {
    const roomHalfWidth = this.roomWidthRef.value / 2;
    const roomHalfHeight = this.roomHeightRef.value / 2;
    const tolerance = 30; // 30cm tolerance for wall detection

    // ✅ Check for L-shaped room notch walls first
    const { notch } = getInteriorBoundaries(
      this.roomWidthRef.value,
      this.roomHeightRef.value,
      this.notchWidthRef.value,
      this.notchHeightRef.value
    );

    if (notch) {
      // Check notch-east wall (vertical edge at notch.maxX)
      if (Math.abs(position.x - notch.maxX) < tolerance &&
        position.z >= notch.minZ &&
        position.z <= notch.maxZ) {
        return 'notch-east';
      }

      // Check notch-south wall (horizontal edge at notch.maxZ)
      if (Math.abs(position.z - notch.maxZ) < tolerance &&
        position.x >= notch.minX &&
        position.x <= notch.maxX) {
        return 'notch-south';
      }
    }

    // Check each main wall
    if (Math.abs(position.z + roomHalfHeight) < tolerance) return 'north';
    if (Math.abs(position.z - roomHalfHeight) < tolerance) return 'south';
    if (Math.abs(position.x - roomHalfWidth) < tolerance) return 'east';
    if (Math.abs(position.x + roomHalfWidth) < tolerance) return 'west';

    // If not clearly on any wall, find nearest (including notch walls)
    const distances: Record<string, number> = {
      north: Math.abs(position.z + roomHalfHeight),
      south: Math.abs(position.z - roomHalfHeight),
      east: Math.abs(position.x - roomHalfWidth),
      west: Math.abs(position.x + roomHalfWidth)
    };

    // Add notch wall distances if notch exists
    if (notch) {
      // Distance to notch-east wall (check if within Z bounds)
      if (position.z >= notch.minZ && position.z <= notch.maxZ) {
        distances['notch-east'] = Math.abs(position.x - notch.maxX);
      }

      // Distance to notch-south wall (check if within X bounds)
      if (position.x >= notch.minX && position.x <= notch.maxX) {
        distances['notch-south'] = Math.abs(position.z - notch.maxZ);
      }
    }

    return Object.entries(distances).reduce((a, b) =>
      distances[a[0]] < distances[b[0]] ? a : b
    )[0] as WallType;
  }

  /**
   * Get the opposite wall or best visible wall
   */
  // Get the opposite wall or best visible wall
  private getOppositeOrBestWall(
    currentWall: WallType,
    visibleWalls: Set<string>
  ): WallType {
    // ✅ CRITICAL FIX: For L-shaped rooms, check if object position is in notch area
    const { notch } = getInteriorBoundaries(
      this.roomWidthRef.value,
      this.roomHeightRef.value,
      this.notchWidthRef.value,
      this.notchHeightRef.value
    );

    // Get object's current position if available
    const objectPosition = this.selectedObject?.position;

    // Define opposite walls
    const opposites: { [key in WallType]: WallType } = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
      "notch-east": "notch-south",
      "notch-south": "notch-east"
    };

    let oppositeWall = opposites[currentWall];

    // ✅ NEW: For L-shaped rooms, check if we need to use a notch wall instead
    if (notch && objectPosition) {
      // If moving from east to west, but object Z is in notch range, use notch-east instead
      if (currentWall === 'east' &&
        objectPosition.z >= notch.minZ &&
        objectPosition.z <= notch.maxZ) {
        oppositeWall = 'notch-east';
      }
      // If moving from west to east, but object Z is in notch range, use notch-east instead
      else if (currentWall === 'west' &&
        objectPosition.z >= notch.minZ &&
        objectPosition.z <= notch.maxZ) {
        oppositeWall = 'notch-east';
      }
      // If moving from north to south, but object X is in notch range, use notch-south instead
      else if (currentWall === 'north' &&
        objectPosition.x >= notch.minX &&
        objectPosition.x <= notch.maxX) {
        oppositeWall = 'notch-south';
      }
      // If moving from south to north, but object X is in notch range, use notch-south instead
      else if (currentWall === 'south' &&
        objectPosition.x >= notch.minX &&
        objectPosition.x <= notch.maxX) {
        oppositeWall = 'notch-south';
      }
    }

    // If opposite wall is visible, use it
    if (visibleWalls.has(oppositeWall)) {
      return oppositeWall;
    }

    // Otherwise, return any visible wall (prefer front-facing walls based on camera)
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Determine which wall we're mainly looking at
    if (Math.abs(cameraDirection.z) > Math.abs(cameraDirection.x)) {
      // Looking north/south
      if (cameraDirection.z < 0 && visibleWalls.has('north')) return 'north';
      if (cameraDirection.z > 0 && visibleWalls.has('south')) return 'south';
      // ✅ NEW: Check for notch-south wall
      if (visibleWalls.has('notch-south')) return 'notch-south';
    } else {
      // Looking east/west
      if (cameraDirection.x > 0 && visibleWalls.has('east')) return 'east';
      if (cameraDirection.x < 0 && visibleWalls.has('west')) return 'west';
      // ✅ NEW: Check for notch-east wall
      if (visibleWalls.has('notch-east')) return 'notch-east';
    }

    // ✅ CRITICAL FIX: Return first available visible wall WITHOUT restricting to only 4 walls
    // This allows notch walls to be returned
    const firstVisibleWall = Array.from(visibleWalls)[0];
    return (firstVisibleWall || 'north') as WallType;
  }


  /**
   * Apply movement to all selected objects based on the primary object's movement
   */
  private applyBulkMove(primaryObject: THREE.Object3D, _unconstrainedPrimaryPos?: THREE.Vector3, _idealRot?: number): void {
    if (this.selectedObjects.size <= 1) {
      return;
    }

    const primaryId = primaryObject.userData.itemId;
    // Use the CURRENT position and rotation of the primary object as the base for the group
    // This ensures the group moves and rotates as a single rigid unit
    const primaryPos = primaryObject.position.clone();
    let primaryRot = primaryObject.rotation.y;

    // 📊 Get primary object's movement configuration to determine actual constraint behavior
    const primaryItemData = this.getCurrentItemData(primaryId);
    const primaryMovementConfig = getMovementConfig(primaryObject.userData.type as ComponentType, primaryItemData);
    const primaryIsCornerOnly = primaryMovementConfig.cornerInstallOnly &&
      typeof primaryMovementConfig.cornerInstallOnly === 'object' &&
      primaryMovementConfig.cornerInstallOnly.enabled;
    const primaryIsWallSnap = primaryMovementConfig.snapToWall && !primaryIsCornerOnly;
    const primaryIsFreestanding = !primaryIsWallSnap && !primaryIsCornerOnly;

    // 📊 UNIFIED GROUP CONSTRAINT: Apply "most restrictive wins" rule
    // If we have a group constraint, snap rotation to 90 degrees if required
    if (this.groupConstraint && this.groupConstraint.rotationRestriction === 'snap_90') {
      primaryRot = snapRotationTo90Degrees(primaryRot);
      primaryObject.rotation.y = primaryRot;
    }

    let anyColliding = false;

    this.selectedObjects.forEach((obj, id) => {
      if (id === primaryId) return;

      const localOffset = this.multiSelectLocalOffsets.get(id);
      const localRot = this.multiSelectLocalRotations.get(id);

      if (localOffset !== undefined && localRot !== undefined) {
        // Calculate target position based on primary's current position and rotation
        // We rotate the local offset by the primary's current rotation to get the world-space offset
        const worldOffset = localOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), primaryRot);
        const targetPos = new THREE.Vector3().addVectors(primaryPos, worldOffset);

        const itemType = obj.userData.type as ComponentType;
        const itemScale = obj.scale.x;
        const itemData = this.getCurrentItemData(id);
        const movementConfig = getMovementConfig(itemType, itemData);

        let constrainedPosition: { x: number, y: number, z: number };
        let constrainedRotation = primaryRot + localRot;

        // 📊 UNIFIED GROUP CONSTRAINT: Apply snap_90 to all items in the group
        if (this.groupConstraint && this.groupConstraint.rotationRestriction === 'snap_90') {
          constrainedRotation = snapRotationTo90Degrees(constrainedRotation);
        }

        // ✅ FIX: Check if this is a CORNER_ONLY group with a WALL_SNAP secondary item
        // In this case, the wall item should re-snap to the appropriate wall when corner moves
        // IMPORTANT: If primary is freestanding, don't treat as corner-only group
        const isCornerOnlyGroup = !primaryIsFreestanding && this.groupConstraint && (
          this.groupConstraint.movementType === ConstraintPriority.CORNER_ONLY ||
          this.groupConstraint.isLShapeGroup
        );
        const isWallSnapItem = movementConfig.snapToWall &&
          !(movementConfig.cornerInstallOnly && typeof movementConfig.cornerInstallOnly === 'object' && movementConfig.cornerInstallOnly.enabled);
        const isCornerOnlyItem = movementConfig.cornerInstallOnly &&
          typeof movementConfig.cornerInstallOnly === 'object' &&
          movementConfig.cornerInstallOnly.enabled;

        // ✅ RIGID BODY MODE: When group has unified constraint, treat as rigid body
        // "Most restrictive wins" - all items move together as one unit
        // EXCEPTION: When CORNER_ONLY group has WALL_SNAP items, let them re-snap to walls
        // EXCEPTION: When primary is WALL_SNAP and secondary is CORNER_ONLY, let corner re-snap to corner
        const useRigidBody = this.viewMode === '2d' ||
          (this.groupConstraint && (
            // For CORNER_ONLY groups: use rigid body UNLESS item is WALL_SNAP (let it re-snap) or CORNER_ONLY (let it re-snap)
            (this.groupConstraint.movementType === ConstraintPriority.CORNER_ONLY && !isWallSnapItem && !isCornerOnlyItem) ||
            // For WALL_SNAP groups: always use rigid body (freestanding primary is snapped to wall at drag start)
            this.groupConstraint.movementType === ConstraintPriority.WALL_SNAP ||
            // For L-shape groups: use rigid body UNLESS item is WALL_SNAP (let it re-snap) or CORNER_ONLY
            (this.groupConstraint.isLShapeGroup && !isWallSnapItem && !isCornerOnlyItem)
          ));

        if (useRigidBody) {
          // Rigid body - maintain relative position
          constrainedPosition = { x: targetPos.x, y: targetPos.y, z: targetPos.z };

          // ✅ FIX: For wall-snap items, use constrainToWalls to get correct wall position
          // but preserve the lateral position from rigid body calculation
          if (isWallSnapItem && !isCornerOnlyItem) {
            const itemWall = this.determineCurrentWall(new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z));

            // Get the correct wall-snapped position
            const wallResult = constrainToWalls(
              constrainedPosition,
              this.roomWidthRef.value,
              this.roomHeightRef.value,
              {
                type: itemType,
                scale: itemScale,
                orientation: obj.userData.orientation,
                item: itemData,
                notchWidth: this.notchWidthRef.value,
                notchHeight: this.notchHeightRef.value
              },
              itemWall
            );

            // Keep lateral position from rigid body, use perpendicular from constrainToWalls
            if (itemWall === 'south' || itemWall === 'north') {
              // North/South walls: keep X (lateral), use Z from constrainToWalls (perpendicular)
              constrainedPosition.z = wallResult.position.z;
            } else if (itemWall === 'east' || itemWall === 'west') {
              // East/West walls: keep Z (lateral), use X from constrainToWalls (perpendicular)
              constrainedPosition.x = wallResult.position.x;
            }
            constrainedRotation = wallResult.rotation;
          }
        } else if (isCornerOnlyGroup && isCornerOnlyItem) {
          // ✅ FIX: CORNER_ONLY secondary item in a group - re-snap to appropriate corner
          // This allows corner items to move to new corners when dragged via a wall-snap primary
          const result = constrainToCorner(
            { x: targetPos.x, y: targetPos.y, z: targetPos.z },
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            {
              type: itemType,
              scale: itemScale,
              orientation: obj.userData.orientation,
              item: itemData,
              movement: movementConfig,
              notchWidth: this.notchWidthRef.value,
              notchHeight: this.notchHeightRef.value
            }
          );
          constrainedPosition = result.position;
          constrainedRotation = result.rotation;
        } else if (isCornerOnlyGroup && isWallSnapItem) {
          // ✅ FIX: CORNER_ONLY group with WALL_SNAP item - re-snap to appropriate wall
          // Use targetPos which already has the correct offset from primary object applied
          const originalY = targetPos.y; // Preserve Y position

          // ✅ FIX: Use UNCLAMPED target position to determine which wall to switch to
          // This allows wall switching when the item goes past the boundary
          const targetItemWall = this.determineCurrentWall(targetPos);

          // Snap to wall - constrainToWalls will handle boundaries correctly
          const result = constrainToWalls(
            targetPos,  // Use unclamped position - constrainToWalls will handle boundaries
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            {
              type: itemType,
              scale: itemScale,
              orientation: obj.userData.orientation,
              item: itemData,
              notchWidth: this.notchWidthRef.value,
              notchHeight: this.notchHeightRef.value
            },
            targetItemWall
          );

          constrainedPosition = { x: result.position.x, y: originalY, z: result.position.z };
          constrainedRotation = result.rotation;
        } else if (movementConfig.snapToWall && !movementConfig.cornerInstallOnly) {
          // 3D MODE: Individual wall constraints (when no group constraint)
          // Determine the target wall for THIS secondary object based on its targetPos
          // This is critical when the primary object has just switched walls
          const originalY = targetPos.y; // Preserve Y position

          // ✅ FIX: Use UNCLAMPED target position to determine which wall to switch to
          // This allows wall switching when the item goes past the boundary
          const targetItemWall = this.determineCurrentWall(targetPos);

          // Now constrain to that wall - constrainToWalls will handle positioning correctly
          const result = constrainToWalls(
            targetPos,  // Use unclamped position - constrainToWalls will handle boundaries
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            {
              type: itemType,
              scale: itemScale,
              orientation: obj.userData.orientation,
              item: itemData,
              notchWidth: this.notchWidthRef.value,
              notchHeight: this.notchHeightRef.value
            },
            targetItemWall
          );
          constrainedPosition = { x: result.position.x, y: originalY, z: result.position.z };
          constrainedRotation = result.rotation;
        } else if (movementConfig.cornerInstallOnly) {
          const result = constrainToCorner(
            { x: targetPos.x, y: targetPos.y, z: targetPos.z },
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            {
              type: itemType,
              scale: itemScale,
              orientation: obj.userData.orientation,
              item: itemData,
              movement: movementConfig,
              notchWidth: this.notchWidthRef.value,
              notchHeight: this.notchHeightRef.value
            }
          );
          constrainedPosition = result.position;
          constrainedRotation = result.rotation;
        } else {
          const result = constrainToRoom(
            { x: targetPos.x, y: targetPos.y, z: targetPos.z },
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            {
              type: itemType,
              scale: itemScale,
              orientation: obj.userData.orientation,
              item: itemData,
              notchWidth: this.notchWidthRef.value,
              notchHeight: this.notchHeightRef.value
            }
          );
          constrainedPosition = result.position;
        }

        // Only apply room boundary clamp for FREE-STANDING objects
        // Wall-snapping objects are already correctly positioned by constrainToWalls
        // and constrainToRoom would incorrectly pull them away from the wall
        if (!movementConfig.snapToWall && !movementConfig.cornerInstallOnly) {
          const finalConstrainedResult = constrainToRoom(
            { x: constrainedPosition.x, y: constrainedPosition.y, z: constrainedPosition.z },
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            {
              type: itemType,
              scale: itemScale,
              orientation: obj.userData.orientation,
              item: itemData,
              notchWidth: this.notchWidthRef.value,
              notchHeight: this.notchHeightRef.value
            }
          );
          constrainedPosition = finalConstrainedResult.position;
        }

        obj.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
        obj.rotation.y = constrainedRotation;

        // Check collision for this object - exclude other selected items to prevent false positives
        const isColliding = wouldCollideWithExisting(
          { x: constrainedPosition.x, y: constrainedPosition.y, z: constrainedPosition.z },
          itemType,
          itemScale,
          id,
          this.getVirtualItemsExcludingSelected(), // Use filtered list to exclude selected group
          itemData,
          this.roomWidthRef.value,
          this.roomHeightRef.value,
          this.notchWidthRef.value,
          this.notchHeightRef.value
        );
        if (isColliding) anyColliding = true;

        // Queue update for this object
        this.queueUpdate(id, {
          position: [constrainedPosition.x, constrainedPosition.y, constrainedPosition.z],
          rotation: constrainedRotation
        });

        // ✅ Update schematic overlay position in 2D mode for multi-selected objects
        if (this.viewMode === '2d' && this.sceneManager?.updateSchematicPosition) {
          this.sceneManager.updateSchematicPosition(id);
        }
      }
    });

    // If any object in the group is colliding, set the outline color to red
    if (anyColliding) {
      setOutlineColor(true);
    }
  }

  /**
   * Re-snaps wall-standing items to the nearest wall after a group move.
   * This ensures items with snapToWall: true maintain their wall attachment
   * when moved as part of a multi-selection group.
   */
  private snapWallStandingItemsOnDrop(): void {
    // Only process if we have a multi-select group
    if (this.selectedObjects.size <= 1) return;

    // In 2D mode, treat group as rigid body - no individual snapping
    if (this.viewMode === '2d') return;

    const updatedItems: Array<{ id: number, position: [number, number, number], rotation: number }> = [];

    this.selectedObjects.forEach((obj, id) => {
      const itemType = obj.userData.type as ComponentType;
      const itemScale = obj.scale.x;
      const itemData = this.getCurrentItemData(id);
      const movementConfig = getMovementConfig(itemType, itemData);

      // Only process items with snapToWall: true (wall-standing units)
      if (movementConfig.snapToWall && !movementConfig.cornerInstallOnly) {
        const currentWall = this.determineCurrentWall(obj.position);
        const originalY = obj.position.y; // Preserve original Y position

        const result = constrainToWalls(
          { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          this.roomWidthRef.value,
          this.roomHeightRef.value,
          {
            type: itemType,
            scale: itemScale,
            orientation: obj.userData.orientation,
            item: itemData,
            notchWidth: this.notchWidthRef.value,
            notchHeight: this.notchHeightRef.value
          },
          currentWall
        );

        // Update position (preserve original Y, only snap X/Z to wall)
        obj.position.set(result.position.x, originalY, result.position.z);
        obj.rotation.y = result.rotation;

        updatedItems.push({
          id,
          position: [result.position.x, originalY, result.position.z],
          rotation: result.rotation
        });

        // Update schematic overlay position if in 2D mode toggle
        if (this.sceneManager?.updateSchematicPosition) {
          this.sceneManager.updateSchematicPosition(id);
        }
      }
    });

    // Batch update the data model with all snapped positions
    if (updatedItems.length > 0) {
      this.setItems((prevItems: BathroomItem[]) => {
        return prevItems.map(item => {
          const updated = updatedItems.find(u => u.id === item.id);
          if (updated) {
            return {
              ...item,
              position: updated.position,
              rotation: updated.rotation
            };
          }
          return item;
        });
      });

    }
  }

  private handleMouseMove(event: MouseEvent): void {
    // Track mouse movement for click vs drag detection
    const mouseDistance = this.mouseDownPosition.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
    if (mouseDistance > this.MOUSE_MOVE_THRESHOLD) {
      this.hasMouseMoved = true;
    }
    if (this.rotationArrows && this.rotationArrows.isDraggingArrow()) {
      return;
    }

    const mousePos = updateMousePosition(event, this.renderer.domElement.getBoundingClientRect());
    this.mouse.set(mousePos.x, mousePos.y);

    // Safety check - if no mouse buttons are pressed, stop dragging
    if (event.buttons === 0) {
      if (this.isDragging || this.isRotating || this.isObjectRotating || this.isHeightAdjusting || this.isScaling) {
        this.stopAllDragOperations();
        return;
      }
    } else {
      if (this.isDragging && this.selectedObject && this.measurementSystem) {
        this.updateMeasurementsThrottled();
        // Emit event for real-time measurement updates
        window.dispatchEvent(new CustomEvent('object-moved'));
      } else if (this.isHeightAdjusting && this.selectedObject && this.measurementSystem) {
        // ✅ ADD THIS: Update measurements during height adjustment
        this.updateMeasurementsThrottled();
        window.dispatchEvent(new CustomEvent('object-moved'));
      }
    }

    if (this.isScaling && this.selectedObject) {
      // Scale object
      const deltaY = (this.mouseStartY - event.clientY) * 0.001;
      const newScale = Math.max(SCALE_LIMITS.MIN, Math.min(SCALE_LIMITS.MAX, this.scaleStart + deltaY));

      this.selectedObject.scale.set(newScale, newScale, newScale);

      const itemId = this.selectedObject.userData.itemId as number;
      // Queue update instead of applying immediately
      this.queueUpdate(itemId, { scale: newScale });

    } else if (this.isHeightAdjusting && this.selectedObject) {
      // 🆕 ENHANCED: Height adjustment with movement configuration
      const objectType = this.selectedObject.userData.type as ComponentType;
      const itemId = this.selectedObject.userData.itemId as number;
      const currentItem = this.getCurrentItemData(itemId);

      // 📐 2D MODE: Disable height adjustment in 2D mode
      if (!this.canAdjustHeight()) {
        return;
      }

      // 📊 GROUP CONSTRAINT: Block height adjustment for entire group if ANY item has fixed height
      if (this.selectedObjects.size > 1 && this.groupConstraint?.heightRestriction === 'locked') {
        return;
      }

      // Check if vertical movement is allowed
      if (!canMoveVertically(objectType, currentItem)) {
        return; // Don't allow height adjustment
      }

      const heightConstraints = this.getProperHeightConstraints(
        objectType,
        currentItem
      );

      const deltaY = (event.clientY - this.mouseStartY) * -0.5;

      // ✅ FIX: Calculate new height properly
      const newHeight = Math.max(
        heightConstraints.min,
        Math.min(heightConstraints.max, this.heightStartY + deltaY)
      );

      // Set the new height
      this.selectedObject.position.y = newHeight;

      // ✅ FIX: Queue update with correct position
      this.queueUpdate(itemId, {
        position: [this.selectedObject.position.x, newHeight, this.selectedObject.position.z]
      });

      if (this.measurementSystem) {
        this.updateMeasurementsThrottled();
      }

    } else if (this.isObjectRotating && this.selectedObject) {
      // 🆕 ENHANCED: Rotation with movement configuration
      const objectType = this.selectedObject.userData.type as ComponentType;
      const itemId = this.selectedObject.userData.itemId as number;
      const currentItem = this.getCurrentItemData(itemId);

      // Check if free rotation is allowed
      if (!canRotateFreely(objectType, currentItem)) {
        return; // Don't allow free rotation
      }

      // Rotate object
      const rect = this.renderer.domElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      const deltaAngle = this.rotationStartAngle - currentAngle;

      this.selectedObject.rotation.y = this.objectStartRotation + deltaAngle;

      this.queueUpdate(itemId, { rotation: this.selectedObject.rotation.y });

    } else if (this.isDragging && this.selectedObject) {

      if (this.measurementSystem) {
        this.updateMeasurementsThrottled();
      }

      const objectType = this.selectedObject.userData.type as ComponentType;
      const objectScale = this.selectedObject.scale.x;
      const itemId = this.selectedObject.userData.itemId as number;
      const currentItem = this.getCurrentItemData(itemId);
      const movementConfig = getMovementConfig(objectType, currentItem);

      // ✅ FIX: Check if primary is a freestanding object
      // Freestanding objects have their origin at center, so they need different positioning when snapped to walls
      const primaryIsFreestanding = !movementConfig.snapToWall &&
        !(movementConfig.cornerInstallOnly && typeof movementConfig.cornerInstallOnly === 'object' && movementConfig.cornerInstallOnly.enabled);

      // 📊 GROUP CONSTRAINT: Override primary object's movement based on group constraint
      // If group has CORNER_ONLY or L-shape constraint, ALL objects (including primary) must be constrained
      // ✅ FIX: When primary is freestanding, ignore L-shape detection because freestanding items aren't really "on" a wall
      // L-shape detection only matters when ALL items in the group are wall-mounted
      // Check if there's an actual corner-only item in the group (not just L-shape detection)
      const hasActualCornerOnlyItem = this.groupConstraint &&
        Array.from(this.selectedObjects.values()).some(obj => {
          const itemData = this.getCurrentItemData(obj.userData.itemId as number);
          const itemMovement = getMovementConfig(obj.userData.type as ComponentType, itemData);
          return itemMovement.cornerInstallOnly &&
            typeof itemMovement.cornerInstallOnly === 'object' &&
            itemMovement.cornerInstallOnly.enabled;
        });

      const effectiveCornerOnly = (this.groupConstraint && (
        // Only use CORNER_ONLY if there's an actual corner-only item, OR L-shape with no freestanding primary
        (this.groupConstraint.movementType === ConstraintPriority.CORNER_ONLY && hasActualCornerOnlyItem) ||
        (this.groupConstraint.isLShapeGroup && !primaryIsFreestanding)
      )) || (movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled);

      // 📊 GROUP CONSTRAINT: "Most restrictive wins" - wall-snap behavior applies to entire group
      // Freestanding primary is snapped to wall at drag start, so it can move along walls
      const effectiveWallSnap = (this.groupConstraint &&
        this.groupConstraint.movementType === ConstraintPriority.WALL_SNAP &&
        !effectiveCornerOnly
      ) || (movementConfig.snapToWall && !effectiveCornerOnly);

      // ✅ NEW: Calculate stable ideal position for the entire group using the camera-facing plane
      // 📐 2D MODE: Use floor plane for position calculation
      let idealPosition: THREE.Vector3;
      if (this.viewMode === '2d') {
        const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());
        const floorIntersect = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(floorPlane, floorIntersect);
        idealPosition = floorIntersect.clone().add(this.dragOffset);
      } else {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        idealPosition = intersectPoint.clone().add(this.dragOffset);
        // Update intersection visualization (only in 3D mode)
        this.updateIntersectionPointVisualization(intersectPoint);
      }

      // Get cursor position on the existing drag plane and include initial offset
      this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());


      // ✅ ROTATION-AWARE FIX for freestanding objects
      // 📊 GROUP CONSTRAINT: Skip free rotation handling if group has more restrictive constraint
      if (movementConfig.allowFreeRotation && !movementConfig.snapToWall && !effectiveCornerOnly && !effectiveWallSnap) {
        const currentPos = idealPosition;
        const constrainedPos = this.constrainFreeRotationObjectPosition(currentPos, objectType, currentItem);

        // Set position
        this.selectedObject.position.set(constrainedPos.x, this.selectedObject.position.y, constrainedPos.z);

        // 📊 GROUP CONSTRAINT: Apply snap_90 if group requires it
        let objectRotation = this.selectedObject.rotation.y;
        if (this.groupConstraint && this.groupConstraint.rotationRestriction === 'snap_90') {
          objectRotation = snapRotationTo90Degrees(objectRotation);
          this.selectedObject.rotation.y = objectRotation;
        }

        // Update data model
        this.queueUpdate(itemId, {
          position: [constrainedPos.x, this.selectedObject.position.y, constrainedPos.z],
          rotation: objectRotation
        });

        // Real-time collision feedback
        const isColliding = this.checkCollisionState(
          { x: constrainedPos.x, y: this.selectedObject.position.y, z: constrainedPos.z },
          objectType,
          objectScale,
          itemId,
          currentItem,
          objectRotation
        );
        setOutlineColor(isColliding);

        // Update schematic overlay position in 2D mode
        if (this.sceneManager?.updateSchematicPosition) {
          this.sceneManager.updateSchematicPosition(itemId);
        }

        // Apply bulk move to other selected objects
        this.applyBulkMove(this.selectedObject, idealPosition, objectRotation);

        return; // Exit early
      }

      let constrainedPosition = { x: 0, y: 0, z: 0 };
      let constrainedRotation = this.selectedObject.rotation.y;
      let rotationChanged = false;

      // 📊 GROUP CONSTRAINT: Apply snap_90 rotation if group requires it
      if (this.groupConstraint && this.groupConstraint.rotationRestriction === 'snap_90') {
        constrainedRotation = snapRotationTo90Degrees(constrainedRotation);
        rotationChanged = true;
      }

      // ✅ Helper to calculate group bounds for a given rotation (moved here to be accessible in all branches)
      const calculateGroupBounds = (rotation: number) => {
        let minX = 0, maxX = 0, minZ = 0, maxZ = 0;
        if (this.selectedObjects.size <= 1) {
          const dims = getDimensions(objectType, currentItem?.sku, currentItem?.model);
          if (dims) {
            const hW = (dims.width * objectScale) / 2;
            const hD = (dims.depth * objectScale) / 2;
            // For single object, use width for X and depth for Z based on rotation
            // rotation 0 or PI = facing north/south, width along X
            // rotation ±PI/2 = facing east/west, width along Z
            const isNorthSouth = Math.abs(Math.cos(rotation)) > 0.7;
            return isNorthSouth
              ? { minX: -hW, maxX: hW, minZ: -hD, maxZ: hD }
              : { minX: -hD, maxX: hD, minZ: -hW, maxZ: hW };
          }
          return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
        }

        this.selectedObjects.forEach((obj, id) => {
          const localOffset = this.multiSelectLocalOffsets.get(id);
          if (localOffset) {
            const worldOffset = localOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            const itemType = obj.userData.type as ComponentType;
            const itemScale = obj.scale.x;
            const itemData = this.getCurrentItemData(id);
            const dims = getDimensions(itemType, itemData?.sku, itemData?.model);

            if (dims) {
              const hW = (dims.width * itemScale) / 2;
              const hD = (dims.depth * itemScale) / 2;
              // Use width for X and depth for Z based on group rotation
              // rotation 0 or PI = facing north/south, width along X
              // rotation ±PI/2 = facing east/west, width along Z
              const isNorthSouth = Math.abs(Math.cos(rotation)) > 0.7;
              const extentX = isNorthSouth ? hW : hD;
              const extentZ = isNorthSouth ? hD : hW;
              minX = Math.min(minX, worldOffset.x - extentX);
              maxX = Math.max(maxX, worldOffset.x + extentX);
              minZ = Math.min(minZ, worldOffset.z - extentZ);
              maxZ = Math.max(maxZ, worldOffset.z + extentZ);
            } else {
              minX = Math.min(minX, worldOffset.x);
              maxX = Math.max(maxX, worldOffset.x);
              minZ = Math.min(minZ, worldOffset.z);
              maxZ = Math.max(maxZ, worldOffset.z);
            }
          }
        });
        return { minX, maxX, minZ, maxZ };
      };

      // ✅ SIMPLIFIED: Direct cursor following for wall-snapping objects
      // 📊 GROUP CONSTRAINT: Use effectiveWallSnap instead of individual config
      if (effectiveWallSnap) {
        // Get room and object dimensions
        const roomHalfWidth = this.roomWidthRef.value / 2;
        const roomHalfHeight = this.roomHeightRef.value / 2;
        const wallBuffer = (currentItem?.model?.orientation?.wallBuffer ?? 0) * objectScale;

        // ✅ NEW: Track current wall to prevent jumping
        const currentWall = this.determineCurrentWall(this.selectedObject.position);

        // ✅ FIX: Project cursor onto ALL wall planes and use the closest intersection
        this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());

        // 📐 2D MODE: Use floor plane intersection instead of wall plane intersection
        if (this.viewMode === '2d') {
          const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
          const floorIntersect = new THREE.Vector3();

          if (this.raycaster.ray.intersectPlane(floorPlane, floorIntersect)) {
            // Apply drag offset to get target position
            const targetX = floorIntersect.x + this.dragOffset.x;
            const targetZ = floorIntersect.z + this.dragOffset.z;
            const targetY = this.selectedObject.position.y; // Keep Y locked in 2D mode

            // ✅ NEW: Use centralized constrainToWalls for 2D mode
            // This provides stickiness, notch support, and consistent behavior
            const currentWall = this.determineCurrentWall(this.selectedObject.position);
            const result = constrainToWalls(
              { x: targetX, y: targetY, z: targetZ },
              this.roomWidthRef.value,
              this.roomHeightRef.value,
              {
                type: objectType,
                scale: objectScale,
                orientation: this.selectedObject.userData.orientation,
                item: currentItem,
                notchWidth: this.notchWidthRef.value,
                notchHeight: this.notchHeightRef.value
              },
              currentWall // Pass current wall for stickiness
            );

            constrainedPosition = result.position;
            constrainedRotation = result.rotation;

            // ✅ FIX: Freestanding primary objects rotate with wall but need position offset
            if (primaryIsFreestanding) {
              // Offset position by half depth based on wall direction
              const dims = getDimensions(objectType, currentItem?.sku, currentItem?.model);
              if (dims) {
                const halfDepth = (dims.depth * objectScale) / 2;
                // Determine which wall based on rotation and offset accordingly
                const normalizedRot = ((constrainedRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
                if (normalizedRot < Math.PI / 4 || normalizedRot > 7 * Math.PI / 4) {
                  // On north wall - move away from north
                  constrainedPosition.z += halfDepth;
                } else if (normalizedRot > 3 * Math.PI / 4 && normalizedRot < 5 * Math.PI / 4) {
                  // On south wall - move away from south
                  constrainedPosition.z -= halfDepth;
                } else if (normalizedRot > Math.PI / 4 && normalizedRot < 3 * Math.PI / 4) {
                  // On west wall - move away from west
                  constrainedPosition.x += halfDepth;
                } else {
                  // On east wall - move away from east
                  constrainedPosition.x -= halfDepth;
                }
              }
            }

            // ✅ FIX: Apply group bounds constraint for multi-select in 2D mode
            // Only constrain the LATERAL axis (along the wall), not the wall-perpendicular axis
            // because constrainToWalls already handles the wall-perpendicular positioning
            if (this.selectedObjects.size > 1) {
              const { interior, notch } = getInteriorBoundaries(
                this.roomWidthRef.value,
                this.roomHeightRef.value,
                this.notchWidthRef.value,
                this.notchHeightRef.value
              );

              // Determine which wall the object is on based on rotation
              // North wall: rotation ~0, slide along X
              // South wall: rotation ~PI, slide along X
              // East wall: rotation ~-PI/2, slide along Z
              // West wall: rotation ~PI/2, slide along Z
              const isOnNorthSouthWall = Math.abs(Math.cos(constrainedRotation)) > 0.7;

              // Calculate group bounds relative to primary position
              let groupMinX = 0, groupMaxX = 0, groupMinZ = 0, groupMaxZ = 0;

              this.selectedObjects.forEach((obj, id) => {
                const localOffset = this.multiSelectLocalOffsets.get(id);
                if (localOffset) {
                  // Rotate the offset by the constrained rotation
                  const worldOffset = localOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), constrainedRotation);
                  const itemType = obj.userData.type as ComponentType;
                  const itemScale = obj.scale.x;
                  const itemData = this.getCurrentItemData(id);
                  const dims = getDimensions(itemType, itemData?.sku, itemData?.model);

                  if (dims) {
                    const hW = (dims.width * itemScale) / 2;
                    const hD = (dims.depth * itemScale) / 2;
                    // Use proper dimension for each axis based on wall orientation
                    // On north/south walls: width runs along X, depth along Z
                    // On east/west walls: width runs along Z, depth along X
                    const halfExtentX = isOnNorthSouthWall ? hW : hD;
                    const halfExtentZ = isOnNorthSouthWall ? hD : hW;
                    groupMinX = Math.min(groupMinX, worldOffset.x - halfExtentX);
                    groupMaxX = Math.max(groupMaxX, worldOffset.x + halfExtentX);
                    groupMinZ = Math.min(groupMinZ, worldOffset.z - halfExtentZ);
                    groupMaxZ = Math.max(groupMaxZ, worldOffset.z + halfExtentZ);
                  } else {
                    groupMinX = Math.min(groupMinX, worldOffset.x);
                    groupMaxX = Math.max(groupMaxX, worldOffset.x);
                    groupMinZ = Math.min(groupMinZ, worldOffset.z);
                    groupMaxZ = Math.max(groupMaxZ, worldOffset.z);
                  }
                }
              });

              // Only apply constraints to the lateral axis (along the wall)
              if (isOnNorthSouthWall) {
                // On north/south wall: only constrain X (left/right movement)
                const effectiveMinX = notch ? Math.max(interior.minX, notch.maxX + WALL_SETTINGS.THICKNESS) : interior.minX;

                // Right boundary: primary.x + groupMaxX <= interior.maxX
                if (constrainedPosition.x + groupMaxX > interior.maxX) {
                  constrainedPosition.x = interior.maxX - groupMaxX;
                }
                // Left boundary: primary.x + groupMinX >= effectiveMinX
                if (constrainedPosition.x + groupMinX < effectiveMinX) {
                  constrainedPosition.x = effectiveMinX - groupMinX;
                }
              } else {
                // On east/west wall: only constrain Z (up/down movement along wall)
                const effectiveMinZ = notch ? Math.max(interior.minZ, notch.maxZ + WALL_SETTINGS.THICKNESS) : interior.minZ;

                // South boundary: primary.z + groupMaxZ <= interior.maxZ
                if (constrainedPosition.z + groupMaxZ > interior.maxZ) {
                  constrainedPosition.z = interior.maxZ - groupMaxZ;
                }
                // North boundary: primary.z + groupMinZ >= effectiveMinZ
                if (constrainedPosition.z + groupMinZ < effectiveMinZ) {
                  constrainedPosition.z = effectiveMinZ - groupMinZ;
                }
              }
            }
          }

          // Check for collisions
          const isColliding = this.checkCollisionState(
            constrainedPosition,
            objectType,
            objectScale,
            itemId,
            currentItem,
            constrainedRotation
          );
          setOutlineColor(isColliding);

          // Apply position to object
          this.selectedObject.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);
          this.selectedObject.rotation.y = constrainedRotation;

          // Update schematic overlay position in 2D mode
          if (this.sceneManager?.updateSchematicPosition) {
            this.sceneManager.updateSchematicPosition(itemId);
          }

          // Queue update
          this.queueUpdate(itemId, {
            position: [constrainedPosition.x, constrainedPosition.y, constrainedPosition.z],
            rotation: constrainedRotation
          });

          // ✅ Apply bulk move to other selected objects in 2D mode
          // Use the floor intersection point as the ideal position for the group
          const idealPosition2D = new THREE.Vector3(
            floorIntersect.x + this.dragOffset.x,
            constrainedPosition.y,
            floorIntersect.z + this.dragOffset.z
          );
          this.applyBulkMove(this.selectedObject, idealPosition2D, constrainedRotation);

          return; // Exit early - 2D mode handling complete
        }


        // ✅ GET NOTCH BOUNDARIES FIRST for L-shaped room support
        const { interior, wallFaces, notch } = getInteriorBoundaries(
          this.roomWidthRef.value,
          this.roomHeightRef.value,
          this.notchWidthRef.value,
          this.notchHeightRef.value
        );

        // Calculate current group bounds for stickiness logic
        const currentGroupBounds = calculateGroupBounds(this.selectedObject.rotation.y);
        const groupMinX = currentGroupBounds.minX;
        const groupMaxX = currentGroupBounds.maxX;
        const groupMinZ = currentGroupBounds.minZ;
        const groupMaxZ = currentGroupBounds.maxZ;

        // ✅ FIX: Use wall culling to determine which walls are visible for SWITCHING
        // But always allow staying on the current wall (even if hidden)
        let visibleWalls: Set<string>;
        if (this.wallCulling && this.wallCulling.enabled) {
          const wallVisibility = this.wallCulling.getWallVisibilityStatus();
          visibleWalls = new Set(
            wallVisibility
              .filter(status => status.visible)
              .map(status => status.direction)
          );
        } else {
          visibleWalls = new Set(['north', 'south', 'east', 'west']);
        }

        // ✅ ALWAYS include current wall - allow dragging along it even if hidden
        if (currentWall) {
          visibleWalls.add(currentWall);
        }

        // ✅ ADD NOTCH WALLS if notch exists (always visible for L-shaped rooms)
        if (notch) {
          visibleWalls.add('notch-east');
          visibleWalls.add('notch-south');
        }

        // Create planes for each wall
        const wallPlanes: { [key: string]: THREE.Plane } = {
          north: new THREE.Plane(new THREE.Vector3(0, 0, 1), roomHalfHeight),
          south: new THREE.Plane(new THREE.Vector3(0, 0, -1), roomHalfHeight),
          east: new THREE.Plane(new THREE.Vector3(-1, 0, 0), roomHalfWidth),
          west: new THREE.Plane(new THREE.Vector3(1, 0, 0), roomHalfWidth)
        };

        // ✅ ADD NOTCH EDGES AS WALLS for L-shaped rooms
        if (notch) {
          // Vertical notch edge (runs north-south at X = notch.maxX)
          // Plane equation: -x + notch.maxX = 0  →  x = notch.maxX
          wallPlanes['notch-east'] = new THREE.Plane(new THREE.Vector3(-1, 0, 0), notch.maxX);
          // Horizontal notch edge (runs east-west at Z = notch.maxZ)
          // Plane equation: -z + notch.maxZ = 0  →  z = notch.maxZ
          wallPlanes['notch-south'] = new THREE.Plane(new THREE.Vector3(0, 0, -1), notch.maxZ);
        }

        // Find where cursor ray intersects each wall
        let closestWall = currentWall || 'north';
        let closestPoint = new THREE.Vector3();
        let minDistance = Infinity;
        let foundValidIntersection = false;

        // First, check intersection with current wall
        let currentWallDistance = Infinity;
        let currentWallPoint = new THREE.Vector3();

        if (currentWall && wallPlanes[currentWall] && visibleWalls.has(currentWall)) {
          const intersectPoint = new THREE.Vector3();
          if (this.raycaster.ray.intersectPlane(wallPlanes[currentWall], intersectPoint)) {
            // ✅ Validate intersection based on wall type
            let isValidIntersection = false;

            // For regular walls: check room bounds with tolerance for wall transitions
            if (currentWall === 'north' || currentWall === 'south' || currentWall === 'east' || currentWall === 'west') {
              // ✅ DYNAMIC TOLERANCE: Use higher tolerance when on north/west walls in L-shaped rooms
              // (to allow smooth transitions to notch walls), otherwise use lower tolerance
              let TRANSITION_TOLERANCE = 40; // Reduced from 200cm to 40cm for better responsiveness

              if (Math.abs(intersectPoint.x) <= roomHalfWidth + TRANSITION_TOLERANCE &&
                Math.abs(intersectPoint.z) <= roomHalfHeight + TRANSITION_TOLERANCE &&
                intersectPoint.y >= -50 && intersectPoint.y <= 300) {

                // ✅ CRITICAL FIX: For L-shaped rooms, check that intersection is NOT inside the notch cutout
                if (notch) {
                  // Check if intersection point is inside the notch rectangle (not just quadrant!)
                  const isInsideNotch =
                    intersectPoint.x >= notch.minX && intersectPoint.x <= notch.maxX &&
                    intersectPoint.z >= notch.minZ && intersectPoint.z <= notch.maxZ;

                  if (!isInsideNotch) {
                    isValidIntersection = true;
                  }
                  // If inside notch, leave isValidIntersection = false
                } else {
                  isValidIntersection = true;
                }
              }
            }
            // ✅ For notch-east: check if intersection is on the vertical notch wall segment
            else if (currentWall === 'notch-east' && notch) {
              if (Math.abs(intersectPoint.x - notch.maxX) <= 20 &&
                intersectPoint.z >= notch.minZ &&
                intersectPoint.z <= notch.maxZ &&
                intersectPoint.y >= -50 && intersectPoint.y <= 300) {
                isValidIntersection = true;
              }
            }
            // ✅ For notch-south: check if intersection is on the horizontal notch wall segment
            else if (currentWall === 'notch-south' && notch) {
              if (Math.abs(intersectPoint.z - notch.maxZ) <= 20 &&
                intersectPoint.x >= notch.minX &&
                intersectPoint.x <= notch.maxX &&
                intersectPoint.y >= -50 && intersectPoint.y <= 300) {
                isValidIntersection = true;
              }
            }

            if (isValidIntersection) {
              const rayDistance = this.camera.position.distanceTo(intersectPoint);
              const STICKINESS_BONUS = 40; // Reduced from 200cm to 40cm for better responsiveness
              let effectiveStickiness = STICKINESS_BONUS;

              // ✅ GROUP-AWARE WALL SWITCHING:
              // If any item in the group is "pressing" against a corner, reduce stickiness
              // to allow easier switching to the adjacent wall.
              if (this.selectedObjects.size > 1) {
                let isPressing = false;
                const buffer = 10; // 10cm buffer

                if (currentWall === 'north' || currentWall === 'south') {
                  if (intersectPoint.x + groupMinX < -roomHalfWidth + buffer ||
                    intersectPoint.x + groupMaxX > roomHalfWidth - buffer) {
                    isPressing = true;
                  }
                } else if (currentWall === 'east' || currentWall === 'west') {
                  if (intersectPoint.z + groupMinZ < -roomHalfHeight + buffer ||
                    intersectPoint.z + groupMaxZ > roomHalfHeight - buffer) {
                    isPressing = true;
                  }
                } else if (currentWall === 'notch-east' && notch) {
                  if (intersectPoint.z + groupMinZ < notch.minZ + buffer ||
                    intersectPoint.z + groupMaxZ > notch.maxZ - buffer) {
                    isPressing = true;
                  }
                } else if (currentWall === 'notch-south' && notch) {
                  if (intersectPoint.x + groupMinX < notch.minX + buffer ||
                    intersectPoint.x + groupMaxX > notch.maxX - buffer) {
                    isPressing = true;
                  }
                }

                if (isPressing) {
                  effectiveStickiness = -20; // Penalty to encourage switching
                }
              }

              currentWallDistance = rayDistance - effectiveStickiness; // Make current wall "closer"

              currentWallPoint.copy(intersectPoint);
              foundValidIntersection = true;
              closestWall = currentWall;
              closestPoint.copy(currentWallPoint);
              minDistance = currentWallDistance;
            }
          }
        }

        // ✅ WALL TRANSITION RULES: Define which walls can be switched to from current wall
        // Allow transitions to adjacent walls based on L-shaped room geometry
        const getAllowedWallTransitions = (fromWall: WallType): Set<WallType> => {
          const allowed = new Set<WallType>();

          switch (fromWall) {
            case 'notch-east':
              // Notch-east connects to all adjacent walls
              allowed.add('north');  // ✅ Added: transition to north at top corner
              allowed.add('south');
              allowed.add('west');
              allowed.add('east'); // Allow transition to parallel wall
              if (notch) {
                allowed.add('notch-south'); // ✅ Added: transition to perpendicular notch wall
              }
              break;
            case 'notch-south':
              // Notch-south connects to all adjacent walls
              allowed.add('east');
              allowed.add('south');
              allowed.add('west');  // ✅ Added: transition to west at left corner
              allowed.add('north'); // Allow transition to parallel wall
              if (notch) {
                allowed.add('notch-east'); // ✅ Added: transition to perpendicular notch wall
              }
              break;
            case 'north':
              // North wall connects to all perpendicular walls and notch walls
              allowed.add('east');
              allowed.add('west');
              if (notch) {
                allowed.add('notch-east');
                allowed.add('notch-south'); // ✅ Added: transition to notch-south
              }
              break;
            case 'south':
              // South wall connects to all perpendicular walls and both notch edges
              allowed.add('east');
              allowed.add('west');
              if (notch) {
                allowed.add('notch-east');
                allowed.add('notch-south');
              }
              break;
            case 'east':
              // East wall connects to all perpendicular walls and both notch walls
              allowed.add('north');
              allowed.add('south');
              if (notch) {
                allowed.add('notch-south');
                allowed.add('notch-east');
              }
              break;
            case 'west':
              // West wall connects to all perpendicular walls and both notch walls
              allowed.add('north');
              allowed.add('south');
              if (notch) {
                allowed.add('notch-east');
                allowed.add('notch-south'); // ✅ Added: transition to notch-south
              }
              break;
          }

          return allowed;
        };

        const allowedTransitions = currentWall ? getAllowedWallTransitions(currentWall) : new Set(Object.keys(wallPlanes));

        // Now check other walls - only switch if significantly closer AND transition is allowed
        for (const [wall, plane] of Object.entries(wallPlanes)) {
          // Skip current wall (already checked) and invisible walls
          if (wall === currentWall || !visibleWalls.has(wall)) {
            continue;
          }

          // ✅ Skip walls that are not allowed transitions from current wall
          if (!allowedTransitions.has(wall as WallType)) {
            continue;
          }

          const intersectPoint = new THREE.Vector3();
          if (this.raycaster.ray.intersectPlane(plane, intersectPoint)) {
            // ✅ Check if this intersection is within valid bounds (room bounds OR notch segment)
            let isValidIntersection = false;

            // For regular walls: check room bounds
            if (wall === 'north' || wall === 'south' || wall === 'east' || wall === 'west') {
              if (Math.abs(intersectPoint.x) <= roomHalfWidth &&
                Math.abs(intersectPoint.z) <= roomHalfHeight &&
                intersectPoint.y >= -50 && intersectPoint.y <= 300) {

                // ✅ Also check notch for other walls
                if (notch) {
                  const isInsideNotch =
                    intersectPoint.x >= notch.minX && intersectPoint.x <= notch.maxX &&
                    intersectPoint.z >= notch.minZ && intersectPoint.z <= notch.maxZ;

                  if (!isInsideNotch) {
                    isValidIntersection = true;
                  }
                } else {
                  isValidIntersection = true;
                }
              }
            }
            // ✅ For notch-east: check if intersection is on the vertical notch wall segment
            else if (wall === 'notch-east' && notch) {
              if (Math.abs(intersectPoint.x - notch.maxX) <= 50 && // Close to notch X position
                intersectPoint.z >= notch.minZ &&
                intersectPoint.z <= notch.maxZ &&
                intersectPoint.y >= -50 && intersectPoint.y <= 300) {
                isValidIntersection = true;
              }
            }
            // ✅ For notch-south: check if intersection is on the horizontal notch wall segment
            else if (wall === 'notch-south' && notch) {
              if (Math.abs(intersectPoint.z - notch.maxZ) <= 50 && // Close to notch Z position
                intersectPoint.x >= notch.minX &&
                intersectPoint.x <= notch.maxX &&
                intersectPoint.y >= -50 && intersectPoint.y <= 300) {
                isValidIntersection = true;
              }
            }

            if (isValidIntersection) {
              // ✅ FIX: Use RAY DISTANCE for candidate walls too
              // The wall with shortest ray distance is where cursor points most directly
              const rayDistance = this.camera.position.distanceTo(intersectPoint);

              // ✅ CRITICAL FIX: If current wall intersection is invalid (not foundValidIntersection yet),
              // immediately accept the closest valid alternative wall without requiring threshold
              // This prevents objects from getting stuck when transitioning between walls
              if (!foundValidIntersection) {
                // No valid current wall intersection - accept any valid alternative wall
                if (rayDistance < minDistance) {
                  minDistance = rayDistance;
                  closestWall = wall as WallType;
                  closestPoint.copy(intersectPoint);
                  foundValidIntersection = true;
                }
              } else {
                // Current wall is valid - use simple ray distance comparison
                // Current wall already has stickiness bonus applied (50cm advantage)
                // Switch if candidate wall has shorter ray distance (cursor points more directly at it)

                const isNotchWall = wall === 'notch-east' || wall === 'notch-south';

                // ✅ NOTCH WALL RESTRICTION: Only allow switching to notch walls if object is near the notch
                // This prevents unwanted jumps when dragging along main walls
                let allowNotchSwitch = true;
                if (isNotchWall && notch) {
                  const objectPos = this.selectedObject.position;
                  const NOTCH_PROXIMITY = 100; // Must be within 100cm of notch area

                  if (wall === 'notch-east') {
                    // Only switch to notch-east if object X is near notch.maxX
                    allowNotchSwitch = objectPos.x < notch.maxX + NOTCH_PROXIMITY;
                  } else if (wall === 'notch-south') {
                    // Only switch to notch-south if object Z is near notch.maxZ
                    allowNotchSwitch = objectPos.z < notch.maxZ + NOTCH_PROXIMITY;
                  }
                }

                // Switch if this wall is closer (cursor points more directly at it)
                const wouldSwitch = allowNotchSwitch && rayDistance < minDistance;

                if (wouldSwitch) {
                  minDistance = rayDistance;
                  closestWall = wall as WallType;
                  closestPoint.copy(intersectPoint);
                  foundValidIntersection = true;
                }
              }
            }
          }
        }

        if (!foundValidIntersection) {
          console.warn('No valid intersection found for cursor on walls');
          return; // Exit if no valid intersection
        } else {
          // ✅ Now position the object at the cursor position on the nearest wall
          // Apply dragOffset to maintain the original click position relative to object
          let newX = closestPoint.x + this.dragOffset.x;
          let newZ = closestPoint.z + this.dragOffset.z;
          let newY;

          // ✅ Adjust Y position (3D mode only - 2D already handled above)
          // ✅ FIX: Disable height adjustment during multi-select to keep group as rigid body
          if (movementConfig.allowVerticalMovement && this.selectedObjects.size <= 1) {
            // For wall-mounted objects, apply dragOffset to maintain where user clicked
            newY = closestPoint.y + this.dragOffset.y;
          } else {
            // Keep current Y if not allowing vertical movement or during multi-select
            newY = this.selectedObject.position.y;
          }

          // Calculate object width and depth for boundary constraints
          // Note: These variables are kept for potential future use but currently unused
          // const objectWidth = dimensions && dimensions.width ? dimensions?.width * objectScale : 0;
          // const objectDepth = dimensions && dimensions.depth ? dimensions?.depth * objectScale : 0;
          // const halfObjectWidth = objectWidth / 2;
          // const halfObjectDepth = objectDepth / 2;

          // ✅ NOTCH HANDLING: Use notch boundaries for L-shaped rooms
          // For north/south walls: object slides along X axis, so use notch.maxX as minimum X boundary
          // For east/west walls: object slides along Z axis, so use notch.maxZ as minimum Z boundary
          // ⚠️ CRITICAL: Add wall thickness to notch boundaries to prevent objects from entering the notch wall
          // notch.maxX/maxZ represent the INNER surface of notch walls, so we add thickness to get the OUTER edge
          const effectiveMinX = notch ? notch.maxX + WALL_SETTINGS.THICKNESS : interior.minX;
          const effectiveMinZ = notch ? notch.maxZ + WALL_SETTINGS.THICKNESS : interior.minZ;

          if (notch) {
          }

          // Adjust position based on which wall and apply constraints
          switch (closestWall) {
            case 'north':
              constrainedRotation = 0;
              const nBounds = calculateGroupBounds(constrainedRotation);
              // Keep object flush to north wall
              newZ = wallFaces.north + wallBuffer;
              // FIXED: Prevent group from extending beyond interior boundaries (including notch)
              newX = Math.max(
                effectiveMinX - nBounds.minX,  // Don't go into west wall or notch
                Math.min(interior.maxX - nBounds.maxX, newX)  // Don't go into east wall
              );
              break;

            case 'south':
              constrainedRotation = Math.PI;
              const sBounds = calculateGroupBounds(constrainedRotation);
              // Keep object flush to south wall
              newZ = wallFaces.south - wallBuffer;
              // ✅ CRITICAL FIX: South wall is opposite to notch - don't apply notch constraint!
              newX = Math.max(
                interior.minX - sBounds.minX,  // Use actual west boundary
                Math.min(interior.maxX - sBounds.maxX, newX)  // Don't go into east wall
              );
              break;

            case 'east':
              constrainedRotation = -Math.PI / 2;
              const eBounds = calculateGroupBounds(constrainedRotation);
              // Keep object flush to east wall
              newX = wallFaces.east - wallBuffer;
              // ✅ CRITICAL FIX: East wall is opposite to notch - don't apply notch constraint!
              newZ = Math.max(
                interior.minZ - eBounds.minZ,  // Use actual north boundary
                Math.min(interior.maxZ - eBounds.maxZ, newZ)  // Don't go into south wall
              );
              break;

            case 'west':
              constrainedRotation = Math.PI / 2;
              const wBounds = calculateGroupBounds(constrainedRotation);
              // Keep object flush to west wall
              newX = wallFaces.west + wallBuffer;
              // FIXED: Prevent group from extending beyond interior boundaries (including notch)
              newZ = Math.max(
                effectiveMinZ - wBounds.minZ,  // Don't go into north wall or notch
                Math.min(interior.maxZ - wBounds.maxZ, newZ)  // Don't go into south wall
              );
              break;

            // ✅ NOTCH EDGE WALLS for L-shaped rooms
            case 'notch-east':
              constrainedRotation = Math.PI / 2; // Faces East, like West wall
              const neBounds = calculateGroupBounds(constrainedRotation);
              // Vertical notch edge (runs north-south at X = notch.maxX)
              newX = notch?.maxX ? notch.maxX + wallBuffer + 5 : 0;
              newZ = Math.max(
                (notch?.minZ ?? interior.minZ) - neBounds.minZ,
                Math.min((notch?.maxZ ?? interior.maxZ) - neBounds.maxZ, newZ)
              );
              break;

            case 'notch-south':
              constrainedRotation = 0; // Faces South, like North wall
              const nsBounds = calculateGroupBounds(constrainedRotation);
              // Horizontal notch edge (runs east-west at Z = notch.maxZ)
              newZ = notch?.maxZ ? notch.maxZ + wallBuffer + 5 : 0;
              newX = Math.max(
                (notch?.minX ?? interior.minX) - nsBounds.minX,
                Math.min((notch?.maxX ?? interior.maxX) - nsBounds.maxX, newX)
              );
              break;
          }

          constrainedPosition.x = newX;
          constrainedPosition.z = newZ;
          constrainedPosition.y = newY;

          // ✅ FIX: Freestanding primary objects rotate with the wall (like wall-snap items)
          // but need position offset because their origin is at center
          if (primaryIsFreestanding) {
            // Freestanding rotates with wall direction (same as wall-snap items)
            rotationChanged = true;

            // Offset position by half depth based on wall direction
            const dims = getDimensions(objectType, currentItem?.sku, currentItem?.model);
            if (dims) {
              const halfDepth = (dims.depth * objectScale) / 2;
              // Offset based on which wall - move center away from wall by half depth
              switch (closestWall) {
                case 'north':
                case 'notch-south':
                  constrainedPosition.z += halfDepth;
                  break;
                case 'south':
                  constrainedPosition.z -= halfDepth;
                  break;
                case 'east':
                  constrainedPosition.x -= halfDepth;
                  break;
                case 'west':
                case 'notch-east':
                  constrainedPosition.x += halfDepth;
                  break;
              }
            }
          } else {
            rotationChanged = true;
          }

          // Handle vertical movement if allowed (disabled during multi-select)
          if (movementConfig.allowVerticalMovement && this.selectedObjects.size <= 1) {
            const heightConstraints = this.getProperHeightConstraints(objectType, currentItem);
            constrainedPosition.y = Math.max(
              heightConstraints.min,
              Math.min(heightConstraints.max, constrainedPosition.y)
            );
          }
        }

      } else if (effectiveCornerOnly) {
        // Handle corner-only objects - direct cursor tracking
        // 📊 GROUP CONSTRAINT: This also handles groups that need corner-only movement
        const heightPlane = new THREE.Plane(
          new THREE.Vector3(0, 1, 0),
          -this.selectedObject.position.y
        );

        this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());
        const cursorWorldPos = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(heightPlane, cursorWorldPos);

        // 📊 GROUP CONSTRAINT: If primary is NOT corner-only but group has corner-only item,
        // find the corner-only item and use IT as the anchor for corner positioning
        let cornerAnchorId = itemId;
        let cornerAnchorObj = this.selectedObject;
        let cornerAnchorOffset = new THREE.Vector3(0, 0, 0);
        const primaryIsCornerOnly = movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled;

        if (this.selectedObjects.size > 1 && this.groupConstraint && !primaryIsCornerOnly) {
          // Primary is not corner-only, find the corner-only item in the group
          this.selectedObjects.forEach((obj, id) => {
            if (id === itemId) return;
            const objItemData = this.getCurrentItemData(id);
            const objMovement = getMovementConfig(obj.userData.type as ComponentType, objItemData);
            if (objMovement.cornerInstallOnly && objMovement.cornerInstallOnly.enabled) {
              cornerAnchorId = id;
              cornerAnchorObj = obj;
              // Get the local offset of this corner-only item from primary
              const localOffset = this.multiSelectLocalOffsets.get(id);
              if (localOffset) {
                cornerAnchorOffset = localOffset.clone();
              }
            }
          });
        }

        // Get corner-only item's config for proper corner constraint
        const cornerAnchorData = this.getCurrentItemData(cornerAnchorId);
        const cornerAnchorMovement = getMovementConfig(cornerAnchorObj.userData.type as ComponentType, cornerAnchorData);

        // Calculate where the cursor would position the corner-only item
        const primaryRot = this.selectedObject.rotation.y;
        const worldAnchorOffset = cornerAnchorOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), primaryRot);
        const cursorPosForCornerItem = new THREE.Vector3(
          cursorWorldPos.x + worldAnchorOffset.x,
          cursorWorldPos.y,
          cursorWorldPos.z + worldAnchorOffset.z
        );

        // Use the corner-only item's movement config for proper corner positioning
        const effectiveMovementConfig = (cornerAnchorMovement.cornerInstallOnly && cornerAnchorMovement.cornerInstallOnly.enabled)
          ? cornerAnchorMovement
          : { ...movementConfig, cornerInstallOnly: { enabled: true } };

        const { position: cornerPos, rotation: cornerRot } = constrainToCorner(
          { x: cursorPosForCornerItem.x, y: cursorPosForCornerItem.y, z: cursorPosForCornerItem.z },
          this.roomWidthRef.value,
          this.roomHeightRef.value,
          {
            type: cornerAnchorObj.userData.type as ComponentType,
            scale: cornerAnchorObj.scale.x,
            orientation: cornerAnchorData?.model?.orientation,
            item: cornerAnchorData,
            movement: effectiveMovementConfig,
            notchWidth: this.notchWidthRef.value,
            notchHeight: this.notchHeightRef.value
          }
        );

        // Calculate primary object position by reversing the offset from the corner-only item
        // cornerPos is where the corner-only item should be
        // primary should be at: cornerPos - worldAnchorOffset
        if (cornerAnchorId !== itemId) {
          // Recalculate world offset with the new corner rotation
          const newWorldAnchorOffset = cornerAnchorOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), cornerRot);
          const rawPrimaryX = cornerPos.x - newWorldAnchorOffset.x;
          const rawPrimaryZ = cornerPos.z - newWorldAnchorOffset.z;
          const rawPrimaryY = this.selectedObject.position.y;

          // ✅ FIX: If primary is a wall-snap item, re-snap it to the appropriate wall
          // This prevents wall-mounted items from going outside room boundaries
          // PRESERVE relative position along the wall when moving to a new wall
          if (movementConfig.snapToWall && !(movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled)) {
            const roomHalfWidth = this.roomWidthRef.value / 2;
            const roomHalfHeight = this.roomHeightRef.value / 2;

            // Calculate current relative position along the wall (0 to 1)
            const currentPos = this.selectedObject.position;
            const currentWall = this.determineCurrentWall(currentPos);
            let relativePosition = 0.5; // Default to center

            if (currentWall === 'north' || currentWall === 'south') {
              // Position along X axis
              relativePosition = (currentPos.x + roomHalfWidth) / this.roomWidthRef.value;
            } else if (currentWall === 'east' || currentWall === 'west') {
              // Position along Z axis
              relativePosition = (currentPos.z + roomHalfHeight) / this.roomHeightRef.value;
            }

            // First, snap to get the target wall
            const wallResult = constrainToWalls(
              { x: rawPrimaryX, y: rawPrimaryY, z: rawPrimaryZ },
              this.roomWidthRef.value,
              this.roomHeightRef.value,
              {
                type: objectType,
                scale: objectScale,
                orientation: this.selectedObject.userData.orientation,
                item: currentItem,
                notchWidth: this.notchWidthRef.value,
                notchHeight: this.notchHeightRef.value
              }
            );

            // Determine which wall we're now on based on rotation
            const newWallRotation = wallResult.rotation;
            const isNorthSouthWall = Math.abs(Math.cos(newWallRotation)) > 0.7; // rotation ~0 or ~π

            // Apply relative position to the new wall
            let finalX = wallResult.position.x;
            let finalZ = wallResult.position.z;

            if (isNorthSouthWall) {
              // On north/south wall - apply relative position along X axis
              finalX = -roomHalfWidth + (relativePosition * this.roomWidthRef.value);
              // Clamp to room bounds
              finalX = Math.max(-roomHalfWidth + 20, Math.min(roomHalfWidth - 20, finalX));
            } else {
              // On east/west wall - apply relative position along Z axis
              finalZ = -roomHalfHeight + (relativePosition * this.roomHeightRef.value);
              // Clamp to room bounds
              finalZ = Math.max(-roomHalfHeight + 20, Math.min(roomHalfHeight - 20, finalZ));
            }

            constrainedPosition.x = finalX;
            constrainedPosition.z = finalZ;
            constrainedPosition.y = rawPrimaryY;
            constrainedRotation = wallResult.rotation;
            rotationChanged = true;
          } else {
            constrainedPosition.x = rawPrimaryX;
            constrainedPosition.z = rawPrimaryZ;
            constrainedPosition.y = rawPrimaryY;
            constrainedRotation = cornerRot;
            rotationChanged = true;
          }
        } else {
          constrainedPosition.x = cornerPos.x;
          constrainedPosition.z = cornerPos.z;
          constrainedPosition.y = cornerPos.y;
          constrainedRotation = cornerRot;
          rotationChanged = true;
        }

      } else {
        // Free movement objects - use traditional drag with offset
        this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

        // ✅ ADD: Visualize the intersection point
        this.updateIntersectionPointVisualization(intersectPoint);

        const newPosition = intersectPoint.add(this.dragOffset);

        const { position: roomConstrainedPos } = constrainToRoom(
          { x: newPosition.x, y: newPosition.y, z: newPosition.z },
          this.roomWidthRef.value,
          this.roomHeightRef.value,
          {
            type: objectType,
            scale: objectScale,
            orientation: this.selectedObject?.userData?.orientation,
            item: currentItem,
            notchWidth: this.notchWidthRef.value,
            notchHeight: this.notchHeightRef.value
          }
        );

        constrainedPosition.x = roomConstrainedPos.x;
        constrainedPosition.z = roomConstrainedPos.z;

        // ✅ FIX: Disable height adjustment during multi-select
        if (movementConfig.allowVerticalMovement && this.selectedObjects.size <= 1) {
          const heightConstraints = this.getProperHeightConstraints(objectType, currentItem);
          constrainedPosition.y = Math.max(heightConstraints.min, Math.min(heightConstraints.max, newPosition.y));
        } else {
          constrainedPosition.y = this.selectedObject.position.y; // Keep current height during multi-select
        }
      }

      // Check collisions with proper rotation
      const isColliding = this.checkCollisionState(
        { x: constrainedPosition.x, y: constrainedPosition.y, z: constrainedPosition.z },
        objectType,
        objectScale,
        itemId,
        currentItem,
        constrainedRotation  // ✅ FIX: Pass rotation to collision detection
      );

      // Update outline color
      setOutlineColor(isColliding);

      // ✅ Group-aware boundary clamping for FREE-STANDING objects only
      // Wall-snapping objects are already correctly positioned by their wall constraints
      // and this clamping would incorrectly pull them away from the wall
      if (this.selectedObjects.size > 1 && !effectiveWallSnap && !effectiveCornerOnly) {
        const { interior, notch } = getInteriorBoundaries(
          this.roomWidthRef.value,
          this.roomHeightRef.value,
          this.notchWidthRef.value,
          this.notchHeightRef.value
        );

        const groupBounds = calculateGroupBounds(constrainedRotation);

        const effectiveMinX = notch ? notch.maxX + WALL_SETTINGS.THICKNESS : interior.minX;
        const effectiveMinZ = notch ? notch.maxZ + WALL_SETTINGS.THICKNESS : interior.minZ;

        const clampMinX = effectiveMinX - groupBounds.minX;
        const clampMaxX = interior.maxX - groupBounds.maxX;
        const clampMinZ = effectiveMinZ - groupBounds.minZ;
        const clampMaxZ = interior.maxZ - groupBounds.maxZ;

        // Clamp primary's X position based on group bounds
        constrainedPosition.x = Math.max(
          clampMinX,
          Math.min(clampMaxX, constrainedPosition.x)
        );

        // Clamp primary's Z position based on group bounds
        constrainedPosition.z = Math.max(
          clampMinZ,
          Math.min(clampMaxZ, constrainedPosition.z)
        );
      }

      // Apply constrained position
      this.selectedObject.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);

      if (rotationChanged) {
        this.selectedObject.rotation.y = constrainedRotation;
      }

      // Update schematic overlay position in 2D mode
      if (this.sceneManager?.updateSchematicPosition) {
        this.sceneManager.updateSchematicPosition(itemId);
      }

      // Queue update
      const updateData: UpdateData = {
        position: [constrainedPosition.x, constrainedPosition.y, constrainedPosition.z]
      };

      if (rotationChanged) {
        updateData.rotation = constrainedRotation;
      }

      this.queueUpdate(itemId, updateData);

      // Apply bulk move to other selected objects using the stable ideal position
      this.applyBulkMove(this.selectedObject, idealPosition, constrainedRotation);

    } else if (this.isRotating) {
      // 📐 2D MODE: Convert camera orbit to panning
      if (this.viewMode === '2d') {
        const deltaX = event.clientX - this.mouseX;
        const deltaY = event.clientY - this.mouseY;

        // Pan the orthographic camera
        if (this.sceneManager) {
          // Invert deltaY because screen Y is opposite to world Z in top-down view
          this.sceneManager.pan2D(-deltaX, -deltaY);
        }

        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        return;
      }

      // 3D MODE: Camera rotation logic
      const deltaX = event.clientX - this.mouseX;
      const deltaY = event.clientY - this.mouseY;

      const spherical = new THREE.Spherical();
      spherical.setFromVector3(this.camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi -= deltaY * 0.01;

      // Constrain phi to prevent camera from going below floor
      spherical.phi = Math.max(0.1, Math.min(this.MAX_PHI_ANGLE, spherical.phi));

      // Apply the constrained position
      this.camera.position.setFromSpherical(spherical);

      // Additional check: if camera somehow goes below minimum height, adjust it
      if (this.camera.position.y < this.MIN_CAMERA_HEIGHT) {
        const distance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
        const newPhi = Math.acos(this.MIN_CAMERA_HEIGHT / distance);
        spherical.phi = Math.min(spherical.phi, newPhi);
        this.camera.position.setFromSpherical(spherical);
      }

      this.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
      // ADD THIS LINE - sync the target with current position
      this.targetCameraPosition.copy(this.camera.position);

      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
    } else {
      // Hover effect
      const intersected = this.getIntersectedObject(this.mouse);
      if (intersected) {
        this.renderer.domElement.style.cursor = 'grab';
      } else {
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  private calculateRotatedBounds(width: number, depth: number, rotation: number): { width: number; height: number } {

    const cosAngle = Math.abs(Math.cos(rotation));
    const sinAngle = Math.abs(Math.sin(rotation));

    const rotatedWidth = width * cosAngle + depth * sinAngle;
    const rotatedHeight = width * sinAngle + depth * cosAngle;

    return {
      width: rotatedWidth,
      height: rotatedHeight
    };
  }

  private constrainFreeRotationObjectPosition(position: THREE.Vector3, objectType: ComponentType, currentItem?: BathroomItem): THREE.Vector3 {
    const objectDimensions = getDimensions(objectType, currentItem?.sku, currentItem?.model);
    if (!objectDimensions) {
      return position;
    }

    const objectScale = this.selectedObject?.scale.x || 1;
    const objectRotation = this.selectedObject?.rotation.y || 0;

    // ✅ Calculate rotated bounding box for any object
    const rotatedBounds = this.calculateRotatedBounds(
      objectDimensions.width * objectScale,
      objectDimensions.depth * objectScale,
      objectRotation
    );

    // Room boundaries (same for all objects)
    const roomHalfWidth = this.roomWidthRef.value / 2;
    const roomHalfHeight = this.roomHeightRef.value / 2;
    const wallThickness = WALL_SETTINGS.THICKNESS;
    const buffer = 2; // Small buffer to prevent visual overlap with walls

    const wallFaces = {
      west: -roomHalfWidth + wallThickness,
      east: roomHalfWidth - wallThickness,
      north: -roomHalfHeight + wallThickness,
      south: roomHalfHeight - wallThickness
    };

    const halfRotatedWidth = rotatedBounds.width / 2;
    const halfRotatedHeight = rotatedBounds.height / 2;

    const safeMinX = wallFaces.west + halfRotatedWidth + buffer;
    const safeMaxX = wallFaces.east - halfRotatedWidth - buffer;
    const safeMinZ = wallFaces.north + halfRotatedHeight + buffer;
    const safeMaxZ = wallFaces.south - halfRotatedHeight - buffer;

    let constrainedX = Math.max(safeMinX, Math.min(safeMaxX, position.x));
    let constrainedZ = Math.max(safeMinZ, Math.min(safeMaxZ, position.z));

    // ✅ Check for L-shaped room notch area
    const notchWidth = this.notchWidthRef.value;
    const notchHeight = this.notchHeightRef.value;

    if (notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0) {
      // Notch boundaries (top-left corner of room) with buffer
      const notchMinX = -roomHalfWidth + wallThickness;
      const notchMaxX = -roomHalfWidth + notchWidth - wallThickness;
      const notchMinZ = -roomHalfHeight + wallThickness;
      const notchMaxZ = -roomHalfHeight + notchHeight - wallThickness;

      // Object boundaries after initial constraint (with buffer for overlap check)
      const objMinX = constrainedX - halfRotatedWidth - buffer;
      const objMaxX = constrainedX + halfRotatedWidth + buffer;
      const objMinZ = constrainedZ - halfRotatedHeight - buffer;
      const objMaxZ = constrainedZ + halfRotatedHeight + buffer;

      // Check if object overlaps with notch area
      const xOverlap = objMaxX > notchMinX && objMinX < notchMaxX;
      const zOverlap = objMaxZ > notchMinZ && objMinZ < notchMaxZ;

      if (xOverlap && zOverlap) {
        // Object is in the notch area - push it out
        // Calculate how much to push in each direction (with buffer)
        const pushEast = notchMaxX + halfRotatedWidth + buffer - constrainedX;  // Push to the right of notch
        const pushSouth = notchMaxZ + halfRotatedHeight + buffer - constrainedZ; // Push below the notch

        // Choose the smaller push to minimize displacement
        if (pushEast <= pushSouth) {
          // Push east (away from notch-east wall)
          constrainedX = notchMaxX + halfRotatedWidth + buffer;
        } else {
          // Push south (away from notch-south wall)
          constrainedZ = notchMaxZ + halfRotatedHeight + buffer;
        }

        // Re-apply main wall constraints after notch adjustment
        constrainedX = Math.max(safeMinX, Math.min(safeMaxX, constrainedX));
        constrainedZ = Math.max(safeMinZ, Math.min(safeMaxZ, constrainedZ));
      }
    }

    return new THREE.Vector3(constrainedX, position.y, constrainedZ);
  }

  private handleMouseUp(): void {
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // Handle collision prevention and snap-back logic
    if (this.isDragging && this.selectedObject) {
      window.dispatchEvent(new CustomEvent('object-moved'));
      const currentItems = this.getCurrentItems();

      // Check collision for ALL selected objects in multiselect mode
      let isColliding = false;

      if (this.isMultiSelectMode && this.selectedObjects.size > 1) {
        // Check each selected object for collision
        for (const [id, obj] of this.selectedObjects) {
          const objType = obj.userData.type as ComponentType;
          const objScale = obj.scale.x;
          const objItem = currentItems.find(item => item.id === id);
          const objPosition = obj.position;

          const objColliding = wouldCollideWithExistingOrWalls(
            { x: objPosition.x, y: objPosition.y, z: objPosition.z },
            objType,
            objScale,
            id,
            currentItems,
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            objItem,
            obj.rotation.y,
            this.notchWidthRef.value,
            this.notchHeightRef.value
          );

          if (objColliding) {
            isColliding = true;
            break; // One collision is enough to trigger snap-back
          }
        }
      } else {
        // Single object collision check
        const objectType = this.selectedObject.userData.type as ComponentType;
        const objectScale = this.selectedObject.scale.x;
        const itemId = this.selectedObject.userData.itemId as number;
        const currentItem = currentItems.find(item => item.id === itemId);
        const finalPosition = this.selectedObject.position;

        isColliding = wouldCollideWithExistingOrWalls(
          { x: finalPosition.x, y: finalPosition.y, z: finalPosition.z },
          objectType,
          objectScale,
          itemId,
          currentItems,
          this.roomWidthRef.value,
          this.roomHeightRef.value,
          currentItem,
          this.selectedObject.rotation.y,
          this.notchWidthRef.value,
          this.notchHeightRef.value
        );
      }

      const itemId = this.selectedObject.userData.itemId as number;

      // Check if collision prevention is enabled and object is colliding
      if (this.preventCollisionPlacementRef.value && isColliding) {
        // Snap back to original position
        this.selectedObject.position.copy(this.originalDragPosition);
        this.selectedObject.rotation.y = this.originalDragRotation;

        // Snap back all other selected objects in the group
        this.selectedObjects.forEach((obj, id) => {
          if (obj !== this.selectedObject) {
            const startPos = this.multiSelectStartPositions.get(id);
            const startRot = this.multiSelectStartRotations.get(id);
            if (startPos) {
              obj.position.copy(startPos);
            }
            if (startRot !== undefined) {
              obj.rotation.y = startRot;
            }
          }
        });

        // Update the data model with the original positions for all objects in the group
        this.setItems((prevItems: BathroomItem[]) => {
          return prevItems.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                position: [this.originalDragPosition.x, this.originalDragPosition.y, this.originalDragPosition.z],
                rotation: this.originalDragRotation
              };
            }
            if (this.selectedObjects.has(item.id)) {
              const startPos = this.multiSelectStartPositions.get(item.id);
              if (startPos) {
                return {
                  ...item,
                  position: [startPos.x, startPos.y, startPos.z]
                };
              }
            }
            return item;
          });
        });

        // Set outline to normal color since we're back to non-colliding position
        setOutlineColor(false);
        // 🆕 CRITICAL FIX: Update measurement system to reflect the snap-back position
        if (this.measurementSystem && this.selectedObject) {
          // Force refresh the measurement system with the updated position
          const currentItemsAfterSnap = this.getCurrentItems();
          this.measurementSystem.updateExistingItems(currentItemsAfterSnap);
          this.measurementSystem.forceUpdateMeasurements();
        }

        // Update schematic overlay position after snap-back (for 2D mode)
        if (this.sceneManager?.updateSchematicPosition) {
          // Update for all selected objects (primary + others)
          this.selectedObjects.forEach((_, id) => {
            if (this.sceneManager?.updateSchematicPosition) {
              this.sceneManager.updateSchematicPosition(id);
            }
          });
        }
      } else {
        // Normal behavior: set outline color based on final collision state
        setOutlineColor(isColliding);

        if (isColliding && this.preventCollisionPlacementRef.value) {
        }

        this.snapWallStandingItemsOnDrop();
      }
    }

    // Multi-select deselection logic (toggle off if it was already selected and just clicked)
    if (this.isMultiSelectMode && this.wasAlreadySelected && !this.hasMouseMoved && this.selectedObject) {
      const itemId = this.selectedObject.userData.itemId;
      this.selectedObjects.delete(itemId);
      this.updateMultiSelectionHighlight();
      this.selectedObject = null;
    }

    // Only deselect if empty space was clicked AND it was a click (not drag)
    if (this.wasEmptySpaceClicked && !this.hasMouseMoved && this.selectedObject) {
      this.updateHighlight(false);
      this.selectedObject = null;
      this.clearSelection();

      // Clear measurement system selection
      if (this.measurementSystem) {
        this.measurementSystem.setSelectedObject(null);
      }

      // Emit event for measurement updates
      window.dispatchEvent(new CustomEvent('object-selected'));
    }

    // Reset all states
    const wasDragging = this.isDragging;
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;
    this.hasMouseMoved = false;
    this.wasEmptySpaceClicked = false;
    this.wasAlreadySelected = false;
    this.renderer.domElement.style.cursor = 'default';

    // Notify that dragging has ended
    if (wasDragging && this.onDragEnd) {
      this.onDragEnd();
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  // ✅ FIXED: DIRECTIONAL ZOOM - No Direction Changes
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    // 📐 2D MODE: Use orthographic zoom
    if (this.viewMode === '2d') {
      if (this.sceneManager) {
        const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1; // Invert for natural feel
        this.sceneManager.zoom2D(zoomDelta);
      }
      return;
    }

    // 3D MODE: Original perspective zoom behavior

    // Simple zoom: move 30cm forward or backward along viewing direction
    const zoomStep = event.deltaY > 0 ? -50 : 50; // positive = zoom out, negative = zoom in

    // ✅ Get the direction the camera is currently looking
    const viewDirection = new THREE.Vector3();
    this.camera.getWorldDirection(viewDirection);

    // ✅ Move camera along that exact direction
    const newPosition = this.camera.position.clone();
    newPosition.addScaledVector(viewDirection, zoomStep);

    // ✅ Optional: Only apply distance limits (no other constraints)
    const distanceFromCenter = newPosition.distanceTo(new THREE.Vector3(0, 0, 0));

    if (distanceFromCenter >= 100 && distanceFromCenter <= 1200) {
      // ✅ Update camera position - direction stays exactly the same
      this.camera.position.copy(newPosition);
      this.targetCameraPosition.copy(newPosition);
    } else {
    }

    // ✅ CRITICAL: NO camera.lookAt() call here!
    // The camera automatically maintains its viewing direction
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touches = event.touches;

    if (touches.length === 1) {
      const touch = touches[0];

      // ADD: Track initial touch position
      this.mouseDownPosition.set(touch.clientX, touch.clientY);
      this.hasMouseMoved = false;
      this.wasEmptySpaceClicked = false;

      const touchPos = updateTouchPosition(touch, this.renderer.domElement.getBoundingClientRect());
      this.mouse.set(touchPos.x, touchPos.y);

      const intersected = this.getIntersectedObject(this.mouse);

      // Handle double tap to delete on mobile
      if (intersected && this.selectedObject && intersected.object === this.selectedObject) {
        const now = Date.now();
        if (this.lastTouchTime && now - this.lastTouchTime < 300) {
          // Double tap detected - delete the object
          const itemId = this.selectedObject.userData.itemId as number;
          highlightObject(this.selectedObject, false);
          this.selectedObject = null;

          if (this.deleteItem && itemId) {
            this.deleteItem(itemId);
          }
          return;
        }
        this.lastTouchTime = now;
      } else {
        this.lastTouchTime = Date.now();
      }

      if (intersected) {
        let itemId = intersected.object.userData.itemId;

        this.wasAlreadySelected = this.selectedObjects.has(itemId);

        if (this.isMultiSelectMode) {
          // Multi-select logic: Toggle selection
          if (!this.wasAlreadySelected) {
            this.selectedObjects.set(itemId, intersected.object);
            this.updateMultiSelectionHighlight();
          }
          this.selectedObject = intersected.object;
        } else {
          // Single select logic
          const previouslySelectedId = this.selectedObject?.userData?.itemId;
          if (!previouslySelectedId || previouslySelectedId !== itemId) {
            this.clearSelection();
            this.selectObject(intersected.object);
            this.selectedObjects.set(itemId, intersected.object);
          }
          this.selectedObject = intersected.object;
        }

        if (!this.selectedObject) return;

        // Sync with measurement system
        if (this.measurementSystem) {
          this.measurementSystem.setSelectedObject(this.selectedObject);
        }

        this.isDragging = true;
        this.isDragOperation = true; // Mark as drag operation

        // Update drag plane for stable movement
        this.updateDragPlane(this.selectedObject);

        // Store start positions and local offsets for all selected objects for bulk move
        this.multiSelectStartPositions.clear();
        this.multiSelectStartRotations.clear();
        this.multiSelectLocalOffsets.clear();
        this.multiSelectLocalRotations.clear();

        const primaryPos = this.selectedObject.position.clone();
        const primaryRot = this.selectedObject.rotation.y;

        this.selectedObjects.forEach((obj, id) => {
          this.multiSelectStartPositions.set(id, obj.position.clone());
          this.multiSelectStartRotations.set(id, obj.rotation.y);

          // Calculate local offset relative to primary object's rotation
          const offset = new THREE.Vector3().subVectors(obj.position, primaryPos);
          offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -primaryRot);
          this.multiSelectLocalOffsets.set(id, offset);

          // Calculate local rotation relative to primary object
          const relRot = obj.rotation.y - primaryRot;
          this.multiSelectLocalRotations.set(id, relRot);
        });

        // Calculate group constraint for multi-selection (most restrictive wins)
        if (this.selectedObjects.size > 1) {
          this.groupConstraint = analyzeGroupConstraints(
            this.selectedObjects,
            (id) => this.getCurrentItemData(id),
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            this.notchWidthRef.value,
            this.notchHeightRef.value
          );
        } else {
          this.groupConstraint = null;
        }

        window.dispatchEvent(new CustomEvent('object-selected', {
          detail: { itemId: this.selectedObject?.userData?.itemId ?? null }
        }));

        // NEW: Store original position for potential snap-back
        this.originalDragPosition.copy(this.selectedObject.position);
        this.originalDragRotation = this.selectedObject.rotation.y;

        this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        this.dragOffset.subVectors(this.selectedObject.position, intersectPoint);

        // Check collision state immediately when object is selected
        const objectType = this.selectedObject.userData.type as ComponentType;
        const objectScale = this.selectedObject.scale.x;
        itemId = this.selectedObject.userData.itemId as number;
        const currentItems = this.getCurrentItems();
        // NEW: Get the current item data for enhanced dimension lookup
        const currentItem = currentItems.find(item => item.id === itemId);

        const currentPosition = this.selectedObject.position;
        const isColliding = wouldCollideWithExisting(
          { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
          objectType,
          objectScale,
          itemId,
          currentItems,
          currentItem
        );

        // Highlight all selected objects
        this.updateHighlight(true);

        // Then set appropriate outline color based on current collision state
        setOutlineColor(isColliding);
      } else {
        this.isRotating = true;
        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
      }
    } else if (touches.length === 2) {
      this.lastTouchDistance = getTouchDistance(touches[0], touches[1]);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touches = event.touches;

    if (touches.length === 1) {
      const touch = touches[0];

      // Track touch movement
      const touchDistance = this.mouseDownPosition.distanceTo(new THREE.Vector2(touch.clientX, touch.clientY));
      if (touchDistance > this.MOUSE_MOVE_THRESHOLD) {
        this.hasMouseMoved = true;
      }

      const touchPos = updateTouchPosition(touch, this.renderer.domElement.getBoundingClientRect());
      this.mouse.set(touchPos.x, touchPos.y);

      if (this.isDragging && this.selectedObject) {
        // 🆕 ENHANCED: Apply the same movement logic as mouse for touch
        const objectType = this.selectedObject.userData.type as ComponentType;
        const objectScale = this.selectedObject.scale.x;
        const itemId = this.selectedObject.userData.itemId as number;
        const currentItem = this.getCurrentItemData(itemId);
        const movementConfig = getMovementConfig(objectType, currentItem);

        this.raycaster.setFromCamera(this.mouse, this.getActiveCamera());
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        const newPosition = intersectPoint.add(this.dragOffset);

        let constrainedPosition = { ...newPosition };
        let constrainedRotation = this.selectedObject.rotation.y;
        let rotationChanged = false;

        // Apply the same movement logic as mouse
        if (movementConfig.snapToWall) {

          // ✅ NEW APPROACH: Project mouse to nearest wall for better following
          const wallProjection = this.getMouseProjectedWallPosition(
            newPosition,
            objectType,
            objectScale,
            currentItem
          );

          // const { position: wallConstrainedPos } = constrainToWalls(
          //   { x: newPosition.x, y: newPosition.y, z: newPosition.z },
          //   this.roomWidthRef.value,
          //   this.roomHeightRef.value,
          //   {
          //     type: objectType,
          //     scale: objectScale,
          //     orientation: this.selectedObject?.userData?.orientation
          //   }
          // );

          constrainedPosition.x = wallProjection.position.x;
          constrainedPosition.z = wallProjection.position.z;

          if (!movementConfig.allowFreeRotation) {
            switch (wallProjection.wall) {
              case 'north':
                constrainedRotation = 0;
                break;
              case 'south':
                constrainedRotation = Math.PI;
                break;
              case 'east':
                constrainedRotation = -Math.PI / 2;
                break;
              case 'west':
                constrainedRotation = Math.PI / 2;
                break;
            }
            rotationChanged = true;
          }

          if (movementConfig.allowVerticalMovement) {
            const heightConstraints = this.getProperHeightConstraints(objectType, currentItem);
            constrainedPosition.y = Math.max(heightConstraints.min, Math.min(heightConstraints.max, newPosition.y));
          } else {
            constrainedPosition.y = this.selectedObject.position.y;
          }

          /*if (!movementConfig.allowFreeRotation) {
            const { rotation: wallRotation } = snapToNearestWall(
              { x: constrainedPosition.x, y: constrainedPosition.y, z: constrainedPosition.z },
              this.roomWidthRef.value,
              this.roomHeightRef.value,
              {
                type: objectType,
                scale: objectScale,
                orientation: this.selectedObject?.userData?.orientation
              }
            );
            constrainedRotation = wallRotation;
            rotationChanged = true;
          }*/
        } else {
          const { position: roomConstrainedPos } = constrainToRoom(
            { x: newPosition.x, y: newPosition.y, z: newPosition.z },
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            {
              type: objectType,
              scale: objectScale,
              orientation: this.selectedObject?.userData?.orientation,
              notchWidth: this.notchWidthRef.value,
              notchHeight: this.notchHeightRef.value
            }
          );

          constrainedPosition.x = roomConstrainedPos.x;
          constrainedPosition.z = roomConstrainedPos.z;

          // Keep free-standing objects on floor
          if (!movementConfig.allowVerticalMovement) {
            constrainedPosition.y = 0;
          } else {
            constrainedPosition.y = roomConstrainedPos.y;
          }
        }

        // Check for collisions and update outline color
        // When multi-select is active with multiple items, exclude other selected items
        // to prevent false collision detection with their old positions
        const currentItems = this.selectedObjects.size > 1
          ? this.getVirtualItemsExcludingSelected()
          : this.getVirtualItems();
        const isColliding = wouldCollideWithExisting(
          { x: constrainedPosition.x, y: constrainedPosition.y, z: constrainedPosition.z },
          objectType,
          objectScale,
          itemId,
          currentItems,
          currentItem
        );

        setOutlineColor(isColliding);

        this.selectedObject.position.set(constrainedPosition.x, constrainedPosition.y, constrainedPosition.z);

        if (rotationChanged) {
          this.selectedObject.rotation.y = constrainedRotation;
        }

        // Update schematic overlay position in 2D mode
        if (this.sceneManager?.updateSchematicPosition) {
          this.sceneManager.updateSchematicPosition(itemId);
        }

        const updateData: UpdateData = {
          position: [constrainedPosition.x, constrainedPosition.y, constrainedPosition.z]
        };

        if (rotationChanged) {
          updateData.rotation = constrainedRotation;
        }

        if (this.measurementSystem) {
          this.updateMeasurementsThrottled();
          window.dispatchEvent(new CustomEvent('object-moved'));
        }

        this.queueUpdate(itemId, updateData);

        // Apply bulk move to other selected objects
        this.applyBulkMove(this.selectedObject, newPosition, constrainedRotation);
      } else if (this.isRotating) {
        // Camera rotation for touch (unchanged)
        const deltaX = touch.clientX - this.mouseX;
        const deltaY = touch.clientY - this.mouseY;

        const smoothDeltaX = deltaX * 0.8;
        const smoothDeltaY = deltaY * 0.8;

        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position);
        spherical.theta -= smoothDeltaX * 0.01;
        spherical.phi += smoothDeltaY * 0.01;

        // Same constraint as mouse rotation
        spherical.phi = Math.max(0.1, Math.min(this.MAX_PHI_ANGLE, spherical.phi));

        // Apply the constrained position
        this.camera.position.setFromSpherical(spherical);

        // Additional check for minimum height
        if (this.camera.position.y < this.MIN_CAMERA_HEIGHT) {
          const distance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
          const newPhi = Math.acos(this.MIN_CAMERA_HEIGHT / distance);
          spherical.phi = Math.min(spherical.phi, newPhi);
          this.camera.position.setFromSpherical(spherical);
        }

        this.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
        // ADD THIS LINE - sync the target with current position
        this.targetCameraPosition.copy(this.camera.position);

        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
      }
    } else if (touches.length === 2) {
      // ✅ FIXED: Directional touch zoom
      const distance = getTouchDistance(touches[0], touches[1]);
      const scale = distance / this.lastTouchDistance;

      if (scale > 1.02 || scale < 0.98) {
        // 📐 2D MODE: Use orthographic zoom (same as wheel zoom)
        if (this.viewMode === '2d') {
          if (this.sceneManager) {
            const zoomDelta = scale > 1.02 ? 0.1 : -0.1; // pinch out = zoom in
            this.sceneManager.zoom2D(zoomDelta);
          }
          this.lastTouchDistance = distance;
          return;
        }

        // 3D MODE: Move camera along viewing direction
        // Touch zoom: move 20cm forward or backward along viewing direction
        const zoomStep = scale > 1.02 ? -20 : 20; // pinch in = zoom in (negative)

        // ✅ Get viewing direction and move along it
        const viewDirection = new THREE.Vector3();
        this.camera.getWorldDirection(viewDirection);

        const newPosition = this.camera.position.clone();
        newPosition.addScaledVector(viewDirection, zoomStep);

        // ✅ Apply distance limits only
        const distanceFromCenter = newPosition.distanceTo(new THREE.Vector3(0, 0, 0));

        if (distanceFromCenter >= 100 && distanceFromCenter <= 1200) {
          this.camera.position.copy(newPosition);
          this.targetCameraPosition.copy(newPosition);
        }

        this.lastTouchDistance = distance;
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    // Apply any pending updates before clearing drag state
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // NEW: Handle collision prevention and snap-back logic for touch
    if (this.isDragging && this.selectedObject) {
      const objectType = this.selectedObject.userData.type as ComponentType;
      const objectScale = this.selectedObject.scale.x;
      const itemId = this.selectedObject.userData.itemId as number;
      const currentItems = this.getCurrentItems();
      const currentItem = currentItems.find(item => item.id === itemId);
      const finalPosition = this.selectedObject.position;
      const isColliding = wouldCollideWithExisting(
        { x: finalPosition.x, y: finalPosition.y, z: finalPosition.z },
        objectType,
        objectScale,
        itemId,
        currentItems,
        currentItem,
        this.roomWidthRef.value,
        this.roomHeightRef.value,
        this.notchWidthRef.value,
        this.notchHeightRef.value
      );

      // Check if collision prevention is enabled and object is colliding
      if (this.preventCollisionPlacementRef.value && isColliding) {
        // Snap back to original position
        this.selectedObject.position.copy(this.originalDragPosition);
        this.selectedObject.rotation.y = this.originalDragRotation;

        // Snap back all other selected objects in the group
        this.selectedObjects.forEach((obj, id) => {
          if (obj !== this.selectedObject) {
            const startPos = this.multiSelectStartPositions.get(id);
            const startRot = this.multiSelectStartRotations.get(id);
            if (startPos) {
              obj.position.copy(startPos);
            }
            if (startRot !== undefined) {
              obj.rotation.y = startRot;
            }
          }
        });

        // Update the data model with the original positions for all objects in the group
        this.setItems((prevItems: BathroomItem[]) => {
          return prevItems.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                position: [this.originalDragPosition.x, this.originalDragPosition.y, this.originalDragPosition.z],
                rotation: this.originalDragRotation
              };
            }
            if (this.selectedObjects.has(item.id)) {
              const startPos = this.multiSelectStartPositions.get(item.id);
              if (startPos) {
                return {
                  ...item,
                  position: [startPos.x, startPos.y, startPos.z]
                };
              }
            }
            return item;
          });
        });

        // Set outline to normal color since we're back to non-colliding position
        setOutlineColor(false);

        // Update schematic overlay position after snap-back (for 2D mode)
        if (this.sceneManager?.updateSchematicPosition) {
          this.sceneManager.updateSchematicPosition(itemId);
        }
      } else {
        // Normal behavior: set outline color based on final collision state
        setOutlineColor(isColliding);

        this.snapWallStandingItemsOnDrop();
      }
    }

    // Multi-select deselection logic (toggle off if it was already selected and just tapped)
    if (this.isMultiSelectMode && this.wasAlreadySelected && !this.hasMouseMoved && this.selectedObject) {
      const itemId = this.selectedObject.userData.itemId;
      this.selectedObjects.delete(itemId);
      this.updateMultiSelectionHighlight();
      this.selectedObject = null;
    }

    // NEW: Only deselect if empty space was tapped AND it was a tap (not drag)
    if (this.wasEmptySpaceClicked && !this.hasMouseMoved && this.selectedObject) {
      this.updateHighlight(false);
      this.selectedObject = null;
      this.clearSelection();

      if (this.measurementSystem) {
        this.measurementSystem.setSelectedObject(null);
      }

      window.dispatchEvent(new CustomEvent('object-selected'));
    }

    // Reset all states
    const wasDragging = this.isDragging;
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;
    this.hasMouseMoved = false; // Reset movement tracking
    this.wasEmptySpaceClicked = false; // Reset empty space flag
    this.wasAlreadySelected = false; // Reset already selected flag

    // Notify that dragging has ended
    if (wasDragging && this.onDragEnd) {
      this.onDragEnd();
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // 🔧 FIX: Add visibility change handler to stop dragging when tab loses focus
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Tab is hidden, stop all drag operations
      this.stopAllDragOperations();
    }
  }

  // 🔧 FIX: Helper method to stop all drag operations
  private stopAllDragOperations(): void {
    // Apply any pending updates before stopping
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // Clear all drag states
    const wasDragging = this.isDragging;
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;

    // Reset cursor
    this.renderer.domElement.style.cursor = 'default';

    // Notify that dragging has ended
    if (wasDragging && this.onDragEnd) {
      this.onDragEnd();
    }

    // ✅ ADD: Clean up drag plane visualization
    if (this.dragPlaneHelper) {
      if ((this.dragPlaneHelper as any).arrowHelper) {
        this.scene.remove((this.dragPlaneHelper as any).arrowHelper);
      }
      this.scene.remove(this.dragPlaneHelper);
      this.dragPlaneHelper = null;
    }

    // Log for debugging
  }

  public addEventListeners(): void {
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.addEventListener('wheel', this.handleWheel);

    // 🔧 FIX: Add mouse leave event to stop dragging when cursor leaves canvas
    this.renderer.domElement.addEventListener('mouseleave', this.handleMouseUp);

    // 🔧 FIX: Add global mouseup listener to catch mouseup events outside canvas
    document.addEventListener('mouseup', this.handleMouseUp);

    // 🔧 FIX: Add visibility change listener to stop dragging when tab loses focus
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Add keyboard event listener for delete functionality
    document.addEventListener('keydown', this.handleKeyDown);

    if (this.isTouchDevice) {
      this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.renderer.domElement.addEventListener('touchend', this.handleTouchEnd, { passive: false });

      // 🔧 FIX: Add touch cancel event for mobile
      this.renderer.domElement.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }

    window.addEventListener('resize', this.handleResize);
  }

  public removeEventListeners(): void {
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel);

    // 🔧 FIX: Remove additional mouse event listeners
    this.renderer.domElement.removeEventListener('mouseleave', this.handleMouseUp);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.isTouchDevice) {
      this.renderer.domElement.removeEventListener('touchstart', this.handleTouchStart);
      this.renderer.domElement.removeEventListener('touchmove', this.handleTouchMove);
      this.renderer.domElement.removeEventListener('touchend', this.handleTouchEnd);
      this.renderer.domElement.removeEventListener('touchcancel', this.handleTouchEnd);
    }

    window.removeEventListener('resize', this.handleResize);
  }

  public clearSelection(): void {

    if (this.selectedObject || this.selectedObjects.size > 0) {
      import('../utils/helpers').then(helpers => {
        helpers.highlightObjects([], false);
      });

      this.selectedObject = null;
      this.selectedObjects.clear();
      this.multiSelectStartPositions.clear();
      this.multiSelectStartRotations.clear();
      this.multiSelectLocalOffsets.clear();
      this.multiSelectLocalRotations.clear();
      this.groupConstraint = null; // Clear group constraint on selection clear

      // EMIT deselection event
      if (this.onItemDeselected) {
        this.onItemDeselected();
      }
    }

    // Clear arrows and measurements
    if (this.rotationArrows) {
      this.rotationArrows.setSelectedObject(null);
    }

    if (this.measurementSystem) {
      this.measurementSystem.setSelectedObject(null);
    }
  }

  public getSelectedItemIds(): number[] {
    return Array.from(this.selectedObjects.keys());
  }

  public setRotationArrowsEnabled(enabled: boolean): void {
    if (this.rotationArrows) {
      this.rotationArrows.setEnabled(enabled);
    } else {
    }
  }

  public isDragOperationActive(): boolean {
    return this.isDragOperation;
  }

  public getPendingUpdatesCount(): number {
    return this.pendingUpdates.size;
  }

  // NEW: Utility method to check collision prevention status
  public isCollisionPreventionEnabled(): boolean {
    return this.preventCollisionPlacementRef.value;
  }

  /**
   * Enhanced wall position calculation that uses vertical mouse movement
   * to control position along side walls when viewing from front/back
   */
  private getMouseProjectedWallPosition(
    mouseWorldPos: { x: number; y: number; z: number },
    objectType: ComponentType,
    objectScale: number,
    currentItem?: BathroomItem
  ): { wall: string; position: { x: number; z: number } } {
    const roomHalfWidth = this.roomWidthRef.value / 2;
    const roomHalfHeight = this.roomHeightRef.value / 2;
    const dimensions = getDimensions(objectType, currentItem?.sku, currentItem?.model);
    const halfWidth = dimensions && dimensions.width ? ((dimensions.width) * objectScale) / 2 : 0;
    const wallBuffer = (currentItem?.model?.orientation?.wallBuffer ?? 0) * objectScale;

    // ✅ ADD: Wall switching threshold - balanced stickiness
    const WALL_SWITCH_THRESHOLD = 40; // Reduced from 150cm to 40cm

    // Get camera direction to determine viewing angle
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // ✅ NEW: Check if we're viewing from top or side
    const isTopView = Math.abs(cameraDirection.y) > 0.7; // Looking mostly down/up
    // const isSideView = !isTopView; // Looking horizontally

    // ✅ FIX: Use correct dimensions for wall distances based on object orientation
    // For objects on north/south walls, use halfDepth for Z extent, halfWidth for X extent
    // For objects on east/west walls, use halfWidth for Z extent, halfDepth for X extent
    const currentWall = this.selectedObject ?
      this.determineCurrentWall(this.selectedObject.position) : null;

    // ✅ NEW: Get notch boundaries for L-shaped rooms
    const { notch } = getInteriorBoundaries(
      this.roomWidthRef.value,
      this.roomHeightRef.value,
      this.notchWidthRef.value,
      this.notchHeightRef.value
    );

    // ✅ NEW: Calculate group extents for multi-selection to detect corner hits
    let groupMinX = 0, groupMaxX = 0, groupMinZ = 0, groupMaxZ = 0;
    if (this.selectedObjects.size > 1 && currentWall) {
      const primaryRot = this.selectedObject?.rotation.y || 0;
      this.selectedObjects.forEach((obj, id) => {
        const localOffset = this.multiSelectLocalOffsets.get(id);
        if (localOffset) {
          const worldOffset = localOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), primaryRot);

          const itemType = obj.userData.type as ComponentType;
          const itemScale = obj.scale.x;
          const itemData = this.getCurrentItemData(id);
          const dims = getDimensions(itemType, itemData?.sku, itemData?.model);

          if (dims) {
            const hW = (dims.width * itemScale) / 2;
            groupMinX = Math.min(groupMinX, worldOffset.x - hW);
            groupMaxX = Math.max(groupMaxX, worldOffset.x + hW);
            groupMinZ = Math.min(groupMinZ, worldOffset.z - hW);
            groupMaxZ = Math.max(groupMaxZ, worldOffset.z + hW);
          } else {
            groupMinX = Math.min(groupMinX, worldOffset.x);
            groupMaxX = Math.max(groupMaxX, worldOffset.x);
            groupMinZ = Math.min(groupMinZ, worldOffset.z);
            groupMaxZ = Math.max(groupMaxZ, worldOffset.z);
          }
        }
      });
    }

    // Calculate wall distances
    const wallDistances: Record<string, number> = {
      north: Math.abs(mouseWorldPos.z + roomHalfHeight),
      south: Math.abs(mouseWorldPos.z - roomHalfHeight),
      east: Math.abs(mouseWorldPos.x - roomHalfWidth),
      west: Math.abs(mouseWorldPos.x + roomHalfWidth)
    };

    // ✅ NEW: Add notch walls if this is an L-shaped room
    if (notch) {
      wallDistances['notch-east'] = Math.abs(mouseWorldPos.x - notch.maxX);
      wallDistances['notch-south'] = Math.abs(mouseWorldPos.z - notch.maxZ);
    }

    // ✅ GROUP-AWARE WALL SWITCHING:
    // If any item in the group is "pressing" against a corner, adjust distances
    // to encourage switching to the adjacent wall.
    if (this.selectedObjects.size > 1 && currentWall) {
      let isPressing = false;
      const buffer = 10;

      if (currentWall === 'north' || currentWall === 'south') {
        if (mouseWorldPos.x + groupMinX < -roomHalfWidth + buffer ||
          mouseWorldPos.x + groupMaxX > roomHalfWidth - buffer) {
          isPressing = true;
        }
      } else if (currentWall === 'east' || currentWall === 'west') {
        if (mouseWorldPos.z + groupMinZ < -roomHalfHeight + buffer ||
          mouseWorldPos.z + groupMaxZ > roomHalfHeight - buffer) {
          isPressing = true;
        }
      } else if (currentWall === 'notch-east' && notch) {
        if (mouseWorldPos.z + groupMinZ < notch.minZ + buffer ||
          mouseWorldPos.z + groupMaxZ > notch.maxZ - buffer) {
          isPressing = true;
        }
      } else if (currentWall === 'notch-south' && notch) {
        if (mouseWorldPos.x + groupMinX < notch.minX + buffer ||
          mouseWorldPos.x + groupMaxX > notch.maxX - buffer) {
          isPressing = true;
        }
      }

      if (isPressing) {
        // Make current wall appear "farther" to encourage switching
        wallDistances[currentWall] += 100;
      }
    }

    const sortedWalls = Object.entries(wallDistances).sort((a, b) => a[1] - b[1]);
    const closestWall = sortedWalls[0][0];
    const secondClosestWall = sortedWalls[1][0];

    // ✅ Use existing wall visibility from SimpleWallCulling
    let visibleWalls: Set<string>;

    if (this.wallCulling && this.wallCulling.enabled) {
      // Get actual wall visibility from the culling system
      const wallVisibility = this.wallCulling.getWallVisibilityStatus();
      visibleWalls = new Set(
        wallVisibility
          .filter(status => status.visible)
          .map(status => status.direction)
      );
    } else {
      // Fallback: all walls are visible if culling is disabled
      visibleWalls = new Set(['north', 'south', 'east', 'west']);
    }

    // Find nearest VISIBLE wall
    let nearestWall = 'north'; // default
    let minDistance = Infinity;

    // ✅ CRITICAL: Different logic for top view vs side view
    if (isTopView) {
      // TOP VIEW: Use your existing logic that works well
      const useClosestWall = wallDistances[closestWall] < wallDistances[secondClosestWall] - WALL_SWITCH_THRESHOLD;

      if (useClosestWall && visibleWalls.has(closestWall)) {
        nearestWall = closestWall;
      } else {
        // Original logic for finding nearest visible wall
        for (const [wall, distance] of Object.entries(wallDistances)) {
          if (visibleWalls.has(wall) && distance < minDistance) {
            minDistance = distance;
            nearestWall = wall;
          }
        }
      }
    } else {
      // SIDE/FRONT VIEW: Strong preference for current wall
      if (currentWall && visibleWalls.has(currentWall)) {
        // Stay on current wall unless cursor is VERY close to another wall
        nearestWall = currentWall;

        // ✅ FIX: More lenient switching for wide objects like mirrors
        // Only switch if cursor is very close to another wall
        for (const [wall, distance] of Object.entries(wallDistances)) {
          if (wall !== currentWall && visibleWalls.has(wall)) {
            // For wide objects (mirrors), be even more conservative about switching
            const switchThreshold = halfWidth > 30 ? 20 : 30; // Tighter threshold for wide objects
            const farThreshold = halfWidth > 30 ? 150 : 100; // Need to be farther from current wall

            if (distance < switchThreshold && wallDistances[currentWall] > farThreshold) {
              nearestWall = wall;
              break;
            }
          }
        }
      } else {
        // No current wall or it's hidden - find nearest visible wall
        for (const [wall, distance] of Object.entries(wallDistances)) {
          if (visibleWalls.has(wall) && distance < minDistance) {
            minDistance = distance;
            nearestWall = wall;
          }
        }
      }
    }

    // If no visible walls found (shouldn't happen), use nearest
    if (!visibleWalls.has(nearestWall)) {
      nearestWall = Object.entries(wallDistances).reduce((a, b) =>
        wallDistances[a[0]] < wallDistances[b[0]] ? a : b
      )[0];
      console.warn('⚠️ No visible wall found, using nearest:', nearestWall);
    }

    // ✅ FIX: Calculate position with correct dimension constraints
    let position = { x: 0, z: 0 };

    // ✅ NEW: Get effective boundaries for L-shaped rooms
    const { interior } = getInteriorBoundaries(
      this.roomWidthRef.value,
      this.roomHeightRef.value,
      this.notchWidthRef.value,
      this.notchHeightRef.value
    );

    switch (nearestWall) {
      case 'north':
        // Use halfWidth for X constraint (mirror is 60cm wide)
        position.x = Math.max(-roomHalfWidth + halfWidth, Math.min(roomHalfWidth - halfWidth, mouseWorldPos.x));
        position.z = -roomHalfHeight + (wallBuffer + WALL_SETTINGS.THICKNESS);
        break;

      case 'south':
        // Use halfWidth for X constraint (mirror is 60cm wide)
        position.x = Math.max(-roomHalfWidth + halfWidth, Math.min(roomHalfWidth - halfWidth, mouseWorldPos.x));
        position.z = roomHalfHeight - wallBuffer - WALL_SETTINGS.THICKNESS;
        break;

      case 'east':
        position.x = roomHalfWidth - wallBuffer - WALL_SETTINGS.THICKNESS;
        // Use halfWidth for Z constraint when on side walls (mirror rotates)
        position.z = Math.max(-roomHalfHeight + halfWidth, Math.min(roomHalfHeight - halfWidth, mouseWorldPos.z));
        break;

      case 'west':
        position.x = -roomHalfWidth + wallBuffer + WALL_SETTINGS.THICKNESS;
        // Use halfWidth for Z constraint when on side walls (mirror rotates)
        position.z = Math.max(-roomHalfHeight + halfWidth, Math.min(roomHalfHeight - halfWidth, mouseWorldPos.z));
        break;

      // ✅ NEW: Handle notch walls for L-shaped rooms
      case 'notch-east':
        if (notch) {
          position.x = notch.maxX + wallBuffer + WALL_SETTINGS.THICKNESS;
          // Allow sliding along Z within notch bounds and extending to room edge
          position.z = Math.max(notch.minZ + halfWidth, Math.min(interior.maxZ - halfWidth, mouseWorldPos.z));
        }
        break;

      case 'notch-south':
        if (notch) {
          position.z = notch.maxZ + wallBuffer + WALL_SETTINGS.THICKNESS;
          // Allow sliding along X within notch bounds and extending to room edge
          position.x = Math.max(notch.minX + halfWidth, Math.min(interior.maxX - halfWidth, mouseWorldPos.x));
        }
        break;
    }

    return {
      wall: nearestWall,
      position: position
    };
  }

  private updateDragPlane(object: THREE.Object3D): void {
    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);

    // Create a plane that faces the camera and passes through the object
    // This is much more stable than a fixed horizontal plane, especially in side views
    this.dragPlane.setFromNormalAndCoplanarPoint(
      cameraDir.clone().negate(),
      object.position
    );

    // ✅ ADD: Update the visual representation
    this.updateDragPlaneVisualization();
  }

  /**
   * Calculates proper vertical movement constraints for objects, accounting for floor offset
   * from GLB models and movement configuration limits.
   *
   * This method handles the complex relationship between:
   * - position.y (Three.js position)
   * - floorOffset (elevation built into the GLB model)
   * - actual visual height (position.y + floorOffset)
   *
   * Key behaviors:
   * - Objects with floorOffset can have negative position.y to reach floor level
   * - maxHeight = -1 or undefined means no limit except ceiling
   * - Always prevents objects from going through the ceiling
   * - Uses actual room height from roomHeightRef
   *
   * @param {ComponentType} objectType - Type of bathroom fixture (e.g., 'sink', 'mirror')
   * @param {BathroomItem | undefined} currentItem - Current item containing SKU, model info, and movement config
   *
   * @returns {{min: number, max: number}} Object with min/max position.y values
   *
   * @example
   * // Mirror with 110cm floor offset, wanting to reach floor
   * // minHeight: 0, floorOffset: 110
   * // Returns: { min: -110, max: ... }
   * // At position.y = -110, actual bottom = -110 + 110 = 0 (floor level)
   *
   * @example
   * // Sink with restricted height range
   * // minHeight: 75, maxHeight: 85, floorOffset: 80
   * // Returns: { min: -5, max: 5 }
   * // Object can only move within 75-85cm from floor
   *
   * @private
   */
  private getProperHeightConstraints(
    objectType: ComponentType,
    currentItem: BathroomItem | undefined
  ): { min: number; max: number } {
    // Get the product dimensions including floorOffset
    const dimensions = getDimensions(objectType, currentItem?.sku, currentItem?.model);
    const movementConfig = getMovementConfig(objectType, currentItem);

    // Get object's actual height and floor offset
    const objectHeight = dimensions?.height || 100; // Default 100cm if not found
    const floorOffset = dimensions?.floorOffset || 0;

    // Use actual room height from the ref
    const ROOM_CEILING_HEIGHT = WALL_SETTINGS.HEIGHT;

    // Calculate minimum position.y
    // Account for floorOffset - object can go negative to reach floor level
    // When position.y = minY, the actual bottom = minY + floorOffset = desired minHeight
    // Example: Mirror with floorOffset=110.1cm and minHeight=0:
    //   minY = 0 - 110.1 = -110.1cm
    //   Actual bottom = -110.1 + 110.1 = 0cm (floor level)
    const desiredMinHeight = movementConfig.minHeight || 0;
    let minY = desiredMinHeight - floorOffset;

    // Calculate maximum position.y
    // Two constraints to consider:
    // 1. Ceiling constraint: Object's top shouldn't go through ceiling
    //    Object's top = position.y + floorOffset + objectHeight
    //    So: position.y <= ROOM_CEILING_HEIGHT - floorOffset - objectHeight
    const ceilingConstraint = ROOM_CEILING_HEIGHT - floorOffset - objectHeight;

    // 2. Movement config maxHeight: Maximum height from floor for object's bottom
    //    When position.y = maxY, actual bottom = maxY + floorOffset = desired maxHeight
    //    So: maxY = desiredMaxHeight - floorOffset
    //    Special case: maxHeight = -1 means "no limit except ceiling"
    //    Example: Mirror with floorOffset=110.1cm and maxHeight=100cm:
    //      maxY = 100 - 110.1 = -10.1cm
    //      Actual bottom = -10.1 + 110.1 = 100cm from floor ✅
    let maxY = ceilingConstraint; // Default to ceiling constraint

    if (movementConfig.maxHeight !== undefined && movementConfig.maxHeight !== -1) {
      // Only apply maxHeight limit if it's defined and not -1
      const configMaxY = movementConfig.maxHeight - floorOffset;
      maxY = Math.min(ceilingConstraint, configMaxY);
    }
    // If maxHeight is undefined or -1, use ceiling constraint only
    // Ensure min doesn't exceed max
    minY = Math.min(minY, maxY);

    return { min: minY, max: maxY };
  }
}
