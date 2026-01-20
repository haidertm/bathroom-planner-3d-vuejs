// src/services/groupConstraintResolver.ts
// Core logic for the "Most Restrictive Wins" group constraint system

import * as THREE from 'three';
import {
  BathroomItem,
  constrainToCorner,
  constrainToWalls,
  getDimensions,
  getInteriorBoundaries,
  getNearestCorner,
  Position,
  WallType,
  wouldCollideWithExistingOrWalls
} from '../utils/constraints';
import { getMovementConfig, getOrientationForItem } from '../utils/models';
import {
  ConstraintLevel,
  ConstraintTypeCode,
  CONSTRAINT_CONSTANTS,
  GroupConstraints,
  GroupTransform,
  ItemConstraintInfo,
  MagneticSnapInfo,
  MovementInput,
  RoomDimensions,
  TransformValidationResult
} from '../types/groupConstraints';

/**
 * GroupConstraintResolver - Resolves movement constraints for multi-selected groups
 *
 * When multiple objects with different constraints are selected, this resolver
 * identifies the "Maximum Constraint Level" (most restrictive) and applies it
 * to the entire group, treating them as a rigid body.
 */
export class GroupConstraintResolver {
  private roomDimensions: RoomDimensions;
  private existingItems: BathroomItem[];
  private lastValidTransform: GroupTransform | null = null;

  constructor(roomDimensions: RoomDimensions, existingItems: BathroomItem[]) {
    this.roomDimensions = roomDimensions;
    this.existingItems = existingItems;
  }

  /**
   * Update room dimensions (call when room size changes)
   */
  public updateRoomDimensions(dimensions: RoomDimensions): void {
    this.roomDimensions = dimensions;
  }

  /**
   * Update existing items (call when items array changes)
   */
  public updateExistingItems(items: BathroomItem[]): void {
    this.existingItems = items;
  }

  /**
   * Classify a single item's constraint type
   */
  public classifyItemConstraint(item: BathroomItem): ItemConstraintInfo {
    const movementConfig = getMovementConfig(item.type, item);

    // Check for corner-only constraint (Type C)
    const isCornerOnly = !!(movementConfig.cornerInstallOnly &&
      typeof movementConfig.cornerInstallOnly === 'object' &&
      movementConfig.cornerInstallOnly.enabled);

    // Determine constraint level
    let level: ConstraintLevel;
    let type: ConstraintTypeCode;

    if (isCornerOnly) {
      level = ConstraintLevel.CORNER_ONLY;
      type = 'C';
    } else if (movementConfig.snapToWall) {
      level = ConstraintLevel.WALL_MOUNTED;
      type = movementConfig.allowVerticalMovement ? 'B' : 'A';
    } else {
      level = ConstraintLevel.FREE;
      type = 'D';
    }

    // Determine which wall the item is currently on
    const currentWall = this.determineItemWall(item);

    return {
      level,
      type,
      currentWall,
      allowVerticalMovement: !!movementConfig.allowVerticalMovement,
      allowFreeRotation: !!movementConfig.allowFreeRotation,
      minHeight: movementConfig.minHeight ?? 0,
      maxHeight: movementConfig.maxHeight ?? 250,
      isCornerOnly,
      snapToWall: !!movementConfig.snapToWall
    };
  }

  /**
   * Determine which wall an item is on based on its position
   */
  public determineItemWall(item: BathroomItem): WallType | undefined {
    const position: Position = {
      x: item.position[0],
      y: item.position[1],
      z: item.position[2]
    };

    return this.determineWallFromPosition(position);
  }

