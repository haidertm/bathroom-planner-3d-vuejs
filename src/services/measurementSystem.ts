// src/services/measurementSystem.ts - FIXED to respect object height and floorOffset
import * as THREE from 'three';
import type { ComponentType } from '../constants/components';
import type { BathroomItem } from '../utils/constraints';
import { getDimensions, getInteriorBoundaries } from '../utils/constraints';
import { getMovementConfig } from '../utils/models';
import {WALL_SETTINGS} from "../constants/dimensions.ts";

export interface MeasurementData {
  objectWidth: number;
  objectDepth: number;
  objectHeight: number;
  floorOffset: number;
  spawnHeight: number;
  spaceLeft: number;
  spaceRight: number;
  spaceFront: number;
  spaceBack: number;
  spaceAbove: number;
  spaceBelow: number;
  isWallBound: boolean;
  wallDirection?: 'north' | 'south' | 'east' | 'west';
}

export interface MeasurementLabel {
  id: string;
  text: string;
  position: THREE.Vector3;
  direction: 'horizontal' | 'vertical';
  color: string;
  isObjectDimension: boolean;
}

export class MeasurementSystem {
  private scene: THREE.Scene;
  private enabled: boolean = false;
  private selectedObject: THREE.Object3D | null = null;
  private measurementLabels: THREE.Group;
  private measurementLines: THREE.Group;
  private currentMeasurements: MeasurementData | null = null;
  private roomWidth: number = 300;
  private roomHeight: number = 250;
  private existingItems: BathroomItem[] = [];

  constructor (scene: THREE.Scene, _camera: THREE.Camera, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;

    // Create groups for measurement visuals
    this.measurementLabels = new THREE.Group();
    this.measurementLabels.name = 'MeasurementLabels';
    this.measurementLines = new THREE.Group();
    this.measurementLines.name = 'MeasurementLines';

    this.scene.add(this.measurementLabels);
    this.scene.add(this.measurementLines);
  }

