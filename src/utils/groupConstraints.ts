// src/utils/groupConstraints.ts - Group constraint analysis for multi-select movement
// Implements "Most Restrictive Wins" rule for grouped object movement

import * as THREE from 'three';
import type { ComponentType } from '../constants/components';
import type { WallType } from '../constants/dimensions';
import type { BathroomItem } from './constraints';
import { getMovementConfig } from './models';

/**
 * Constraint priority levels (higher = more restrictive)
 */
export enum ConstraintPriority {
  FREE = 0,           // Can move anywhere in room
  WALL_SNAP = 1,      // Must stay on walls
  CORNER_ONLY = 2     // Must be in corners (MOST RESTRICTIVE)
}

/**
 * Represents the unified constraint for a group of selected objects
 */
export interface GroupConstraint {
  /** The most restrictive movement type in the group */
  movementType: ConstraintPriority;
  /** Rotation restriction: 'free' allows any angle, 'snap_90' snaps to 90 degree increments */
  rotationRestriction: 'free' | 'snap_90';
  /** Height restriction: 'adjustable' allows Ctrl+drag, 'locked' blocks all height changes */
  heightRestriction: 'adjustable' | 'locked';
  /** True if items are on different/perpendicular walls (L-shape group) */
  isLShapeGroup: boolean;
  /** Maps item ID to the wall it's currently on */
  itemWalls: Map<number, WallType>;
  /** The highest constraint priority item (for debugging) */
  mostRestrictiveItemId: number | null;
  /** Array of all item constraints for reference */
  itemConstraints: Map<number, ConstraintPriority>;
}

/**
 * Determines which wall a position is closest to
 */
export function determineWallFromPosition(
  position: THREE.Vector3 | { x: number; y: number; z: number },
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): WallType {
  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;
  const tolerance = 30; // 30cm tolerance for wall detection

  const x = position.x;
  const z = position.z;

  // Check for L-shaped room notch walls first
  if (notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0) {
    const notchMinX = -roomHalfWidth;
    const notchMaxX = -roomHalfWidth + notchWidth;
    const notchMinZ = -roomHalfHeight;
    const notchMaxZ = -roomHalfHeight + notchHeight;

    // Check notch-east wall (vertical edge at notch.maxX)
    if (Math.abs(x - notchMaxX) < tolerance && z >= notchMinZ && z <= notchMaxZ) {
      return 'notch-east';
    }

    // Check notch-south wall (horizontal edge at notch.maxZ)
    if (Math.abs(z - notchMaxZ) < tolerance && x >= notchMinX && x <= notchMaxX) {
      return 'notch-south';
    }
  }

  // Standard wall detection
  const distToNorth = Math.abs(z - (-roomHalfHeight));
  const distToSouth = Math.abs(z - roomHalfHeight);
  const distToEast = Math.abs(x - roomHalfWidth);
  const distToWest = Math.abs(x - (-roomHalfWidth));

  const minDist = Math.min(distToNorth, distToSouth, distToEast, distToWest);

  if (minDist === distToNorth) return 'north';
  if (minDist === distToSouth) return 'south';
  if (minDist === distToEast) return 'east';
  return 'west';
}

/**
 * Checks if two walls are perpendicular (forming an L-shape)
 */
export function areWallsPerpendicular(wall1: WallType, wall2: WallType): boolean {
  const northSouthWalls: WallType[] = ['north', 'south', 'notch-south'];
  // eastWestWalls: ['east', 'west', 'notch-east'] - walls perpendicular to N/S

  const wall1IsNS = northSouthWalls.includes(wall1);
  const wall2IsNS = northSouthWalls.includes(wall2);

  // If one is N/S and the other is E/W, they're perpendicular
  return wall1IsNS !== wall2IsNS;
}

/**
 * Analyzes a group of selected objects and returns the most restrictive constraint
 * that should apply to the entire group.
 *
 * Rules:
 * 1. Movement: Most restrictive wins (CORNER_ONLY > WALL_SNAP > FREE)
 * 2. Rotation: If ANY item cannot rotate freely, group uses 90 degree snap
 * 3. Height: If ANY item cannot move vertically, group height is locked
 * 4. L-Shape: If items are on perpendicular walls, treat as CORNER_ONLY
 */
