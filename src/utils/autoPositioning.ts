/**
 * Smart Auto-Positioning System for Bathroom Planner
 *
 * This module implements intelligent placement logic for bathroom fixtures:
 * - Mirror/Wall Cabinet: Positions above vanity units
 * - Toilet: Places as "sidekick" near vanity units
 * - Bath: Finds best corner placement
 * - Shower: Corner-bound placement
 * - Vanity Unit: Places on wall facing camera
 * - Heated Towel Rail (Radiator): Places near bath or vanity
 *
 * Hierarchy: First look for anchor objects, then fall back to wall placement
 */

import type { ComponentType } from '../constants/components';
import type { BathroomItem, Position, WallType, CornerType } from './constraints';
import {
  getDimensions,
  getInteriorBoundaries,
  getRoomCorners,
  wouldCollideWithExisting,
  constrainToCorner
} from './constraints';
import { getObjectRotationForWall } from './models';
import { DEFAULT_ORIENTATION, type OrientationConfig } from '../constants/models';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AutoPositionContext {
  roomWidth: number;
  roomHeight: number;
  notchWidth?: number;
  notchHeight?: number;
  existingItems: BathroomItem[];
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
}

export interface AutoPositionResult {
  position: Position;
  rotation: number;
  anchorItem?: BathroomItem;  // The item this was positioned relative to
  placementMethod: 'anchor' | 'corner' | 'wall' | 'fallback';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MIRROR_HEIGHT_ABOVE_VANITY = 20;  // 20cm above vanity top
const EYE_LEVEL_HEIGHT = 160;           // 160cm from floor for fallback mirror placement
const TOILET_GAP_FROM_VANITY = 15;      // 15cm gap between toilet and vanity
const TOWEL_RAIL_HEIGHT = 60;           // 60cm from floor (UK electrical zone standard)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find all items of a specific type
 */
const findItemsByType = (items: BathroomItem[], type: ComponentType): BathroomItem[] => {
  return items.filter(item => item.type === type);
};

/**
 * Find all vanity units (Furniture type represents vanity/basin units)
 */
const findVanityUnits = (items: BathroomItem[]): BathroomItem[] => {
  return findItemsByType(items, 'Furniture');
};

/**
 * Find all baths
 */
const findBaths = (items: BathroomItem[]): BathroomItem[] => {
  return findItemsByType(items, 'Bath');
};

/**
 * Detect which wall an item is on based on position and rotation
 */
const detectWallFromItem = (
  item: BathroomItem,
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): WallType => {
  const position = item.position;
  const rotation = item.rotation || 0;

  // Use rotation to determine wall (more reliable)
  const normalizedRotation = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  if (Math.abs(normalizedRotation) < 0.1 || Math.abs(normalizedRotation - 2 * Math.PI) < 0.1) {
    return 'north';
  } else if (Math.abs(normalizedRotation - Math.PI) < 0.1) {
    return 'south';
  } else if (Math.abs(normalizedRotation - Math.PI / 2) < 0.1) {
    return 'west';
  } else if (Math.abs(normalizedRotation - 3 * Math.PI / 2) < 0.1 || Math.abs(normalizedRotation + Math.PI / 2) < 0.1) {
    return 'east';
  }

  // Fallback: use position to detect wall
  const { wallFaces, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
  const tolerance = 50; // 50cm tolerance

  // Check notch walls first for L-shaped rooms
  if (notch) {
    if (Math.abs(position[0] - notch.maxX) < tolerance && position[2] <= notch.maxZ) {
      return 'notch-east';
    }
    if (Math.abs(position[2] - notch.maxZ) < tolerance && position[0] <= notch.maxX) {
      return 'notch-south';
    }
  }

  if (Math.abs(position[2] - wallFaces.north) < tolerance) return 'north';
  if (Math.abs(position[2] - wallFaces.south) < tolerance) return 'south';
  if (Math.abs(position[0] - wallFaces.east) < tolerance) return 'east';
  if (Math.abs(position[0] - wallFaces.west) < tolerance) return 'west';

  return 'north'; // Default fallback
};

/**
 * Determine which wall the camera is facing based on position and target
 */
const getWallFacingCamera = (
  cameraPosition?: { x: number; y: number; z: number },
  cameraTarget?: { x: number; y: number; z: number }
): WallType => {
  if (!cameraPosition || !cameraTarget) {
    return 'south'; // Default to south wall
  }

  // Calculate view direction
  const dirX = cameraTarget.x - cameraPosition.x;
  const dirZ = cameraTarget.z - cameraPosition.z;

  // Determine which direction is dominant
  if (Math.abs(dirX) > Math.abs(dirZ)) {
    // Looking more along X axis
    return dirX > 0 ? 'east' : 'west';
  } else {
    // Looking more along Z axis
    return dirZ > 0 ? 'south' : 'north';
  }
};

/**
 * Check if a position has enough space (no collision)
 */
const hasSpaceAtPosition = (
  position: Position,
  objectType: ComponentType,
  scale: number,
  existingItems: BathroomItem[],
  excludeItemId: number = -1,
  sku?: string,
  roomWidth?: number,
  roomHeight?: number,
  notchWidth?: number,
  notchHeight?: number
): boolean => {
  const tempItem: BathroomItem = {
    id: excludeItemId,
    type: objectType,
    position: [position.x, position.y, position.z],
    scale,
    sku
  };

  return !wouldCollideWithExisting(
    position,
    objectType,
    scale,
    excludeItemId,
    existingItems,
    tempItem,
    roomWidth,
    roomHeight,
    notchWidth,
    notchHeight
  );
};

/**
 * Get item dimensions
 */
const getItemDimensions = (item: BathroomItem) => {
  return item.model?.dimensions || getDimensions(item.type, item.sku, item.model) || { width: 60, height: 60, depth: 40 };
};

/**
 * Calculate the top Y position of an item
 */
const getItemTopY = (item: BathroomItem): number => {
  const dimensions = getItemDimensions(item);
  const floorOffset = item.model?.floorOffset || 0;
  return item.position[1] + floorOffset + dimensions.height;
};

/**
 * Find longest empty wall segment
 */
const findLongestEmptyWallSegment = (
  context: AutoPositionContext,
  objectType: ComponentType,
  scale: number,
  orientation: OrientationConfig,
  sku?: string
): { wall: WallType; position: Position; rotation: number; length: number } | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems } = context;
  const { wallFaces, interior } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
  const dimensions = getDimensions(objectType, sku);

