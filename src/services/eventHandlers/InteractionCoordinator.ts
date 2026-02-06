/**
 * InteractionCoordinator - Main coordinator for all interaction handlers.
 *
 * This class provides a unified interface for managing user interactions in the
 * 3D bathroom planner. It coordinates between specialized handlers and maintains
 * backward compatibility with the original EventHandlers API.
 *
 * Architecture:
 * - Owns SharedState instance (centralized state)
 * - Creates and manages all handler instances
 * - Routes DOM events to appropriate handlers
 * - Handles inter-handler communication
 * - Provides public API for Planner.vue
 */

import * as THREE from 'three';
import type { Ref } from 'vue';
import type { ViewMode } from '../../constants/camera';
import type { BathroomPlannerState } from '../../composables/useUndoRedo';
import type { BathroomItem } from '../../utils/constraints';
import type { MeasurementSystem } from '../measurementSystem';
import type { SimpleWallCulling } from '../simpleWallCulling';
import type { SceneEventBus } from '../sceneEventBus';
import type { RotationArrows } from '../rotationArrows';

import { SharedState } from './SharedState';
import { CameraHandler } from './handlers/CameraHandler';
import { SelectionHandler } from './handlers/SelectionHandler';
import { DragHandler } from './handlers/DragHandler';
import { RotationHandler } from './handlers/RotationHandler';
import { HeightScaleHandler } from './handlers/HeightScaleHandler';
import type { HandlerContext } from './types';

/**
 * Constructor options matching the original EventHandlers signature.
 */
export interface InteractionCoordinatorOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  roomWidthRef: Ref<number>;
  roomHeightRef: Ref<number>;
  notchWidthRef: Ref<number>;
  notchHeightRef: Ref<number>;
  setItems: (updater: (items: BathroomItem[]) => BathroomItem[]) => void;
  getItems: () => BathroomItem[];
  deleteItem: (itemId: number) => void;
  preventCollisionPlacementRef: Ref<boolean>;
  saveToHistory: (state: BathroomPlannerState) => void;
  currentFloorTextureRef: Ref<number>;
  currentWallTextureRef: Ref<number>;
}

export class InteractionCoordinator {
  // ============================================================================
  // STATE & HANDLERS
  // ============================================================================

  private state: SharedState;
  private cameraHandler: CameraHandler;
  private selectionHandler: SelectionHandler;
  private dragHandler: DragHandler;
  private rotationHandler: RotationHandler;
  private heightScaleHandler: HeightScaleHandler;

  // Bound event handlers for proper cleanup
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleWheel: (e: WheelEvent) => void;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleContextMenu: (e: MouseEvent) => void;
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;
  private boundHandleTouchEnd: (e: TouchEvent) => void;
  private boundHandleResize: () => void;

  // ============================================================================
  // PUBLIC PROPERTIES (Backward compatibility)
  // ============================================================================

  /** Callback when an item is selected */
  public get onItemSelected(): ((itemId: number) => void) | undefined {
    return this.state.onItemSelected;
  }
  public set onItemSelected(callback: ((itemId: number) => void) | undefined) {
    this.state.onItemSelected = callback;
  }

  /** Callback when an item is deselected */
  public get onItemDeselected(): (() => void) | undefined {
    return this.state.onItemDeselected;
  }
  public set onItemDeselected(callback: (() => void) | undefined) {
    this.state.onItemDeselected = callback;
  }

  /** Callback when drag starts */
  public get onDragStart(): (() => void) | undefined {
    return this.state.onDragStart;
  }
  public set onDragStart(callback: (() => void) | undefined) {
    this.state.onDragStart = callback;
  }

  /** Callback when drag ends */
  public get onDragEnd(): (() => void) | undefined {
    return this.state.onDragEnd;
  }
  public set onDragEnd(callback: (() => void) | undefined) {
    this.state.onDragEnd = callback;
  }

  /** Callback for toast notifications */
  public get onShowToast(): ((message: string, type?: 'info' | 'warning' | 'error') => void) | null {
    return this.state.onShowToast;
  }
  public set onShowToast(callback: ((message: string, type?: 'info' | 'warning' | 'error') => void) | null) {
    this.state.onShowToast = callback;
  }