export function analyzeGroupConstraints(
  selectedObjects: Map<number, THREE.Object3D>,
  getItemData: (id: number) => BathroomItem | undefined,
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): GroupConstraint {
  const result: GroupConstraint = {
    movementType: ConstraintPriority.FREE,
    rotationRestriction: 'free',
    heightRestriction: 'adjustable',
    isLShapeGroup: false,
    itemWalls: new Map(),
    mostRestrictiveItemId: null,
    itemConstraints: new Map()
  };

  if (selectedObjects.size === 0) {
    return result;
  }

  const walls = new Set<WallType>();
  let hasFixedRotation = false;
  let hasFixedHeight = false;
  let highestPriority = ConstraintPriority.FREE;

  selectedObjects.forEach((obj, id) => {
    const itemType = obj.userData.type as ComponentType;
    const itemData = getItemData(id);
    const movementConfig = getMovementConfig(itemType, itemData);

    // Determine the wall this item is on
    const wall = determineWallFromPosition(
      obj.position,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    );
    result.itemWalls.set(id, wall);
    walls.add(wall);

    // Determine constraint priority for this item
    let itemPriority = ConstraintPriority.FREE;

    if (movementConfig.cornerInstallOnly &&
        typeof movementConfig.cornerInstallOnly === 'object' &&
        movementConfig.cornerInstallOnly.enabled) {
      itemPriority = ConstraintPriority.CORNER_ONLY;
    } else if (movementConfig.snapToWall) {
      itemPriority = ConstraintPriority.WALL_SNAP;
    }

    result.itemConstraints.set(id, itemPriority);

    // Track the most restrictive constraint
    if (itemPriority > highestPriority) {
      highestPriority = itemPriority;
      result.mostRestrictiveItemId = id;
    }

    // Check rotation restriction
    if (!movementConfig.allowFreeRotation) {
      hasFixedRotation = true;
    }

    // Check height restriction
    if (!movementConfig.allowVerticalMovement) {
      hasFixedHeight = true;
    }
  });

  // Check for L-shape group (items on perpendicular walls)
  const wallArray = Array.from(walls);
  if (wallArray.length > 1) {
    for (let i = 0; i < wallArray.length; i++) {
      for (let j = i + 1; j < wallArray.length; j++) {
        if (areWallsPerpendicular(wallArray[i], wallArray[j])) {
          result.isLShapeGroup = true;
          // L-shape groups are treated as CORNER_ONLY (most restrictive)
          highestPriority = ConstraintPriority.CORNER_ONLY;
          break;
        }
      }
      if (result.isLShapeGroup) break;
    }
  }

  result.movementType = highestPriority;
  result.rotationRestriction = hasFixedRotation ? 'snap_90' : 'free';
  result.heightRestriction = hasFixedHeight ? 'locked' : 'adjustable';

  return result;
}

/**
 * Snaps a rotation angle to the nearest 90 degree increment
 * @param angle - The angle in radians
 * @returns The snapped angle in radians (0, π/2, π, or 3π/2)
 */
export function snapRotationTo90Degrees(angle: number): number {
  // Normalize angle to [0, 2π)
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;

  // Snap to nearest 90 degree (π/2 radians)
  const snapAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI];

  let closest = snapAngles[0];
  let minDiff = Math.abs(normalized - closest);

  for (const snapAngle of snapAngles) {
    const diff = Math.abs(normalized - snapAngle);
    if (diff < minDiff) {
      minDiff = diff;
      closest = snapAngle;
    }
  }

  // Normalize result to [-π, π] for consistency with Three.js
  if (closest >= Math.PI) {
    closest -= 2 * Math.PI;
  }

  return closest;
}

/**
 * Calculates the center point of a group of objects
 */