  /**
   * Determine which wall a position is on
   */
  public determineWallFromPosition(position: Position): WallType | undefined {
    const { wallFaces, notch } = getInteriorBoundaries(
      this.roomDimensions.width,
      this.roomDimensions.height,
      this.roomDimensions.notchWidth,
      this.roomDimensions.notchHeight
    );

    const TOLERANCE = 15; // 15cm tolerance

    // Calculate distances to walls
    const distances: Record<WallType, number> = {
      north: Math.abs(position.z - wallFaces.north),
      south: Math.abs(position.z - wallFaces.south),
      east: Math.abs(position.x - wallFaces.east),
      west: Math.abs(position.x - wallFaces.west),
      'notch-east': notch ? Math.abs(position.x - notch.maxX) : Infinity,
      'notch-south': notch ? Math.abs(position.z - notch.maxZ) : Infinity
    };

    // Find the closest wall
    let closestWall: WallType | undefined;
    let minDistance = TOLERANCE;

    for (const [wall, distance] of Object.entries(distances) as [WallType, number][]) {
      if (distance < minDistance) {
        minDistance = distance;
        closestWall = wall;
      }
    }

    return closestWall;
  }

  /**
   * Check if two walls are perpendicular (forming an L-shape)
   */
  private areWallsPerpendicular(wall1: WallType, wall2: WallType): boolean {
    // northSouth walls are horizontal (running east-west)
    // eastWest walls are vertical (running north-south)
    // Two walls are perpendicular if one is horizontal and one is vertical
    const northSouth: WallType[] = ['north', 'south', 'notch-south'];

    const isWall1NorthSouth = northSouth.includes(wall1);
    const isWall2NorthSouth = northSouth.includes(wall2);

    // Perpendicular if one is north/south and other is east/west
    return isWall1NorthSouth !== isWall2NorthSouth;
  }

  /**
   * Analyze constraints for a group of items
   * Returns the most restrictive constraints that apply to the entire group
   */
  public analyzeGroupConstraints(items: BathroomItem[], primaryItemId?: number): GroupConstraints {
    const itemIds = items.map(item => item.id);
    const wallItems = new Map<WallType, number[]>();

    let mostRestrictiveLevel = ConstraintLevel.FREE;
    let hasCornerItem = false;
    let groupAllowVertical = true;
    let groupAllowFreeRotation = true;
    let groupMinHeight = 0;
    let groupMaxHeight = 250;

    // Classify each item and track wall assignments
    for (const item of items) {
      const constraint = this.classifyItemConstraint(item);

      // Track most restrictive level
      if (constraint.level < mostRestrictiveLevel) {
        mostRestrictiveLevel = constraint.level;
      }

      // Track corner items
      if (constraint.isCornerOnly) {
        hasCornerItem = true;
      }

      // Track wall assignments - ONLY for wall-mounted items (not corner items)
      // Corner items are in corners, not on walls, so they shouldn't trigger L-shape detection
      if (constraint.currentWall && constraint.snapToWall && !constraint.isCornerOnly) {
        const existing = wallItems.get(constraint.currentWall) || [];
        existing.push(item.id);
        wallItems.set(constraint.currentWall, existing);
      }

      // Combine vertical movement constraints (any "no" blocks all)
      if (!constraint.allowVerticalMovement) {
        groupAllowVertical = false;
      }

      // Combine rotation constraints (any "no" blocks all)
      if (!constraint.allowFreeRotation) {
        groupAllowFreeRotation = false;
      }

      // Track height constraints (use most restrictive range)
      groupMinHeight = Math.max(groupMinHeight, constraint.minHeight);
      groupMaxHeight = Math.min(groupMaxHeight, constraint.maxHeight);
    }

    // Detect L-shape group (wall-mounted items on perpendicular walls)
    // This only applies to wall-mounted items, not corner or free items
    let isLShapeGroup = false;
    const wallList = Array.from(wallItems.keys());

    // Only check for L-shape if we have wall-mounted items on multiple walls
    if (wallList.length >= 2) {
      for (let i = 0; i < wallList.length - 1; i++) {
        for (let j = i + 1; j < wallList.length; j++) {
          if (this.areWallsPerpendicular(wallList[i], wallList[j])) {
            isLShapeGroup = true;
            break;
          }
        }
        if (isLShapeGroup) break;
      }
    }

    // Determine effective type
    let effectiveType: ConstraintTypeCode;
    if (isLShapeGroup) {
      effectiveType = 'L-SHAPE';
    } else if (hasCornerItem) {
      effectiveType = 'C';
    } else if (mostRestrictiveLevel === ConstraintLevel.WALL_MOUNTED) {
      effectiveType = groupAllowVertical ? 'B' : 'A';
    } else {
      effectiveType = 'D';
    }

    return {
      level: mostRestrictiveLevel,
      effectiveType,
      allowVerticalMovement: groupAllowVertical,
      allowFreeRotation: groupAllowFreeRotation,
      minHeight: groupMinHeight,
      maxHeight: groupMaxHeight,
      isLShapeGroup,
      hasCornerItem,
      wallItems,
      primaryItemId,
      itemIds
    };
  }