  if (!dimensions) return null;

  const segmentHalfWidth = dimensions.width * scale / 2;
  const halfDepth = dimensions.depth * scale / 2;
  const wallBuffer = orientation?.wallBuffer !== undefined ? orientation.wallBuffer * scale : 0;
  const isFlushMounted = wallBuffer === 0;

  const walls: Array<{
    name: WallType;
    length: number;
    getPosition: (t: number) => Position;
    rotation: number;
  }> = [
    {
      name: 'north',
      length: interior.maxX - interior.minX,
      getPosition: (t) => ({
        x: interior.minX + segmentHalfWidth + t * (interior.maxX - interior.minX - dimensions.width * scale),
        y: 0,
        z: isFlushMounted ? wallFaces.north : wallFaces.north + halfDepth + wallBuffer
      }),
      rotation: getObjectRotationForWall(objectType, 'north', orientation)
    },
    {
      name: 'south',
      length: interior.maxX - interior.minX,
      getPosition: (t) => ({
        x: interior.minX + segmentHalfWidth + t * (interior.maxX - interior.minX - dimensions.width * scale),
        y: 0,
        z: isFlushMounted ? wallFaces.south : wallFaces.south - halfDepth - wallBuffer
      }),
      rotation: getObjectRotationForWall(objectType, 'south', orientation)
    },
    {
      name: 'east',
      length: interior.maxZ - interior.minZ,
      getPosition: (t) => ({
        x: isFlushMounted ? wallFaces.east : wallFaces.east - halfDepth - wallBuffer,
        y: 0,
        z: interior.minZ + segmentHalfWidth + t * (interior.maxZ - interior.minZ - dimensions.width * scale)
      }),
      rotation: getObjectRotationForWall(objectType, 'east', orientation)
    },
    {
      name: 'west',
      length: interior.maxZ - interior.minZ,
      getPosition: (t) => ({
        x: isFlushMounted ? wallFaces.west : wallFaces.west + halfDepth + wallBuffer,
        y: 0,
        z: interior.minZ + segmentHalfWidth + t * (interior.maxZ - interior.minZ - dimensions.width * scale)
      }),
      rotation: getObjectRotationForWall(objectType, 'west', orientation)
    }
  ];