  public setEnabled (enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearMeasurements();
    } else if (this.selectedObject) {
      this.updateMeasurements();
    }
  }

  public isEnabled (): boolean {
    return this.enabled;
  }

  public setSelectedObject (object: THREE.Object3D | null): void {
    this.selectedObject = object;

    // If we have a selected object, immediately trigger update
    if (this.enabled && this.selectedObject) {
      this.updateMeasurements();
    } else if (!this.selectedObject) {
      // Clear measurements when no object is selected
      this.clearMeasurements();
    }
  }

  public updateRoomDimensions (width: number, height: number): void {
    this.roomWidth = width;
    this.roomHeight = height;
    if (this.enabled && this.selectedObject) {
      this.updateMeasurements();
    }
  }

  public updateExistingItems (items: BathroomItem[]): void {
    this.existingItems = items;
    if (this.enabled && this.selectedObject) {
      this.updateMeasurements();
    }
  }

  private updateMeasurements (): void {
    this.clearMeasurements();

    if (!this.selectedObject || !this.enabled) return;

    const measurements = this.calculateMeasurements();
    if (!measurements) return;

    this.currentMeasurements = measurements;
    this.createMeasurementVisuals(measurements);
  }

  private calculateMeasurements (): MeasurementData | null {
    if (!this.selectedObject) return null;

    const objectType = this.selectedObject.userData.type as ComponentType;
    const objectScale = this.selectedObject.scale.x;
    const objectPosition = this.selectedObject.position;
    const itemId = this.selectedObject.userData.itemId;

    // Get the current item data to access SKU and model information
    const currentItem = this.existingItems.find(item => item.id === itemId);

    // 🆘 FALLBACK: If not found in existingItems, check if data is in userData
    let itemForDimensions = currentItem;
    if (!currentItem && this.selectedObject.userData.sku) {
      itemForDimensions = {
        id: itemId,
        type: objectType,
        position: [objectPosition.x, objectPosition.y, objectPosition.z],
        sku: this.selectedObject.userData.sku,
        model: this.selectedObject.userData.model || undefined,
        scale: objectScale
      } as BathroomItem;
    }

    // 🚀 UPDATED: Use enhanced dimension lookup that prioritizes product data
    const dimensions = getDimensions(
      objectType,
      itemForDimensions?.sku,        // Pass SKU for product-specific dimensions
      itemForDimensions?.model       // Pass model data for most accurate dimensions
    );

    if (!dimensions || (dimensions.width === 0 && dimensions.height === 0 && dimensions.depth === 0)) {
      return null;
    }

    // Apply scale to the product-specific dimensions
    const scaledWidth = dimensions.width * objectScale;
    const scaledDepth = dimensions.depth * objectScale;
    const scaledHeight = dimensions.height * objectScale;
    const scaledFloorOffset = dimensions.floorOffset * objectScale; // ✅ CRITICAL: Scale the floor offset too
    const scaledSpawnHeight = dimensions.spawnHeight * objectScale; // ✅ CRITICAL: Scale the floor offset too

    // Check if object is wall-bound
    const isWallBound = this.isObjectWallBound(objectPosition, scaledWidth, scaledDepth);
    const wallDirection = this.getWallDirection(objectPosition, scaledWidth, scaledDepth);

    // Calculate available space
    const spaceCalculations = this.calculateAvailableSpace(
      objectPosition,
      scaledWidth,
      scaledHeight,
      this.selectedObject.userData.itemId
    );

    return {
      objectWidth: scaledWidth,
      objectDepth: scaledDepth,
      objectHeight: scaledHeight,
      floorOffset: scaledFloorOffset, // ✅ NEW: Include floorOffset in measurement data
      spawnHeight: scaledSpawnHeight, // ✅ NEW: Include spawnHeight in measurement data
      ...spaceCalculations,
      isWallBound,
      wallDirection
    };
  }

  private isObjectWallBound (position: THREE.Vector3, _width: number, _depth: number): boolean {
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;
    const tolerance = 25; // 25cm tolerance for better wall detection

    // Check if object is near any wall
    const nearNorth = Math.abs(position.z + roomHalfHeight) < tolerance;
    const nearSouth = Math.abs(position.z - roomHalfHeight) < tolerance;
    const nearEast = Math.abs(position.x - roomHalfWidth) < tolerance;
    const nearWest = Math.abs(position.x + roomHalfWidth) < tolerance;

    return nearNorth || nearSouth || nearEast || nearWest;
  }

  private getWallDirection (position: THREE.Vector3, _width: number, _depth: number): 'north' | 'south' | 'east' | 'west' | undefined {
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;
    const tolerance = 20;

    if (Math.abs(position.z + roomHalfHeight) < tolerance) return 'north';
    if (Math.abs(position.z - roomHalfHeight) < tolerance) return 'south';
    if (Math.abs(position.x - roomHalfWidth) < tolerance) return 'east';
    if (Math.abs(position.x + roomHalfWidth) < tolerance) return 'west';

    return undefined;
  }

  private calculateAvailableSpace (
      position: THREE.Vector3,
      width: number,
      height: number,
      excludeItemId: number
  ): Omit<MeasurementData, 'objectWidth' | 'objectDepth' | 'objectHeight' | 'floorOffset' | 'isWallBound' | 'wallDirection' | 'spawnHeight'> {
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;
    const wallThickness = WALL_SETTINGS.THICKNESS + 1; // Use wall width from WALL_SETTINGS

    // Calculate space to room boundaries
    const spaceToWestWall = (position.x + roomHalfWidth) - width / 2 - wallThickness;
    const spaceToEastWall = (roomHalfWidth - position.x) - width / 2 - wallThickness;
    const spaceToNorthWall = (position.z + roomHalfHeight) - width / 2 - wallThickness;
    const spaceToSouthWall = (roomHalfHeight - position.z) - width / 2 - wallThickness;

    // Calculate space to other objects
    const spaceToObjects = this.calculateSpaceToOtherObjects(
        position, width, height, excludeItemId
    );

    return {
      spaceLeft: Math.max(0, Math.min(spaceToWestWall, spaceToObjects.left)),
      spaceRight: Math.max(0, Math.min(spaceToEastWall, spaceToObjects.right)),
      spaceFront: Math.max(0, Math.min(spaceToNorthWall, spaceToObjects.front)),
      spaceBack: Math.max(0, Math.min(spaceToSouthWall, spaceToObjects.back)),
      spaceAbove: 250 - height, // Assume 250cm ceiling height
      spaceBelow: position.y
    };
  }

  private calculateSpaceToOtherObjects (
    position: THREE.Vector3,
    width: number,
    height: number, // ✅ Now we use the height parameter
    excludeItemId: number
  ): { left: number; right: number; front: number; back: number } {
    let minLeft = Infinity;
    let minRight = Infinity;
    let minFront = Infinity;
    let minBack = Infinity;

    // ✅ NEW: Get current object's height data for comparison
    const currentItem = this.existingItems.find(item => item.id === this.selectedObject?.userData.itemId);
    const currentDimensions = currentItem ? getDimensions(currentItem.type, currentItem.sku, currentItem.model) : null;
    const currentScale = currentItem?.scale || 1.0;
    const currentFloorOffset = currentDimensions ? currentDimensions.floorOffset * currentScale : 0;

    // Calculate current object's actual vertical range
    const currentBottomY = position.y + currentFloorOffset;
    const currentTopY = currentBottomY + height;
    console.log('>>> who is here', currentBottomY, currentTopY)

    this.existingItems.forEach(item => {
      if (item.id === excludeItemId) return;

      // ✅ ENHANCED: Use enhanced dimension lookup for other objects too
      const itemDimensions = getDimensions(item.type, item.sku, item.model);

      if (!itemDimensions) {
        console.warn(`⚠️ No dimensions found for item ${item.id} of type ${item.type}`);
        return;
      }

      const itemScale = item.scale || 1.0;
      const itemWidth = itemDimensions.width * itemScale;
      // const itemDepth = itemDimensions.depth * itemScale;
      const itemHeight = itemDimensions.height * itemScale;
      const itemFloorOffset = itemDimensions.floorOffset * itemScale;

      const itemPos = new THREE.Vector3(item.position[0], item.position[1], item.position[2]);

      // ✅ NEW: Calculate other object's actual vertical range
      const itemBottomY = itemPos.y + itemFloorOffset;
      const itemTopY = itemBottomY + itemHeight;

      // ✅ KEY FIX: Only measure distance if objects have height overlap
      const verticalOverlapBuffer = 5; // 20cm buffer
      const hasVerticalOverlap = !(currentTopY + verticalOverlapBuffer < itemBottomY ||
        itemTopY + verticalOverlapBuffer < currentBottomY);
      if (!hasVerticalOverlap) {
        // Objects are at different heights - skip this object
        console.log(`⏭️ Skipping ${item.type} - different height level (${Math.abs(currentBottomY - itemBottomY).toFixed(1)}cm apart)`);
        return; // ✅ This is the key fix - return early for objects at different heights
      }

      // Rest of the method remains exactly the same
      const leftDistance = Math.abs(position.x - width / 2 - (itemPos.x + itemWidth / 2));
      const rightDistance = Math.abs(position.x + width / 2 - (itemPos.x - itemWidth / 2));
      const frontDistance = Math.abs(position.z - width / 2 - (itemPos.z + itemWidth / 2));
      const backDistance = Math.abs(position.z + width / 2 - (itemPos.z - itemWidth / 2));

      // Update minimum distances (considering object alignment)
      if (this.objectsAlignedOnAxis(position, itemPos, 'x')) {
        if (itemPos.x < position.x) minLeft = Math.min(minLeft, leftDistance);
        if (itemPos.x > position.x) minRight = Math.min(minRight, rightDistance);
      }

      if (this.objectsAlignedOnAxis(position, itemPos, 'z')) {
        if (itemPos.z < position.z) minFront = Math.min(minFront, frontDistance);
        if (itemPos.z > position.z) minBack = Math.min(minBack, backDistance);
      }
    });

    return {
      left: minLeft === Infinity ? 1000 : minLeft,
      right: minRight === Infinity ? 1000 : minRight,
      front: minFront === Infinity ? 1000 : minFront,
      back: minBack === Infinity ? 1000 : minBack
    };
  }

  private objectsAlignedOnAxis (pos1: THREE.Vector3, pos2: THREE.Vector3, axis: 'x' | 'z'): boolean {
    const tolerance = 20; // 2cm tolerance
    if (axis === 'x') {
      return Math.abs(pos1.z - pos2.z) < tolerance;
    } else {
      return Math.abs(pos1.x - pos2.x) < tolerance;
    }
  }

  private createMeasurementVisuals(measurements: MeasurementData): void {
    if (!this.selectedObject) return;

    const position = this.selectedObject.position;
    const labels: MeasurementLabel[] = [];

    // Calculate object bottom and top Y positions
    const objectBottomY = this.getObjectBottomY(measurements, position);
    const objectTopY = this.getObjectTopY(measurements, position);

    const CEILING_HEIGHT = WALL_SETTINGS.HEIGHT; // Wall height from WALL_SETTINGS.HEIGHT
    const spaceAboveObject = this.calculateSpaceAboveObject(measurements, position, objectTopY, CEILING_HEIGHT);
    const spaceBelowObject = this.calculateSpaceBelowObject(measurements, position, objectBottomY);

    // ✅ Get movement config to check allowFreeRotation
    const itemId = this.selectedObject.userData.itemId;
    const currentItem = this.existingItems.find(item => item.id === itemId);
    const movementConfig = getMovementConfig(currentItem?.type || 'Furniture', currentItem);
    const MOUNT_THRESHOLD_PERCENT = 30;
    // ✅ Calculate if object POSITION is more than 30% up the wall height
    // Use objectBottomY (where the object starts) to check mounting height
    const objectMountingHeight = objectBottomY; // This is where the object is positioned
    const mountingHeightPercentage = (objectMountingHeight / CEILING_HEIGHT) * 100;
    const hasObjectAbove = spaceAboveObject < (CEILING_HEIGHT - objectTopY);
    const isObjectHighlyMounted = mountingHeightPercentage > MOUNT_THRESHOLD_PERCENT;

    // Add bottom space for all objects
    if (spaceBelowObject > 0) {
      labels.push({
        id: 'item-bottom-y',
        text: `${Math.round(Math.max(0, spaceBelowObject))} cm`,
        position: new THREE.Vector3(position.x, objectBottomY - spaceBelowObject/2, position.z),
        direction: 'vertical',
        color: '#007BFF',
        isObjectDimension: false
      });
    }

    // ✅ CONDITIONAL: Show top space line when:
    // 1. allowFreeRotation is FALSE AND
    // 2. Object is mounted MORE than 30% up the wall height

    const shouldShowTopSpace = spaceAboveObject > 0 &&
        !movementConfig.allowFreeRotation &&
        (isObjectHighlyMounted || hasObjectAbove);

    if (shouldShowTopSpace) {
      labels.push({
        id: 'item-top-y',
        text: `${Math.round(Math.max(0, spaceAboveObject))} cm`,
        position: new THREE.Vector3(position.x, objectTopY + spaceAboveObject/2, position.z),
        direction: 'vertical',
        color: '#007BFF',
        isObjectDimension: false
      });

      console.log(`✅ Showing top space line: Object mounted at ${mountingHeightPercentage.toFixed(1)}% of wall height`);
    } else if (!movementConfig.allowFreeRotation && !isObjectHighlyMounted) {
      console.log(`🚫 Hiding top space line: Object mounted at only ${mountingHeightPercentage.toFixed(1)}% of wall height < ${MOUNT_THRESHOLD_PERCENT}%)`);
    }

    // Existing logic for wall-bound or free-standing measurements
    if (measurements.isWallBound) {
      this.createWallBoundMeasurements(measurements, position, labels);
    } else {
      this.createFreeStandingMeasurements(measurements, position, labels);
    }

    // Create visual elements for each label
    labels.forEach(label => {
      this.createMeasurementLabel(label);
      this.createMeasurementLine(label, measurements);
    });
  }


  // ✅ NEW METHOD: Calculate space below object (to nearest object below OR floor)
  private calculateSpaceBelowObject(measurements: MeasurementData, position: THREE.Vector3, objectBottomY: number): number {
    if (!this.selectedObject) return objectBottomY; // Fallback to floor distance

    const excludeItemId = this.selectedObject.userData.itemId;
    let nearestObjectBelowTopY = 0; // Start from floor level (Y=0)

    // Get current object's horizontal bounds for overlap detection
    const objectWidth = measurements.objectWidth;
    const objectDepth = measurements.objectDepth;

    this.existingItems.forEach(item => {
      if (item.id === excludeItemId) return; // Skip current object

      // Get other object's dimensions and position
      const itemDimensions = getDimensions(item.type, item.sku, item.model);
      if (!itemDimensions) return;

      const itemScale = item.scale || 1.0;
      const itemWidth = itemDimensions.width * itemScale;
      const itemDepth = itemDimensions.depth * itemScale;
      const itemHeight = itemDimensions.height * itemScale;
      const itemFloorOffset = itemDimensions.floorOffset * itemScale;

      const itemPos = new THREE.Vector3(item.position[0], item.position[1], item.position[2]);
      const itemBottomY = itemPos.y + itemFloorOffset;
      const itemTopY = itemBottomY + itemHeight;

      // Check if other object is BELOW current object
      if (itemTopY >= objectBottomY - 10) return; // Not below (with 10cm buffer)

      // Check horizontal overlap (XZ plane)
      const horizontalBuffer = 10; // 10cm buffer

      // Current object bounds
      const currentMinX = position.x - objectWidth / 2;
      const currentMaxX = position.x + objectWidth / 2;
      const currentMinZ = position.z - objectDepth / 2;
      const currentMaxZ = position.z + objectDepth / 2;

      // Other object bounds
      const itemMinX = itemPos.x - itemWidth / 2;
      const itemMaxX = itemPos.x + itemWidth / 2;
      const itemMinZ = itemPos.z - itemDepth / 2;
      const itemMaxZ = itemPos.z + itemDepth / 2;

      // Check for horizontal overlap
      const overlapX = !(currentMaxX + horizontalBuffer < itemMinX || itemMaxX + horizontalBuffer < currentMinX);
      const overlapZ = !(currentMaxZ + horizontalBuffer < itemMinZ || itemMaxZ + horizontalBuffer < currentMinZ);

      if (overlapX && overlapZ) {
        // Objects overlap horizontally and other object is below
        nearestObjectBelowTopY = Math.max(nearestObjectBelowTopY, itemTopY);
        console.log(`📏 Found object below: ${item.type} at top Y=${itemTopY.toFixed(1)}cm`);
      }
    });

    // Calculate space: from current object bottom to top of nearest object below (or floor)
    const spaceBelow = objectBottomY - nearestObjectBelowTopY;

    console.log(`📏 Space below calculation:`, {
      objectBottomY: objectBottomY.toFixed(1),
      nearestObjectBelowTopY: nearestObjectBelowTopY.toFixed(1),
      spaceBelow: spaceBelow.toFixed(1),
      hasObjectBelow: nearestObjectBelowTopY > 0
    });

    return Math.max(0, spaceBelow);
  }

