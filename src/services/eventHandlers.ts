// src/services/eventHandlers.ts
import * as THREE from 'three';
import type { Ref } from 'vue';
import { updateMousePosition, updateTouchPosition, getTouchDistance, highlightObject } from '../utils/helpers';
import { constrainToRoom, snapToWall } from '../utils/constraints';
import { SCALE_LIMITS, HEIGHT_LIMITS } from '../constants/dimensions';
import type { ComponentType } from '../constants/components';
import type { BathroomItem } from '../utils/constraints';

// Type definitions
interface MousePosition {
  x: number;
  y: number;
}

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
type DeleteItemFunction = (itemId: number) => void;

export class EventHandlers {
  // Core Three.js objects
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private roomWidthRef: Ref<number>;
  private roomHeightRef: Ref<number>;
  private setItems: SetItemsFunction;
  private deleteItem: DeleteItemFunction;

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
  private mouseDownX: number;
  private mouseDownY: number;

  // Touch variables
  private touchStartX: number;
  private touchStartY: number;
  private touchStart: Touch | null;
  private lastTouchDistance: number;
  private lastTouchTime: number;
  private isTouchDevice: boolean;

  // Drag operation tracking
  private isDragOperation: boolean;
  private pendingUpdates: Map<number, UpdateData>;

