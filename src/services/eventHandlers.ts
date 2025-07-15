// src/services/eventHandlers.ts
import * as THREE from 'three';
import type { Ref } from 'vue';
import { updateMousePosition, updateTouchPosition, getTouchDistance, highlightObject, setOutlineColor } from '../utils/helpers';
import { constrainToWalls, snapToNearestWall, wouldCollideWithExisting, type BathroomItem } from '../utils/constraints';
import { SCALE_LIMITS, HEIGHT_LIMITS } from '../constants/dimensions';
import type { ComponentType } from '../constants/components';

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

  // Camera constraints - ADD THESE NEW PROPERTIES
  private readonly MIN_CAMERA_HEIGHT = 0.5; // Minimum height above floor
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

  // Touch variables
  private lastTouchDistance: number;
  private lastTouchTime: number;
  private isTouchDevice: boolean;

  // Drag operation tracking
  private isDragOperation: boolean;
  private pendingUpdates: Map<number, UpdateData>;

  // Note: Event handlers are defined as methods below and bound in constructor

  constructor (
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    roomWidthRef: Ref<number>,
    roomHeightRef: Ref<number>,
    setItems: SetItemsFunction,
    getItems: GetItemsFunction,
    deleteItem: DeleteItemFunction
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

    // Initialize touch variables
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

  // Method to get current items for collision detection
  private getCurrentItems(): BathroomItem[] {
    return this.getItems();
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
    }
  }

  private handleMouseMove (event: MouseEvent): void {
    const mousePos = updateMousePosition(event, this.renderer.domElement.getBoundingClientRect());
    this.mouse.set(mousePos.x, mousePos.y);

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
      // UPDATED: Drag object with wall constraints
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

      // UPDATED: Always constrain to walls instead of free room movement
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

      // DEBUG: Log final position
      console.log('🔗 DRAG - Final wall-snapped position:', {
        x: newPosition.x.toFixed(3),
        z: newPosition.z.toFixed(3),
        rotation: `${(snappedRotation * 180 / Math.PI).toFixed(0)}°`,
        collision: isColliding ? 'DETECTED' : 'NONE'
      });

      this.selectedObject.position.copy(newPosition);

      // Queue update instead of applying immediately
      this.queueUpdate(itemId, {
        position: [newPosition.x, newPosition.y, newPosition.z],
        rotation: snappedRotation // Include rotation in the update
      });

    } else if (this.isRotating) {
      // UPDATED: Rotate camera with floor constraint
      const deltaX = event.clientX - this.mouseX;
      const deltaY = event.clientY - this.mouseY;

      const spherical = new THREE.Spherical();
      spherical.setFromVector3(this.camera.position);
      spherical.theta -= deltaX * 0.01;
      spherical.phi += deltaY * 0.01;

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

  private handleMouseUp (): void {
    // Apply any pending updates before clearing drag state
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // Check final collision state when drag ends and set appropriate color
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

      // Set outline color based on final collision state
      setOutlineColor(isColliding);

      console.log('🎯 Final drag position collision check:', isColliding ? 'RED (collision)' : 'CYAN (safe)');
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
    // UPDATED: Constrain zoom to prevent going below floor
    const scale = event.deltaY > 0 ? 1.1 : 0.9;
    const newPosition = this.camera.position.clone().multiplyScalar(scale);

    // Check if the new position would put camera below minimum height
    if (newPosition.y >= this.MIN_CAMERA_HEIGHT) {
      this.camera.position.copy(newPosition);
    } else {
      // If zooming in would put camera below floor, limit the zoom
      // Calculate maximum scale that keeps camera above minimum height
      const maxScale = this.MIN_CAMERA_HEIGHT / this.camera.position.y;
      if (scale < maxScale) {
        this.camera.position.multiplyScalar(maxScale);
      }
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
        this.isDragging = true;
        this.isDragOperation = true; // Mark as drag operation

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
        // UPDATED: Touch drag with wall constraints
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

        const newPosition = intersectPoint.add(this.dragOffset);

        // Get object type and scale for enhanced constraints
        const objectType = this.selectedObject.userData.type as ComponentType;
        const objectScale = this.selectedObject.scale.x;
        const itemId = this.selectedObject.userData.itemId as number;

        // UPDATED: Always constrain to walls instead of free room movement
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

        newPosition.x = wallConstrainedPos.x;
        newPosition.z = wallConstrainedPos.z;

        // Additional snap to nearest wall
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

        // Queue update instead of applying immediately
        this.queueUpdate(itemId, {
          position: [newPosition.x, newPosition.y, newPosition.z],
          rotation: snappedRotation // Include rotation in the update
        });
      } else if (this.isRotating) {
        // UPDATED: Touch camera rotation with floor constraint
        const deltaX = touch.clientX - this.mouseX;
        const deltaY = touch.clientY - this.mouseY;

        const spherical = new THREE.Spherical();
        spherical.setFromVector3(this.camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi += deltaY * 0.01;

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

  private handleTouchEnd (event: TouchEvent): void {
    event.preventDefault();

    // Apply any pending updates before clearing drag state
    if (this.isDragOperation) {
      this.applyPendingUpdates();
      this.isDragOperation = false;
    }

    // Check final collision state when touch drag ends and set appropriate color
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

      // Set outline color based on final collision state
      setOutlineColor(isColliding);

      console.log('🎯 Final touch position collision check:', isColliding ? 'RED (collision)' : 'CYAN (safe)');
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

  public addEventListeners (): void {
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

  public removeEventListeners (): void {
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
  public getSelectedObject (): THREE.Object3D | null {
    return this.selectedObject;
  }

  public clearSelection (): void {
    if (this.selectedObject) {
      highlightObject(this.selectedObject, false);
      setOutlineColor(false); // Reset to normal color when clearing selection
      this.selectedObject = null;
    }
  }

  public isDragOperationActive (): boolean {
    return this.isDragOperation;
  }

  public getPendingUpdatesCount (): number {
    return this.pendingUpdates.size;
  }
}