  // Sort walls by length (longest first)
  walls.sort((a, b) => b.length - a.length);

  // Try to find a valid position on each wall
  for (const wall of walls) {
    // Try multiple positions along the wall
    const positions = [0.5, 0.25, 0.75, 0, 1]; // Try center first

    for (const t of positions) {
      const position = wall.getPosition(t);

      if (hasSpaceAtPosition(
        position,
        objectType,
        scale,
        existingItems,
        -1,
        sku,
        roomWidth,
        roomHeight,
        notchWidth,
        notchHeight
      )) {
        return {
          wall: wall.name,
          position,
          rotation: wall.rotation,
          length: wall.length
        };
      }
    }
  }

  return null;
};

// ============================================================================
// MIRROR PLACEMENT LOGIC
// ============================================================================

/**
 * Position a mirror above a vanity unit
 * Primary: Find vanity, place mirror centered 20cm above
 * Fallback: Wall facing camera at eye level (160cm)
 */
export const positionMirror = (
  context: AutoPositionContext,
  mirrorVariant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems, cameraPosition, cameraTarget } = context;
  const vanities = findVanityUnits(existingItems);
  const spawnHeight = mirrorVariant?.spawnHeight || 0;

  // Primary: Find vanity without a mirror above it
  for (const vanity of vanities) {
    const vanityTop = getItemTopY(vanity);
    const vanityDimensions = getItemDimensions(vanity);

    // Check if this vanity already has a mirror
    const existingMirrors = findItemsByType(existingItems, 'Mirror');
    const hasMirror = existingMirrors.some(mirror => {
      const dx = Math.abs(mirror.position[0] - vanity.position[0]);
      const dz = Math.abs(mirror.position[2] - vanity.position[2]);
      return dx < vanityDimensions.width / 2 + 30 && dz < (vanityDimensions.depth || vanityDimensions.height) + 30;
    });

    if (hasMirror) continue;

    // Position mirror centered above vanity
    const mirrorPosition: Position = {
      x: vanity.position[0],
      y: vanityTop + MIRROR_HEIGHT_ABOVE_VANITY + spawnHeight,
      z: vanity.position[2]
    };

    // Check if position is clear
    if (hasSpaceAtPosition(
      mirrorPosition,
      'Mirror',
      scale,
      existingItems,
      -1,
      mirrorVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log('🪞 Auto-position: Mirror placed above vanity');
      return {
        position: mirrorPosition,
        rotation: vanity.rotation || 0,
        anchorItem: vanity,
        placementMethod: 'anchor'
      };
    }
  }

  // Fallback: Wall facing camera at eye level
  const targetWall = getWallFacingCamera(cameraPosition, cameraTarget);
  const { wallFaces, interior } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
  const orientation = mirrorVariant?.orientation || DEFAULT_ORIENTATION;

  let fallbackPosition: Position;
  let fallbackRotation: number;

  switch (targetWall) {
    case 'north':
      fallbackPosition = {
        x: (interior.minX + interior.maxX) / 2,
        y: EYE_LEVEL_HEIGHT + spawnHeight,
        z: wallFaces.north
      };
      fallbackRotation = getObjectRotationForWall('Mirror', 'north', orientation);
      break;
    case 'south':
      fallbackPosition = {
        x: (interior.minX + interior.maxX) / 2,
        y: EYE_LEVEL_HEIGHT + spawnHeight,
        z: wallFaces.south
      };
      fallbackRotation = getObjectRotationForWall('Mirror', 'south', orientation);
      break;
    case 'east':
      fallbackPosition = {
        x: wallFaces.east,
        y: EYE_LEVEL_HEIGHT + spawnHeight,
        z: (interior.minZ + interior.maxZ) / 2
      };
      fallbackRotation = getObjectRotationForWall('Mirror', 'east', orientation);
      break;
    case 'west':
    default:
      fallbackPosition = {
        x: wallFaces.west,
        y: EYE_LEVEL_HEIGHT + spawnHeight,
        z: (interior.minZ + interior.maxZ) / 2
      };
      fallbackRotation = getObjectRotationForWall('Mirror', 'west', orientation);
      break;
  }

  if (hasSpaceAtPosition(
    fallbackPosition,
    'Mirror',
    scale,
    existingItems,
    -1,
    mirrorVariant?.sku,
    roomWidth,
    roomHeight,
    notchWidth,
    notchHeight
  )) {
    console.log('🪞 Auto-position: Mirror placed on', targetWall, 'wall at eye level (fallback)');
    return {
      position: fallbackPosition,
      rotation: fallbackRotation,
      placementMethod: 'fallback'
    };
  }

  return null; // No valid position found
};