  // Note: Event handlers are defined as methods below and bound in constructor

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    roomWidthRef: Ref<number>,
    roomHeightRef: Ref<number>,
    setItems: SetItemsFunction,
    deleteItem: DeleteItemFunction
  ) {
    // Assign core objects
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.roomWidthRef = roomWidthRef;
    this.roomHeightRef = roomHeightRef;
    this.setItems = setItems;
    this.deleteItem = deleteItem;

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
    this.mouseDownX = 0;
    this.mouseDownY = 0;

    // Initialize touch variables
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStart = null;
    this.lastTouchDistance = 0;
    this.lastTouchTime = 0;
    this.isTouchDevice = 'ontouchstart' in window;

    // Initialize drag operation tracking
    this.isDragOperation = false;
    this.pendingUpdates = new Map<number, UpdateData>();

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
  }

  private getIntersectedObject(mouse: MousePosition): IntersectionResult | null {
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
  }

  // Method to queue updates during drag operations
  private queueUpdate(itemId: number, updateData: UpdateData): void {
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
  private handleKeyDown(event: KeyboardEvent): void {
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

  private handleMouseDown(event: MouseEvent): void {
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;

    this.mouse = updateMousePosition(event, this.renderer.domElement.getBoundingClientRect());
    const intersected = this.getIntersectedObject(this.mouse);

    // Clear previous selection if clicking on empty space or different object
    if (this.selectedObject && (!intersected || intersected.object !== this.selectedObject)) {
      highlightObject(this.selectedObject, false);
      this.selectedObject = null;
    }

    if (intersected) {
      this.selectedObject = intersected.object;

      console.log('selectedObject >>>', this.selectedObject);

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
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        this.dragOffset.subVectors(this.selectedObject.position, intersectPoint);
        this.renderer.domElement.style.cursor = 'grabbing';
      }

      highlightObject(this.selectedObject, true);
    } else {
      if (event.button === 0) { // Left click for camera rotation
        this.isRotating = true;
        this.renderer.domElement.style.cursor = 'grabbing';
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouse = updateMousePosition(event, this.renderer.domElement.getBoundingClientRect());

    if (this.isScaling && this.selectedObject) {
      // Scale object
      const deltaY = (this.mouseStartY - event.clientY) * 0.01;
      const newScale = Math.max(SCALE_LIMITS.MIN, Math.min(SCALE_LIMITS.MAX, this.scaleStart + deltaY));

      this.selectedObject.scale.set(newScale, newScale, newScale);

      const itemId = this.selectedObject.userData.itemId as number;
      // Queue update instead of applying immediately
      this.queueUpdate(itemId, { scale: newScale });

    } else if (this.isHeightAdjusting && this.selectedObject) {
      // Adjust object height
      const deltaY = (this.mouseStartY - event.clientY) * 0.01;
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
      // Drag object
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

      const newPosition = intersectPoint.add(this.dragOffset);

      // Get object type and scale for enhanced constraints
      const objectType = this.selectedObject.userData.type as ComponentType;
      const objectScale = this.selectedObject.scale.x;

      // DEBUG: Log room size refs
      console.log('🔍 DRAG - Room size refs:', {
        width: this.roomWidthRef.value,
        height: this.roomHeightRef.value,
        selectedObject: objectType,
        objectScale
      });

      // DEBUG: Log position before constraints
      console.log('🔍 DRAG - Position before constraints:', {
        x: newPosition.x,
        z: newPosition.z
      });

      // Constrain to room bounds using refs
      const constrainedPos = constrainToRoom(newPosition, this.roomWidthRef.value, this.roomHeightRef.value, objectType, objectScale);

      // DEBUG: Log constraint results
      console.log('🔍 DRAG - Constraint results:', {
        original: { x: newPosition.x, z: newPosition.z },
        constrained: { x: constrainedPos.x, z: constrainedPos.z }
      });

      newPosition.x = constrainedPos.x;
      newPosition.z = constrainedPos.z;

      // Apply wall snapping
      const snappedPos = snapToWall(newPosition, this.roomWidthRef.value, this.roomHeightRef.value, objectType, objectScale);

      newPosition.x = snappedPos.x;
      newPosition.z = snappedPos.z;

      // DEBUG: Log final position
      console.log('🔍 DRAG - Final position:', {
        x: newPosition.x,
        z: newPosition.z
      });

      this.selectedObject.position.copy(newPosition);

      const itemId = this.selectedObject.userData.itemId as number;
      // Queue update instead of applying immediately
      this.queueUpdate(itemId, {
        position: [newPosition.x, newPosition.y, newPosition.z]
      });

    } else if (this.isRotating) {
      // Rotate camera
      const deltaX = event.clientX - this.mouseX;
      const deltaY = event.clientY - this.mouseY;

      const spherical = new THREE.Spherical();
      spherical.setFromVector3(this.camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      this.camera.position.setFromSpherical(spherical);
      this.camera.lookAt(0, 0, 0);

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

  private handleMouseUp(event: MouseEvent): void {
    // Apply any pending updates before clearing drag state
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // Don't clear selection on mouse up - keep it selected for potential deletion
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;
    this.renderer.domElement.style.cursor = 'default';
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private handleWheel(event: WheelEvent): void {
    const scale = event.deltaY > 0 ? 1.1 : 0.9;
    this.camera.position.multiplyScalar(scale);
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touches = event.touches;

    if (touches.length === 1) {
      const touch = touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStart = touch;

      this.mouse = updateTouchPosition(touch, this.renderer.domElement.getBoundingClientRect());
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
        this.isDragging = true;
        this.isDragOperation = true; // Mark as drag operation

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
        this.dragOffset.subVectors(this.selectedObject.position, intersectPoint);

        highlightObject(this.selectedObject, true);
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
      this.mouse = updateTouchPosition(touch, this.renderer.domElement.getBoundingClientRect());

      if (this.isDragging && this.selectedObject) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

        const newPosition = intersectPoint.add(this.dragOffset);

        // Get object type and scale for enhanced constraints
        const objectType = this.selectedObject.userData.type as ComponentType;
        const objectScale = this.selectedObject.scale.x;

        // Constrain to room bounds using refs
        const constrainedPos = constrainToRoom(newPosition, this.roomWidthRef.value, this.roomHeightRef.value, objectType, objectScale);
        newPosition.x = constrainedPos.x;
        newPosition.z = constrainedPos.z;

        // DEBUG: Log constraint application
        console.log('🔍 Constraining object:', objectType,
          'from:', intersectPoint.add(this.dragOffset),
          'to:', constrainedPos);

        const snappedPos = snapToWall(newPosition, this.roomWidthRef.value, this.roomHeightRef.value, objectType, objectScale);
        newPosition.x = snappedPos.x;
        newPosition.z = snappedPos.z;

        this.selectedObject.position.copy(newPosition);

        const itemId = this.selectedObject.userData.itemId as number;
        // Queue update instead of applying immediately
        this.queueUpdate(itemId, {
          position: [newPosition.x, newPosition.y, newPosition.z]
        });
      } else if (this.isRotating) {
        const deltaX = touch.clientX - this.mouseX;
        const deltaY = touch.clientY - this.mouseY;

        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi += deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        this.camera.position.setFromSpherical(spherical);
        this.camera.lookAt(0, 0, 0);

        this.mouseX = touch.clientX;
        this.mouseY = touch.clientY;
      }
    } else if (touches.length === 2) {
      const distance = getTouchDistance(touches[0], touches[1]);
      const scale = distance / this.lastTouchDistance;

      if (scale > 1.02) {
        this.camera.position.multiplyScalar(0.95);
        this.lastTouchDistance = distance;
      } else if (scale < 0.98) {
        this.camera.position.multiplyScalar(1.05);
        this.lastTouchDistance = distance;
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    const touches = event.touches;

    // Apply any pending updates before clearing drag state
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // Don't clear selection on touch end - keep it selected for potential deletion
    this.isDragging = false;
    this.isRotating = false;
    this.isObjectRotating = false;
    this.isHeightAdjusting = false;
    this.isScaling = false;

    if (touches.length === 0) {
      this.touchStart = null;
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public addEventListeners(): void {
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.addEventListener('wheel', this.handleWheel);

    // Add keyboard event listener for delete functionality
    document.addEventListener('keydown', this.handleKeyDown);

    if (this.isTouchDevice) {
      this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.renderer.domElement.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    window.addEventListener('resize', this.handleResize);
  }

  public removeEventListeners(): void {
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('mouseup', this.handleMouseUp);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel);

    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown);

    if (this.isTouchDevice) {
      this.renderer.domElement.removeEventListener('touchstart', this.handleTouchStart);
      this.renderer.domElement.removeEventListener('touchmove', this.handleTouchMove);
      this.renderer.domElement.removeEventListener('touchend', this.handleTouchEnd);
    }

    window.removeEventListener('resize', this.handleResize);
  }

  // Utility methods for external access
  public getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject;
  }

  public clearSelection(): void {
    if (this.selectedObject) {
      highlightObject(this.selectedObject, false);
      this.selectedObject = null;
    }
  }

  public isDragOperationActive(): boolean {
    return this.isDragOperation;
  }

  public getPendingUpdatesCount(): number {
    return this.pendingUpdates.size;
  }
}