  /** Orthographic camera reference (for SceneManager access) */
  public get orthographicCamera(): THREE.OrthographicCamera | null {
    return this.state.orthographicCamera;
  }

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor(options: InteractionCoordinatorOptions) {
    // Create handler context
    const context: HandlerContext = {
      scene: options.scene,
      camera: options.camera,
      renderer: options.renderer,
      roomWidthRef: options.roomWidthRef,
      roomHeightRef: options.roomHeightRef,
      notchWidthRef: options.notchWidthRef,
      notchHeightRef: options.notchHeightRef,
      setItems: options.setItems,
      getItems: options.getItems,
      deleteItem: options.deleteItem,
      preventCollisionPlacementRef: options.preventCollisionPlacementRef,
      saveToHistory: options.saveToHistory,
      currentFloorTextureRef: options.currentFloorTextureRef,
      currentWallTextureRef: options.currentWallTextureRef,
    };

    // Create shared state
    this.state = new SharedState(context);

    // Create handlers
    this.cameraHandler = new CameraHandler(this.state);
    this.selectionHandler = new SelectionHandler(this.state);
    this.dragHandler = new DragHandler(this.state);
    this.rotationHandler = new RotationHandler(this.state);
    this.heightScaleHandler = new HeightScaleHandler(this.state);

    // Bind event handlers
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleWheel = this.handleWheel.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleContextMenu = this.handleContextMenu.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);

