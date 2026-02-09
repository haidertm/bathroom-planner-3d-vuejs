/**
 * DragLogic - Core drag calculation and constraint logic.
 *
 * This class encapsulates all the complex drag handling logic that was
 * previously in EventHandlers.ts. It handles:
 * - Wall snapping
 * - Collision detection
 * - Group bounds calculation
 * - Wall transitions for L-shaped rooms
 * - Position constraints
 */

import * as THREE from 'three';
import type { ComponentType } from '../../constants/components';
import type { OrientationConfig } from '../../constants/models';
import type { BathroomItem } from '../../utils/constraints';
import type { SimpleWallCulling } from '../simpleWallCulling';
import {
  constrainToWalls,
  wouldCollideWithExistingOrWalls,
  getInteriorBoundaries,
  getDimensions,
} from '../../utils/constraints';
import type { WallType, Position3D } from './types';

// Constants
const WALL_SETTINGS = { THICKNESS: 2 };

/**
 * Snap rotation to nearest 90 degrees
 */
export function snapRotationTo90Degrees(rotation: number): number {
  const normalized = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const snapPoints = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, Math.PI * 2];
  let closest = snapPoints[0];
  let minDiff = Math.abs(normalized - closest);

  for (const point of snapPoints) {
    const diff = Math.abs(normalized - point);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest === Math.PI * 2 ? 0 : closest;
}

/**
 * Determine which wall an object is currently on based on position
 */
