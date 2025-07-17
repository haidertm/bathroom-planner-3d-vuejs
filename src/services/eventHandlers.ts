// src/services/eventHandlers.ts
import * as THREE from 'three';
import type { Ref } from 'vue';
import {
  updateMousePosition,
  updateTouchPosition,
  getTouchDistance,
  highlightObject,
  setOutlineColor
} from '../utils/helpers';
import { constrainToWalls, snapToNearestWall, wouldCollideWithExisting, type BathroomItem } from '../utils/constraints';
import { SCALE_LIMITS, HEIGHT_LIMITS } from '../constants/dimensions';
import type { ComponentType } from '../constants/components';
import { LOOK_AT, CAMERA_SETTINGS, CAMERA_CONTROLS } from '../constants/camera';
import { ref } from 'vue';

interface IntersectionResult {
  object: THREE.Object3D;
  point: THREE.Vector3;
}

interface UpdateData {
  position?: [number, number, number];
  rotation?: number;
  scale?: number;

  [key: string]: any;
}

// Function type definitions
type SetItemsFunction = (updater: (items: BathroomItem[]) => BathroomItem[]) => void;
type GetItemsFunction = () => BathroomItem[];
type DeleteItemFunction = (itemId: number) => void;

export class EventHandlers {
  // Core Three.js objects
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private roomWidthRef: Ref<number>;
  private roomHeightRef: Ref<number>;
  private setItems: SetItemsFunction;
  private getItems: GetItemsFunction;
  private deleteItem: DeleteItemFunction;
  private preventCollisionPlacementRef: Ref<boolean>; // NEW: Collision prevention setting

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
  private targetSpherical: THREE.Spherical;        // NEW: Target rotation
  private isAnimatingCamera: boolean = false;

  // Add these properties for smooth rotation
  private currentSpherical: THREE.Spherical;

  // Note: Event handlers are defined as methods below and bound in constructor