  /**
   * Calculate group transform based on constraints and input
   * Main entry point for constraint-aware movement
   */
  public calculateGroupTransform(
    constraints: GroupConstraints,
    input: MovementInput,
    currentTransform: GroupTransform,
    selectedObjects: Map<number, THREE.Object3D>,
    localOffsets: Map<number, THREE.Vector3>,
    localRotations: Map<number, number>
  ): TransformValidationResult {
    // L-Shape groups are locked - no movement allowed
    if (constraints.isLShapeGroup) {
      return this.createLockedResult(currentTransform, 'L-shape group cannot be moved');
    }

    // Route to appropriate movement processor
    let result: TransformValidationResult;

    switch (constraints.level) {
      case ConstraintLevel.CORNER_ONLY:
        result = this.processCornerOnlyMovement(
          constraints, input, currentTransform,
          selectedObjects, localOffsets, localRotations
        );
        break;

      case ConstraintLevel.WALL_MOUNTED:
        result = this.processWallMountedMovement(
          constraints, input, currentTransform,
          selectedObjects, localOffsets, localRotations
        );
        break;

      case ConstraintLevel.FREE:
      default:
        result = this.processFreeMovement(
          constraints, input, currentTransform,
          selectedObjects, localOffsets, localRotations
        );
        break;
    }

    // Store last valid transform
    if (result.isValid) {
      this.lastValidTransform = result.validTransform;
    }

    return result;
  }

  /**
   * Process corner-only movement (Type C)
   * Group can only jump between valid corners
   */
  private processCornerOnlyMovement(
    constraints: GroupConstraints,
    input: MovementInput,
    currentTransform: GroupTransform,
    selectedObjects: Map<number, THREE.Object3D>,
    localOffsets: Map<number, THREE.Vector3>,
    localRotations: Map<number, number>
  ): TransformValidationResult {
    // Find nearest corner to target position
    const nearestCorner = getNearestCorner(
      { x: input.targetPosition.x, y: input.targetPosition.y, z: input.targetPosition.z },
      this.roomDimensions.width,
      this.roomDimensions.height,
      this.roomDimensions.notchWidth,
      this.roomDimensions.notchHeight
    );

    // Get primary item for constraint calculation
    const primaryId = constraints.primaryItemId || constraints.itemIds[0];
    const primaryItem = this.existingItems.find(item => item.id === primaryId);

    if (!primaryItem) {
      return this.createLockedResult(currentTransform, 'Primary item not found');
    }

    // Use constrainToCorner to get proper position and rotation
    const cornerResult = constrainToCorner(
      nearestCorner.position,
      this.roomDimensions.width,
      this.roomDimensions.height,
      {
        type: primaryItem.type,
        scale: primaryItem.scale || 1,
        orientation: getOrientationForItem(primaryItem),
        item: primaryItem,
        notchWidth: this.roomDimensions.notchWidth,
        notchHeight: this.roomDimensions.notchHeight
      }
    );

    // Calculate new transforms for all items in group
    const itemTransforms = this.calculateGroupItemTransforms(
      { x: cornerResult.position.x, y: cornerResult.position.y, z: cornerResult.position.z },
      cornerResult.rotation,
      selectedObjects,
      localOffsets,
      localRotations
    );

    // Check for collisions
    const collisionResult = this.checkGroupCollisions(itemTransforms, constraints.itemIds);

    if (collisionResult.hasCollision) {
      // Return invalid result with cursor position for ghost display
      const invalidTransform: GroupTransform = {
        primaryPosition: { x: input.targetPosition.x, y: input.targetPosition.y, z: input.targetPosition.z },
        primaryRotation: cornerResult.rotation,
        itemTransforms: new Map()
      };

      return {
        isValid: false,
        validTransform: this.lastValidTransform || currentTransform,
        invalidTransform,
        validationStatus: {
          blocked: true,
          reason: 'Collision detected',
          collidingItems: collisionResult.collidingIds
        }
      };
    }

    return {
      isValid: true,
      validTransform: {
        primaryPosition: cornerResult.position,
        primaryRotation: cornerResult.rotation,
        itemTransforms
      },
      validationStatus: { blocked: false }
    };
  }