// ✅ NEW METHOD: Calculate space above object (to nearest object above OR ceiling)
  private calculateSpaceAboveObject(measurements: MeasurementData, position: THREE.Vector3, objectTopY: number, ceilingHeight: number): number {
    if (!this.selectedObject) return ceilingHeight - objectTopY; // Fallback to ceiling distance

    const excludeItemId = this.selectedObject.userData.itemId;
    let nearestObjectAboveBottomY = ceilingHeight; // Start from ceiling level

    // Get current object's horizontal bounds for overlap detection
    const objectWidth = measurements.objectWidth;
    const objectDepth = measurements.objectDepth;

    this.existingItems.forEach(item => {
      if (item.id === excludeItemId) return; // Skip current object

      // Get other object's dimensions and position
      const itemDimensions = getDimensions(item.type, item.sku, item.model);
      if (!itemDimensions) return;

      const itemScale = item.scale || 1.0;
      const itemWidth = itemDimensions.width * itemScale;
      const itemDepth = itemDimensions.depth * itemScale;
      // const itemHeight = itemDimensions.height * itemScale;
      const itemFloorOffset = itemDimensions.floorOffset * itemScale;

      const itemPos = new THREE.Vector3(item.position[0], item.position[1], item.position[2]);
      const itemBottomY = itemPos.y + itemFloorOffset;
      // const itemTopY = itemBottomY + itemHeight;

      // Check if other object is ABOVE current object
      if (itemBottomY <= objectTopY + 10) return; // Not above (with 10cm buffer)

      // Check horizontal overlap (XZ plane)
      const horizontalBuffer = 10; // 10cm buffer

      // Current object bounds
      const currentMinX = position.x - objectWidth / 2;
      const currentMaxX = position.x + objectWidth / 2;
      const currentMinZ = position.z - objectDepth / 2;
      const currentMaxZ = position.z + objectDepth / 2;

      // Other object bounds
      const itemMinX = itemPos.x - itemWidth / 2;
      const itemMaxX = itemPos.x + itemWidth / 2;
      const itemMinZ = itemPos.z - itemDepth / 2;
      const itemMaxZ = itemPos.z + itemDepth / 2;

      // Check for horizontal overlap
      const overlapX = !(currentMaxX + horizontalBuffer < itemMinX || itemMaxX + horizontalBuffer < currentMinX);
      const overlapZ = !(currentMaxZ + horizontalBuffer < itemMinZ || itemMaxZ + horizontalBuffer < currentMinZ);

      if (overlapX && overlapZ) {
        // Objects overlap horizontally and other object is above
        nearestObjectAboveBottomY = Math.min(nearestObjectAboveBottomY, itemBottomY);
        console.log(`📏 Found object above: ${item.type} at bottom Y=${itemBottomY.toFixed(1)}cm`);
      }
    });

    // Calculate space: from current object top to bottom of nearest object above (or ceiling)
    const spaceAbove = nearestObjectAboveBottomY - objectTopY;

    console.log(`📏 Space above calculation:`, {
      objectTopY: objectTopY.toFixed(1),
      nearestObjectAboveBottomY: nearestObjectAboveBottomY.toFixed(1),
      spaceAbove: spaceAbove.toFixed(1),
      hasObjectAbove: nearestObjectAboveBottomY < ceilingHeight
    });

    return Math.max(0, spaceAbove);
  }

  // ✅ CRITICAL FIX: Calculate object's center height (middle of the actual 3D object)
  private getObjectCenterY (measurements: MeasurementData, position: THREE.Vector3): number {
    // Object bottom = scene position + floorOffset
    const objectBottom = position.y + measurements.floorOffset;
    // Object top = object bottom + object height
    const objectTop = objectBottom + measurements.objectHeight;
    // Object center = middle point between bottom and top
    return (objectBottom + objectTop) / 2;
  }

  // ✅ Calculate object's actual bottom position
  private getObjectBottomY (measurements: MeasurementData, position: THREE.Vector3): number {
    // Bottom = object's scene position + floorOffset (where the object actually starts)
    return position.y + measurements.floorOffset;
  }

  // ✅ Calculate object's actual top position
  private getObjectTopY (measurements: MeasurementData, position: THREE.Vector3): number {
    // Top = object's scene position + floorOffset + object height
    return position.y + measurements.floorOffset + measurements.objectHeight;
  }