// ============================================================================
// TOILET PLACEMENT LOGIC
// ============================================================================

/**
 * Position a toilet as "sidekick" to vanity
 * Primary: 15cm to the right of vanity
 * Secondary: 15cm to the left if right is blocked
 * Fallback: Longest empty wall segment
 */
export const positionToilet = (
  context: AutoPositionContext,
  toiletVariant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems } = context;
  const vanities = findVanityUnits(existingItems);
  const toiletDimensions = toiletVariant?.dimensions || getDimensions('Toilet', toiletVariant?.sku) || { width: 40, height: 40, depth: 65 };
  const orientation = toiletVariant?.orientation || DEFAULT_ORIENTATION;
  const spawnHeight = toiletVariant?.spawnHeight || 0;

  // Primary: Try positioning beside vanity
  for (const vanity of vanities) {
    const vanityDimensions = getItemDimensions(vanity);
    const vanityWall = detectWallFromItem(vanity, roomWidth, roomHeight, notchWidth, notchHeight);

    // Calculate positions to the right and left of vanity
    const gap = TOILET_GAP_FROM_VANITY;
    const totalOffset = vanityDimensions.width / 2 + toiletDimensions.width / 2 + gap;

    let rightPosition: Position;
    let leftPosition: Position;

    // Position depends on which wall the vanity is on
    if (vanityWall === 'north' || vanityWall === 'south' || vanityWall === 'notch-south') {
      // Vanity on north/south wall: left/right are along X axis
      rightPosition = {
        x: vanity.position[0] + totalOffset,
        y: spawnHeight,
        z: vanity.position[2]
      };
      leftPosition = {
        x: vanity.position[0] - totalOffset,
        y: spawnHeight,
        z: vanity.position[2]
      };
    } else {
      // Vanity on east/west wall: left/right are along Z axis
      rightPosition = {
        x: vanity.position[0],
        y: spawnHeight,
        z: vanity.position[2] + totalOffset
      };
      leftPosition = {
        x: vanity.position[0],
        y: spawnHeight,
        z: vanity.position[2] - totalOffset
      };
    }

    // Try right side first
    if (hasSpaceAtPosition(
      rightPosition,
      'Toilet',
      scale,
      existingItems,
      -1,
      toiletVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log('🚽 Auto-position: Toilet placed to right of vanity');
      return {
        position: rightPosition,
        rotation: vanity.rotation || 0,
        anchorItem: vanity,
        placementMethod: 'anchor'
      };
    }

    // Try left side
    if (hasSpaceAtPosition(
      leftPosition,
      'Toilet',
      scale,
      existingItems,
      -1,
      toiletVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log('🚽 Auto-position: Toilet placed to left of vanity');
      return {
        position: leftPosition,
        rotation: vanity.rotation || 0,
        anchorItem: vanity,
        placementMethod: 'anchor'
      };
    }
  }

  // Fallback: Longest empty wall
  const wallResult = findLongestEmptyWallSegment(context, 'Toilet', scale, orientation, toiletVariant?.sku);

  if (wallResult) {
    const position = { ...wallResult.position, y: spawnHeight };
    console.log('🚽 Auto-position: Toilet placed on', wallResult.wall, 'wall (fallback)');
    return {
      position,
      rotation: wallResult.rotation,
      placementMethod: 'wall'
    };
  }

  return null;
};

// ============================================================================
// BATH PLACEMENT LOGIC
// ============================================================================

/**
 * Position a bath in the best corner
 * Primary: Back wall corner (opposite entry)
 * Secondary: Cycle clockwise through corners
 */
export const positionBath = (
  context: AutoPositionContext,
  bathVariant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems } = context;
  const bathDimensions = bathVariant?.dimensions || getDimensions('Bath', bathVariant?.sku) || { width: 170, height: 55, depth: 75 };
  const orientation = bathVariant?.orientation || DEFAULT_ORIENTATION;
  const spawnHeight = bathVariant?.spawnHeight || 0;
  const { wallFaces, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  // For baths, we want to place them length-wise against a wall in a corner
  const bathHalfWidth = bathDimensions.width * scale / 2;
  const halfDepth = bathDimensions.depth * scale / 2;
  const wallBuffer = orientation?.wallBuffer !== undefined ? orientation.wallBuffer * scale : 0;

  // Define corner configurations - prioritize back wall (south) corners
  const cornerConfigs: Array<{
    name: string;
    corner: CornerType;
    position: Position;
    rotation: number;
    priority: number;
  }> = [];

  // South-East corner (back-right) - highest priority
  cornerConfigs.push({
    name: 'south-east',
    corner: 'south-east',
    position: {
      x: wallFaces.east - bathHalfWidth - wallBuffer,
      y: spawnHeight,
      z: wallFaces.south - halfDepth - wallBuffer
    },
    rotation: getObjectRotationForWall('Bath', 'south', orientation),
    priority: 1
  });

  // South-West corner (back-left)
  cornerConfigs.push({
    name: 'south-west',
    corner: 'south-west',
    position: {
      x: wallFaces.west + bathHalfWidth + wallBuffer,
      y: spawnHeight,
      z: wallFaces.south - halfDepth - wallBuffer
    },
    rotation: getObjectRotationForWall('Bath', 'south', orientation),
    priority: 2
  });

  // North-East corner
  if (!notch) { // Skip if L-shaped room (notch is in NW)
    cornerConfigs.push({
      name: 'north-east',
      corner: 'north-east',
      position: {
        x: wallFaces.east - bathHalfWidth - wallBuffer,
        y: spawnHeight,
        z: wallFaces.north + halfDepth + wallBuffer
      },
      rotation: getObjectRotationForWall('Bath', 'north', orientation),
      priority: 3
    });
  }

  // North-West corner (only for rectangular rooms)
  if (!notch) {
    cornerConfigs.push({
      name: 'north-west',
      corner: 'north-west',
      position: {
        x: wallFaces.west + bathHalfWidth + wallBuffer,
        y: spawnHeight,
        z: wallFaces.north + halfDepth + wallBuffer
      },
      rotation: getObjectRotationForWall('Bath', 'north', orientation),
      priority: 4
    });
  }

  // For L-shaped rooms, add notch corners
  if (notch) {
    // Notch-interior corner
    cornerConfigs.push({
      name: 'notch-interior',
      corner: 'notch-interior',
      position: {
        x: notch.minX + bathHalfWidth + wallBuffer,
        y: spawnHeight,
        z: notch.maxZ + halfDepth + wallBuffer
      },
      rotation: getObjectRotationForWall('Bath', 'south', orientation),
      priority: 5
    });
  }

  // Sort by priority
  cornerConfigs.sort((a, b) => a.priority - b.priority);

  // Try each corner
  for (const config of cornerConfigs) {
    if (hasSpaceAtPosition(
      config.position,
      'Bath',
      scale,
      existingItems,
      -1,
      bathVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log('🛁 Auto-position: Bath placed in', config.name, 'corner');
      return {
        position: config.position,
        rotation: config.rotation,
        placementMethod: 'corner'
      };
    }
  }

  return null;
};

// ============================================================================
// SHOWER ENCLOSURE PLACEMENT LOGIC
// ============================================================================

/**
 * Position a shower enclosure in a corner
 * Showers are strictly corner-bound
 * Door opening should face into room
 */
export const positionShower = (
  context: AutoPositionContext,
  showerVariant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems, cameraPosition } = context;
  const orientation = showerVariant?.orientation || DEFAULT_ORIENTATION;
  const movement = showerVariant?.movement;
  const spawnHeight = showerVariant?.spawnHeight || 0;

  // Get all available corners
  const corners = getRoomCorners(roomWidth, roomHeight, notchWidth, notchHeight);

  // If camera position is available, sort corners by distance to camera focus
  let sortedCorners = [...corners];
  if (cameraPosition) {
    sortedCorners.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.position.x - cameraPosition.x, 2) +
        Math.pow(a.position.z - cameraPosition.z, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.position.x - cameraPosition.x, 2) +
        Math.pow(b.position.z - cameraPosition.z, 2)
      );
      return distA - distB; // Nearest first
    });
  }

  // Try each corner using constrainToCorner for proper positioning
  for (const corner of sortedCorners) {
    const result = constrainToCorner(corner.position, roomWidth, roomHeight, {
      type: 'Shower',
      scale,
      orientation,
      movement,
      sku: showerVariant?.sku,
      notchWidth,
      notchHeight
    });

    const position = { ...result.position, y: spawnHeight };

    if (hasSpaceAtPosition(
      position,
      'Shower',
      scale,
      existingItems,
      -1,
      showerVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log('🚿 Auto-position: Shower placed in', corner.type, 'corner');
      return {
        position,
        rotation: result.rotation,
        placementMethod: 'corner'
      };
    }
  }

  return null;
};