  /**
   * Process wall-mounted movement (Type A/B)
   * Group slides along walls with 40cm stickiness
   */
  private processWallMountedMovement(
    constraints: GroupConstraints,
    input: MovementInput,
    currentTransform: GroupTransform,
    selectedObjects: Map<number, THREE.Object3D>,
    localOffsets: Map<number, THREE.Vector3>,
    localRotations: Map<number, number>
  ): TransformValidationResult {
    const primaryId = constraints.primaryItemId || constraints.itemIds[0];
    const primaryItem = this.existingItems.find(item => item.id === primaryId);

    if (!primaryItem) {
      return this.createLockedResult(currentTransform, 'Primary item not found');
    }

    // Use constrainToWalls with stickiness
    const wallResult = constrainToWalls(
      { x: input.targetPosition.x, y: input.targetPosition.y, z: input.targetPosition.z },
      this.roomDimensions.width,
      this.roomDimensions.height,
      {
        type: primaryItem.type,
        scale: primaryItem.scale || 1,
        orientation: getOrientationForItem(primaryItem),
        item: primaryItem,
        notchWidth: this.roomDimensions.notchWidth,
        notchHeight: this.roomDimensions.notchHeight
      },
      input.currentWall
    );

    // Handle rotation constraint - snap to 90 degrees if free rotation not allowed
    let finalRotation = wallResult.rotation;
    if (!constraints.allowFreeRotation && input.targetRotation !== undefined) {
      finalRotation = this.snapToNearestRightAngle(input.targetRotation);
    }

    // Handle height constraint
    let finalY = constraints.allowVerticalMovement
      ? Math.max(constraints.minHeight, Math.min(constraints.maxHeight, input.targetPosition.y))
      : currentTransform.primaryPosition.y;

    const constrainedPosition = {
      x: wallResult.position.x,
      y: finalY,
      z: wallResult.position.z
    };

    // Calculate transforms for all items
    const itemTransforms = this.calculateGroupItemTransforms(
      constrainedPosition,
      finalRotation,
      selectedObjects,
      localOffsets,
      localRotations
    );

    // Adjust for group bounds to keep all items inside room
    const boundsResult = this.adjustForGroupBounds(
      constrainedPosition,
      finalRotation,
      itemTransforms,
      constraints
    );

    // Check collisions
    const collisionResult = this.checkGroupCollisions(boundsResult.itemTransforms, constraints.itemIds);

    // Calculate magnetic snap
    const magneticSnap = this.calculateMagneticSnap(boundsResult.position, finalRotation);

    if (collisionResult.hasCollision) {
      const invalidTransform: GroupTransform = {
        primaryPosition: { x: input.targetPosition.x, y: input.targetPosition.y, z: input.targetPosition.z },
        primaryRotation: finalRotation,
        itemTransforms: new Map()
      };

      return {
        isValid: false,
        validTransform: this.lastValidTransform || currentTransform,
        invalidTransform,
        validationStatus: {
          blocked: true,
          reason: 'Collision detected',
          collidingItems: collisionResult.collidingIds,
          magneticSnap
        }
      };
    }

    return {
      isValid: true,
      validTransform: {
        primaryPosition: boundsResult.position,
        primaryRotation: finalRotation,
        itemTransforms: boundsResult.itemTransforms
      },
      validationStatus: { blocked: false, magneticSnap }
    };
  }

