// src/utils/wallDragHelpers.ts
// Unified helpers for wall-mounted object dragging (2D and 3D modes)

import * as THREE from 'three';
import { getInteriorBoundaries } from './constraints';
import { WallType } from '../constants/dimensions';

/**
 * Notch boundaries for L-shaped rooms
 */
export interface NotchBoundaries {
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Room boundaries including wall faces and optional notch for L-shaped rooms
 */
export interface RoomBoundaries {
  roomHalfWidth: number;
  roomHalfHeight: number;
  interior: ReturnType<typeof getInteriorBoundaries>['interior'];
  wallFaces: ReturnType<typeof getInteriorBoundaries>['wallFaces'];
  notch: NotchBoundaries | null;
}

/**
 * Wall plane definitions for raycasting
 */
export interface WallPlanes {
  north: THREE.Plane;
  south: THREE.Plane;
  east: THREE.Plane;
  west: THREE.Plane;
  'notch-east'?: THREE.Plane;
  'notch-south'?: THREE.Plane;
}

/**
 * Get room boundaries with caching support
 * Single source of truth for interior boundaries calculation
 */
export function getRoomBoundaries(
  roomWidth: number,
  roomHeight: number,
  notchWidth: number,
  notchHeight: number
): RoomBoundaries {
  const { interior, wallFaces, notch } = getInteriorBoundaries(
    roomWidth,
    roomHeight,
    notchWidth,
    notchHeight
  );

  return {
    roomHalfWidth: roomWidth / 2,
    roomHalfHeight: roomHeight / 2,
    interior,
    wallFaces,
    notch
  };
}

/**
 * Create wall planes for raycasting (includes notch walls if present)
 */
export function createWallPlanes(boundaries: RoomBoundaries): WallPlanes {
  const { roomHalfWidth, roomHalfHeight, notch } = boundaries;

  const planes: WallPlanes = {
    north: new THREE.Plane(new THREE.Vector3(0, 0, 1), roomHalfHeight),
    south: new THREE.Plane(new THREE.Vector3(0, 0, -1), roomHalfHeight),
    east: new THREE.Plane(new THREE.Vector3(-1, 0, 0), roomHalfWidth),
    west: new THREE.Plane(new THREE.Vector3(1, 0, 0), roomHalfWidth)
  };

  // Add notch wall planes for L-shaped rooms
  if (notch) {
    planes['notch-east'] = new THREE.Plane(new THREE.Vector3(-1, 0, 0), notch.maxX);
    planes['notch-south'] = new THREE.Plane(new THREE.Vector3(0, 0, -1), notch.maxZ);
  }

  return planes;
}

/**
 * Get set of visible walls (includes notch walls if present)
 */
export function getVisibleWallsSet(
  wallCulling: { enabled: boolean; getWallVisibilityStatus: () => Array<{ direction: string; visible: boolean }> } | null,
  notch: NotchBoundaries | null,
  currentWall?: WallType | null
): Set<string> {
  let visibleWalls: Set<string>;

  if (wallCulling && wallCulling.enabled) {
    const wallVisibility = wallCulling.getWallVisibilityStatus();
    visibleWalls = new Set(
      wallVisibility
        .filter(status => status.visible)
        .map(status => status.direction)
    );
  } else {
    visibleWalls = new Set(['north', 'south', 'east', 'west']);
  }

  // Always include current wall - allow dragging along it even if hidden
  if (currentWall) {
    visibleWalls.add(currentWall);
  }

  // Add notch walls if notch exists (always visible for L-shaped rooms)
  if (notch) {
    visibleWalls.add('notch-east');
    visibleWalls.add('notch-south');
  }

  return visibleWalls;
}

/**
 * Calculate distances from a point to all walls
 */
export function calculateWallDistances(
  position: { x: number; z: number },
  boundaries: RoomBoundaries
): Record<string, number> {
  const { wallFaces, notch } = boundaries;

  const distances: Record<string, number> = {
    north: Math.abs(position.z - wallFaces.north),
    south: Math.abs(position.z - wallFaces.south),
    east: Math.abs(position.x - wallFaces.east),
    west: Math.abs(position.x - wallFaces.west)
  };

  // Add notch wall distances for L-shaped rooms
  if (notch) {
    distances['notch-east'] = Math.abs(position.x - notch.maxX);
    distances['notch-south'] = Math.abs(position.z - notch.maxZ);
  }

  return distances;
}

/**
 * Find the closest wall from a set of visible walls
 */
export function findClosestWall(
  position: { x: number; z: number },
  boundaries: RoomBoundaries,
  visibleWalls: Set<string>
): WallType {
  const distances = calculateWallDistances(position, boundaries);

  // Filter to only visible walls and find minimum
  let closestWall: WallType = 'north';
  let minDistance = Infinity;

  for (const [wall, distance] of Object.entries(distances)) {
    if (visibleWalls.has(wall) && distance < minDistance) {
      minDistance = distance;
      closestWall = wall as WallType;
    }
  }

  return closestWall;
}

/**
 * Clamp position along a wall with notch awareness
 * Returns the clamped X, Z coordinates and rotation for the wall
 */
export function clampPositionToWall(
  targetWall: WallType,
  targetX: number,
  targetZ: number,
  halfObjectWidth: number,
  wallBuffer: number,
  boundaries: RoomBoundaries
): { x: number; z: number; rotation: number } {
  const { roomHalfWidth, roomHalfHeight, wallFaces, notch } = boundaries;

  let x = targetX;
  let z = targetZ;
  let rotation = 0;

  switch (targetWall) {
    case 'north':
      z = wallFaces.north + wallBuffer;
      x = Math.max(-roomHalfWidth + halfObjectWidth, Math.min(roomHalfWidth - halfObjectWidth, x));
      // Check if X position is inside notch area
      if (notch && x >= notch.minX && x <= notch.maxX) {
        x = notch.maxX + halfObjectWidth;
      }
      rotation = 0;
      break;

    case 'south':
      z = wallFaces.south - wallBuffer;
      x = Math.max(-roomHalfWidth + halfObjectWidth, Math.min(roomHalfWidth - halfObjectWidth, x));
      if (notch && x >= notch.minX && x <= notch.maxX && z < notch.maxZ) {
        x = notch.maxX + halfObjectWidth;
      }
      rotation = Math.PI;
      break;

    case 'east':
      x = wallFaces.east - wallBuffer;
      z = Math.max(-roomHalfHeight + halfObjectWidth, Math.min(roomHalfHeight - halfObjectWidth, z));
      // Check if Z position would be inside notch
      if (notch && z >= notch.minZ && z <= notch.maxZ) {
        z = notch.maxZ + halfObjectWidth;
      }
      rotation = -Math.PI / 2;
      break;

    case 'west':
      x = wallFaces.west + wallBuffer;
      z = Math.max(-roomHalfHeight + halfObjectWidth, Math.min(roomHalfHeight - halfObjectWidth, z));
      rotation = Math.PI / 2;
      break;

    case 'notch-east':
      if (notch) {
        x = notch.maxX + wallBuffer;
        z = Math.max(notch.minZ + halfObjectWidth, Math.min(notch.maxZ - halfObjectWidth, z));
        rotation = Math.PI / 2; // Face into room from notch
      }
      break;

    case 'notch-south':
      if (notch) {
        z = notch.maxZ + wallBuffer;
        x = Math.max(notch.minX + halfObjectWidth, Math.min(notch.maxX - halfObjectWidth, x));
        rotation = 0; // Face into room from notch
      }
      break;
  }

  return { x, z, rotation };
}

/**
 * Check if a position is within the notch area (L-shaped room void)
 */
export function isPositionInNotch(
  x: number,
  z: number,
  notch: NotchBoundaries | null
): boolean {
  if (!notch) return false;

  return x >= notch.minX && x <= notch.maxX &&
         z >= notch.minZ && z <= notch.maxZ;
}

/**
 * Get the opposite wall, considering notch walls for L-shaped rooms
 */
export function getOppositeWall(
  currentWall: WallType,
  objectPosition: THREE.Vector3 | null,
  notch: NotchBoundaries | null
): WallType {
  const opposites: Record<WallType, WallType> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
    'notch-east': 'notch-south',
    'notch-south': 'notch-east'
  };

  let oppositeWall = opposites[currentWall];

  // For L-shaped rooms, check if we need to use a notch wall instead
  if (notch && objectPosition) {
    if (currentWall === 'east' &&
        objectPosition.z >= notch.minZ &&
        objectPosition.z <= notch.maxZ) {
      oppositeWall = 'notch-east';
    }
    if (currentWall === 'south' &&
        objectPosition.x >= notch.minX &&
        objectPosition.x <= notch.maxX) {
      oppositeWall = 'notch-south';
    }
  }

  return oppositeWall;
}