  constructor (
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    roomWidthRef: Ref<number>,
    roomHeightRef: Ref<number>,
    setItems: SetItemsFunction,
    getItems: GetItemsFunction,
    deleteItem: DeleteItemFunction,
    preventCollisionPlacementRef: Ref<boolean> = ref(true) // NEW: Accept collision prevention setting
  ) {
    // Assign core objects
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.roomWidthRef = roomWidthRef;
    this.roomHeightRef = roomHeightRef;
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

    // NEW: Initialize original position tracking
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

    // Simple animation loop ONLY for zoom
    this.startSimpleZoomAnimation();
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

  // Method to get current items for collision detection
  private getCurrentItems (): BathroomItem[] {
    return this.getItems();
  }

  // Add method to set measurement system reference
  public setMeasurementSystem (measurementSystem: MeasurementSystem): void {
    this.measurementSystem = measurementSystem;
  }

  private getIntersectedObject (mouse: THREE.Vector2): IntersectionResult | null {
    this.raycaster.setFromCamera(mouse, this.camera);

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
  private applyPendingUpdates (): void {
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
  }

  // Method to queue updates during drag operations
  private queueUpdate (itemId: number, updateData: UpdateData): void {
    if (this.isDragOperation) {
      // Store the update for later application
      this.pendingUpdates.set(itemId, {
        ...this.pendingUpdates.get(itemId),
        ...updateData
      });
    } else {
      // Apply immediately if not dragging
      this.setItems((prev: BathroomItem[]) => prev.map(item =>
        item.id === itemId ? { ...item, ...updateData } : item
      ));
    }
  }

  // Keyboard event handler for delete functionality
  private handleKeyDown (event: KeyboardEvent): void {
    // Delete selected object when Delete or Backspace key is pressed
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedObject) {
      event.preventDefault();
      const itemId = this.selectedObject.userData.itemId as number;

      // Clear selection and highlight
      highlightObject(this.selectedObject, false);
      this.selectedObject = null;

      console.log('itemToBeDeleted>>>', itemId);

      // Delete the item
      if (this.deleteItem && itemId) {
        this.deleteItem(itemId);
      }
    }
  }

  private handleMouseDown (event: MouseEvent): void {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    // Convert mouse position to Three.js Vector2
    const mousePos = updateMousePosition(event, this.renderer.domElement.getBoundingClientRect());
    this.mouse.set(mousePos.x, mousePos.y);

    const intersected = this.getIntersectedObject(this.mouse);

    // Clear previous selection if clicking on empty space or different object
    if (this.selectedObject && (!intersected || intersected.object !== this.selectedObject)) {
      highlightObject(this.selectedObject, false);
      this.selectedObject = null;
    }

    if (intersected) {
      this.selectedObject = intersected.object;

      console.log('selectedObject >>>', this.selectedObject);

      // Sync with measurement system
      if (this.measurementSystem) {
        this.measurementSystem.setSelectedObject(this.selectedObject);
      }

      // Emit event for measurement updates
      window.dispatchEvent(new CustomEvent('object-selected'));

      // Check collision state immediately when object is selected
      const objectType = this.selectedObject.userData.type as ComponentType;
      const objectScale = this.selectedObject.scale.x;
      const itemId = this.selectedObject.userData.itemId as number;
      const currentItems = this.getCurrentItems();

      const currentPosition = this.selectedObject.position;
      const isColliding = wouldCollideWithExisting(
        { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
        objectType,
        objectScale,
        itemId,
        currentItems
      );

      // Highlight the object first
      highlightObject(this.selectedObject, true);

      // Then set appropriate outline color based on current collision state
      setOutlineColor(isColliding);

      if (event.button === 2) { // Right click for rotation
        this.isObjectRotating = true;
        this.isDragOperation = true; // Mark as drag operation
        const rect = this.renderer.domElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.rotationStartAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        this.objectStartRotation = this.selectedObject.rotation.y;
        this.renderer.domElement.style.cursor = 'crosshair';
      } else if (event.ctrlKey || event.metaKey) { // Ctrl/Cmd + click for height adjustment
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

        // NEW: Store original position for potential snap-back
        this.originalDragPosition.copy(this.selectedObject.position);
        this.originalDragRotation = this.selectedObject.rotation.y;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        this.dragOffset.subVectors(this.selectedObject.position, intersectPoint);
        this.renderer.domElement.style.cursor = 'grabbing';
      }

    } else {
      if (event.button === 0) { // Left click for camera rotation
        this.isRotating = true;
        this.renderer.domElement.style.cursor = 'grabbing';
      }

      // Clear measurement system selection
      if (this.measurementSystem) {
        this.measurementSystem.setSelectedObject(null);
      }

      // Emit event for measurement updates
      window.dispatchEvent(new CustomEvent('object-selected'));
    }
  }

  private handleMouseMove (event: MouseEvent): void {
    const mousePos = updateMousePosition(event, this.renderer.domElement.getBoundingClientRect());
    this.mouse.set(mousePos.x, mousePos.y);

    // Safety check - if no mouse buttons are pressed, stop dragging
    if (event.buttons === 0) {
      if (this.isDragging || this.isRotating || this.isObjectRotating || this.isHeightAdjusting || this.isScaling) {
        console.log('🛑 No mouse buttons pressed, stopping drag operations');
        this.stopAllDragOperations();
        return;
      }
    } else {
      if (this.isDragging && this.selectedObject && this.measurementSystem) {
        this.measurementSystem.forceUpdateMeasurements();
        // Emit event for real-time measurement updates
        window.dispatchEvent(new CustomEvent('object-moved'));
      }
    }

    if (this.isScaling && this.selectedObject) {
      // Scale object - UPDATED SCALING FACTOR FOR CENTIMETERS
      const deltaY = (this.mouseStartY - event.clientY) * 0.001; // Reduced from 0.01 to 0.001
      const newScale = Math.max(SCALE_LIMITS.MIN, Math.min(SCALE_LIMITS.MAX, this.scaleStart + deltaY));

      this.selectedObject.scale.set(newScale, newScale, newScale);

      const itemId = this.selectedObject.userData.itemId as number;
      // Queue update instead of applying immediately
      this.queueUpdate(itemId, { scale: newScale });

    } else if (this.isHeightAdjusting && this.selectedObject) {
      // Adjust object height - UPDATED HEIGHT ADJUSTMENT FOR CENTIMETERS
      const deltaY = (this.mouseStartY - event.clientY) * 1.0; // Increased from 0.01 to 1.0
      let newY = this.heightStartY + deltaY;

      const minHeight = HEIGHT_LIMITS.MIN;
      const maxHeight = this.selectedObject.userData.type === 'Mirror' ? HEIGHT_LIMITS.MIRROR_MAX : HEIGHT_LIMITS.MAX;
      newY = Math.max(minHeight, Math.min(maxHeight, newY));

      this.selectedObject.position.y = newY;

      const itemId = this.selectedObject.userData.itemId as number;
      // Queue update instead of applying immediately
      this.queueUpdate(itemId, {
        position: [this.selectedObject.position.x, newY, this.selectedObject.position.z]
      });

    } else if (this.isObjectRotating && this.selectedObject) {
      // Rotate object
      const rect = this.renderer.domElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      const deltaAngle = currentAngle - this.rotationStartAngle;

      this.selectedObject.rotation.y = this.objectStartRotation + deltaAngle;

      const itemId = this.selectedObject.userData.itemId as number;
      // Queue update instead of applying immediately
      this.queueUpdate(itemId, { rotation: this.selectedObject.rotation.y });

    } else if (this.isDragging && this.selectedObject) {
      // ENHANCED: Drag object with wall constraints and collision detection
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

      const newPosition = intersectPoint.add(this.dragOffset);

      // Get object type and scale for enhanced constraints
      const objectType = this.selectedObject.userData.type as ComponentType;
      const objectScale = this.selectedObject.scale.x;
      const itemId = this.selectedObject.userData.itemId as number;

      // DEBUG: Log room size refs
      console.log('🔗 DRAG - Room size refs:', {
        width: this.roomWidthRef.value,
        height: this.roomHeightRef.value,
        selectedObject: objectType,
        objectScale
      });

      // DEBUG: Log position before constraints
      console.log('🔗 DRAG - Position before wall constraints:', {
        x: newPosition.x.toFixed(3),
        z: newPosition.z.toFixed(3)
      });

      // Always constrain to walls
      const { position: wallConstrainedPos, rotation: wallRotation } = constrainToWalls(
        newPosition,
        this.roomWidthRef.value,
        this.roomHeightRef.value,
        objectType,
        objectScale
      );

      // DEBUG: Log wall constraint results
      console.log('🔗 DRAG - Wall constraint results:', {
        original: { x: newPosition.x.toFixed(3), z: newPosition.z.toFixed(3) },
        wallConstrained: { x: wallConstrainedPos.x.toFixed(3), z: wallConstrainedPos.z.toFixed(3) },
        rotation: `${(wallRotation * 180 / Math.PI).toFixed(0)}°`
      });

      // Apply wall constraints
      newPosition.x = wallConstrainedPos.x;
      newPosition.z = wallConstrainedPos.z;

      // Additional snap to nearest wall for fine-tuning
      const { position: snappedPos, rotation: snappedRotation } = snapToNearestWall(
        newPosition,
        this.roomWidthRef.value,
        this.roomHeightRef.value,
        objectType,
        objectScale
      );

      newPosition.x = snappedPos.x;
      newPosition.z = snappedPos.z;

      // IMPORTANT: Update rotation to match the wall the object is on
      this.selectedObject.rotation.y = snappedRotation;

      // ENHANCED: Check for collisions and update outline color
      const currentItems = this.getCurrentItems();
      const isColliding = wouldCollideWithExisting(
        { x: newPosition.x, y: newPosition.y, z: newPosition.z },
        objectType,
        objectScale,
        itemId,
        currentItems
      );

      // CRITICAL: Update outline color immediately and force refresh
      console.log(`🎨 Setting outline color: ${isColliding ? 'RED (collision)' : 'CYAN (safe)'}`);
      setOutlineColor(isColliding);

      // Additional debug info
      console.log('🔗 DRAG collision check result:', {
        position: { x: newPosition.x.toFixed(1), z: newPosition.z.toFixed(1) },
        objectType,
        objectScale: objectScale.toFixed(2),
        itemId,
        existingItems: currentItems.length,
        isColliding,
        outlineColor: isColliding ? 'RED' : 'CYAN'
      });


      this.selectedObject.position.copy(newPosition);

      // Queue update instead of applying immediately
      this.queueUpdate(itemId, {
        position: [newPosition.x, newPosition.y, newPosition.z],
        rotation: snappedRotation // Include rotation in the update
      });

    } else if (this.isRotating) {
      // SMOOTH: Rotate camera with smooth interpolation
      const deltaX = event.clientX - this.mouseX;
      const deltaY = event.clientY - this.mouseY;

      const spherical = new THREE.Spherical();
      spherical.setFromVector3(this.camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi -= deltaY * 0.01;

      // Constrain phi to prevent camera from going below floor
      // phi = 0 is looking straight down from above
      // phi = Math.PI/2 is looking horizontally
      // We want to limit phi to keep camera above floor level
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

  private handleMouseUp (): void {
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // ENHANCED: Handle collision prevention and snap-back logic
    if (this.isDragging && this.selectedObject) {
      window.dispatchEvent(new CustomEvent('object-moved'));
      const objectType = this.selectedObject.userData.type as ComponentType;
      const objectScale = this.selectedObject.scale.x;
      const itemId = this.selectedObject.userData.itemId as number;
      const currentItems = this.getCurrentItems();

      const finalPosition = this.selectedObject.position;
      const isColliding = wouldCollideWithExisting(
        { x: finalPosition.x, y: finalPosition.y, z: finalPosition.z },
        objectType,
        objectScale,
        itemId,
        currentItems
      );

      // NEW: Check if collision prevention is enabled and object is colliding
      if (this.preventCollisionPlacementRef.value && isColliding) {
        // Snap back to original position
        this.selectedObject.position.copy(this.originalDragPosition);
        this.selectedObject.rotation.y = this.originalDragRotation;

        // Update the data model with the original position
        this.setItems((prevItems: BathroomItem[]) => {
          return prevItems.map(item =>
            item.id === itemId ? {
              ...item,
              position: [this.originalDragPosition.x, this.originalDragPosition.y, this.originalDragPosition.z],
              rotation: this.originalDragRotation
            } : item
          );
        });

        // Set outline to normal color since we're back to non-colliding position
        setOutlineColor(false);

        console.log('🔄 SNAP BACK: Object returned to original position due to collision prevention');
        console.log('📍 Original position restored:', {
          x: this.originalDragPosition.x.toFixed(3),
          z: this.originalDragPosition.z.toFixed(3),
          rotation: `${(this.originalDragRotation * 180 / Math.PI).toFixed(0)}°`
        });
      } else {
        // Normal behavior: set outline color based on final collision state
        setOutlineColor(isColliding);

        console.log('🎯 Final drag position collision check:', isColliding ? 'RED (collision)' : 'CYAN (safe)');

        if (isColliding && this.preventCollisionPlacementRef.value) {
          console.log('⚠️ Collision detected but placement allowed (prevention disabled)');
        }
      }
    }

    // Don't clear selection on mouse up - keep it selected for potential deletion
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;
    this.renderer.domElement.style.cursor = 'default';
  }

  private handleContextMenu (event: MouseEvent): void {
    event.preventDefault();
  }

  private handleWheel (event: WheelEvent): void {
    event.preventDefault();

    // Use zoom step size from constants
    const zoomFactor = event.deltaY > 0 ? CAMERA_CONTROLS.ZOOM_STEP_SIZE : (1 / CAMERA_CONTROLS.ZOOM_STEP_SIZE);
    const newTargetPosition = this.targetCameraPosition.clone().multiplyScalar(zoomFactor);

    // Calculate distance from center
    const distanceFromCenter = newTargetPosition.distanceTo(new THREE.Vector3(0, 0, 0));

    // Check constraints using constants
    const meetMinHeightConstraint = newTargetPosition.y >= CAMERA_SETTINGS.MIN_HEIGHT;
    const meetMaxDistanceConstraint = distanceFromCenter <= CAMERA_SETTINGS.MAX_DISTANCE;

    // Update target position if constraints are met
    if (meetMinHeightConstraint && meetMaxDistanceConstraint) {
      this.targetCameraPosition.copy(newTargetPosition);
    } else if (!meetMinHeightConstraint) {
      // Constrain to minimum height
      const direction = this.targetCameraPosition.clone().normalize();
      const minDistance = CAMERA_SETTINGS.MIN_HEIGHT / direction.y;
      this.targetCameraPosition.copy(direction.multiplyScalar(minDistance));
    }
  }

  private handleTouchStart (event: TouchEvent): void {
    event.preventDefault();
    const touches = event.touches;

    if (touches.length === 1) {
      const touch = touches[0];

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

      // Clear previous selection if touching empty space or different object
      if (this.selectedObject && (!intersected || intersected.object !== this.selectedObject)) {
        highlightObject(this.selectedObject, false);
        this.selectedObject = null;
      }

      if (intersected) {
        this.selectedObject = intersected.object;

        // Sync with measurement system
        if (this.measurementSystem) {
          this.measurementSystem.setSelectedObject(this.selectedObject);
        }

        this.isDragging = true;
        this.isDragOperation = true; // Mark as drag operation

        // NEW: Store original position for potential snap-back
        this.originalDragPosition.copy(this.selectedObject.position);
        this.originalDragRotation = this.selectedObject.rotation.y;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        this.dragOffset.subVectors(this.selectedObject.position, intersectPoint);

        // Check collision state immediately when object is selected
        const objectType = this.selectedObject.userData.type as ComponentType;
        const objectScale = this.selectedObject.scale.x;
        const itemId = this.selectedObject.userData.itemId as number;
        const currentItems = this.getCurrentItems();

        const currentPosition = this.selectedObject.position;
        const isColliding = wouldCollideWithExisting(
          { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
          objectType,
          objectScale,
          itemId,
          currentItems
        );

        // Highlight the object first
        highlightObject(this.selectedObject, true);

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

  private handleTouchMove (event: TouchEvent): void {
    event.preventDefault();
    const touches = event.touches;

    if (touches.length === 1) {
      const touch = touches[0];
      const touchPos = updateTouchPosition(touch, this.renderer.domElement.getBoundingClientRect());
      this.mouse.set(touchPos.x, touchPos.y);

      if (this.isDragging && this.selectedObject) {
        // NEW: Apply the same enhanced drag logic as mouse movement
        const objectType = this.selectedObject.userData.type as ComponentType;
        const objectScale = this.selectedObject.scale.x;
        const itemId = this.selectedObject.userData.itemId as number;
        const movementConfig = getMovementConfig(objectType);

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        let newPosition = intersectPoint.add(this.dragOffset);

        // Apply movement behavior based on configuration
        if (movementConfig.allowFreeMovement) {
          const constrainedPos = constrainToRoom(
            newPosition,
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            objectType,
            objectScale
          );
          newPosition = constrainedPos.position;
        } else if (movementConfig.snapToWall) {
          const { position: wallConstrainedPos, rotation: wallRotation } = constrainToWalls(
            newPosition,
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            objectType,
            objectScale
          );

          newPosition.x = wallConstrainedPos.x;
          newPosition.z = wallConstrainedPos.z;

          if (movementConfig.allowVerticalMovement) {
            const heightConstraints = getHeightConstraints(objectType);
            newPosition.y = Math.max(heightConstraints.min, Math.min(heightConstraints.max, newPosition.y));
          } else {
            newPosition.y = wallConstrainedPos.y;
          }

          const { position: snappedPos, rotation: snappedRotation } = snapToNearestWall(
            newPosition,
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            objectType,
            objectScale
          );

          newPosition.x = snappedPos.x;
          newPosition.z = snappedPos.z;

          if (!movementConfig.allowFreeRotation) {
            this.selectedObject.rotation.y = snappedRotation;
          }
        } else {
          const constrainedPos = constrainToRoom(
            newPosition,
            this.roomWidthRef.value,
            this.roomHeightRef.value,
            objectType,
            objectScale
          );
          newPosition = constrainedPos.position;
        }

        // NEW: Check for collisions and update outline color
        const currentItems = this.getCurrentItems();
        const isColliding = wouldCollideWithExisting(
          { x: newPosition.x, y: newPosition.y, z: newPosition.z },
          objectType,
          objectScale,
          itemId,
          currentItems
        );

        // Update outline color based on collision state
        setOutlineColor(isColliding);

        // DEBUG: Log constraint application
        console.log('🔗 Touch constraining object:', objectType,
          'to wall position:', {
            x: newPosition.x.toFixed(3),
            z: newPosition.z.toFixed(3),
            rotation: `${(snappedRotation * 180 / Math.PI).toFixed(0)}°`,
            collision: isColliding ? 'DETECTED' : 'NONE'
          });

        this.selectedObject.position.copy(newPosition);

        const updateData: UpdateData = {
          position: [newPosition.x, newPosition.y, newPosition.z]
        };

        if (shouldSnapToWall(objectType) && !movementConfig.allowFreeRotation) {
          updateData.rotation = this.selectedObject.rotation.y;
        }

        if (this.measurementSystem) {
          this.measurementSystem.forceUpdateMeasurements();
          // Emit event for real-time measurement updates
          window.dispatchEvent(new CustomEvent('object-moved'));
        }

        this.queueUpdate(itemId, updateData);
      } else if (this.isRotating) {
        // BACK TO ORIGINAL TOUCH ROTATION - with tiny smoothing
        const deltaX = touch.clientX - this.mouseX;
        const deltaY = touch.clientY - this.mouseY;

        // Add tiny smoothing to touch movement
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

        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
      }
    } else if (touches.length === 2) {
      const distance = getTouchDistance(touches[0], touches[1]);
      const scale = distance / this.lastTouchDistance;

      if (scale > 1.02) {
        this.camera.position.multiplyScalar(0.98); // Reduced zoom speed
        this.lastTouchDistance = distance;
      } else if (scale < 0.98) {
        this.camera.position.multiplyScalar(1.02); // Reduced zoom speed
        this.lastTouchDistance = distance;
      }
    }
  }

  private handleTouchEnd (event: TouchEvent): void {
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

      const finalPosition = this.selectedObject.position;
      const isColliding = wouldCollideWithExisting(
        { x: finalPosition.x, y: finalPosition.y, z: finalPosition.z },
        objectType,
        objectScale,
        itemId,
        currentItems
      );

      console.log('🎯 Touch final position collision check:', {
        position: { x: finalPosition.x.toFixed(1), z: finalPosition.z.toFixed(1) },
        isColliding,
        preventionEnabled: this.preventCollisionPlacementRef.value,
        willSnapBack: this.preventCollisionPlacementRef.value && isColliding
      });

      // Check if collision prevention is enabled and object is colliding
      if (this.preventCollisionPlacementRef.value && isColliding) {
        console.log('🔄 TOUCH SNAP BACK: Collision detected, returning to original position');
        // Snap back to original position
        this.selectedObject.position.copy(this.originalDragPosition);
        this.selectedObject.rotation.y = this.originalDragRotation;

        // Update the data model with the original position
        this.setItems((prevItems: BathroomItem[]) => {
          return prevItems.map(item =>
            item.id === itemId ? {
              ...item,
              position: [this.originalDragPosition.x, this.originalDragPosition.y, this.originalDragPosition.z],
              rotation: this.originalDragRotation
            } : item
          );
        });

        // Set outline to normal color since we're back to non-colliding position
        setOutlineColor(false);
        console.log('✅ Touch snap back completed - outline set to CYAN');
      } else {
        // Normal behavior: set outline color based on final collision state
        setOutlineColor(isColliding);

        console.log('🎯 Final touch position collision check:', isColliding ? 'RED (collision)' : 'CYAN (safe)');
      }
    }

    // Don't clear selection on touch end - keep it selected for potential deletion
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;
  }

  private handleResize (): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // 🔧 FIX: Add visibility change handler to stop dragging when tab loses focus
  private handleVisibilityChange (): void {
    if (document.hidden) {
      // Tab is hidden, stop all drag operations
      this.stopAllDragOperations();
    }
  }

  // 🔧 FIX: Helper method to stop all drag operations
  private stopAllDragOperations (): void {
    // Apply any pending updates before stopping
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // Clear all drag states
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;

    // Reset cursor
    this.renderer.domElement.style.cursor = 'default';

    // Log for debugging
    console.log('🛑 All drag operations stopped');
  }

  public addEventListeners (): void {
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

  public removeEventListeners (): void {
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

  // Utility methods for external access
  public getSelectedObject (): THREE.Object3D | null {
    return this.selectedObject;
  }

  public clearSelection (): void {
    if (this.selectedObject) {
      highlightObject(this.selectedObject, false);
      setOutlineColor(false);
      this.selectedObject = null;
    }
    // Clear measurement system selection
    if (this.measurementSystem) {
      this.measurementSystem.setSelectedObject(null);
    }
  }

  public isDragOperationActive (): boolean {
    return this.isDragOperation;
  }

  public getPendingUpdatesCount (): number {
    return this.pendingUpdates.size;
  }

  // NEW: Utility method to check collision prevention status
  public isCollisionPreventionEnabled (): boolean {
    return this.preventCollisionPlacementRef.value;
  }
}