  /**
   * Process free movement (Type D)
   * Group can move freely but still checks collisions
   */
  private processFreeMovement(
    constraints: GroupConstraints,
    input: MovementInput,
    currentTransform: GroupTransform,
    selectedObjects: Map<number, THREE.Object3D>,
    localOffsets: Map<number, THREE.Vector3>,
    localRotations: Map<number, number>
  ): TransformValidationResult {
    const primaryId = constraints.primaryItemId || constraints.itemIds[0];
    const primaryItem = this.existingItems.find(item => item.id === primaryId);

    if (!primaryItem) {
      return this.createLockedResult(currentTransform, 'Primary item not found');
    }

    // Use target position directly for free movement
    let targetPos = {
      x: input.targetPosition.x,
      y: input.targetPosition.y,
      z: input.targetPosition.z
    };

    // Handle rotation
    let finalRotation = input.targetRotation ?? currentTransform.primaryRotation;
    if (!constraints.allowFreeRotation) {
      finalRotation = this.snapToNearestRightAngle(finalRotation);
    }

    // Handle height constraint
    if (!constraints.allowVerticalMovement) {
      targetPos.y = currentTransform.primaryPosition.y;
    } else {
      targetPos.y = Math.max(constraints.minHeight, Math.min(constraints.maxHeight, targetPos.y));
    }

    // Calculate transforms for all items
    const itemTransforms = this.calculateGroupItemTransforms(
      targetPos,
      finalRotation,
      selectedObjects,
      localOffsets,
      localRotations
    );

    // Adjust for group bounds
    const boundsResult = this.adjustForGroupBounds(
      targetPos,
      finalRotation,
      itemTransforms,
      constraints
    );

    // Check collisions
    const collisionResult = this.checkGroupCollisions(boundsResult.itemTransforms, constraints.itemIds);

    if (collisionResult.hasCollision) {
      const invalidTransform: GroupTransform = {
        primaryPosition: { x: input.targetPosition.x, y: input.targetPosition.y, z: input.targetPosition.z },
        primaryRotation: finalRotation,
        itemTransforms: new Map()
      };

      return {
        isValid: false,
        validTransform: this.lastValidTransform || currentTransform,
        invalidTransform,
        validationStatus: {
          blocked: true,
          reason: 'Collision detected',
          collidingItems: collisionResult.collidingIds
        }
      };
    }

    return {
      isValid: true,
      validTransform: {
        primaryPosition: boundsResult.position,
        primaryRotation: finalRotation,
        itemTransforms: boundsResult.itemTransforms
      },
      validationStatus: { blocked: false }
    };
  }