// ============================================================================
// VANITY UNIT PLACEMENT LOGIC
// ============================================================================

/**
 * Position a vanity unit on the wall facing the camera
 * Primary: Wall user is looking at, centered in view
 * Fallback: Offset if window/door detected
 */
export const positionVanity = (
  context: AutoPositionContext,
  vanityVariant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems, cameraPosition, cameraTarget } = context;
  const vanityDimensions = vanityVariant?.dimensions || getDimensions('Furniture', vanityVariant?.sku) || { width: 60, height: 55, depth: 40 };
  const orientation = vanityVariant?.orientation || DEFAULT_ORIENTATION;
  const spawnHeight = vanityVariant?.spawnHeight || 0;
  const { wallFaces, interior } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  const vanityHalfWidth = vanityDimensions.width * scale / 2;
  const halfDepth = vanityDimensions.depth * scale / 2;
  const wallBuffer = orientation?.wallBuffer !== undefined ? orientation.wallBuffer * scale : 0;
  const isFlushMounted = wallBuffer === 0;

  // Determine which wall to place on based on camera
  const targetWall = getWallFacingCamera(cameraPosition, cameraTarget);

  let position: Position;
  let rotation: number;

  switch (targetWall) {
    case 'north':
      position = {
        x: (interior.minX + interior.maxX) / 2,
        y: spawnHeight,
        z: isFlushMounted ? wallFaces.north : wallFaces.north + halfDepth + wallBuffer
      };
      rotation = getObjectRotationForWall('Furniture', 'north', orientation);
      break;
    case 'south':
      position = {
        x: (interior.minX + interior.maxX) / 2,
        y: spawnHeight,
        z: isFlushMounted ? wallFaces.south : wallFaces.south - halfDepth - wallBuffer
      };
      rotation = getObjectRotationForWall('Furniture', 'south', orientation);
      break;
    case 'east':
      position = {
        x: isFlushMounted ? wallFaces.east : wallFaces.east - halfDepth - wallBuffer,
        y: spawnHeight,
        z: (interior.minZ + interior.maxZ) / 2
      };
      rotation = getObjectRotationForWall('Furniture', 'east', orientation);
      break;
    case 'west':
    default:
      position = {
        x: isFlushMounted ? wallFaces.west : wallFaces.west + halfDepth + wallBuffer,
        y: spawnHeight,
        z: (interior.minZ + interior.maxZ) / 2
      };
      rotation = getObjectRotationForWall('Furniture', 'west', orientation);
      break;
  }

  // Check if centered position is available
  if (hasSpaceAtPosition(
    position,
    'Furniture',
    scale,
    existingItems,
    -1,
    vanityVariant?.sku,
    roomWidth,
    roomHeight,
    notchWidth,
    notchHeight
  )) {
    console.log('🪥 Auto-position: Vanity placed centered on', targetWall, 'wall');
    return {
      position,
      rotation,
      placementMethod: 'wall'
    };
  }

  // Fallback: Try offsetting to the right
  const offsetPositions = [0.25, 0.75, 0.1, 0.9];

  for (const offset of offsetPositions) {
    let offsetPosition: Position;

    if (targetWall === 'north' || targetWall === 'south') {
      offsetPosition = {
        ...position,
        x: interior.minX + vanityHalfWidth + offset * (interior.maxX - interior.minX - vanityDimensions.width * scale)
      };
    } else {
      offsetPosition = {
        ...position,
        z: interior.minZ + vanityHalfWidth + offset * (interior.maxZ - interior.minZ - vanityDimensions.width * scale)
      };
    }

    if (hasSpaceAtPosition(
      offsetPosition,
      'Furniture',
      scale,
      existingItems,
      -1,
      vanityVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log('🪥 Auto-position: Vanity placed offset on', targetWall, 'wall');
      return {
        position: offsetPosition,
        rotation,
        placementMethod: 'wall'
      };
    }
  }

  // Final fallback: Try any wall
  const wallResult = findLongestEmptyWallSegment(context, 'Furniture', scale, orientation, vanityVariant?.sku);

  if (wallResult) {
    const pos = { ...wallResult.position, y: spawnHeight };
    console.log('🪥 Auto-position: Vanity placed on', wallResult.wall, 'wall (fallback)');
    return {
      position: pos,
      rotation: wallResult.rotation,
      placementMethod: 'fallback'
    };
  }

  return null;
};

