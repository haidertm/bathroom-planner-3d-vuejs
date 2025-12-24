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
  wallDirection?: 'north' | 'south' | 'east' | 'west' | 'notch-south' | 'notch-east';
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
  private notchWidth: number = 0;
  private notchHeight: number = 0;
  private existingItems: BathroomItem[] = [];

  // Wall dimension labels (for 2D Blueprint view)
  private wallDimensionLabels: THREE.Group;
  private wallDimensionLines: THREE.Group;
  private wallLabelsVisible: boolean = false;

  constructor (scene: THREE.Scene, _camera: THREE.Camera, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;

    // Create groups for measurement visuals
    this.measurementLabels = new THREE.Group();
    this.measurementLabels.name = 'MeasurementLabels';
    this.measurementLines = new THREE.Group();
    this.measurementLines.name = 'MeasurementLines';

    // Create groups for wall dimension labels (2D Blueprint view)
    this.wallDimensionLabels = new THREE.Group();
    this.wallDimensionLabels.name = 'WallDimensionLabels';
    this.wallDimensionLines = new THREE.Group();
    this.wallDimensionLines.name = 'WallDimensionLines';

    this.scene.add(this.measurementLabels);
    this.scene.add(this.measurementLines);
    this.scene.add(this.wallDimensionLabels);
    this.scene.add(this.wallDimensionLines);
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

  public updateRoomDimensions (width: number, height: number, notchWidth?: number, notchHeight?: number): void {
    this.roomWidth = width;
    this.roomHeight = height;
    this.notchWidth = notchWidth || 0;
    this.notchHeight = notchHeight || 0;
    if (this.enabled && this.selectedObject) {
      this.updateMeasurements();
    }
    // Update wall dimension labels if they're visible (2D mode)
    if (this.wallLabelsVisible) {
      this.createWallDimensionLabels();
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

    // ✅ Adjust space calculations for notch walls - limit by wall boundaries
    let adjustedSpaceCalculations = { ...spaceCalculations };

    if (wallDirection === 'notch-east') {
      // For notch-east wall objects, limit spaceBack to the end of the wall (notch.maxZ + wall thickness)
      const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);
      if (notch && objectPosition.z < notch.maxZ) {
        const wallThickness = WALL_SETTINGS.THICKNESS;
        // ✅ For east/west walls, objectWidth is the dimension parallel to wall (Z-direction)
        // ✅ Add wall thickness because wall extends outward from notch boundary
        const backEdge = objectPosition.z + scaledWidth / 2;
        const wallOuterEdge = notch.maxZ + wallThickness;
        const spaceToEndOfWall = Math.max(0, wallOuterEdge - backEdge);
        console.log(`📏 Calculating spaceBack for notch-east wall:`, {
          objectPosition: objectPosition.z.toFixed(1),
          scaledWidth: scaledWidth.toFixed(1),
          backEdge: backEdge.toFixed(1),
          notchMaxZ: notch.maxZ.toFixed(1),
          wallThickness: wallThickness.toFixed(1),
          wallOuterEdge: wallOuterEdge.toFixed(1),
          spaceToEndOfWall: spaceToEndOfWall.toFixed(1),
          originalSpaceBack: spaceCalculations.spaceBack.toFixed(1)
        });
        adjustedSpaceCalculations.spaceBack = Math.min(spaceCalculations.spaceBack, spaceToEndOfWall);
        console.log(`📏 Final spaceBack: ${adjustedSpaceCalculations.spaceBack.toFixed(1)}cm (line will end at ${(backEdge + adjustedSpaceCalculations.spaceBack).toFixed(1)})`);
      }
    } else if (wallDirection === 'notch-south') {
      // For notch-south wall objects, limit spaceRight to the end of the wall (notch.maxX + wall thickness)
      const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);
      if (notch && objectPosition.x < notch.maxX) {
        const wallThickness = WALL_SETTINGS.THICKNESS;
        // ✅ For north/south walls, objectWidth is the dimension parallel to wall (X-direction)
        // ✅ Add wall thickness because wall extends outward from notch boundary
        const rightEdge = objectPosition.x + scaledWidth / 2;
        const wallOuterEdge = notch.maxX + wallThickness;
        const spaceToEndOfWall = Math.max(0, wallOuterEdge - rightEdge);
        console.log(`📏 Calculating spaceRight for notch-south wall:`, {
          objectPosition: objectPosition.x.toFixed(1),
          scaledWidth: scaledWidth.toFixed(1),
          rightEdge: rightEdge.toFixed(1),
          notchMaxX: notch.maxX.toFixed(1),
          wallThickness: wallThickness.toFixed(1),
          wallOuterEdge: wallOuterEdge.toFixed(1),
          spaceToEndOfWall: spaceToEndOfWall.toFixed(1),
          originalSpaceRight: spaceCalculations.spaceRight.toFixed(1)
        });
        adjustedSpaceCalculations.spaceRight = Math.min(spaceCalculations.spaceRight, spaceToEndOfWall);
        console.log(`📏 Final spaceRight: ${adjustedSpaceCalculations.spaceRight.toFixed(1)}cm (line will end at ${(rightEdge + adjustedSpaceCalculations.spaceRight).toFixed(1)})`);
      }
    }

    return {
      objectWidth: scaledWidth,
      objectDepth: scaledDepth,
      objectHeight: scaledHeight,
      floorOffset: scaledFloorOffset, // ✅ NEW: Include floorOffset in measurement data
      spawnHeight: scaledSpawnHeight, // ✅ NEW: Include spawnHeight in measurement data
      ...adjustedSpaceCalculations,
      isWallBound,
      wallDirection
    };
  }

  private isObjectWallBound (position: THREE.Vector3, _width: number, _depth: number): boolean {
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;
    const tolerance = 30; // 30cm tolerance for better wall detection (increased to match getWallDirection)

    // Check if object is near any main room wall
    const nearNorth = Math.abs(position.z + roomHalfHeight) < tolerance;
    const nearSouth = Math.abs(position.z - roomHalfHeight) < tolerance;
    const nearEast = Math.abs(position.x - roomHalfWidth) < tolerance;
    const nearWest = Math.abs(position.x + roomHalfWidth) < tolerance;

    // ✅ Also check for notch walls in L-shaped rooms
    if (this.notchWidth > 0 && this.notchHeight > 0) {
      const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);

      if (notch) {
        // Check if near notch-south wall
        const nearNotchSouth = Math.abs(position.z - notch.maxZ) < tolerance &&
                               position.x >= notch.minX - tolerance &&
                               position.x <= notch.maxX + tolerance;

        // Check if near notch-east wall
        const nearNotchEast = Math.abs(position.x - notch.maxX) < tolerance &&
                              position.z >= notch.minZ - tolerance &&
                              position.z <= notch.maxZ + tolerance;

        if (nearNotchSouth || nearNotchEast) {
          console.log(`✅ Object is wall-bound to notch wall:`, {
            nearNotchSouth,
            nearNotchEast
          });
          return true;
        }
      }
    }

    return nearNorth || nearSouth || nearEast || nearWest;
  }

  private getWallDirection (position: THREE.Vector3, _width: number, _depth: number): 'north' | 'south' | 'east' | 'west' | 'notch-south' | 'notch-east' | undefined {
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;
    const tolerance = 30; // ✅ Increased tolerance from 20 to 30 for better detection

    console.log(`🔍 Detecting wall for object at position:`, {
      x: position.x.toFixed(1),
      z: position.z.toFixed(1),
      roomHalfWidth: roomHalfWidth.toFixed(1),
      roomHalfHeight: roomHalfHeight.toFixed(1),
      notchWidth: this.notchWidth,
      notchHeight: this.notchHeight
    });

    // ✅ Check for notch walls first (if L-shaped room)
    if (this.notchWidth > 0 && this.notchHeight > 0) {
      const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);

      if (notch) {
        console.log(`🔍 Notch boundaries:`, {
          minX: notch.minX.toFixed(1),
          maxX: notch.maxX.toFixed(1),
          minZ: notch.minZ.toFixed(1),
          maxZ: notch.maxZ.toFixed(1)
        });

        // Check distances to both notch walls
        const distToNotchSouth = Math.abs(position.z - notch.maxZ);
        const isInNotchXRange = position.x >= notch.minX - tolerance && position.x <= notch.maxX + tolerance;
        const isNearNotchSouth = distToNotchSouth < tolerance && isInNotchXRange;

        const distToNotchEast = Math.abs(position.x - notch.maxX);
        const isInNotchZRange = position.z >= notch.minZ - tolerance && position.z <= notch.maxZ + tolerance;
        const isNearNotchEast = distToNotchEast < tolerance && isInNotchZRange;

        console.log(`🔍 Checking notch walls:`, {
          notchSouth: { dist: distToNotchSouth.toFixed(1), inRange: isInNotchXRange, detected: isNearNotchSouth },
          notchEast: { dist: distToNotchEast.toFixed(1), inRange: isInNotchZRange, detected: isNearNotchEast }
        });

        // ✅ If near BOTH walls (at corner), choose the CLOSER one
        if (isNearNotchSouth && isNearNotchEast) {
          if (distToNotchEast < distToNotchSouth) {
            console.log(`✅ Object at CORNER - closer to NOTCH-EAST wall (${distToNotchEast.toFixed(1)}cm vs ${distToNotchSouth.toFixed(1)}cm)`);
            return 'notch-east';
          } else {
            console.log(`✅ Object at CORNER - closer to NOTCH-SOUTH wall (${distToNotchSouth.toFixed(1)}cm vs ${distToNotchEast.toFixed(1)}cm)`);
            return 'notch-south';
          }
        }

        // If near only one wall, use that
        if (isNearNotchSouth) {
          console.log(`✅ Object detected on NOTCH-SOUTH wall`);
          return 'notch-south';
        }

        if (isNearNotchEast) {
          console.log(`✅ Object detected on NOTCH-EAST wall`);
          return 'notch-east';
        }
      }
    }

    // Check main room walls
    const distToNorth = Math.abs(position.z + roomHalfHeight);
    const distToSouth = Math.abs(position.z - roomHalfHeight);
    const distToEast = Math.abs(position.x - roomHalfWidth);
    const distToWest = Math.abs(position.x + roomHalfWidth);

    console.log(`🔍 Distances to main walls:`, {
      north: distToNorth.toFixed(1),
      south: distToSouth.toFixed(1),
      east: distToEast.toFixed(1),
      west: distToWest.toFixed(1)
    });

    if (distToNorth < tolerance) {
      console.log(`✅ Object detected on NORTH wall`);
      return 'north';
    }
    if (distToSouth < tolerance) {
      console.log(`✅ Object detected on SOUTH wall`);
      return 'south';
    }
    if (distToEast < tolerance) {
      console.log(`✅ Object detected on EAST wall`);
      return 'east';
    }
    if (distToWest < tolerance) {
      console.log(`✅ Object detected on WEST wall`);
      return 'west';
    }

    console.log(`❌ Object not detected on any wall`);
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

    // Get interior boundaries including notch information
    const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);

    // Calculate space to main room boundaries
    let spaceToWestWall = (position.x + roomHalfWidth) - width / 2 - wallThickness;
    let spaceToEastWall = (roomHalfWidth - position.x) - width / 2 - wallThickness;
    let spaceToNorthWall = (position.z + roomHalfHeight) - width / 2 - wallThickness;
    let spaceToSouthWall = (roomHalfHeight - position.z) - width / 2 - wallThickness;

    // ✅ NEW: Consider notch walls as boundaries for L-shaped rooms
    if (notch) {
      // Check if object is near the notch-east wall (vertical wall at notch.maxX)
      // This wall blocks movement to the LEFT (west direction) for objects east of it
      // ✅ CRITICAL FIX: Only apply if object Z is within notch Z range (actually near the notch wall)
      if (position.x > notch.maxX && position.z >= notch.minZ && position.z <= notch.maxZ) {
        // notch.maxX is interior face - add wallThickness to get exterior face
        const spaceToNotchEastWall = position.x - width / 2 - notch.maxX - wallThickness;
        spaceToWestWall = Math.min(spaceToWestWall, spaceToNotchEastWall);
        console.log(`📏 Object near notch-east wall: spaceToNotchEastWall=${spaceToNotchEastWall.toFixed(1)}cm (interior face at ${notch.maxX.toFixed(1)}, exterior at ${(notch.maxX + wallThickness).toFixed(1)})`);
      }

      // Check if object is near the notch-south wall (horizontal wall at notch.maxZ)
      // This wall blocks movement to the FRONT (north direction) for objects south of it
      // ✅ CRITICAL FIX: Only apply if object X is within notch X range (actually near the notch wall)
      if (position.z > notch.maxZ && position.x >= notch.minX && position.x <= notch.maxX) {
        // notch.maxZ is interior face - add wallThickness to get exterior face
        const spaceToNotchSouthWall = position.z - width / 2 - notch.maxZ - wallThickness;
        spaceToNorthWall = Math.min(spaceToNorthWall, spaceToNotchSouthWall);
        console.log(`📏 Object near notch-south wall: spaceToNotchSouthWall=${spaceToNotchSouthWall.toFixed(1)}cm (interior face at ${notch.maxZ.toFixed(1)}, exterior at ${(notch.maxZ + wallThickness).toFixed(1)})`);
      }
    }

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
    console.log(`🎨 Creating visual elements for ${labels.length} labels:`, labels.map(l => ({ id: l.id, text: l.text })));

    labels.forEach(label => {
      console.log(`🎨 Processing label: ${label.id} - "${label.text}"`);
      this.createMeasurementLabel(label);
      this.createMeasurementLine(label, measurements);
    });

    console.log(`✅ Finished creating measurements for ${measurements.wallDirection || 'free-standing'} object`);
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

    } else if (wallDirection === 'notch-south') {
      // ✅ Object on notch-south wall - behave like north/south wall
      // Show width and left/right clearances, BUT NOT space-back (distance to main south wall)
      // space-right now shows distance to END of notch-south wall (notch.maxX), not main east wall
      console.log(`📍 Creating measurements for NOTCH-SOUTH wall object`);

      labels.push({
        id: 'object-width',
        text: `${objectWidth} cm`,
        position: new THREE.Vector3(position.x, this.getObjectCenterY(measurements, position), position.z),
        direction: 'horizontal',
        color: '#ff6b35',
        isObjectDimension: true
      });

      // Show side clearances if significant
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

      // ✅ Show space-right (now limited to end of notch-south wall)
      if (spaceRight > 5) { // Reduced threshold to 5cm since we're showing distance to wall end
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
        console.log(`✅ Showing space-right (distance to end of notch-south wall)`);
      }

      // ❌ SKIP space-back (distance to main south wall)
      // ❌ SKIP space-front as well (perpendicular to wall)
      console.log(`✅ Notch-south wall object: Created ${labels.length} labels`);
      console.log(`📋 Labels created:`, labels.map(l => l.id));

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

    } else if (wallDirection === 'notch-east') {
      // ✅ Object on notch-east wall - behave like east/west wall
      // Show depth and front/back clearances, BUT NOT space-right (distance to main east wall)
      // space-back now shows distance to END of notch-east wall (notch.maxZ), not main south wall
      console.log(`📍 Creating measurements for NOTCH-EAST wall object`);

      labels.push({
        id: 'object-width',
        text: `${objectWidth} cm`,
        position: new THREE.Vector3(position.x, this.getObjectCenterY(measurements, position), position.z),
        direction: 'vertical',
        color: '#ff6b35',
        isObjectDimension: true
      });

      // Show parallel-to-wall clearances
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

      // ✅ Show space-back (now limited to end of notch-east wall)
      if (spaceBack > 5) { // Reduced threshold to 5cm since we're showing distance to wall end
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
        console.log(`✅ Showing space-back (distance to end of notch-east wall)`);
      }

      // ❌ SKIP space-right (distance to main east wall)
      console.log(`✅ Notch-east wall object: Created ${labels.length} labels`);
      console.log(`📋 Labels created:`, labels.map(l => l.id));
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

  private shouldSkipWallFacingLine (labelId: string, wallDirection: 'north' | 'south' | 'east' | 'west' | 'notch-south' | 'notch-east'): boolean {
    // ✅ RESTRICTIVE: For wall-mounted objects, only allow measurements parallel to the wall
    const restrictedLines = {
      'north': ['space-front', 'space-back'],           // Only allow left/right for north wall objects
      'south': ['space-front', 'space-back'],           // Only allow left/right for south wall objects
      'notch-south': ['space-front', 'space-back'],     // ✅ Only allow left/right for notch-south wall objects
      'east': ['space-left', 'space-right'],            // Only allow front/back for east wall objects
      'west': ['space-left', 'space-right'],            // Only allow front/back for west wall objects
      'notch-east': ['space-left', 'space-right']       // ✅ Only allow front/back for notch-east wall objects
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
        let endX = startX - measurements.spaceLeft;

        // ✅ Check if object is in notch-affected area
        const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);
        let lineY = objectCenterY;

        let lineZ = position.z;
        let notchLineAdjusted = false;

        console.log(`📏 space-left DEBUG: notch=${notch ? 'EXISTS' : 'NULL'}, notchWidth=${this.notchWidth}, notchHeight=${this.notchHeight}`);
        if (notch) {
          console.log(`📏 space-left DEBUG: notch.maxX=${notch.maxX.toFixed(1)}, position.x=${position.x.toFixed(1)}, notch.maxZ=${notch.maxZ.toFixed(1)}, position.z=${position.z.toFixed(1)}`);

          // Check if line ends at notch-east wall (object is east of it)
          if (position.x > notch.maxX) {
            const distanceToNotchWall = Math.abs(endX - notch.maxX);
            console.log(`📏 space-left: Object east of notch-east wall! endX=${endX.toFixed(1)}, notch.maxX=${notch.maxX.toFixed(1)}, distance=${distanceToNotchWall.toFixed(1)}`);

            if (distanceToNotchWall < 20) {
              // Don't override endX - let the space calculation handle it
              lineY = objectCenterY + 5;
              lineZ = position.z + 20;
              notchLineAdjusted = true;
              console.log(`📏 ✅ APPLYING space-left adjustment for notch-east wall: lineZ offset by 20cm, endX=${endX.toFixed(1)}`);
            }
          }

          // ✅ NEW: Check if object is near notch-south wall - offset horizontal lines away from wall
          if (position.z > notch.maxZ && Math.abs(position.z - notch.maxZ) < 30) {
            lineZ = notch.maxZ + 10; // Move 20cm south of notch-south wall
            console.log(`📏 ✅ APPLYING space-left Z-offset for notch-south wall: lineZ=${lineZ.toFixed(1)} (20cm from wall at ${notch.maxZ.toFixed(1)})`);
          }
        }

        // ✅ Apply wall offset for consistent positioning (only if not already adjusted for notch)
        if (!notchLineAdjusted && measurements.isWallBound && measurements.wallDirection) {
          const { wallFaces } = getInteriorBoundaries(this.roomWidth, this.roomHeight);
          const offset = 5; // 5cm away from wall face

          switch (measurements.wallDirection) {
            case 'north': lineZ = wallFaces.north + offset; break; // Move south from north wall
            case 'south': lineZ = wallFaces.south - offset; break; // Move north from south wall
            case 'east': lineZ = position.z; break; // Keep original Z for east/west walls
            case 'west': lineZ = position.z; break; // Keep original Z for east/west walls
          }
        }

        points.push(new THREE.Vector3(startX, lineY, lineZ));
        points.push(new THREE.Vector3(endX, lineY, lineZ));
        this.createEndMarker(new THREE.Vector3(startX, lineY, lineZ), 'vertical');
        this.createEndMarker(new THREE.Vector3(endX, lineY, lineZ), 'vertical');

      } else if (label.id === 'space-right') {
        const startX = position.x + measurements.objectWidth / 2;
        const endX = startX + measurements.spaceRight;

        // ✅ Check if object is near notch-south wall
        const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);
        let lineZ = position.z;

        if (notch && position.z > notch.maxZ && Math.abs(position.z - notch.maxZ) < 30) {
          lineZ = notch.maxZ + 10; // Move 20cm south of notch-south wall
          console.log(`📏 ✅ APPLYING space-right Z-offset for notch-south wall: lineZ=${lineZ.toFixed(1)}`);
        } else if (measurements.isWallBound && measurements.wallDirection) {
          // Apply standard wall offset
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
        let endZ = startZ - measurements.spaceFront;

        // ✅ Check if object is in notch-affected area
        const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);
        let lineY = objectCenterY;
        let lineX = position.x;
        let notchLineAdjusted = false;

        console.log(`📏 space-front DEBUG: notch=${notch ? 'EXISTS' : 'NULL'}, notchWidth=${this.notchWidth}, notchHeight=${this.notchHeight}`);
        if (notch) {
          console.log(`📏 space-front DEBUG: notch.maxX=${notch.maxX.toFixed(1)}, position.x=${position.x.toFixed(1)}, notch.maxZ=${notch.maxZ.toFixed(1)}, position.z=${position.z.toFixed(1)}`);

          // Check if line ends at notch-south wall (object is south of it)
          if (position.z > notch.maxZ) {
            const distanceToNotchWall = Math.abs(endZ - notch.maxZ);
            console.log(`📏 space-front: Object south of notch-south wall! endZ=${endZ.toFixed(1)}, notch.maxZ=${notch.maxZ.toFixed(1)}, distance=${distanceToNotchWall.toFixed(1)}`);

            if (distanceToNotchWall < 20) {
              // Don't override endZ - let the space calculation handle it
              lineY = objectCenterY + 5;
              lineX = position.x + 20;
              notchLineAdjusted = true;
              console.log(`📏 ✅ APPLYING space-front adjustment for notch-south wall: lineX offset by 20cm, endZ=${endZ.toFixed(1)}`);
            }
          }

          // ✅ NEW: Check if object is near notch-east wall - offset vertical lines away from wall
          if (position.x > notch.maxX && Math.abs(position.x - notch.maxX) < 30) {
            lineX = notch.maxX + 10; // Move 20cm east of notch-east wall
            console.log(`📏 ✅ APPLYING space-front X-offset for notch-east wall: lineX=${lineX.toFixed(1)} (20cm from wall at ${notch.maxX.toFixed(1)})`);
          }
        }

        // ✅ Apply wall offset for consistent positioning (only if not already adjusted for notch)
        if (!notchLineAdjusted && measurements.isWallBound && measurements.wallDirection) {
          const { wallFaces } = getInteriorBoundaries(this.roomWidth, this.roomHeight);
          const offset = 5;

          switch (measurements.wallDirection) {
            case 'north': lineX = position.x; break;
            case 'south': lineX = position.x; break;
            case 'east': lineX = wallFaces.east - offset; break;
            case 'west': lineX = wallFaces.west + offset; break;
          }
        }

        points.push(new THREE.Vector3(lineX, lineY, startZ));
        points.push(new THREE.Vector3(lineX, lineY, endZ));
        this.createEndMarker(new THREE.Vector3(lineX, lineY, startZ), 'vertical');
        this.createEndMarker(new THREE.Vector3(lineX, lineY, endZ), 'vertical');

      } else if (label.id === 'space-back') {
        const startZ = position.z + measurements.objectWidth / 2;
        const endZ = startZ + measurements.spaceBack;

        // ✅ Check if object is near notch-east wall - offset vertical lines away from wall
        const { notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);
        let lineX = position.x;

        if (notch && position.x > notch.maxX && Math.abs(position.x - notch.maxX) < 30) {
          lineX = notch.maxX + 10; // Move 20cm east of notch-east wall
          console.log(`📏 ✅ APPLYING space-back X-offset for notch-east wall: lineX=${lineX.toFixed(1)}`);
        } else if (measurements.isWallBound && measurements.wallDirection) {
          // Apply standard wall offset
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
        const { wallFaces, notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);
        const offset = 5; // 5cm away from wall face (into the room)

        switch (measurements.wallDirection) {
          case 'north':
            lineX = position.x;
            lineZ = wallFaces.north + offset; // Move SOUTH (away from north wall)
            break;
          case 'south':
            lineX = position.x;
            lineZ = wallFaces.south - offset; // Move NORTH (away from south wall)
            break;
          case 'notch-south':
            // ✅ For notch-south wall, move away from wall (south) - same as horizontal lines
            lineX = position.x;
            lineZ = notch ? notch.maxZ + 10 : position.z;
            break;
          case 'east':
            lineX = wallFaces.east - offset; // Move WEST (away from east wall)
            lineZ = position.z;
            break;
          case 'west':
            lineX = wallFaces.west + offset; // Move EAST (away from west wall)
            lineZ = position.z;
            break;
          case 'notch-east':
            // ✅ For notch-east wall, move away from wall (east) - same as horizontal lines
            lineX = notch ? notch.maxX + 10 : position.x;
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
        const { wallFaces, notch } = getInteriorBoundaries(this.roomWidth, this.roomHeight, this.notchWidth, this.notchHeight);
        const offset = 5; // 5cm away from wall face (into the room)

        switch (measurements.wallDirection) {
          case 'north':
            lineX = position.x;
            lineZ = wallFaces.north + offset; // Move SOUTH (away from north wall)
            break;
          case 'south':
            lineX = position.x;
            lineZ = wallFaces.south - offset; // Move NORTH (away from south wall)
            break;
          case 'notch-south':
            // ✅ For notch-south wall, move away from wall (south) - same as horizontal lines
            lineX = position.x;
            lineZ = notch ? notch.maxZ + 10 : position.z;
            break;
          case 'east':
            lineX = wallFaces.east - offset; // Move WEST (away from east wall)
            lineZ = position.z;
            break;
          case 'west':
            lineX = wallFaces.west + offset; // Move EAST (away from west wall)
            lineZ = position.z;
            break;
          case 'notch-east':
            // ✅ For notch-east wall, move away from wall (east) - same as horizontal lines
            lineX = notch ? notch.maxX + 10 : position.x;
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
      line.renderOrder = 999; // Render in front of walls (labels use 1000)
      line.userData = { lineId: label.id };
      this.measurementLines.add(line);
    }
  };
  // NEW: Create end markers (small perpendicular lines at measurement ends)
  private createEndMarker(
      position: THREE.Vector3,
      direction: 'horizontal' | 'vertical',
      wallDirection?: 'north' | 'south' | 'east' | 'west' | 'notch-south' | 'notch-east'
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
      if (wallDirection === 'north' || wallDirection === 'south' || wallDirection === 'notch-south') {
        // For north/south/notch-south walls, extend in X-axis (left/right) for front visibility
          points.push(new THREE.Vector3(position.x - markerSize / 2, safeMarkerY, position.z));
          points.push(new THREE.Vector3(position.x + markerSize / 2, safeMarkerY, position.z));
      } else {
        // For east/west/notch-east walls (or no wall), extend in Z-axis (front/back) for side visibility
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
      marker.renderOrder = 999; // Render in front of walls (same as measurement lines)
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

  /**
   * Update the camera reference (for 2D/3D view switching)
   *
   * @param _camera - The active camera (perspective or orthographic)
   *
   * @remarks
   * **Intentionally a no-op placeholder.** This method is part of the public API
   * and is called by SceneManager.updatePostProcessingCamera() when switching
   * between 2D/3D views. It exists to support future camera-dependent features.
   *
   * @todo Potential future enhancements:
   * - Billboard labels that always face the camera
   * - Distance-based label scaling for consistent readability
   * - Camera frustum culling for off-screen measurement labels
   * - Different label styles for orthographic vs perspective views
   *
   * @see SceneManager.updatePostProcessingCamera - Caller of this method
   */
  public updateCamera(_camera: THREE.Camera): void {
    // Intentionally empty - placeholder for future camera-dependent functionality
  }

  // ============================================================================
  // WALL DIMENSION LABELS (for 2D Blueprint View)
  // ============================================================================

  /**
   * Set wall dimension labels visibility (for 2D/3D mode switching)
   */
  public setWallLabelsVisible(visible: boolean): void {
    this.wallLabelsVisible = visible;
    this.wallDimensionLabels.visible = visible;
    this.wallDimensionLines.visible = visible;

    if (visible) {
      this.createWallDimensionLabels();
    }
  }

  /**
   * Dispose all resources (textures, materials, geometries) in wall dimension groups
   * Must be called before clearing the groups to prevent GPU memory leaks
   */
  private disposeWallDimensionResources(): void {
    // Dispose label sprites (textures and materials)
    this.wallDimensionLabels.children.forEach((child) => {
      if (child instanceof THREE.Sprite) {
        const material = child.material as THREE.SpriteMaterial;
        if (material.map) {
          material.map.dispose();
        }
        material.dispose();
      }
    });

    // Dispose line geometries and materials
    this.wallDimensionLines.children.forEach((child) => {
      if (child instanceof THREE.Line) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  /**
   * Create wall dimension labels positioned outside the room boundary
   * Displays room measurements in traditional blueprint style
   */
  private createWallDimensionLabels(): void {
    // Dispose existing resources before clearing
    this.disposeWallDimensionResources();

    // Clear existing wall labels
    this.wallDimensionLabels.clear();
    this.wallDimensionLines.clear();

    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;
    const wallThickness = WALL_SETTINGS.THICKNESS;
    const labelOffset = 30; // 30cm outside the wall
    const labelY = 1; // Slightly above floor for visibility in 2D

    // Check if L-shaped room (has notch)
    const hasNotch = this.notchWidth > 0 && this.notchHeight > 0;

    if (hasNotch) {
      // L-shaped room: Create labels for 6 wall segments
      this.createLShapedRoomLabels(roomHalfWidth, roomHalfHeight, wallThickness, labelOffset, labelY);
    } else {
      // Rectangular room: Create labels for 4 walls
      this.createRectangularRoomLabels(roomHalfWidth, roomHalfHeight, wallThickness, labelOffset, labelY);
    }
  }

  /**
   * Create dimension labels for a rectangular room (4 walls)
   */
  private createRectangularRoomLabels(
    roomHalfWidth: number,
    roomHalfHeight: number,
    wallThickness: number,
    labelOffset: number,
    labelY: number
  ): void {
    // South wall (bottom) - full room width
    this.createWallDimensionLabel(
      `${this.roomWidth.toFixed(0)} cm`,
      new THREE.Vector3(0, labelY, roomHalfHeight + wallThickness + labelOffset),
      this.roomWidth,
      'horizontal',
      new THREE.Vector3(-roomHalfWidth, labelY, roomHalfHeight + wallThickness + labelOffset),
      new THREE.Vector3(roomHalfWidth, labelY, roomHalfHeight + wallThickness + labelOffset)
    );

    // East wall (right) - full room height
    this.createWallDimensionLabel(
      `${this.roomHeight.toFixed(0)} cm`,
      new THREE.Vector3(roomHalfWidth + wallThickness + labelOffset, labelY, 0),
      this.roomHeight,
      'vertical',
      new THREE.Vector3(roomHalfWidth + wallThickness + labelOffset, labelY, -roomHalfHeight),
      new THREE.Vector3(roomHalfWidth + wallThickness + labelOffset, labelY, roomHalfHeight)
    );
  }

  /**
   * Create dimension labels for an L-shaped room (6 wall segments)
   */
  private createLShapedRoomLabels(
    roomHalfWidth: number,
    roomHalfHeight: number,
    wallThickness: number,
    labelOffset: number,
    labelY: number
  ): void {
    // Get notch boundaries
    const notchMinX = -roomHalfWidth;
    const notchMaxX = -roomHalfWidth + this.notchWidth;
    const notchMinZ = -roomHalfHeight;
    const notchMaxZ = -roomHalfHeight + this.notchHeight;

    // South wall (bottom) - full room width
    this.createWallDimensionLabel(
      `${this.roomWidth.toFixed(0)} cm`,
      new THREE.Vector3(0, labelY, roomHalfHeight + wallThickness + labelOffset),
      this.roomWidth,
      'horizontal',
      new THREE.Vector3(-roomHalfWidth, labelY, roomHalfHeight + wallThickness + labelOffset),
      new THREE.Vector3(roomHalfWidth, labelY, roomHalfHeight + wallThickness + labelOffset)
    );

    // East wall (right) - full room height
    this.createWallDimensionLabel(
      `${this.roomHeight.toFixed(0)} cm`,
      new THREE.Vector3(roomHalfWidth + wallThickness + labelOffset, labelY, 0),
      this.roomHeight,
      'vertical',
      new THREE.Vector3(roomHalfWidth + wallThickness + labelOffset, labelY, -roomHalfHeight),
      new THREE.Vector3(roomHalfWidth + wallThickness + labelOffset, labelY, roomHalfHeight)
    );

    // North wall segment (top) - from notch to east wall
    const northSegmentWidth = this.roomWidth - this.notchWidth;
    const northSegmentCenterX = notchMaxX + northSegmentWidth / 2;
    this.createWallDimensionLabel(
      `${northSegmentWidth.toFixed(0)} cm`,
      new THREE.Vector3(northSegmentCenterX, labelY, -roomHalfHeight - wallThickness - labelOffset),
      northSegmentWidth,
      'horizontal',
      new THREE.Vector3(notchMaxX, labelY, -roomHalfHeight - wallThickness - labelOffset),
      new THREE.Vector3(roomHalfWidth, labelY, -roomHalfHeight - wallThickness - labelOffset)
    );

    // West wall segment (left) - from notch to south wall
    const westSegmentHeight = this.roomHeight - this.notchHeight;
    const westSegmentCenterZ = notchMaxZ + westSegmentHeight / 2;
    this.createWallDimensionLabel(
      `${westSegmentHeight.toFixed(0)} cm`,
      new THREE.Vector3(-roomHalfWidth - wallThickness - labelOffset, labelY, westSegmentCenterZ),
      westSegmentHeight,
      'vertical',
      new THREE.Vector3(-roomHalfWidth - wallThickness - labelOffset, labelY, notchMaxZ),
      new THREE.Vector3(-roomHalfWidth - wallThickness - labelOffset, labelY, roomHalfHeight)
    );

    // Notch-east wall (vertical part of notch) - notch height
    // Position label OUTSIDE (in the notch cutout area, to the LEFT of the wall)
    this.createWallDimensionLabel(
      `${this.notchHeight.toFixed(0)} cm`,
      new THREE.Vector3(notchMaxX - labelOffset, labelY, notchMinZ + this.notchHeight / 2),
      this.notchHeight,
      'vertical',
      new THREE.Vector3(notchMaxX - labelOffset, labelY, notchMinZ),
      new THREE.Vector3(notchMaxX - labelOffset, labelY, notchMaxZ)
    );

    // Notch-south wall (horizontal part of notch) - notch width
    // Position label OUTSIDE (in the notch cutout area, ABOVE the wall)
    this.createWallDimensionLabel(
      `${this.notchWidth.toFixed(0)} cm`,
      new THREE.Vector3(notchMinX + this.notchWidth / 2, labelY, notchMaxZ - labelOffset),
      this.notchWidth,
      'horizontal',
      new THREE.Vector3(notchMinX, labelY, notchMaxZ - labelOffset),
      new THREE.Vector3(notchMaxX, labelY, notchMaxZ - labelOffset)
    );
  }

  /**
   * Create a single wall dimension label with dimension line
   */
  private createWallDimensionLabel(
    text: string,
    labelPosition: THREE.Vector3,
    _dimension: number,
    _direction: 'horizontal' | 'vertical',
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3
  ): void {
    // Create label sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const fontSize = 16;
    const padding = 6;
    const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
    context.font = `600 ${fontSize}px ${fontFamily}`;
    const textWidth = context.measureText(text).width;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    // Clear and draw background
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    if (context.roundRect) {
      context.roundRect(0, 0, canvas.width, canvas.height, 3);
    } else {
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.fill();

    // Draw border
    context.strokeStyle = '#333333';
    context.lineWidth = 1;
    context.stroke();

    // Draw text
    context.fillStyle = '#333333';
    context.font = `600 ${fontSize}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(labelPosition);
    sprite.renderOrder = 1001;

    const scale = 1.0;
    const scaleX = canvas.width * scale;
    const scaleY = canvas.height * scale;
    sprite.scale.set(scaleX, scaleY, 1);

    this.wallDimensionLabels.add(sprite);

    // Create dimension line with end markers
    this.createWallDimensionLine(lineStart, lineEnd);
  }

  /**
   * Create dimension line with end markers for wall dimensions
   */
  private createWallDimensionLine(start: THREE.Vector3, end: THREE.Vector3): void {
    // Main dimension line
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: '#333333',
      linewidth: 1,
      transparent: false
    });

    const line = new THREE.Line(geometry, material);
    line.renderOrder = 1000;
    this.wallDimensionLines.add(line);

    // End markers (perpendicular ticks)
    const markerSize = 8;
    const isHorizontal = Math.abs(start.z - end.z) < 1;

    // Start marker
    const startMarkerPoints = isHorizontal
      ? [
          new THREE.Vector3(start.x, start.y, start.z - markerSize / 2),
          new THREE.Vector3(start.x, start.y, start.z + markerSize / 2)
        ]
      : [
          new THREE.Vector3(start.x - markerSize / 2, start.y, start.z),
          new THREE.Vector3(start.x + markerSize / 2, start.y, start.z)
        ];

    const startMarkerGeom = new THREE.BufferGeometry().setFromPoints(startMarkerPoints);
    const startMarker = new THREE.Line(startMarkerGeom, material.clone());
    startMarker.renderOrder = 1000;
    this.wallDimensionLines.add(startMarker);

    // End marker
    const endMarkerPoints = isHorizontal
      ? [
          new THREE.Vector3(end.x, end.y, end.z - markerSize / 2),
          new THREE.Vector3(end.x, end.y, end.z + markerSize / 2)
        ]
      : [
          new THREE.Vector3(end.x - markerSize / 2, end.y, end.z),
          new THREE.Vector3(end.x + markerSize / 2, end.y, end.z)
        ];

    const endMarkerGeom = new THREE.BufferGeometry().setFromPoints(endMarkerPoints);
    const endMarker = new THREE.Line(endMarkerGeom, material.clone());
    endMarker.renderOrder = 1000;
    this.wallDimensionLines.add(endMarker);
  }

  /**
   * Refresh wall dimension labels (call when room dimensions change)
   */
  public refreshWallDimensionLabels(): void {
    if (this.wallLabelsVisible) {
      this.createWallDimensionLabels();
    }
  }

  public dispose(): void {
    this.clearMeasurements();

    // Dispose wall dimension resources before clearing
    this.disposeWallDimensionResources();
    this.wallDimensionLabels.clear();
    this.wallDimensionLines.clear();

    this.scene.remove(this.measurementLabels);
    this.scene.remove(this.measurementLines);
    this.scene.remove(this.wallDimensionLabels);
    this.scene.remove(this.wallDimensionLines);
  }
}