// REPLACE your entire createWallBoundMeasurements method with this version
// This completely eliminates room-extension measurements for wall-mounted objects

  private createWallBoundMeasurements (
    measurements: MeasurementData,
    position: THREE.Vector3,
    labels: MeasurementLabel[]
  ): void {
    const { objectWidth, objectDepth, spaceLeft, spaceRight, spaceFront, spaceBack, wallDirection } = measurements;

    // Calculate object center height for lines and label positions
    const objectTopY = this.getObjectTopY(measurements, position);

    // Position labels ABOVE the object
    // const labelHeightOffset = 40; // 40cm above top of object
    const spaceHeightOffset = 20; // 20cm above top of object for space labels

    console.log(`📏 RESTRICTIVE wall-mounted measurements for ${wallDirection} wall:`, {
      wallDirection,
      position: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
      availableSpaces: {
        left: spaceLeft.toFixed(1),
        right: spaceRight.toFixed(1),
        front: spaceFront.toFixed(1),
        back: spaceBack.toFixed(1)
      },
      labelsToCreate: 'ONLY parallel-to-wall measurements'
    });

    // ✅ RESTRICTIVE APPROACH: Wall-mounted objects show ONLY parallel-to-wall measurements
    if (wallDirection === 'north' || wallDirection === 'south') {
      // Object against north/south wall - show ONLY width and left/right clearances
      // ❌ NO front/back measurements (no room extension lines)

      labels.push({
        id: 'object-width',
        text: `${objectWidth} cm`,
        position: new THREE.Vector3(position.x, this.getObjectCenterY(measurements, position), position.z),
        direction: 'horizontal',
        color: '#ff6b35',
        isObjectDimension: true
      });

      // Only show side clearances if significant
      if (spaceLeft > 10) {
        labels.push({
          id: 'space-left',
          text: `${Math.round(spaceLeft)} cm`,
          position: new THREE.Vector3(
            position.x - objectWidth / 2 - spaceLeft / 2,
            objectTopY + spaceHeightOffset,
            position.z
          ),
          direction: 'horizontal',
          color: '#4CAF50',
          isObjectDimension: false
        });
      }

      if (spaceRight > 10) {
        labels.push({
          id: 'space-right',
          text: `${Math.round(spaceRight)} cm`,
          position: new THREE.Vector3(
            position.x + objectWidth / 2 + spaceRight / 2,
            objectTopY + spaceHeightOffset,
            position.z
          ),
          direction: 'horizontal',
          color: '#4CAF50',
          isObjectDimension: false
        });
      }

      console.log(`✅ North/South wall object: Created ${labels.length} labels (width + left/right only)`);

    } else if (wallDirection === 'east' || wallDirection === 'west') {
      // Object against east/west wall - show ONLY depth and front/back clearances
      // ❌ NO left/right measurements (no room extension lines)

      labels.push({
        id: 'object-width',
        text: `${objectWidth} cm`,
        position: new THREE.Vector3(position.x, this.getObjectCenterY(measurements, position), position.z),
        direction: 'vertical',
        color: '#ff6b35',
        isObjectDimension: true
      });

      // Only show parallel-to-wall clearances
      if (spaceFront > 10) {
        labels.push({
          id: 'space-front',
          text: `${Math.round(spaceFront)} cm`,
          position: new THREE.Vector3(
            position.x,
            objectTopY + spaceHeightOffset,
            position.z - objectDepth / 2 - spaceFront / 2
          ),
          direction: 'vertical',
          color: '#4CAF50',
          isObjectDimension: false
        });
      }

      if (spaceBack > 10) {
        labels.push({
          id: 'space-back',
          text: `${Math.round(spaceBack)} cm`,
          position: new THREE.Vector3(
            position.x,
            objectTopY + spaceHeightOffset,
            position.z + objectDepth / 2 + spaceBack / 2
          ),
          direction: 'vertical',
          color: '#4CAF50',
          isObjectDimension: false
        });
      }

      console.log(`✅ East/West wall object: Created ${labels.length} labels (depth + front/back only)`);
    }

    console.log(`🎯 FINAL: Created ${labels.length} total labels for wall-mounted object`);
  }

  private createFreeStandingMeasurements (
    measurements: MeasurementData,
    position: THREE.Vector3,
    labels: MeasurementLabel[]
  ): void {
    const { objectWidth, objectDepth, spaceLeft, spaceRight, spaceFront, spaceBack } = measurements;

    // ✅ CRITICAL: Calculate object center height for lines and label positions
    const objectCenterY = this.getObjectCenterY(measurements, position);
    const objectTopY = this.getObjectTopY(measurements, position);
    const objectBottomY = this.getObjectBottomY(measurements, position);

    // ✅ Position labels ABOVE the object, but lines at object center
    const labelHeightOffset = 50; // 50cm above top of object for main labels
    const spaceHeightOffset = 30; // 30cm above top of object for space labels

    console.log(`📏 Free-standing measurements:`, {
      scenePositionY: position.y.toFixed(1) + 'cm',
      floorOffset: measurements.floorOffset.toFixed(1) + 'cm',
      objectHeight: measurements.objectHeight.toFixed(1) + 'cm',
      objectBottomY: objectBottomY.toFixed(1) + 'cm',
      objectCenterY: objectCenterY.toFixed(1) + 'cm',
      objectTopY: objectTopY.toFixed(1) + 'cm',
      labelHeight: (objectTopY + labelHeightOffset).toFixed(1) + 'cm'
    });

    // Show space in all four directions
    if (spaceLeft > 10) {
      labels.push({
        id: 'space-left',
        text: `${Math.round(spaceLeft)} cm`,
        position: new THREE.Vector3(
          position.x - objectWidth / 2 - spaceLeft / 2,
          objectTopY + spaceHeightOffset,
          position.z
        ),
        direction: 'horizontal',
        color: '#4CAF50',
        isObjectDimension: false
      });
    }

    if (spaceRight > 10) {
      labels.push({
        id: 'space-right',
        text: `${Math.round(spaceRight)} cm`,
        position: new THREE.Vector3(
          position.x + objectWidth / 2 + spaceRight / 2,
          objectTopY + spaceHeightOffset,
          position.z
        ),
        direction: 'horizontal',
        color: '#4CAF50',
        isObjectDimension: false
      });
    }

    if (spaceFront > 10) {
      labels.push({
        id: 'space-front',
        text: `${Math.round(spaceFront)} cm`,
        position: new THREE.Vector3(
          position.x,
          objectTopY + spaceHeightOffset,
          position.z - objectDepth / 2 - spaceFront / 2
        ),
        direction: 'horizontal',
        color: '#4CAF50',
        isObjectDimension: false
      });
    }

    if (spaceBack > 5) {
      labels.push({
        id: 'space-back',
        text: `${Math.round(spaceBack)} cm`,
        position: new THREE.Vector3(
          position.x,
          objectTopY + spaceHeightOffset,
          position.z + objectDepth / 2 + spaceBack / 2
        ),
        direction: 'horizontal',
        color: '#4CAF50',
        isObjectDimension: false
      });
    }

    // Show object dimensions
    labels.push({
      id: 'object-width',
      text: `${objectWidth} cm`,
      position: new THREE.Vector3(position.x, this.getObjectCenterY(measurements, position), position.z),
      direction: 'horizontal',
      color: '#ff6b35',
      isObjectDimension: true
    });
  }

  public forceUpdateMeasurements (): void {
    if (this.enabled && this.selectedObject) {
      this.updateMeasurements();
    }
  }

  private createMeasurementLabel (label: MeasurementLabel): void {
    // Create text sprite for the measurement label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const fontSize = 14;  // Much smaller (was 24)
    const padding = 4;    // Less padding (was 8)
    const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    context.font = `600 ${fontSize}px ${fontFamily}`;
    const textWidth = context.measureText(label.text).width;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    // Clear and redraw with IKEA-style background
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle rounded rectangle background
    context.fillStyle = 'rgba(0, 0, 0, 0.9)';
    if (context.roundRect) {
      context.roundRect(0, 0, canvas.width, canvas.height, 2);
    } else {
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.fill();

    // Clean white text
    context.fillStyle = 'white';
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label.text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      depthTest: false,    // ✅ CRITICAL: Labels always visible
      depthWrite: false,   // ✅ Don't interfere with depth buffer,
      sizeAttenuation: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(label.position);
    sprite.renderOrder = 1000; // Ensure labels render on top

    // Much smaller scale - IKEA style
    const scale = 0.8;  // Much smaller (was 2)
    const scaleX = canvas.width * scale;
    const scaleY = canvas.height * scale;
    sprite.scale.set(scaleX, scaleY, 1);

    sprite.userData = { labelId: label.id };
    this.measurementLabels.add(sprite);
  }

  private shouldSkipWallFacingLine (labelId: string, wallDirection: 'north' | 'south' | 'east' | 'west'): boolean {
    // ✅ RESTRICTIVE: For wall-mounted objects, only allow measurements parallel to the wall
    const restrictedLines = {
      'north': ['space-front', 'space-back'],    // Only allow left/right for north wall objects
      'south': ['space-front', 'space-back'],    // Only allow left/right for south wall objects
      'east': ['space-left', 'space-right'],     // Only allow front/back for east wall objects
      'west': ['space-left', 'space-right']      // Only allow front/back for west wall objects
    };

    const shouldSkip = restrictedLines[wallDirection]?.includes(labelId) || false;

    if (shouldSkip) {
      console.log(`🚫 Skipping room-extension line: ${labelId} for ${wallDirection} wall object`);
    }

    return shouldSkip;
  }

  private createMeasurementLine (label: MeasurementLabel, measurements: MeasurementData): void {
    if (!this.selectedObject) return;

    // ✅ SAFEGUARD: For wall-bound objects, don't create lines going into walls
    if (measurements.isWallBound && measurements.wallDirection) {
      const shouldSkipLine = this.shouldSkipWallFacingLine(label.id, measurements.wallDirection);
      if (shouldSkipLine) {
        console.log(`🚫 Skipping wall-facing line: ${label.id} for ${measurements.wallDirection} wall`);
        return; // Don't create this line
      }
    }

    const position = this.selectedObject.position;
    const points: THREE.Vector3[] = [];

    // ✅ CRITICAL: Lines positioned at the CENTER of the object (middle height)
    const objectCenterY = this.getObjectCenterY(measurements, position);

    console.log(`📐 Line positioning for ${label.id}:`, {
      objectCenterY: objectCenterY.toFixed(1) + 'cm',
      labelType: label.isObjectDimension ? 'OBJECT DIMENSION' : 'SPACE'
    });
      // Lines showing available space AT CENTER HEIGHT - these extend FROM object TO walls/obstacles
      if (label.id === 'space-left') {
        const startX = position.x - measurements.objectWidth / 2;
        const endX = startX - measurements.spaceLeft;

        // ✅ Apply wall offset for consistent positioning
        let lineZ = position.z;
        if (measurements.isWallBound && measurements.wallDirection) {
          const { wallFaces } = getInteriorBoundaries(this.roomWidth, this.roomHeight);
          const offset = 5; // 5cm away from wall face

          switch (measurements.wallDirection) {
            case 'north': lineZ = wallFaces.north + offset; break; // Move south from north wall
            case 'south': lineZ = wallFaces.south - offset; break; // Move north from south wall
            case 'east': lineZ = position.z; break; // Keep original Z for east/west walls
            case 'west': lineZ = position.z; break; // Keep original Z for east/west walls
          }
        }

        points.push(new THREE.Vector3(startX, objectCenterY, lineZ));
        points.push(new THREE.Vector3(endX, objectCenterY, lineZ));
        this.createEndMarker(new THREE.Vector3(startX, objectCenterY, lineZ), 'vertical');
        this.createEndMarker(new THREE.Vector3(endX, objectCenterY, lineZ), 'vertical');

      } else if (label.id === 'space-right') {
        const startX = position.x + measurements.objectWidth / 2;
        const endX = startX + measurements.spaceRight;

        // ✅ Apply wall offset for consistent positioning
        let lineZ = position.z;
        if (measurements.isWallBound && measurements.wallDirection) {
          const { wallFaces } = getInteriorBoundaries(this.roomWidth, this.roomHeight);
          const offset = 5;

          switch (measurements.wallDirection) {
            case 'north': lineZ = wallFaces.north + offset; break;
            case 'south': lineZ = wallFaces.south - offset; break;
            case 'east': lineZ = position.z; break;
            case 'west': lineZ = position.z; break;
          }
        }

        points.push(new THREE.Vector3(startX, objectCenterY, lineZ));
        points.push(new THREE.Vector3(endX, objectCenterY, lineZ));
        this.createEndMarker(new THREE.Vector3(startX, objectCenterY, lineZ), 'vertical');
        this.createEndMarker(new THREE.Vector3(endX, objectCenterY, lineZ), 'vertical');

      } else if (label.id === 'space-front') {
        const startZ = position.z - measurements.objectWidth / 2;
        const endZ = startZ - measurements.spaceFront;

        // ✅ Apply wall offset for consistent positioning
        let lineX = position.x;
        if (measurements.isWallBound && measurements.wallDirection) {
          const { wallFaces } = getInteriorBoundaries(this.roomWidth, this.roomHeight);
          const offset = 5;

          switch (measurements.wallDirection) {
            case 'north': lineX = position.x; break; // Keep original X for north/south walls
            case 'south': lineX = position.x; break; // Keep original X for north/south walls
            case 'east': lineX = wallFaces.east - offset; break; // Move west from east wall
            case 'west': lineX = wallFaces.west + offset; break; // Move east from west wall
          }
        }

        points.push(new THREE.Vector3(lineX, objectCenterY, startZ));
        points.push(new THREE.Vector3(lineX, objectCenterY, endZ));
        this.createEndMarker(new THREE.Vector3(lineX, objectCenterY, startZ), 'vertical');
        this.createEndMarker(new THREE.Vector3(lineX, objectCenterY, endZ), 'vertical');

      } else if (label.id === 'space-back') {
        const startZ = position.z + measurements.objectWidth / 2;
        const endZ = startZ + measurements.spaceBack;

        // ✅ Apply wall offset for consistent positioning
        let lineX = position.x;
        if (measurements.isWallBound && measurements.wallDirection) {
          const { wallFaces } = getInteriorBoundaries(this.roomWidth, this.roomHeight);
          const offset = 5;

          switch (measurements.wallDirection) {
            case 'north': lineX = position.x; break;
            case 'south': lineX = position.x; break;
            case 'east': lineX = wallFaces.east - offset; break;
            case 'west': lineX = wallFaces.west + offset; break;
          }
        }

        points.push(new THREE.Vector3(lineX, objectCenterY, startZ));
        points.push(new THREE.Vector3(lineX, objectCenterY, endZ));
        this.createEndMarker(new THREE.Vector3(lineX, objectCenterY, startZ), 'vertical');
        this.createEndMarker(new THREE.Vector3(lineX, objectCenterY, endZ), 'vertical');
      }
    else if (label.id === 'item-bottom-y') {
      // Vertical line from object bottom to floor/object below
      const objectBottomY = this.getObjectBottomY(measurements, position);
      const spaceBelowObject = this.calculateSpaceBelowObject(measurements, position, objectBottomY);
      const endY = objectBottomY - spaceBelowObject;

      let lineX = position.x;
      let lineZ = position.z;

      if (measurements.isWallBound && measurements.wallDirection) {
        const { wallFaces } = getInteriorBoundaries(this.roomWidth, this.roomHeight);
        const offset = 5; // 20cm away from wall face (into the room)

        switch (measurements.wallDirection) {
          case 'north':
            lineX = position.x;
            lineZ = wallFaces.north + offset; // Move SOUTH (away from north wall)
            break;
          case 'south':
            lineX = position.x;
            lineZ = wallFaces.south - offset; // Move NORTH (away from south wall)
            break;
          case 'east':
            lineX = wallFaces.east - offset; // Move WEST (away from east wall)
            lineZ = position.z;
            break;
          case 'west':
            lineX = wallFaces.west + offset; // Move EAST (away from west wall)
            lineZ = position.z;
            break;
        }
      } else {
        lineX = position.x + measurements.objectWidth / 4;
        lineZ = position.z;
      }

      points.push(new THREE.Vector3(lineX, objectBottomY, lineZ));
      points.push(new THREE.Vector3(lineX, endY, lineZ));
        this.createEndMarker(
            new THREE.Vector3(lineX, objectBottomY, lineZ),
            'horizontal',
            measurements.wallDirection
        );
        this.createEndMarker(
            new THREE.Vector3(lineX, endY, lineZ),
            'horizontal',
            measurements.wallDirection
        );

    } else if (label.id === 'item-top-y') {
      const objectTopY = this.getObjectTopY(measurements, position);
      const spaceAboveObject = this.calculateSpaceAboveObject(measurements, position, objectTopY, WALL_SETTINGS.HEIGHT);
      const endY = objectTopY + spaceAboveObject;

      let lineX = position.x;
      let lineZ = position.z;

      if (measurements.isWallBound && measurements.wallDirection) {
        const { wallFaces } = getInteriorBoundaries(this.roomWidth, this.roomHeight);
        const offset = 5; // 20cm away from wall face (into the room)

        switch (measurements.wallDirection) {
          case 'north':
            lineX = position.x;
            lineZ = wallFaces.north + offset; // Move SOUTH (away from north wall)
            break;
          case 'south':
            lineX = position.x;
            lineZ = wallFaces.south - offset; // Move NORTH (away from south wall)
            break;
          case 'east':
            lineX = wallFaces.east - offset; // Move WEST (away from east wall)
            lineZ = position.z;
            break;
          case 'west':
            lineX = wallFaces.west + offset; // Move EAST (away from west wall)
            lineZ = position.z;
            break;
        }
      } else {
        lineX = position.x - measurements.objectWidth / 4;
        lineZ = position.z;
      }

      points.push(new THREE.Vector3(lineX, objectTopY, lineZ));
      points.push(new THREE.Vector3(lineX, endY, lineZ));
        this.createEndMarker(
            new THREE.Vector3(lineX, objectTopY, lineZ),
            'horizontal',
            measurements.wallDirection
        );
        this.createEndMarker(
            new THREE.Vector3(lineX, endY, lineZ),
            'horizontal',
            measurements.wallDirection
        );
    }

    if (points.length === 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      // IKEA-style line material - thin and professional
      const material = new THREE.LineBasicMaterial({
        color: '#000000',
        linewidth: 2,
        transparent: false,
        opacity: 1
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { lineId: label.id };
      this.measurementLines.add(line);
    }
  };
  // NEW: Create end markers (small perpendicular lines at measurement ends)
  private createEndMarker(
      position: THREE.Vector3,
      direction: 'horizontal' | 'vertical',
      wallDirection?: 'north' | 'south' | 'east' | 'west'
  ): void {
    const markerSize = 8; // Small marker size
    const points: THREE.Vector3[] = [];

      const FLOOR_Y = 0;      // Floor is at Y = 0
      const EPS = 0.5;        // Small cushion to avoid z-fighting

      // Calculate safe Y position for marker
      const safeMarkerY = Math.max(position.y, FLOOR_Y + EPS);

    if (direction === 'vertical') {

        const markerBottom = Math.max(safeMarkerY - markerSize / 2, FLOOR_Y + EPS);
        const markerTop = markerBottom + markerSize;
      // Vertical end marker (extends vertically)
        points.push(new THREE.Vector3(position.x, markerBottom, position.z));
        points.push(new THREE.Vector3(position.x, markerTop, position.z));
    } else {
      // Horizontal end marker - orientation depends on wall direction
      if (wallDirection === 'north' || wallDirection === 'south') {
        // For north/south walls, extend in X-axis (left/right) for front visibility
          points.push(new THREE.Vector3(position.x - markerSize / 2, safeMarkerY, position.z));
          points.push(new THREE.Vector3(position.x + markerSize / 2, safeMarkerY, position.z));
      } else {
        // For east/west walls (or no wall), extend in Z-axis (front/back) for side visibility
          points.push(new THREE.Vector3(position.x, safeMarkerY, position.z - markerSize / 2));
          points.push(new THREE.Vector3(position.x, safeMarkerY, position.z + markerSize / 2));
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: '#000000',
      linewidth: 2,
      transparent: true,
      opacity: 1.0
    });

      const marker = new THREE.Line(geometry, material);
      marker.userData = {
          type: 'endMarker',
          direction,
          wallDirection,
          originalY: position.y,
          adjustedY: safeMarkerY
      };

      this.measurementLines.add(marker);
  }

  private clearMeasurements (): void {
    this.measurementLabels.clear();
    this.measurementLines.clear();
    this.currentMeasurements = null;
  }

  public getCurrentMeasurements (): MeasurementData | null {
    return this.currentMeasurements;
  }

  public dispose (): void {
    this.clearMeasurements();
    this.scene.remove(this.measurementLabels);
    this.scene.remove(this.measurementLines);
  }
}