  /**
   * Calculate transforms for all items in the group based on primary position
   */
  private calculateGroupItemTransforms(
    primaryPosition: { x: number; y: number; z: number },
    primaryRotation: number,
    selectedObjects: Map<number, THREE.Object3D>,
    localOffsets: Map<number, THREE.Vector3>,
    localRotations: Map<number, number>
  ): Map<number, { position: THREE.Vector3; rotation: number }> {
    const transforms = new Map<number, { position: THREE.Vector3; rotation: number }>();
    const primaryPos = new THREE.Vector3(primaryPosition.x, primaryPosition.y, primaryPosition.z);

    selectedObjects.forEach((_obj, id) => {
      const localOffset = localOffsets.get(id);
      const localRot = localRotations.get(id);

      if (localOffset !== undefined && localRot !== undefined) {
        // Rotate local offset by primary rotation
        const worldOffset = localOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), primaryRotation);
        const position = new THREE.Vector3().addVectors(primaryPos, worldOffset);
        const rotation = primaryRotation + localRot;

        transforms.set(id, { position, rotation });
      }
    });

    return transforms;
  }

  /**
   * Adjust primary position to keep all group items inside room bounds
   */
  private adjustForGroupBounds(
    primaryPosition: { x: number; y: number; z: number },
    _primaryRotation: number,
    itemTransforms: Map<number, { position: THREE.Vector3; rotation: number }>,
    _constraints: GroupConstraints
  ): { position: { x: number; y: number; z: number }; itemTransforms: Map<number, { position: THREE.Vector3; rotation: number }> } {
    const { interior, notch } = getInteriorBoundaries(
      this.roomDimensions.width,
      this.roomDimensions.height,
      this.roomDimensions.notchWidth,
      this.roomDimensions.notchHeight
    );

    // Calculate group bounds relative to primary
    let minX = 0, maxX = 0, minZ = 0, maxZ = 0;

    itemTransforms.forEach((transform, id) => {
      const item = this.existingItems.find(i => i.id === id);
      if (item) {
        const dims = getDimensions(item.type, item.sku, item.model);
        if (dims) {
          const halfW = (dims.width * (item.scale || 1)) / 2;
          const halfD = (dims.depth * (item.scale || 1)) / 2;
          const offsetX = transform.position.x - primaryPosition.x;
          const offsetZ = transform.position.z - primaryPosition.z;

          minX = Math.min(minX, offsetX - halfW);
          maxX = Math.max(maxX, offsetX + halfW);
          minZ = Math.min(minZ, offsetZ - halfD);
          maxZ = Math.max(maxZ, offsetZ + halfD);
        }
      }
    });

    // Adjust primary position to keep group inside bounds
    let adjustedX = primaryPosition.x;
    let adjustedZ = primaryPosition.z;

    // X bounds
    const effectiveMinX = notch ? Math.max(interior.minX, notch.maxX) : interior.minX;
    if (adjustedX + minX < effectiveMinX) {
      adjustedX = effectiveMinX - minX;
    }
    if (adjustedX + maxX > interior.maxX) {
      adjustedX = interior.maxX - maxX;
    }

    // Z bounds
    const effectiveMinZ = notch ? Math.max(interior.minZ, notch.maxZ) : interior.minZ;
    if (adjustedZ + minZ < effectiveMinZ) {
      adjustedZ = effectiveMinZ - minZ;
    }
    if (adjustedZ + maxZ > interior.maxZ) {
      adjustedZ = interior.maxZ - maxZ;
    }

    // If position changed, recalculate item transforms
    if (adjustedX !== primaryPosition.x || adjustedZ !== primaryPosition.z) {
      const newPrimaryPos = new THREE.Vector3(adjustedX, primaryPosition.y, adjustedZ);
      const newTransforms = new Map<number, { position: THREE.Vector3; rotation: number }>();

      itemTransforms.forEach((transform, id) => {
        const offset = new THREE.Vector3(
          transform.position.x - primaryPosition.x,
          transform.position.y - primaryPosition.y,
          transform.position.z - primaryPosition.z
        );
        newTransforms.set(id, {
          position: new THREE.Vector3().addVectors(newPrimaryPos, offset),
          rotation: transform.rotation
        });
      });

      return {
        position: { x: adjustedX, y: primaryPosition.y, z: adjustedZ },
        itemTransforms: newTransforms
      };
    }

    return { position: primaryPosition, itemTransforms };
  }

  /**
   * Check for collisions for all items in the group
   */
  private checkGroupCollisions(
    itemTransforms: Map<number, { position: THREE.Vector3; rotation: number }>,
    groupItemIds: number[]
  ): { hasCollision: boolean; collidingIds: number[] } {
    const collidingIds: number[] = [];

    // Filter existing items to exclude items in the current group
    const otherItems = this.existingItems.filter(item => !groupItemIds.includes(item.id));

    itemTransforms.forEach((transform, id) => {
      const item = this.existingItems.find(i => i.id === id);
      if (item) {
        const position: Position = {
          x: transform.position.x,
          y: transform.position.y,
          z: transform.position.z
        };

        const hasCollision = wouldCollideWithExistingOrWalls(
          position,
          item.type,
          item.scale || 1,
          id,
          otherItems,
          this.roomDimensions.width,
          this.roomDimensions.height,
          item,
          transform.rotation,
          this.roomDimensions.notchWidth,
          this.roomDimensions.notchHeight
        );

        if (hasCollision) {
          collidingIds.push(id);
        }
      }
    });

    return { hasCollision: collidingIds.length > 0, collidingIds };
  }

  /**
   * Calculate magnetic snap information
   */
  private calculateMagneticSnap(
    position: { x: number; y: number; z: number },
    _rotation: number
  ): MagneticSnapInfo | undefined {
    const { wallFaces, notch } = getInteriorBoundaries(
      this.roomDimensions.width,
      this.roomDimensions.height,
      this.roomDimensions.notchWidth,
      this.roomDimensions.notchHeight
    );

    const threshold = CONSTRAINT_CONSTANTS.MAGNETIC_SNAP_THRESHOLD;

    // Check distance to each wall
    const distances: { wall: WallType; distance: number; targetPos: { x: number; z: number } }[] = [
      { wall: 'north', distance: Math.abs(position.z - wallFaces.north), targetPos: { x: position.x, z: wallFaces.north } },
      { wall: 'south', distance: Math.abs(position.z - wallFaces.south), targetPos: { x: position.x, z: wallFaces.south } },
      { wall: 'east', distance: Math.abs(position.x - wallFaces.east), targetPos: { x: wallFaces.east, z: position.z } },
      { wall: 'west', distance: Math.abs(position.x - wallFaces.west), targetPos: { x: wallFaces.west, z: position.z } }
    ];

    if (notch) {
      distances.push(
        { wall: 'notch-east', distance: Math.abs(position.x - notch.maxX), targetPos: { x: notch.maxX, z: position.z } },
        { wall: 'notch-south', distance: Math.abs(position.z - notch.maxZ), targetPos: { x: position.x, z: notch.maxZ } }
      );
    }

    // Find closest wall within threshold
    const closest = distances
      .filter(d => d.distance < threshold)
      .sort((a, b) => a.distance - b.distance)[0];

    if (closest) {
      const strength = 1 - (closest.distance / threshold);
      const direction = ['north', 'south', 'notch-south'].includes(closest.wall) ? 'z' : 'x';

      return {
        direction,
        targetPosition: closest.targetPos,
        strength,
        target: closest.wall
      };
    }

    return undefined;
  }

  /**
   * Snap rotation to nearest 90-degree angle
   */
  private snapToNearestRightAngle(rotation: number): number {
    const snap = CONSTRAINT_CONSTANTS.ROTATION_SNAP_ANGLE;
    return Math.round(rotation / snap) * snap;
  }

  /**
   * Create a locked result (no movement allowed)
   */
  private createLockedResult(currentTransform: GroupTransform, reason: string): TransformValidationResult {
    return {
      isValid: false,
      validTransform: currentTransform,
      validationStatus: {
        blocked: true,
        reason
      }
    };
  }

  /**
   * Reset the last valid transform (call when selection changes)
   */
  public resetLastValidTransform(): void {
    this.lastValidTransform = null;
  }
}

/**
 * Singleton instance getter
 */
let resolverInstance: GroupConstraintResolver | null = null;

export const getGroupConstraintResolver = (
  roomDimensions: RoomDimensions,
  existingItems: BathroomItem[]
): GroupConstraintResolver => {
  if (!resolverInstance) {
    resolverInstance = new GroupConstraintResolver(roomDimensions, existingItems);
  } else {
    resolverInstance.updateRoomDimensions(roomDimensions);
    resolverInstance.updateExistingItems(existingItems);
  }
  return resolverInstance;
};