export function determineCurrentWall(
  position: THREE.Vector3,
  roomWidth: number,
  roomHeight: number,
  notchWidth: number,
  notchHeight: number
): WallType {
  const halfWidth = roomWidth / 2;
  const halfHeight = roomHeight / 2;
  const { notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  // Check notch walls first (if L-shaped room)
  if (notch) {
    // Check notch-east wall (vertical edge at notch.maxX)
    if (Math.abs(position.x - notch.maxX) < 30 &&
        position.z >= notch.minZ &&
        position.z <= notch.maxZ) {
      return 'notch-east';
    }
    // Check notch-south wall (horizontal edge at notch.maxZ)
    if (Math.abs(position.z - notch.maxZ) < 30 &&
        position.x >= notch.minX &&
        position.x <= notch.maxX) {
      return 'notch-south';
    }
  }

  // Check main walls
  const distToNorth = Math.abs(position.z - (-halfHeight));
  const distToSouth = Math.abs(position.z - halfHeight);
  const distToEast = Math.abs(position.x - halfWidth);
  const distToWest = Math.abs(position.x - (-halfWidth));

  const minDist = Math.min(distToNorth, distToSouth, distToEast, distToWest);

  if (minDist === distToNorth) return 'north';
  if (minDist === distToSouth) return 'south';
  if (minDist === distToEast) return 'east';
  return 'west';
}

/**
 * Get allowed wall transitions from a given wall
 */
export function getAllowedWallTransitions(
  fromWall: WallType,
  hasNotch: boolean
): Set<WallType> {
  const allowed = new Set<WallType>();

  switch (fromWall) {
    case 'notch-east':
      allowed.add('north');
      allowed.add('south');
      allowed.add('west');
      allowed.add('east');
      if (hasNotch) allowed.add('notch-south');
      break;
    case 'notch-south':
      allowed.add('east');
      allowed.add('south');
      allowed.add('west');
      allowed.add('north');
      if (hasNotch) allowed.add('notch-east');
      break;
    case 'north':
      allowed.add('east');
      allowed.add('west');
      if (hasNotch) {
        allowed.add('notch-east');
        allowed.add('notch-south');
      }
      break;
    case 'south':
      allowed.add('east');
      allowed.add('west');
      if (hasNotch) {
        allowed.add('notch-east');
        allowed.add('notch-south');
      }
      break;
    case 'east':
      allowed.add('north');
      allowed.add('south');
      if (hasNotch) {
        allowed.add('notch-south');
        allowed.add('notch-east');
      }
      break;
    case 'west':
      allowed.add('north');
      allowed.add('south');
      if (hasNotch) {
        allowed.add('notch-east');
        allowed.add('notch-south');
      }
      break;
  }

  return allowed;
}

/**
 * Create wall planes for raycasting
 */
export function createWallPlanes(
  roomWidth: number,
  roomHeight: number,
  notchWidth: number,
  notchHeight: number
): Map<WallType, THREE.Plane> {
  const halfWidth = roomWidth / 2;
  const halfHeight = roomHeight / 2;
  const { notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  const planes = new Map<WallType, THREE.Plane>();

  planes.set('north', new THREE.Plane(new THREE.Vector3(0, 0, 1), halfHeight));
  planes.set('south', new THREE.Plane(new THREE.Vector3(0, 0, -1), halfHeight));
  planes.set('east', new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfWidth));
  planes.set('west', new THREE.Plane(new THREE.Vector3(1, 0, 0), halfWidth));

  if (notch) {
    planes.set('notch-east', new THREE.Plane(new THREE.Vector3(-1, 0, 0), notch.maxX));
    planes.set('notch-south', new THREE.Plane(new THREE.Vector3(0, 0, -1), notch.maxZ));
  }

  return planes;
}

/**
 * Calculate group bounds for multi-select
 */
export function calculateGroupBounds(
  selectedObjects: Map<number, THREE.Object3D>,
  multiSelectLocalOffsets: Map<number, THREE.Vector3>,
  rotation: number,
  getCurrentItemData: (itemId: number) => BathroomItem | null
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = 0, maxX = 0, minZ = 0, maxZ = 0;

  if (selectedObjects.size <= 1) {
    return { minX, maxX, minZ, maxZ };
  }

  selectedObjects.forEach((obj, id) => {
    const localOffset = multiSelectLocalOffsets.get(id);
    if (localOffset) {
      const worldOffset = localOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      const itemType = obj.userData.type as ComponentType;
      const itemScale = obj.scale.x;
      const itemData = getCurrentItemData(id);
      const dims = getDimensions(itemType, itemData?.sku, itemData?.model);

      if (dims) {
        const hW = (dims.width * itemScale) / 2;
        const hD = (dims.depth * itemScale) / 2;
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
}

/**
 * Check if position is inside notch cutout
 */
export function isInsideNotch(
  position: Position3D,
  notch: { minX: number; maxX: number; minZ: number; maxZ: number } | null
): boolean {
  if (!notch) return false;
  return (
    position.x >= notch.minX && position.x <= notch.maxX &&
    position.z >= notch.minZ && position.z <= notch.maxZ
  );
}

/**
 * Validate wall intersection
 */
export function validateWallIntersection(
  wall: WallType,
  intersectPoint: THREE.Vector3,
  roomWidth: number,
  roomHeight: number,
  notch: { minX: number; maxX: number; minZ: number; maxZ: number } | null
): boolean {
  const halfWidth = roomWidth / 2;
  const halfHeight = roomHeight / 2;
  const TRANSITION_TOLERANCE = 40;

  if (wall === 'north' || wall === 'south' || wall === 'east' || wall === 'west') {
    if (Math.abs(intersectPoint.x) <= halfWidth + TRANSITION_TOLERANCE &&
        Math.abs(intersectPoint.z) <= halfHeight + TRANSITION_TOLERANCE &&
        intersectPoint.y >= -50 && intersectPoint.y <= 300) {

      if (notch) {
        return !isInsideNotch(
          { x: intersectPoint.x, y: intersectPoint.y, z: intersectPoint.z },
          notch
        );
      }
      return true;
    }
    return false;
  }

  if (wall === 'notch-east' && notch) {
    return (
      Math.abs(intersectPoint.x - notch.maxX) <= 20 &&
      intersectPoint.z >= notch.minZ &&
      intersectPoint.z <= notch.maxZ &&
      intersectPoint.y >= -50 && intersectPoint.y <= 300
    );
  }

  if (wall === 'notch-south' && notch) {
    return (
      Math.abs(intersectPoint.z - notch.maxZ) <= 20 &&
      intersectPoint.x >= notch.minX &&
      intersectPoint.x <= notch.maxX &&
      intersectPoint.y >= -50 && intersectPoint.y <= 300
    );
  }

  return false;
}

/**
 * Apply wall snap constraint to position
 */
export function applyWallSnapConstraint(
  targetPosition: Position3D,
  objectType: ComponentType,
  objectScale: number,
  currentItem: BathroomItem | undefined,
  roomWidth: number,
  roomHeight: number,
  notchWidth: number,
  notchHeight: number,
  currentWall: WallType | null,
  orientation?: { type?: string; wallBuffer?: number }
): { position: Position3D; rotation: number; wall: WallType } {
  const result = constrainToWalls(
    targetPosition,
    roomWidth,
    roomHeight,
    {
      type: objectType,
      scale: objectScale,
      orientation: orientation as OrientationConfig | undefined,
      item: currentItem,
      notchWidth: notchWidth,
      notchHeight: notchHeight
    },
    currentWall || undefined
  );

  // Determine which wall the constrained position is on
  const constrainedWall = determineCurrentWall(
    new THREE.Vector3(result.position.x, result.position.y, result.position.z),
    roomWidth,
    roomHeight,
    notchWidth,
    notchHeight
  );

  return {
    position: result.position,
    rotation: result.rotation,
    wall: constrainedWall
  };
}

/**
 * Apply freestanding position offset based on wall
 */
export function applyFreestandingOffset(
  position: Position3D,
  rotation: number,
  objectType: ComponentType,
  objectScale: number,
  currentItem: BathroomItem | undefined
): Position3D {
  const dims = getDimensions(objectType, currentItem?.sku, currentItem?.model);
  if (!dims) return position;

  const halfDepth = (dims.depth * objectScale) / 2;
  const normalizedRot = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const result = { ...position };

  if (normalizedRot < Math.PI / 4 || normalizedRot > 7 * Math.PI / 4) {
    // On north wall - move away from north
    result.z += halfDepth;
  } else if (normalizedRot > 3 * Math.PI / 4 && normalizedRot < 5 * Math.PI / 4) {
    // On south wall - move away from south
    result.z -= halfDepth;
  } else if (normalizedRot > Math.PI / 4 && normalizedRot < 3 * Math.PI / 4) {
    // On west wall - move away from west
    result.x += halfDepth;
  } else {
    // On east wall - move away from east
    result.x -= halfDepth;
  }

  return result;
}

/**
 * Constrain group position to room boundaries
 */
export function constrainGroupToRoom(
  position: Position3D,
  rotation: number,
  groupBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  roomWidth: number,
  roomHeight: number,
  notchWidth: number,
  notchHeight: number
): Position3D {
  const { interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
  const isOnNorthSouthWall = Math.abs(Math.cos(rotation)) > 0.7;
  const result = { ...position };

  if (isOnNorthSouthWall) {
    const effectiveMinX = notch ? Math.max(interior.minX, notch.maxX + WALL_SETTINGS.THICKNESS) : interior.minX;

    if (result.x + groupBounds.maxX > interior.maxX) {
      result.x = interior.maxX - groupBounds.maxX;
    }
    if (result.x + groupBounds.minX < effectiveMinX) {
      result.x = effectiveMinX - groupBounds.minX;
    }
  } else {
    const effectiveMinZ = notch ? Math.max(interior.minZ, notch.maxZ + WALL_SETTINGS.THICKNESS) : interior.minZ;

    if (result.z + groupBounds.maxZ > interior.maxZ) {
      result.z = interior.maxZ - groupBounds.maxZ;
    }
    if (result.z + groupBounds.minZ < effectiveMinZ) {
      result.z = effectiveMinZ - groupBounds.minZ;
    }
  }

  return result;
}

/**
 * Check collision state for an object
 */
export function checkCollisionState(
  position: Position3D,
  objectType: ComponentType,
  objectScale: number,
  itemId: number,
  currentItem: BathroomItem | undefined,
  rotation: number,
  getItems: () => BathroomItem[],
  roomWidth: number,
  roomHeight: number,
  notchWidth: number,
  notchHeight: number
): boolean {
  return wouldCollideWithExistingOrWalls(
    position,
    objectType,
    objectScale,
    itemId,
    getItems(),
    roomWidth,
    roomHeight,
    currentItem,
    rotation,
    notchWidth,
    notchHeight
  );
}

/**
 * Get visible walls based on wall culling
 */
export function getVisibleWalls(
  wallCulling: SimpleWallCulling | null,
  currentWall: WallType | null,
  hasNotch: boolean
): Set<WallType> {
  let visibleWalls: Set<WallType>;

  if (wallCulling && wallCulling.enabled) {
    const wallVisibility = wallCulling.getWallVisibilityStatus();
    visibleWalls = new Set(
      wallVisibility
        .filter(status => status.visible)
        .map(status => status.direction as WallType)
    );
  } else {
    visibleWalls = new Set<WallType>(['north', 'south', 'east', 'west']);
  }

  // Always include current wall
  if (currentWall) {
    visibleWalls.add(currentWall);
  }

  // Add notch walls if applicable
  if (hasNotch) {
    visibleWalls.add('notch-east');
    visibleWalls.add('notch-south');
  }

  return visibleWalls;
}