export function getGroupCenter(selectedObjects: Map<number, THREE.Object3D>): THREE.Vector3 {
  if (selectedObjects.size === 0) {
    return new THREE.Vector3();
  }

  const center = new THREE.Vector3();

  selectedObjects.forEach((obj) => {
    center.add(obj.position);
  });

  center.divideScalar(selectedObjects.size);
  return center;
}

/**
 * Rotates a group of objects around their collective center point
 * @param selectedObjects - Map of selected objects
 * @param deltaRotation - The rotation delta to apply (in radians)
 * @param localOffsets - Map of local offsets from primary object
 * @param localRotations - Map of local rotations from primary object
 * @param groupConstraint - The group constraint (for 90 degree snapping)
 * @returns The snapped rotation if snap_90, otherwise the raw delta
 */
export function calculateGroupRotation(
  currentPrimaryRotation: number,
  deltaRotation: number,
  groupConstraint: GroupConstraint
): number {
  let newRotation = currentPrimaryRotation + deltaRotation;

  if (groupConstraint.rotationRestriction === 'snap_90') {
    newRotation = snapRotationTo90Degrees(newRotation);
  }

  return newRotation;
}

/**
 * Checks if the group can be placed at the given position
 * based on the group's constraint type
 */
export function isValidGroupPosition(
  groupConstraint: GroupConstraint,
  primaryPosition: THREE.Vector3,
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): boolean {
  // For FREE constraint, any position within room bounds is valid
  if (groupConstraint.movementType === ConstraintPriority.FREE) {
    return true;
  }

  // For WALL_SNAP, check if position is near a wall
  if (groupConstraint.movementType === ConstraintPriority.WALL_SNAP) {
    const roomHalfWidth = roomWidth / 2;
    const roomHalfHeight = roomHeight / 2;
    const wallTolerance = 50; // 50cm tolerance

    const nearWall =
      Math.abs(primaryPosition.x - roomHalfWidth) < wallTolerance ||
      Math.abs(primaryPosition.x - (-roomHalfWidth)) < wallTolerance ||
      Math.abs(primaryPosition.z - roomHalfHeight) < wallTolerance ||
      Math.abs(primaryPosition.z - (-roomHalfHeight)) < wallTolerance;

    return nearWall;
  }

  // For CORNER_ONLY, check if position is near a corner
  if (groupConstraint.movementType === ConstraintPriority.CORNER_ONLY) {
    const roomHalfWidth = roomWidth / 2;
    const roomHalfHeight = roomHeight / 2;
    const cornerTolerance = 60; // 60cm tolerance for corners

    const corners = [
      { x: -roomHalfWidth, z: -roomHalfHeight }, // NW
      { x: roomHalfWidth, z: -roomHalfHeight },  // NE
      { x: -roomHalfWidth, z: roomHalfHeight },  // SW
      { x: roomHalfWidth, z: roomHalfHeight }    // SE
    ];

    // Add notch corners if applicable
    if (notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0) {
      const notchMaxX = -roomHalfWidth + notchWidth;
      const notchMaxZ = -roomHalfHeight + notchHeight;
      corners.push(
        { x: notchMaxX, z: notchMaxZ } // Notch interior corner
      );
    }

    return corners.some(corner => {
      const dist = Math.sqrt(
        Math.pow(primaryPosition.x - corner.x, 2) +
        Math.pow(primaryPosition.z - corner.z, 2)
      );
      return dist < cornerTolerance;
    });
  }

  return false;
}

/**
 * Returns a description of the group constraint for debugging/logging
 */
export function describeGroupConstraint(constraint: GroupConstraint): string {
  const movementTypeNames = {
    [ConstraintPriority.FREE]: 'FREE',
    [ConstraintPriority.WALL_SNAP]: 'WALL_SNAP',
    [ConstraintPriority.CORNER_ONLY]: 'CORNER_ONLY'
  };

  return `GroupConstraint {
    movement: ${movementTypeNames[constraint.movementType]},
    rotation: ${constraint.rotationRestriction},
    height: ${constraint.heightRestriction},
    isLShape: ${constraint.isLShapeGroup},
    mostRestrictiveItem: ${constraint.mostRestrictiveItemId}
  }`;
}