    // Start camera zoom animation
    this.cameraHandler.startZoomAnimation();
  }

  // ============================================================================
  // PUBLIC API - View Mode
  // ============================================================================

  /** Set the view mode (2D or 3D) */
  public setViewMode(mode: ViewMode): void {
    this.cameraHandler.setViewMode(mode);
  }

  /** Get the current view mode */
  public getViewMode(): ViewMode {
    return this.cameraHandler.getViewMode();
  }

  /** Set the orthographic camera reference */
  public setOrthographicCamera(camera: THREE.OrthographicCamera): void {
    this.cameraHandler.setOrthographicCamera(camera);
  }

  /** Sync target camera position with current position */
  public syncTargetCameraPosition(): void {
    this.cameraHandler.syncTargetCameraPosition();
  }

  // ============================================================================
  // PUBLIC API - Selection
  // ============================================================================

  /** Set multi-select mode */
  public setMultiSelectMode(enabled: boolean): void {
    this.selectionHandler.setMultiSelectMode(enabled);
  }

  /** Select all items */
  public selectAllItems(): void {
    this.selectionHandler.selectAllItems();
  }

  /** Clear all selections */
  public clearSelection(): void {
    this.selectionHandler.clearSelection();
  }

  /** Get IDs of all selected items */
  public getSelectedItemIds(): number[] {
    return this.selectionHandler.getSelectedIds();
  }

  // ============================================================================
  // PUBLIC API - Rotation Arrows
  // ============================================================================

  /** Enable or disable rotation arrows */
  public setRotationArrowsEnabled(enabled: boolean): void {
    this.rotationHandler.setRotationArrowsEnabled(enabled);
  }

  // ============================================================================
  // PUBLIC API - Drag Operations
  // ============================================================================

  /** Check if a drag operation is active */
  public isDragOperationActive(): boolean {
    return this.dragHandler.isDragOperationActive();
  }

  /** Get the count of pending updates */
  public getPendingUpdatesCount(): number {
    return this.dragHandler.getPendingUpdates().size;
  }

  /** Check if collision prevention is enabled */
  public isCollisionPreventionEnabled(): boolean {
    return this.state.preventCollisionPlacementRef.value;
  }

  // ============================================================================
  // PUBLIC API - Services
  // ============================================================================

  /** Set the measurement system reference */
  public setMeasurementSystem(measurementSystem: MeasurementSystem): void {
    this.state.measurementSystem = measurementSystem;
  }

  /** Set the wall culling reference */
  public setWallCulling(wallCulling: SimpleWallCulling): void {
    this.state.wallCulling = wallCulling;
  }

  /** Set the event bus for decoupled communication */
  public setEventBus(eventBus: SceneEventBus): void {
    // Clean up previous subscriptions
    this.state.eventBusUnsubscribers.forEach(unsub => unsub());
    this.state.eventBusUnsubscribers = [];

    this.state.eventBus = eventBus;

    // Subscribe to events from SceneManager
    this.state.eventBusUnsubscribers.push(
      eventBus.on('view:modeChanged', ({ mode }) => {
        this.setViewMode(mode);
      })
    );

    this.state.eventBusUnsubscribers.push(
      eventBus.on('camera:orthographicReady', ({ camera }) => {
        this.setOrthographicCamera(camera);
      })
    );

    this.state.eventBusUnsubscribers.push(
      eventBus.on('camera:syncPosition', () => {
        this.syncTargetCameraPosition();
      })
    );
  }

  /** @deprecated Use setEventBus instead */
  public setSceneManager(sceneManager: any): void {
    this.state.sceneManager = sceneManager;
    if (sceneManager?.orthographicCamera) {
      this.state.orthographicCamera = sceneManager.orthographicCamera;
    }
  }

  /** Set rotation arrows instance */
  public setRotationArrows(rotationArrows: RotationArrows): void {
    this.state.rotationArrows = rotationArrows;

    // Set up rotation change callback
    rotationArrows.setRotationChangeCallback((rotation: number) => {
      this.rotationHandler.handleRotationArrowChange(rotation);
    });
  }

  // ============================================================================
  // PUBLIC API - Update Loop
  // ============================================================================

  /** Update loop - call each frame for rotation arrows */
  public update(): void {
    if (this.state.rotationArrows) {
      this.state.rotationArrows.update();
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  /** Add all event listeners to the renderer's DOM element */
  public addEventListeners(): void {
    const canvas = this.state.renderer.domElement;

    canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    canvas.addEventListener('mouseup', this.boundHandleMouseUp);
    canvas.addEventListener('wheel', this.boundHandleWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.boundHandleContextMenu);
    canvas.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.boundHandleTouchEnd);

    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('resize', this.boundHandleResize);
  }

  /** Remove all event listeners */
  public removeEventListeners(): void {
    const canvas = this.state.renderer.domElement;

    canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
    canvas.removeEventListener('wheel', this.boundHandleWheel);
    canvas.removeEventListener('contextmenu', this.boundHandleContextMenu);
    canvas.removeEventListener('touchstart', this.boundHandleTouchStart);
    canvas.removeEventListener('touchmove', this.boundHandleTouchMove);
    canvas.removeEventListener('touchend', this.boundHandleTouchEnd);

    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('resize', this.boundHandleResize);

    // Dispose shared state
    this.state.dispose();
  }

  // ============================================================================
  // EVENT HANDLERS (Private)
  // ============================================================================

  private handleMouseDown(event: MouseEvent): void {
    try {
      // Update mouse position
      this.updateMousePosition(event);

      // Track mouse down position for click detection
      this.state.mouseDownPosition.set(event.clientX, event.clientY);
      this.state.hasMouseMoved = false;

      // Check for object intersection
      const intersection = this.selectionHandler.getIntersectedObject(this.state.mouse);

      if (event.button === 0) { // Left click
        if (intersection) {
          // Handle object selection/drag
          this.handleLeftClickOnObject(event, intersection);
        } else {
          // Start camera rotation
          this.state.isRotating = true;
          this.state.wasEmptySpaceClicked = true;
          this.state.mouseX = event.clientX;
          this.state.mouseY = event.clientY;
        }
      } else if (event.button === 2) { // Right click
        if (this.state.selectedObject) {
          // Start object rotation
          this.rotationHandler.startObjectRotation(event);
        }
      }
    } catch (error) {
      console.error('[InteractionCoordinator] Error in mouseDown:', error);
      this.resetAllStates();
    }
  }

  private handleLeftClickOnObject(event: MouseEvent, intersection: { object: THREE.Object3D; point: THREE.Vector3 }): void {
    const object = intersection.object;
    const wasAlreadySelected = this.selectionHandler.isObjectSelected(object);

    // Handle Ctrl+click for height adjustment
    if (event.ctrlKey && this.state.selectedObject) {
      if (this.heightScaleHandler.startHeightAdjust(event)) {
        return;
      }
    }

    // Handle Alt+click for scaling
    if (event.altKey && this.state.selectedObject) {
      if (this.heightScaleHandler.startScaling(event)) {
        return;
      }
    }

    // Handle multi-select mode
    if (this.state.isMultiSelectMode) {
      this.selectionHandler.toggleObjectSelection(object);
      this.state.wasAlreadySelected = wasAlreadySelected;
    } else {
      // Single select mode
      this.selectionHandler.selectObject(object);
    }

    // Start drag
    if (this.state.selectedObject) {
      this.dragHandler.initializeDragState(this.state.selectedObject);
      this.dragHandler.setupDragPlane(this.state.selectedObject.position.y);
      this.dragHandler.calculateDragOffset(intersection.point, this.state.selectedObject.position);

      if (this.state.selectedObjects.size > 1) {
        this.dragHandler.initializeMultiSelectState();
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    try {
      // Update mouse position
      this.updateMousePosition(event);

      // Check if mouse has moved beyond threshold
      const dx = event.clientX - this.state.mouseDownPosition.x;
      const dy = event.clientY - this.state.mouseDownPosition.y;
      if (Math.sqrt(dx * dx + dy * dy) > this.state.MOUSE_MOVE_THRESHOLD) {
        this.state.hasMouseMoved = true;
      }

      // Route to appropriate handler based on current state
      if (this.state.isHeightAdjusting) {
        this.heightScaleHandler.handleHeightAdjust(event);
      } else if (this.state.isScaling) {
        this.heightScaleHandler.handleScaling(event);
      } else if (this.state.isObjectRotating) {
        this.rotationHandler.handleObjectRotation(event);
      } else if (this.state.isDragging) {
        this.handleDragMove(event);
      } else if (this.state.isRotating) {
        this.cameraHandler.handleCameraDrag(event);
      } else {
        // Hover effect
        this.updateHoverCursor();
      }
    } catch (error) {
      console.error('[InteractionCoordinator] Error in mouseMove:', error);
    }
  }

  private handleDragMove(_event: MouseEvent): void {
    if (!this.state.selectedObject) return;

    const intersection = this.dragHandler.getDragIntersection(this.state.mouse);
    if (!intersection) return;

    // Note: Complex constraint logic is still in the original EventHandlers.ts
    // For now, just update position directly (without constraints)
    // Full constraint logic should be migrated to DragHandler incrementally
    this.state.selectedObject.position.x = intersection.x;
    this.state.selectedObject.position.z = intersection.z;

    // Emit schematic update for 2D mode
    const itemId = this.state.selectedObject.userData.itemId;
    if (this.state.eventBus) {
      this.state.eventBus.emit('schematic:update', { itemId });
    }
  }

  private handleMouseUp(_event: MouseEvent): void {
    try {
      // Handle height/scale end
      if (this.state.isHeightAdjusting) {
        this.heightScaleHandler.endHeightAdjust();
        this.applyPendingUpdates();
      } else if (this.state.isScaling) {
        this.heightScaleHandler.endScaling();
        this.applyPendingUpdates();
      } else if (this.state.isObjectRotating) {
        this.rotationHandler.endObjectRotation();
        this.applyPendingUpdates();
      } else if (this.state.isDragging) {
        this.dragHandler.endDrag();
        this.dragHandler.queueAllSelectedUpdates();
        this.applyPendingUpdates();
      }

      // Handle click (no movement) on empty space - deselect
      if (this.state.wasEmptySpaceClicked && !this.state.hasMouseMoved) {
        this.selectionHandler.clearSelection();
      }

      // Reset states
      this.state.isRotating = false;
      this.state.wasEmptySpaceClicked = false;
    } catch (error) {
      console.error('[InteractionCoordinator] Error in mouseUp:', error);
      this.resetAllStates();
    }
  }

  private handleWheel(event: WheelEvent): void {
    try {
      event.preventDefault();
      this.cameraHandler.handleWheelZoom(event.deltaY);
    } catch (error) {
      console.error('[InteractionCoordinator] Error in wheel:', error);
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    try {
      // Delete key - delete selected object
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (this.state.selectedObject) {
          const itemId = this.state.selectedObject.userData.itemId;
          this.selectionHandler.clearSelection();
          this.state.deleteItem(itemId);
        }
      }

      // Escape key - clear selection
      if (event.key === 'Escape') {
        this.selectionHandler.clearSelection();
      }
    } catch (error) {
      console.error('[InteractionCoordinator] Error in keyDown:', error);
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private handleTouchStart(event: TouchEvent): void {
    try {
      event.preventDefault();
      const touches = event.touches;

      if (touches.length === 1) {
        // Single touch - treat like mouse down
        const touch = touches[0];
        this.state.mouseDownPosition.set(touch.clientX, touch.clientY);
        this.state.hasMouseMoved = false;
        this.updateTouchPosition(touch);

        const intersection = this.selectionHandler.getIntersectedObject(this.state.mouse);
        if (intersection) {
          this.selectionHandler.selectObject(intersection.object);
          if (this.state.selectedObject) {
            this.dragHandler.initializeDragState(this.state.selectedObject);
            this.dragHandler.setupDragPlane(this.state.selectedObject.position.y);
            this.dragHandler.calculateDragOffset(intersection.point, this.state.selectedObject.position);
          }
        } else {
          this.state.isRotating = true;
          this.state.wasEmptySpaceClicked = true;
          this.state.mouseX = touch.clientX;
          this.state.mouseY = touch.clientY;
        }

        this.state.lastTouchTime = Date.now();
      } else if (touches.length === 2) {
        // Two finger touch - zoom
        this.state.lastTouchDistance = this.getTouchDistance(touches[0], touches[1]);
      }
    } catch (error) {
      console.error('[InteractionCoordinator] Error in touchStart:', error);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    try {
      event.preventDefault();
      const touches = event.touches;

      if (touches.length === 1) {
        const touch = touches[0];
        this.updateTouchPosition(touch);

        // Check movement threshold
        const dx = touch.clientX - this.state.mouseDownPosition.x;
        const dy = touch.clientY - this.state.mouseDownPosition.y;
        if (Math.sqrt(dx * dx + dy * dy) > this.state.MOUSE_MOVE_THRESHOLD) {
          this.state.hasMouseMoved = true;
        }

        if (this.state.isDragging) {
          const intersection = this.dragHandler.getDragIntersection(this.state.mouse);
          if (intersection && this.state.selectedObject) {
            this.state.selectedObject.position.x = intersection.x;
            this.state.selectedObject.position.z = intersection.z;
          }
        } else if (this.state.isRotating) {
          this.cameraHandler.handleCameraTouchDrag(touch);
        }
      } else if (touches.length === 2) {
        // Pinch zoom
        const distance = this.getTouchDistance(touches[0], touches[1]);
        const scale = distance / this.state.lastTouchDistance;
        this.cameraHandler.handleTouchZoom(scale, distance);
      }
    } catch (error) {
      console.error('[InteractionCoordinator] Error in touchMove:', error);
    }
  }

  private handleTouchEnd(_event: TouchEvent): void {
    try {
      // Check for double-tap to delete
      const now = Date.now();
      if (now - this.state.lastTouchTime < 300 && !this.state.hasMouseMoved) {
        if (this.state.selectedObject) {
          const itemId = this.state.selectedObject.userData.itemId;
          this.selectionHandler.clearSelection();
          this.state.deleteItem(itemId);
        }
      }

      // End drag
      if (this.state.isDragging) {
        this.dragHandler.endDrag();
        this.dragHandler.queueAllSelectedUpdates();
        this.applyPendingUpdates();
      }

      // Handle tap on empty space
      if (this.state.wasEmptySpaceClicked && !this.state.hasMouseMoved) {
        this.selectionHandler.clearSelection();
      }

      // Reset states
      this.state.isRotating = false;
      this.state.wasEmptySpaceClicked = false;
    } catch (error) {
      console.error('[InteractionCoordinator] Error in touchEnd:', error);
    }
  }

  private handleResize(): void {
    // Resize handling is typically done by SceneManager
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.state.renderer.domElement.getBoundingClientRect();
    this.state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.state.mouseX = event.clientX;
    this.state.mouseY = event.clientY;
  }

  private updateTouchPosition(touch: Touch): void {
    const rect = this.state.renderer.domElement.getBoundingClientRect();
    this.state.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.state.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    this.state.mouseX = touch.clientX;
    this.state.mouseY = touch.clientY;
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private updateHoverCursor(): void {
    const intersection = this.selectionHandler.getIntersectedObject(this.state.mouse);
    this.state.renderer.domElement.style.cursor = intersection ? 'grab' : 'default';
  }

  private resetAllStates(): void {
    this.state.resetAllInteractionStates();
    this.state.wasEmptySpaceClicked = false;
  }

  private applyPendingUpdates(): void {
    const updates = this.dragHandler.getPendingUpdates();
    if (updates.size === 0) return;

    const updatesArray = Array.from(updates.entries());
    this.dragHandler.clearPendingUpdates();

    // Apply all updates at once
    this.state.setItems((prevItems: BathroomItem[]) => {
      return prevItems.map(item => {
        const update = updatesArray.find(([itemId]) => itemId === item.id);
        if (update) {
          return { ...item, ...update[1] };
        }
        return item;
      });
    });

    // Save to history after a short delay
    setTimeout(() => {
      const currentItems = this.state.getItems();
      this.state.saveToHistory({
        items: currentItems,
        roomWidth: this.state.roomWidthRef.value,
        roomHeight: this.state.roomHeightRef.value,
        currentFloorTexture: this.state.currentFloorTextureRef.value,
        currentWallTexture: this.state.currentWallTextureRef.value
      });
    }, 50);
  }

  // ============================================================================
  // GETTERS FOR HANDLERS (for advanced use cases)
  // ============================================================================

  public getCameraHandler(): CameraHandler {
    return this.cameraHandler;
  }

  public getSelectionHandler(): SelectionHandler {
    return this.selectionHandler;
  }

  public getDragHandler(): DragHandler {
    return this.dragHandler;
  }

  public getRotationHandler(): RotationHandler {
    return this.rotationHandler;
  }

  public getHeightScaleHandler(): HeightScaleHandler {
    return this.heightScaleHandler;
  }

  public getSharedState(): SharedState {
    return this.state;
  }
}