// ============================================================================
// HEATED TOWEL RAIL (RADIATOR) PLACEMENT LOGIC
// ============================================================================

/**
 * Position a heated towel rail near bath or vanity
 * Primary: Foot end of bath (if >60cm wall space)
 * Secondary: Open side of vanity (opposite toilet)
 * Height: Bottom @ 60cm from floor (UK standard)
 */
export const positionTowelRail = (
  context: AutoPositionContext,
  radiatorVariant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems } = context;
  const radiatorDimensions = radiatorVariant?.dimensions || getDimensions('Radiator', radiatorVariant?.sku) || { width: 50, height: 80, depth: 10 };
  const orientation = radiatorVariant?.orientation || DEFAULT_ORIENTATION;
  const spawnHeight = radiatorVariant?.spawnHeight || TOWEL_RAIL_HEIGHT;
  const { wallFaces } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  const halfDepth = radiatorDimensions.depth * scale / 2;
  const wallBuffer = orientation?.wallBuffer !== undefined ? orientation.wallBuffer * scale : 0;

  // Primary: Find bath and place at foot end
  const baths = findBaths(existingItems);

  for (const bath of baths) {
    const bathDimensions = getItemDimensions(bath);
    const bathWall = detectWallFromItem(bath, roomWidth, roomHeight, notchWidth, notchHeight);

    // Calculate foot end position (opposite end from fixtures)
    // Bath is typically length-wise along a wall
    let footEndPosition: Position;
    let rotation: number;

    if (bathWall === 'north' || bathWall === 'south') {
      // Bath on north/south wall - foot end is on east or west wall
      // Determine which end based on bath position
      const distToEast = wallFaces.east - (bath.position[0] + bathDimensions.width / 2);
      const distToWest = (bath.position[0] - bathDimensions.width / 2) - wallFaces.west;

      if (distToEast < distToWest) {
        // Closer to east wall - foot end is east
        footEndPosition = {
          x: wallFaces.east - halfDepth - wallBuffer,
          y: spawnHeight,
          z: bath.position[2]
        };
        rotation = getObjectRotationForWall('Radiator', 'east', orientation);
      } else {
        // Closer to west wall - foot end is west
        footEndPosition = {
          x: wallFaces.west + halfDepth + wallBuffer,
          y: spawnHeight,
          z: bath.position[2]
        };
        rotation = getObjectRotationForWall('Radiator', 'west', orientation);
      }
    } else {
      // Bath on east/west wall - foot end is on north or south wall
      const distToSouth = wallFaces.south - (bath.position[2] + bathDimensions.width / 2);
      const distToNorth = (bath.position[2] - bathDimensions.width / 2) - wallFaces.north;

      if (distToSouth < distToNorth) {
        footEndPosition = {
          x: bath.position[0],
          y: spawnHeight,
          z: wallFaces.south - halfDepth - wallBuffer
        };
        rotation = getObjectRotationForWall('Radiator', 'south', orientation);
      } else {
        footEndPosition = {
          x: bath.position[0],
          y: spawnHeight,
          z: wallFaces.north + halfDepth + wallBuffer
        };
        rotation = getObjectRotationForWall('Radiator', 'north', orientation);
      }
    }

    if (hasSpaceAtPosition(
      footEndPosition,
      'Radiator',
      scale,
      existingItems,
      -1,
      radiatorVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log('🔥 Auto-position: Towel rail placed at bath foot end');
      return {
        position: footEndPosition,
        rotation,
        anchorItem: bath,
        placementMethod: 'anchor'
      };
    }
  }

  // Secondary: Find vanity and place on free side (opposite toilet)
  const vanities = findVanityUnits(existingItems);
  const toilets = findItemsByType(existingItems, 'Toilet');

  for (const vanity of vanities) {
    const vanityDimensions = getItemDimensions(vanity);
    const vanityWall = detectWallFromItem(vanity, roomWidth, roomHeight, notchWidth, notchHeight);

    // Determine which side the toilet is on
    let toiletOnRight = false;

    for (const toilet of toilets) {
      if (vanityWall === 'north' || vanityWall === 'south') {
        if (toilet.position[0] > vanity.position[0]) toiletOnRight = true;
      } else {
        if (toilet.position[2] > vanity.position[2]) toiletOnRight = true;
      }
    }

    // Place on the opposite side from toilet
    const gap = 30; // 30cm gap from vanity
    const totalOffset = vanityDimensions.width / 2 + radiatorDimensions.width / 2 + gap;

    let position: Position;
    let rotation: number;

    if (vanityWall === 'north' || vanityWall === 'south') {
      const xOffset = toiletOnRight ? -totalOffset : totalOffset;
      position = {
        x: vanity.position[0] + xOffset,
        y: spawnHeight,
        z: vanity.position[2]
      };
      rotation = vanity.rotation || 0;
    } else {
      const zOffset = toiletOnRight ? -totalOffset : totalOffset;
      position = {
        x: vanity.position[0],
        y: spawnHeight,
        z: vanity.position[2] + zOffset
      };
      rotation = vanity.rotation || 0;
    }

    if (hasSpaceAtPosition(
      position,
      'Radiator',
      scale,
      existingItems,
      -1,
      radiatorVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log('🔥 Auto-position: Towel rail placed beside vanity (opposite toilet)');
      return {
        position,
        rotation,
        anchorItem: vanity,
        placementMethod: 'anchor'
      };
    }
  }

  // Fallback: Any available wall position
  const wallResult = findLongestEmptyWallSegment(context, 'Radiator', scale, orientation, radiatorVariant?.sku);

  if (wallResult) {
    const position = { ...wallResult.position, y: spawnHeight };
    console.log('🔥 Auto-position: Towel rail placed on', wallResult.wall, 'wall (fallback)');
    return {
      position,
      rotation: wallResult.rotation,
      placementMethod: 'fallback'
    };
  }

  return null;
};

// ============================================================================
// SINK PLACEMENT LOGIC (similar to Toilet)
// ============================================================================

/**
 * Position a sink - typically on a wall, often near plumbing
 */
export const positionSink = (
  context: AutoPositionContext,
  sinkVariant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  const orientation = sinkVariant?.orientation || DEFAULT_ORIENTATION;
  const spawnHeight = sinkVariant?.spawnHeight || 0;

  // Sinks typically go on walls - use the longest empty wall segment
  const wallResult = findLongestEmptyWallSegment(context, 'Sink', scale, orientation, sinkVariant?.sku);

  if (wallResult) {
    const position = { ...wallResult.position, y: spawnHeight };
    console.log('🚰 Auto-position: Sink placed on', wallResult.wall, 'wall');
    return {
      position,
      rotation: wallResult.rotation,
      placementMethod: 'wall'
    };
  }

  return null;
};

// ============================================================================
// MAIN AUTO-POSITION FUNCTION
// ============================================================================

/**
 * Main function to auto-position any item type
 * Dispatches to the appropriate placement function based on item type
 */
export const autoPositionItem = (
  itemType: ComponentType,
  context: AutoPositionContext,
  variant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  console.log(`🎯 Auto-positioning ${itemType}...`);

  switch (itemType) {
    case 'Mirror':
      return positionMirror(context, variant, scale);

    case 'Toilet':
      return positionToilet(context, variant, scale);

    case 'Bath':
      return positionBath(context, variant, scale);

    case 'Shower':
      return positionShower(context, variant, scale);

    case 'Furniture': // Vanity units
      return positionVanity(context, variant, scale);

    case 'Radiator': // Heated towel rails
      return positionTowelRail(context, variant, scale);

    case 'Sink':
      return positionSink(context, variant, scale);

    default:
      console.log(`⚠️ No auto-position logic for ${itemType}, using default placement`);
      return null;
  }
};
