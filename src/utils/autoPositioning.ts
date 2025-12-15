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
  constrainToCorner,
  checkWallCollision
} from './constraints';
import { getObjectRotationForWall, getMovementConfig } from './models';
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
  selectedItemId?: string;  // Currently selected item ID (for prioritizing anchor placement)
}

export interface AutoPositionResult {
  position: Position;
  rotation: number;
  anchorItem?: BathroomItem;  // The item this was positioned relative to
  placementMethod: 'anchor' | 'corner' | 'wall' | 'fallback' | 'none';
  /** Reason for placement failure (only set when placementMethod is 'none') */
  reason?: 'no-auto-position-logic' | 'no-space-found' | 'no-anchor-available';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TOILET_GAP_FROM_VANITY = 15;      // 15cm gap between toilet and vanity
const TOWEL_RAIL_BOTTOM_HEIGHT = 60;    // Bottom of rail @ 60cm from floor (UK electrical zone standard)
const MIN_WALL_SPACE_FOR_TOWEL_RAIL = 60; // Minimum 60cm (600mm) wall space required

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
 * Find all towel rails (both 'TowelRails' and 'Radiator' types for compatibility)
 */
const findTowelRails = (items: BathroomItem[]): BathroomItem[] => {
  return items.filter(item => item.type === 'TowelRails' || item.type === 'Radiator');
};

/**
 * Check if a bath already has a towel rail placed near it
 */
const bathHasTowelRailNearby = (
  bath: BathroomItem,
  existingItems: BathroomItem[],
  threshold: number = 100 // 100cm proximity threshold
): boolean => {
  const towelRails = findTowelRails(existingItems);
  const bathX = bath.position[0];
  const bathZ = bath.position[2];
  const bathDimensions = bath.model?.dimensions || { width: 170, depth: 70 };

  // Check if any towel rail is within threshold distance of the bath's edges
  for (const rail of towelRails) {
    const railX = rail.position[0];
    const railZ = rail.position[2];

    // Calculate distance from rail to bath center
    const dx = Math.abs(railX - bathX);
    const dz = Math.abs(railZ - bathZ);

    // Check if rail is close to bath (within bath dimensions + threshold)
    const maxX = (bathDimensions.width / 2) + threshold;
    const maxZ = ((bathDimensions.depth || 70) / 2) + threshold;

    if (dx < maxX && dz < maxZ) {
      console.log('🔥 Bath already has towel rail nearby:', {
        bathPosition: [bathX, bathZ],
        railPosition: [railX, railZ],
        distance: { dx, dz }
      });
      return true;
    }
  }

  return false;
};

/**
 * Calculate proper Y position for towel rail so visual bottom is at 60cm from floor
 * Formula: position.y = desiredBottomHeight - floorOffset
 */
const calculateTowelRailY = (variant: any): number => {
  const floorOffset = variant?.floorOffset || 0;
  return TOWEL_RAIL_BOTTOM_HEIGHT - floorOffset;
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
 * Check if a position has enough space (no collision with walls or existing items)
 * This is a critical function that validates placement positions
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
  // First check: Wall boundaries
  // If roomWidth/roomHeight not provided, skip wall check
  // Also skip wall check for corner-install items (they're placed at corners by design)
  if (roomWidth && roomHeight) {
    const tempItem: BathroomItem = {
      id: excludeItemId,
      type: objectType,
      position: [position.x, position.y, position.z],
      scale,
      sku
    };

    // Skip wall collision for corner-install items during auto-positioning
    const movementConfig = getMovementConfig(objectType, tempItem);
    const isCornerInstall = movementConfig.cornerInstallOnly &&
      typeof movementConfig.cornerInstallOnly === 'object' &&
      movementConfig.cornerInstallOnly.enabled;

    if (!isCornerInstall) {
      // Check if position would collide with walls (including L-shape notch)
      const wallCollision = checkWallCollision(
        position,
        objectType,
        scale,
        roomWidth,
        roomHeight,
        tempItem,
        undefined, // rotation
        notchWidth,
        notchHeight
      );

      if (wallCollision) {
        console.log(`🚫 Wall collision detected for ${objectType} at`, {
          x: position.x.toFixed(1),
          z: position.z.toFixed(1)
        });
        return false;
      }
    } else {
      console.log(`✅ Skipping wall collision for corner-install ${objectType}`);
    }
  }

  // Second check: Collision with existing items
  const tempItem: BathroomItem = {
    id: excludeItemId,
    type: objectType,
    position: [position.x, position.y, position.z],
    scale,
    sku
  };

  const itemCollision = wouldCollideWithExisting(
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

  if (itemCollision) {
    console.log(`🚫 Item collision detected for ${objectType} at`, {
      x: position.x.toFixed(1),
      z: position.z.toFixed(1)
    });
    return false;
  }

  return true;
};

/**
 * Get item dimensions
 */
const getItemDimensions = (item: BathroomItem) => {
  return item.model?.dimensions || getDimensions(item.type, item.sku, item.model) || { width: 60, height: 60, depth: 40 };
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
  const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
  const dimensions = getDimensions(objectType, sku);

  if (!dimensions) return null;

  const segmentHalfWidth = dimensions.width * scale / 2;
  const halfDepth = dimensions.depth * scale / 2;
  const wallBuffer = orientation?.wallBuffer !== undefined ? orientation.wallBuffer * scale : 0;
  const isFlushMounted = wallBuffer === 0;

  // ✅ FIX: For L-shaped rooms, adjust north wall start and west wall end to avoid notch area
  const northWallMinX = notch ? notch.maxX : interior.minX;
  const northWallLength = interior.maxX - northWallMinX;
  const westWallMaxZ = notch ? notch.maxZ : interior.maxZ;
  const westWallLength = westWallMaxZ - interior.minZ;

  const walls: Array<{
    name: WallType;
    length: number;
    getPosition: (t: number) => Position;
    rotation: number;
  }> = [
    {
      name: 'north',
      // ✅ FIX: Use adjusted length for L-shaped rooms
      length: northWallLength,
      getPosition: (t) => ({
        // ✅ FIX: Start from notch.maxX for L-shaped rooms
        x: northWallMinX + segmentHalfWidth + t * (northWallLength - dimensions.width * scale),
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
      // ✅ FIX: Use adjusted length for L-shaped rooms
      length: westWallLength,
      getPosition: (t) => ({
        x: isFlushMounted ? wallFaces.west : wallFaces.west + halfDepth + wallBuffer,
        y: 0,
        // ✅ FIX: End at notch.maxZ for L-shaped rooms
        z: interior.minZ + segmentHalfWidth + t * (westWallLength - dimensions.width * scale)
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
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems, cameraPosition, cameraTarget, selectedItemId } = context;
  const vanities = findVanityUnits(existingItems);
  const spawnHeight = mirrorVariant?.spawnHeight || 0;

  // Secondary Rule: If multiple vanities exist, prioritize:
  // 1. Currently selected vanity (if it's a vanity)
  // 2. Last added vanity (reverse order since items are added chronologically)
  let sortedVanities = [...vanities];

  // Check if selected item is a vanity - move it to front
  let selectedVanityFound = false;
  if (selectedItemId) {
    const selectedVanityIndex = sortedVanities.findIndex(v => String(v.id) === selectedItemId);
    if (selectedVanityIndex >= 0) {
      selectedVanityFound = true;
      if (selectedVanityIndex > 0) {
        // Move selected vanity to front
        const [selectedVanity] = sortedVanities.splice(selectedVanityIndex, 1);
        sortedVanities.unshift(selectedVanity);
      }
      console.log('🪞 Prioritizing selected vanity for mirror placement:', selectedItemId);
    }
  }

  // If no vanity is selected, reverse to prioritize last added
  if (!selectedVanityFound) {
    sortedVanities.reverse();
    console.log('🪞 Prioritizing last added vanity for mirror placement (reversed order)');
  }

  console.log('🪞 Vanity order for mirror placement:', sortedVanities.map(v => v.id));

  // Primary: Find vanity without a mirror above it
  for (const vanity of sortedVanities) {
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
    // Mirror.x = Vanity.x
    // Mirror.y = Vanity.top + 200mm (20cm gap above vanity)
    //
    // IMPORTANT: When placing above vanity, ignore the mirror's floorOffset.
    // floorOffset is for standalone wall placement (visual bottom = position.y + floorOffset)
    // For anchor-based placement, we want the visual bottom at vanityTop + gap,
    // so we need: position.y = vanityTop + gap - floorOffset
    const MIRROR_GAP_ABOVE_VANITY = 20; // 20cm (200mm) gap above vanity top
    const vanityTopY = (vanity.position[1] || 0) + vanityDimensions.height;

    // Get mirror's floorOffset to compensate for it
    // Visual bottom should be at vanityTopY + gap
    // Since visual bottom = position.y + floorOffset
    // We need: position.y = (vanityTopY + gap) - floorOffset
    const mirrorFloorOffset = mirrorVariant?.floorOffset || 0;
    const desiredVisualBottom = vanityTopY + MIRROR_GAP_ABOVE_VANITY;
    const mirrorY = desiredVisualBottom - mirrorFloorOffset;

    const mirrorPosition: Position = {
      x: vanity.position[0],
      y: mirrorY,
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
      console.log('🪞 Auto-position: Mirror placed above vanity', {
        vanityTopY,
        mirrorFloorOffset,
        desiredVisualBottom,
        mirrorSceneY: mirrorY,
        actualVisualBottom: mirrorY + mirrorFloorOffset,
        note: 'Mirror floorOffset is subtracted so visual bottom aligns with vanityTop + 20cm gap'
      });
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
  const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
  const orientation = mirrorVariant?.orientation || DEFAULT_ORIENTATION;

  // ✅ FIX: For L-shaped rooms, adjust wall boundaries to avoid notch area
  const northWallMinX = notch ? notch.maxX : interior.minX;
  const westWallMaxZ = notch ? notch.maxZ : interior.maxZ;

  // ✅ FIX: Use spawnHeight directly - this is the actual Y position where the mirror will be placed
  // The Planner.vue addItem function uses selectedVariant?.spawnHeight for the Y position
  const mirrorY = spawnHeight;

  let fallbackPosition: Position;
  let fallbackRotation: number;

  switch (targetWall) {
    case 'north':
      fallbackPosition = {
        // ✅ FIX: Use northWallMinX for L-shaped rooms
        x: (northWallMinX + interior.maxX) / 2,
        y: mirrorY,
        z: wallFaces.north
      };
      fallbackRotation = getObjectRotationForWall('Mirror', 'north', orientation);
      break;
    case 'south':
      fallbackPosition = {
        x: (interior.minX + interior.maxX) / 2,
        y: mirrorY,
        z: wallFaces.south
      };
      fallbackRotation = getObjectRotationForWall('Mirror', 'south', orientation);
      break;
    case 'east':
      fallbackPosition = {
        x: wallFaces.east,
        y: mirrorY,
        z: (interior.minZ + interior.maxZ) / 2
      };
      fallbackRotation = getObjectRotationForWall('Mirror', 'east', orientation);
      break;
    case 'west':
    default:
      fallbackPosition = {
        x: wallFaces.west,
        y: mirrorY,
        // ✅ FIX: Use westWallMaxZ for L-shaped rooms
        z: (interior.minZ + westWallMaxZ) / 2
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
 *
 * For corner-install baths, uses constrainToCorner for proper flush placement
 */
export const positionBath = (
  context: AutoPositionContext,
  bathVariant: any,
  scale: number = 1.0
): AutoPositionResult | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems } = context;
  const orientation = bathVariant?.orientation || DEFAULT_ORIENTATION;
  const movement = bathVariant?.movement;
  const spawnHeight = bathVariant?.spawnHeight || 0;

  // Check if this is a corner-install bath
  const isCornerInstall = movement?.cornerInstallOnly?.enabled === true;

  // Find the door to determine the "back wall" (opposite to door)
  // Note: Doors can be typed as 'Door' or 'WindowAndDoor' depending on source
  const doors = existingItems.filter(item =>
    item.type === 'Door' || item.type === ('WindowAndDoor' as any) || item.sku?.includes('DOOR')
  );
  let doorWall: WallType | null = null;
  let backWall: WallType = 'south'; // Default to south if no door found

  if (doors.length > 0) {
    // Use the first door to determine door wall
    doorWall = detectWallFromItem(doors[0], roomWidth, roomHeight, notchWidth, notchHeight);
    // Back wall is opposite to door wall
    const oppositeWalls: Record<WallType, WallType> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'notch-south': 'north',
      'notch-east': 'west'
    };
    backWall = oppositeWalls[doorWall] || 'south';
    console.log('🚪 Door found on', doorWall, 'wall -> Back wall is', backWall);
  } else {
    console.log('🚪 No door found, defaulting back wall to south');
  }

  // Get all available corners
  const allCorners = getRoomCorners(roomWidth, roomHeight, notchWidth, notchHeight);

  // Prioritize corners based on back wall (opposite to door)
  // Corners on the back wall get highest priority, then cycle clockwise
  const getCornerPriority = (cornerType: CornerType): number => {
    // Define which corners are on which walls
    const cornersOnWall: Record<WallType, CornerType[]> = {
      'south': ['south-east', 'south-west'],
      'north': ['north-east', 'north-west'],
      'east': ['south-east', 'north-east'],
      'west': ['south-west', 'north-west'],
      'notch-south': ['notch-interior'],
      'notch-east': ['notch-interior']
    };

    // Back wall corners get priority 1-2
    if (cornersOnWall[backWall]?.includes(cornerType)) {
      return cornersOnWall[backWall].indexOf(cornerType) + 1;
    }

    // Clockwise from back wall for other corners
    const clockwiseOrder: WallType[] = ['south', 'west', 'north', 'east'];
    const backWallIndex = clockwiseOrder.indexOf(backWall);

    // Find which wall this corner is primarily on (not the back wall)
    for (let i = 1; i < 4; i++) {
      const wallIndex = (backWallIndex + i) % 4;
      const wall = clockwiseOrder[wallIndex];
      if (cornersOnWall[wall]?.includes(cornerType)) {
        return 2 + i * 2 + cornersOnWall[wall].indexOf(cornerType);
      }
    }

    // Notch corners get lowest priority
    if (cornerType.includes('notch')) return 10;
    return 99;
  };

  const sortedCorners = [...allCorners].sort((a, b) => {
    return getCornerPriority(a.type) - getCornerPriority(b.type);
  });

  console.log('🛁 Corner priority order:', sortedCorners.map(c => c.type).join(' -> '));

  // For corner-install baths, use constrainToCorner for proper placement
  if (isCornerInstall) {
    console.log('🛁 Bath is corner-install, using constrainToCorner for placement');

    for (const corner of sortedCorners) {
      // Use constrainToCorner which properly calculates flush corner positioning
      const result = constrainToCorner(corner.position, roomWidth, roomHeight, {
        type: 'Bath',
        scale,
        orientation,
        movement,
        sku: bathVariant?.sku,
        notchWidth,
        notchHeight
      });

      const position = { ...result.position, y: spawnHeight };

      // Check if this position is valid (no collisions)
      if (hasSpaceAtPosition(
        position,
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
        console.log('🛁 Auto-position: Corner-install bath placed in', corner.type, 'corner');
        return {
          position,
          rotation: result.rotation,
          placementMethod: 'corner'
        };
      }
    }

    // No free corner found for corner-install bath
    console.log('🛁 No free corner available for corner-install bath');
    return null;
  }

  // For non-corner-install baths (freestanding), use manual corner positioning
  // Rule: Snap bath length-ways against the LONGEST wall of each corner
  const bathDimensions = bathVariant?.dimensions || getDimensions('Bath', bathVariant?.sku) || { width: 170, height: 55, depth: 75 };
  const { wallFaces, notch, interior } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  const bathLength = bathDimensions.width * scale; // Bath length (the long dimension)
  const bathWidth = bathDimensions.depth * scale;  // Bath width (the short dimension)
  const bathHalfLength = bathLength / 2;
  const bathHalfWidth = bathWidth / 2;
  const wallBuffer = orientation?.wallBuffer !== undefined ? orientation.wallBuffer * scale : 0;

  // Calculate wall lengths
  // ✅ FIX: For L-shaped rooms, north wall starts at notch.maxX (not notch.minX)
  const southWallLength = interior.maxX - interior.minX; // Full width of room
  const northWallLength = notch ? (interior.maxX - notch.maxX) : (interior.maxX - interior.minX);
  const eastWallLength = interior.maxZ - interior.minZ;  // Full height of room
  const westWallLength = notch ? (notch.maxZ - interior.minZ) : (interior.maxZ - interior.minZ);

  console.log('🛁 Room wall lengths:', { south: southWallLength, north: northWallLength, east: eastWallLength, west: westWallLength });

  // Helper to create corner config based on which wall is longer
  const createCornerConfig = (
    cornerName: string,
    cornerType: CornerType,
    wall1: WallType,
    wall1Length: number,
    wall2: WallType,
    wall2Length: number,
    priority: number
  ) => {
    // Determine which wall the bath should snap against (the longer one)
    const snapToWall1 = wall1Length >= wall2Length;
    const snapWall = snapToWall1 ? wall1 : wall2;

    console.log(`🛁 Corner ${cornerName}: wall1=${wall1}(${wall1Length.toFixed(0)}cm) vs wall2=${wall2}(${wall2Length.toFixed(0)}cm) -> snap to ${snapWall}`);

    let position: Position;
    let rotation: number;

    // Calculate position based on which wall to snap length against
    if (cornerType === 'south-east') {
      if (snapWall === 'south') {
        // Length along south wall (X axis), depth toward north
        position = {
          x: wallFaces.east - bathHalfLength - wallBuffer,
          y: spawnHeight,
          z: wallFaces.south - bathHalfWidth - wallBuffer
        };
        rotation = Math.PI; // Facing north
      } else {
        // Length along east wall (Z axis), depth toward west
        position = {
          x: wallFaces.east - bathHalfWidth - wallBuffer,
          y: spawnHeight,
          z: wallFaces.south - bathHalfLength - wallBuffer
        };
        rotation = Math.PI / 2; // Facing west
      }
    } else if (cornerType === 'south-west') {
      if (snapWall === 'south') {
        // Length along south wall (X axis)
        position = {
          x: wallFaces.west + bathHalfLength + wallBuffer,
          y: spawnHeight,
          z: wallFaces.south - bathHalfWidth - wallBuffer
        };
        rotation = Math.PI; // Facing north
      } else {
        // Length along west wall (Z axis)
        position = {
          x: wallFaces.west + bathHalfWidth + wallBuffer,
          y: spawnHeight,
          z: wallFaces.south - bathHalfLength - wallBuffer
        };
        rotation = -Math.PI / 2; // Facing east
      }
    } else if (cornerType === 'north-east') {
      if (snapWall === 'north') {
        // Length along north wall (X axis)
        position = {
          x: wallFaces.east - bathHalfLength - wallBuffer,
          y: spawnHeight,
          z: wallFaces.north + bathHalfWidth + wallBuffer
        };
        rotation = 0; // Facing south
      } else {
        // Length along east wall (Z axis)
        position = {
          x: wallFaces.east - bathHalfWidth - wallBuffer,
          y: spawnHeight,
          z: wallFaces.north + bathHalfLength + wallBuffer
        };
        rotation = Math.PI / 2; // Facing west
      }
    } else if (cornerType === 'north-west') {
      if (snapWall === 'north') {
        // Length along north wall (X axis)
        position = {
          x: wallFaces.west + bathHalfLength + wallBuffer,
          y: spawnHeight,
          z: wallFaces.north + bathHalfWidth + wallBuffer
        };
        rotation = 0; // Facing south
      } else {
        // Length along west wall (Z axis)
        position = {
          x: wallFaces.west + bathHalfWidth + wallBuffer,
          y: spawnHeight,
          z: wallFaces.north + bathHalfLength + wallBuffer
        };
        rotation = -Math.PI / 2; // Facing east
      }
    } else {
      // Default fallback for notch corners
      position = {
        x: wallFaces.west + bathHalfLength + wallBuffer,
        y: spawnHeight,
        z: wallFaces.south - bathHalfWidth - wallBuffer
      };
      rotation = Math.PI;
    }

    return { name: cornerName, corner: cornerType, position, rotation, priority };
  };

  // Define corner configurations - prioritize corners on the back wall (opposite to door)
  const cornerConfigs: Array<{
    name: string;
    corner: CornerType;
    position: Position;
    rotation: number;
    priority: number;
  }> = [];

  // Add all corners with dynamic priority based on back wall
  cornerConfigs.push(createCornerConfig('south-east', 'south-east', 'south', southWallLength, 'east', eastWallLength, getCornerPriority('south-east')));
  cornerConfigs.push(createCornerConfig('south-west', 'south-west', 'south', southWallLength, 'west', westWallLength, getCornerPriority('south-west')));

  if (!notch) {
    cornerConfigs.push(createCornerConfig('north-east', 'north-east', 'north', northWallLength, 'east', eastWallLength, getCornerPriority('north-east')));
    cornerConfigs.push(createCornerConfig('north-west', 'north-west', 'north', northWallLength, 'west', westWallLength, getCornerPriority('north-west')));
  }

  // For L-shaped rooms, add notch corners
  if (notch) {
    // ✅ FIX: notch-south wall length is from notch.minX to notch.maxX
    const notchSouthLength = notch.maxX - notch.minX;
    const notchWestLength = notch.maxZ - interior.minZ;
    cornerConfigs.push(createCornerConfig('notch-interior', 'notch-interior', 'south', notchSouthLength, 'west', notchWestLength, getCornerPriority('notch-interior')));
  }

  // Sort by priority (back wall corners first, then clockwise)
  cornerConfigs.sort((a, b) => a.priority - b.priority);

  console.log('🛁 Freestanding bath corner priority:', cornerConfigs.map(c => `${c.name}(${c.priority})`).join(' -> '));

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

  // Sort corners by distance from camera position (furthest first)
  // The camera looks at room center, so corners furthest from camera are the ones
  // the user is looking at (in the camera's field of view)
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
      return distB - distA; // Furthest from camera first (= in camera's view)
    });
    console.log('🚿 Shower corner priority (furthest from camera = in view):', sortedCorners.map(c => c.type).join(' -> '));
  }

  // Use constrainToCorner for positioning (tested/working logic)
  // This handles the complex positioning math for each corner type
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

    console.log(`🚿 Trying ${corner.type} corner: position=(${position.x.toFixed(1)}, ${position.z.toFixed(1)}), rotation=${(result.rotation * 180 / Math.PI).toFixed(0)}°`);

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
  const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  const vanityHalfWidth = vanityDimensions.width * scale / 2;
  const halfDepth = vanityDimensions.depth * scale / 2;
  const wallBuffer = orientation?.wallBuffer !== undefined ? orientation.wallBuffer * scale : 0;
  const isFlushMounted = wallBuffer === 0;

  // ✅ FIX: For L-shaped rooms, adjust wall boundaries to avoid notch area
  const northWallMinX = notch ? notch.maxX : interior.minX;
  const westWallMaxZ = notch ? notch.maxZ : interior.maxZ;

  // Determine which wall to place on based on camera
  const targetWall = getWallFacingCamera(cameraPosition, cameraTarget);

  let position: Position;
  let rotation: number;

  switch (targetWall) {
    case 'north':
      position = {
        // ✅ FIX: Use northWallMinX for L-shaped rooms
        x: (northWallMinX + interior.maxX) / 2,
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
        // ✅ FIX: Use westWallMaxZ for L-shaped rooms
        z: (interior.minZ + westWallMaxZ) / 2
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

    if (targetWall === 'north') {
      // ✅ FIX: Use northWallMinX for L-shaped rooms on north wall
      const northWallLength = interior.maxX - northWallMinX;
      offsetPosition = {
        ...position,
        x: northWallMinX + vanityHalfWidth + offset * (northWallLength - vanityDimensions.width * scale)
      };
    } else if (targetWall === 'south') {
      offsetPosition = {
        ...position,
        x: interior.minX + vanityHalfWidth + offset * (interior.maxX - interior.minX - vanityDimensions.width * scale)
      };
    } else if (targetWall === 'west') {
      // ✅ FIX: Use westWallMaxZ for L-shaped rooms on west wall
      const westWallLength = westWallMaxZ - interior.minZ;
      offsetPosition = {
        ...position,
        z: interior.minZ + vanityHalfWidth + offset * (westWallLength - vanityDimensions.width * scale)
      };
    } else {
      // east wall
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
 *
 * PRIMARY RULE (Bath Foot End):
 * - Find Bath → Check wall space at foot end → Require >60cm space → Place there
 *
 * SECONDARY RULE (Vanity Side):
 * - If no bath or space blocked → Find Vanity → Place on free side (opposite toilet)
 *
 * HEIGHT: Bottom of rail @ 60cm from floor (UK electrical zone standard)
 */
export const positionTowelRail = (
  context: AutoPositionContext,
  radiatorVariant: any,
  scale: number = 1.0,
  itemType: ComponentType = 'TowelRails' // Can be 'TowelRails' for heated towel rails or 'Radiator' for panel radiators
): AutoPositionResult | null => {
  const { roomWidth, roomHeight, notchWidth, notchHeight, existingItems } = context;
  const radiatorDimensions = radiatorVariant?.dimensions || getDimensions(itemType, radiatorVariant?.sku) || { width: 50, height: 80, depth: 10 };
  const orientation = radiatorVariant?.orientation || DEFAULT_ORIENTATION;

  // Calculate spawn height so visual bottom is at 60cm from floor
  let spawnHeight = calculateTowelRailY(radiatorVariant);

  // Clamp spawnHeight to movement config limits
  const tempItem = {
    type: itemType,
    sku: radiatorVariant?.sku,
    model: radiatorVariant
  } as unknown as BathroomItem;
  const movementConfig = getMovementConfig(itemType, tempItem);
  const minHeight = movementConfig.minHeight ?? 0;
  const maxHeight = movementConfig.maxHeight ?? spawnHeight;
  spawnHeight = Math.min(Math.max(spawnHeight, minHeight), maxHeight);

  const { wallFaces, notch, interior } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  // Helper: Check if wall segment at position has sufficient continuous space
  // Returns true if there's at least MIN_WALL_SPACE_FOR_TOWEL_RAIL cm of free wall
  const hasMinWallSpace = (
    candidateX: number,
    candidateZ: number,
    wall: string,
    railWidth: number
  ): boolean => {
    // Calculate wall length based on wall type
    let wallStart: number;
    let wallEnd: number;
    let candidatePos: number;

    // For L-shaped rooms, adjust boundaries
    const northWallMinX = notch ? notch.maxX : interior.minX;
    const westWallMaxZ = notch ? notch.maxZ : interior.maxZ;

    switch (wall) {
      case 'north':
        wallStart = northWallMinX;
        wallEnd = interior.maxX;
        candidatePos = candidateX;
        break;
      case 'south':
        wallStart = interior.minX;
        wallEnd = interior.maxX;
        candidatePos = candidateX;
        break;
      case 'east':
        wallStart = interior.minZ;
        wallEnd = interior.maxZ;
        candidatePos = candidateZ;
        break;
      case 'west':
        wallStart = interior.minZ;
        wallEnd = westWallMaxZ;
        candidatePos = candidateZ;
        break;
      case 'notch-south':
        if (!notch) return false;
        wallStart = interior.minX;
        wallEnd = notch.maxX;
        candidatePos = candidateX;
        break;
      case 'notch-east':
        if (!notch) return false;
        wallStart = interior.minZ;
        wallEnd = notch.maxZ;
        candidatePos = candidateZ;
        break;
      default:
        return true; // Unknown wall, allow
    }

    // Check if the rail (candidatePos ± railWidth/2) fits within wall bounds
    // with at least MIN_WALL_SPACE_FOR_TOWEL_RAIL total wall length
    const wallLength = wallEnd - wallStart;
    if (wallLength < MIN_WALL_SPACE_FOR_TOWEL_RAIL) {
      console.log(`🔥 Wall ${wall} too short: ${wallLength.toFixed(1)}cm < ${MIN_WALL_SPACE_FOR_TOWEL_RAIL}cm`);
      return false;
    }

    // Check if candidate position is within wall bounds (with rail width margin)
    const railHalf = railWidth / 2;
    if (candidatePos - railHalf < wallStart || candidatePos + railHalf > wallEnd) {
      console.log(`🔥 Candidate position ${candidatePos.toFixed(1)} out of wall bounds [${wallStart.toFixed(1)}, ${wallEnd.toFixed(1)}]`);
      return false;
    }

    return true;
  };

  // Check for existing towel rails to prevent stacking
  const existingTowelRails = findTowelRails(existingItems);

  console.log('🔥 Towel Rail Auto-Position: Starting...', {
    spawnHeight,
    spawnHeightClamped: { min: minHeight, max: maxHeight },
    floorOffset: radiatorVariant?.floorOffset || 0,
    visualBottom: spawnHeight + (radiatorVariant?.floorOffset || 0),
    dimensions: radiatorDimensions,
    existingTowelRails: existingTowelRails.length
  });

  const halfDepth = radiatorDimensions.depth * scale / 2;
  const halfWidth = radiatorDimensions.width * scale / 2;
  const wallBuffer = orientation?.wallBuffer !== undefined ? orientation.wallBuffer * scale : 0;

  // Primary: Find bath and place at foot end
  const baths = findBaths(existingItems);
  console.log('🔥 Looking for baths to place towel rail near. Found:', baths.length);

  for (const bath of baths) {
    // Skip baths that already have a towel rail nearby
    if (bathHasTowelRailNearby(bath, existingItems)) {
      console.log('🔥 Skipping bath - already has towel rail nearby');
      continue;
    }
    const bathDimensions = getItemDimensions(bath);
    const bathRotation = bath.rotation || 0;

    // Normalize rotation to determine bath orientation
    const normalizedRotation = ((bathRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    // Determine bath orientation based on rotation
    // 0 or PI = bath length along X axis (facing north or south)
    // PI/2 or 3PI/2 = bath length along Z axis (facing east or west)
    const isBathAlongX = Math.abs(normalizedRotation) < 0.3 || Math.abs(normalizedRotation - Math.PI) < 0.3;

    console.log('🛁 Bath analysis:', {
      position: bath.position,
      rotation: bathRotation.toFixed(2),
      normalizedRotation: normalizedRotation.toFixed(2),
      isBathAlongX,
      dimensions: bathDimensions
    });

    // For corner baths, determine which corner they're in
    const bathX = bath.position[0];
    const bathZ = bath.position[2];

    // Check distances to all walls
    const distToEast = wallFaces.east - bathX;
    const distToWest = bathX - wallFaces.west;
    const distToSouth = wallFaces.south - bathZ;
    const distToNorth = bathZ - wallFaces.north;

    console.log('🛁 Bath distances to walls:', {
      east: distToEast.toFixed(1),
      west: distToWest.toFixed(1),
      south: distToSouth.toFixed(1),
      north: distToNorth.toFixed(1)
    });

    // STRATEGY: Place towel rail on a wall that the bath is AGAINST (or near),
    // positioned at the FOOT END of the bath (the end sticking into the room).
    //
    // For a corner bath in SE corner (against south and east walls):
    // - The foot end is toward the west/north (into the room)
    // - Place towel rail on SOUTH wall at the western end of the bath
    // - OR on EAST wall at the northern end of the bath

    // Bath dimensions: width = long side (170cm typically), depth = short side (70cm typically)
    // These are the PHYSICAL dimensions, regardless of rotation
    const bathLongSide = bathDimensions?.width || 170;   // The long dimension of the bath
    const bathShortSide = bathDimensions?.depth || 70;   // The short dimension of the bath
    const bathHalfLong = bathLongSide / 2;
    const bathHalfShort = bathShortSide / 2;

    // Calculate actual edge distances (not center distances)
    // For bath along X: long side is along X, short side is along Z
    // For bath along Z: long side is along Z, short side is along X
    const xHalfExtent = isBathAlongX ? bathHalfLong : bathHalfShort;
    const zHalfExtent = isBathAlongX ? bathHalfShort : bathHalfLong;

    // For backward compatibility with existing code that uses bathHalfLength/bathHalfWidth
    const bathHalfLength = bathHalfLong;  // Always the long dimension
    const bathHalfWidth = bathHalfShort;  // Always the short dimension

    const eastEdgeDist = wallFaces.east - (bathX + xHalfExtent);
    const westEdgeDist = (bathX - xHalfExtent) - wallFaces.west;
    const southEdgeDist = wallFaces.south - (bathZ + zHalfExtent);
    const northEdgeDist = (bathZ - zHalfExtent) - wallFaces.north;

    console.log('🛁 Bath edge distances to walls:', {
      eastEdge: eastEdgeDist.toFixed(1),
      westEdge: westEdgeDist.toFixed(1),
      southEdge: southEdgeDist.toFixed(1),
      northEdge: northEdgeDist.toFixed(1)
    });

    // Determine which walls the bath is AGAINST (edge within 20cm of wall)
    const bathAgainstNorth = northEdgeDist < 20;
    const bathAgainstSouth = southEdgeDist < 20;
    const bathAgainstEast = eastEdgeDist < 20;
    const bathAgainstWest = westEdgeDist < 20;

    // For L-shaped rooms, also check notch walls
    let bathAgainstNotchEast = false;
    let bathAgainstNotchSouth = false;
    let notchEastWall = 0;
    let notchSouthWall = 0;

    if (notch) {
      notchEastWall = notch.maxX;
      notchSouthWall = notch.maxZ;

      // Check distance to notch-east wall (vertical edge of notch)
      // Bath's western edge should be close to notch-east wall
      // And bath should overlap with the notch-east wall's Z range (from north wall to notch-south)
      const notchEastEdgeDist = Math.abs((bathX - xHalfExtent) - notchEastWall);
      const bathNorthEdge = bathZ - zHalfExtent;
      const bathOverlapsNotchEastZ = bathNorthEdge <= notchSouthWall; // Bath's north edge is at or north of notch-south
      bathAgainstNotchEast = notchEastEdgeDist < 20 && bathOverlapsNotchEastZ;

      // Check distance to notch-south wall (horizontal edge of notch)
      // Bath's northern edge should be close to notch-south wall
      // And bath should overlap with the notch-south wall's X range (from west wall to notch-east)
      const notchSouthEdgeDist = Math.abs((bathZ - zHalfExtent) - notchSouthWall);
      const bathWestEdgeX = bathX - xHalfExtent;
      const bathOverlapsNotchSouthX = bathWestEdgeX <= notchEastWall; // Bath's west edge is at or west of notch-east
      bathAgainstNotchSouth = notchSouthEdgeDist < 20 && bathOverlapsNotchSouthX;

      console.log('🛁 Notch detection:', {
        notchEastWall: notchEastWall.toFixed(1),
        notchSouthWall: notchSouthWall.toFixed(1),
        notchEastEdgeDist: notchEastEdgeDist.toFixed(1),
        notchSouthEdgeDist: notchSouthEdgeDist.toFixed(1),
        bathNorthEdge: bathNorthEdge.toFixed(1),
        bathWestEdgeX: bathWestEdgeX.toFixed(1),
        bathOverlapsNotchEastZ,
        bathOverlapsNotchSouthX
      });
    }

    console.log('🛁 Bath wall proximity:', {
      againstNorth: bathAgainstNorth,
      againstSouth: bathAgainstSouth,
      againstEast: bathAgainstEast,
      againstWest: bathAgainstWest,
      againstNotchEast: bathAgainstNotchEast,
      againstNotchSouth: bathAgainstNotchSouth
    });

    const footEndCandidates: Array<{ position: Position; rotation: number; wall: string; priority: number }> = [];

    // Calculate foot end position - the end of the bath furthest from the corner/wall
    // For bath along X: foot end is at the X position furthest from the nearest X-wall
    // For bath along Z: foot end is at the Z position furthest from the nearest Z-wall

    if (isBathAlongX) {
      // Bath length is along X axis (bath's long side is horizontal)
      // Foot end X is the end of bath furthest from east/west walls (including notch walls)
      const bathEastEdge = bathX + bathHalfLength;
      const bathWestEdge = bathX - bathHalfLength;

      // The foot end is whichever edge is further from its respective wall
      // For L-shaped rooms, also consider notch-east wall for the west edge
      const eastEdgeDistToWall = wallFaces.east - bathEastEdge;
      let westEdgeDistToWall = bathWestEdge - wallFaces.west;

      // If bath is against notch-east wall, its west edge distance should be 0 (not distance to main west wall)
      if (bathAgainstNotchEast && notch) {
        const westEdgeDistToNotchEast = Math.abs(bathWestEdge - notchEastWall);
        if (westEdgeDistToNotchEast < 30) {
          westEdgeDistToWall = westEdgeDistToNotchEast; // Use distance to notch wall instead
        }
      }

      // Foot end is the edge that's further from wall (sticking into room)
      const footEndX = eastEdgeDistToWall > westEdgeDistToWall ? bathEastEdge : bathWestEdge;
      const footEndIsEast = eastEdgeDistToWall > westEdgeDistToWall;

      console.log('🛁 Bath foot end (along X):', {
        bathEastEdge: bathEastEdge.toFixed(1),
        bathWestEdge: bathWestEdge.toFixed(1),
        eastEdgeDistToWall: eastEdgeDistToWall.toFixed(1),
        westEdgeDistToWall: westEdgeDistToWall.toFixed(1),
        footEndX: footEndX.toFixed(1),
        footEndIsEast,
        bathAgainstNotchEast
      });

      // For bath along X axis:
      // - Bath's LENGTH (long side) is along X axis
      // - Bath's WIDTH (short side) is along Z axis
      // FOOT END: The end of the bath sticking into the room (furthest from corner)
      // PRIORITY: Place towel rail on the wall at the foot end (where you step out)

      const railGap = 15; // 15cm gap between bath and towel rail

      // PRIMARY: Place on south/north wall (at the foot end X position)
      // This is where you reach for a towel when stepping out at the foot end
      const offsetX = railGap + halfWidth;

      if (bathAgainstSouth) {
        // For corner bath, place past the foot end in the direction away from the corner
        const railX = bathAgainstEast
          ? bathX - bathHalfLength - offsetX  // SE corner: place west of bath
          : bathAgainstWest
            ? bathX + bathHalfLength + offsetX  // SW corner: place east of bath
            : footEndX + (footEndIsEast ? offsetX : -offsetX); // Not in corner, use foot end

        const railZ = wallFaces.south - halfDepth - wallBuffer;
        if (hasMinWallSpace(railX, railZ, 'south', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'south', orientation),
            wall: 'south',
            priority: 1  // HIGH priority for foot end wall
          });
        }
      }

      if (bathAgainstNorth) {
        // Determine rail X position based on which corner the bath is in
        let railX: number;
        if (bathAgainstEast) {
          railX = bathX - bathHalfLength - offsetX;  // NE corner: place west of bath (foot end)
        } else if (bathAgainstWest) {
          railX = bathX + bathHalfLength + offsetX;  // NW corner: place east of bath (foot end)
        } else if (bathAgainstNotchEast) {
          // notch-east-north corner: bath is against notch-east wall, foot end is EAST
          railX = bathX + bathHalfLength + offsetX;  // Place east of bath (foot end)
          console.log('🔥 North wall towel rail for notch-east-north corner - placing at EAST (foot end)');
        } else {
          railX = footEndX + (footEndIsEast ? offsetX : -offsetX); // Not in corner, use foot end
        }

        const railZ = wallFaces.north + halfDepth + wallBuffer;
        if (hasMinWallSpace(railX, railZ, 'north', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'north', orientation),
            wall: 'north',
            priority: 1  // HIGH priority for foot end wall
          });
        }
      }

      // SECONDARY: Place on east/west wall (along the length of the bath)
      if (bathAgainstEast) {
        const railZ = bathZ + (bathAgainstSouth ? -(bathHalfWidth + railGap + halfWidth) : (bathHalfWidth + railGap + halfWidth));
        const railX = wallFaces.east - halfDepth - wallBuffer;
        console.log('🔥 East wall towel rail (bath along X):', {
          bathZ: bathZ.toFixed(1),
          bathHalfWidth: bathHalfWidth.toFixed(1),
          bathAgainstSouth,
          calculatedRailZ: railZ.toFixed(1)
        });
        if (hasMinWallSpace(railX, railZ, 'east', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'east', orientation),
            wall: 'east',
            priority: 2  // Lower priority - not at foot end
          });
        }
      }

      if (bathAgainstWest) {
        const railZ = bathZ + (bathAgainstSouth ? -(bathHalfWidth + railGap + halfWidth) : (bathHalfWidth + railGap + halfWidth));
        const railX = wallFaces.west + halfDepth + wallBuffer;
        if (hasMinWallSpace(railX, railZ, 'west', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'west', orientation),
            wall: 'west',
            priority: 2  // Lower priority - not at foot end
          });
        }
      }

      // NOTCH WALLS for L-shaped rooms (bath along X)
      if (bathAgainstNotchSouth && notch) {
        // Bath against notch-south wall (horizontal edge) - like north/south walls
        const railX = bathAgainstNotchEast
          ? bathX + bathHalfLength + offsetX  // Bath in notch-interior corner: place east of bath
          : bathAgainstWest
            ? bathX + bathHalfLength + offsetX  // Bath against west and notch-south: place east
            : footEndX + (footEndIsEast ? offsetX : -offsetX);

        const railZ = notchSouthWall + halfDepth + wallBuffer;
        console.log('🔥 Notch-south wall towel rail (bath along X):', {
          bathX: bathX.toFixed(1),
          notchSouthWall: notchSouthWall.toFixed(1),
          calculatedRailX: railX.toFixed(1)
        });

        if (hasMinWallSpace(railX, railZ, 'notch-south', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'north', orientation), // Same as north (facing into room)
            wall: 'notch-south',
            priority: 1  // HIGH priority for foot end wall
          });
        }
      }

      if (bathAgainstNotchEast && notch) {
        // Bath against notch-east wall (vertical edge) - like east/west walls
        const railZ = bathZ + (bathAgainstNotchSouth ? (bathHalfWidth + railGap + halfWidth) : -(bathHalfWidth + railGap + halfWidth));
        const railX = notchEastWall + halfDepth + wallBuffer;

        console.log('🔥 Notch-east wall towel rail (bath along X):', {
          bathZ: bathZ.toFixed(1),
          notchEastWall: notchEastWall.toFixed(1),
          calculatedRailZ: railZ.toFixed(1)
        });

        if (hasMinWallSpace(railX, railZ, 'notch-east', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'west', orientation), // Same as west (facing into room)
            wall: 'notch-east',
            priority: 2  // Lower priority - not at foot end
          });
        }
      }
    } else {
      // Bath length is along Z axis
      const bathSouthEdge = bathZ + bathHalfLength;
      const bathNorthEdge = bathZ - bathHalfLength;

      const southEdgeDistToWall = wallFaces.south - bathSouthEdge;
      const northEdgeDistToWall = bathNorthEdge - wallFaces.north;

      const footEndZ = southEdgeDistToWall > northEdgeDistToWall ? bathSouthEdge : bathNorthEdge;
      const footEndIsSouth = southEdgeDistToWall > northEdgeDistToWall;

      console.log('🛁 Bath foot end (along Z):', {
        bathSouthEdge: bathSouthEdge.toFixed(1),
        bathNorthEdge: bathNorthEdge.toFixed(1),
        southEdgeDistToWall: southEdgeDistToWall.toFixed(1),
        northEdgeDistToWall: northEdgeDistToWall.toFixed(1),
        footEndZ: footEndZ.toFixed(1),
        footEndIsSouth
      });

      // For bath along Z axis (length north-south):
      // - FOOT END is at one of the Z extremes (north or south edge)
      // - PRIMARY: Place on south/north wall (the wall bath is against) WEST/EAST of the bath
      // - SECONDARY: Place on east/west wall at the foot end Z position

      const railGap = 15; // 15cm gap between bath and towel rail
      const perpOffset = bathHalfWidth + railGap + halfWidth;

      // For bath along Z axis, the FOOT END is in the Z direction
      // So east/west wall candidates (at foot end Z) should have HIGHER priority
      // North/south wall candidates are beside the bath, not at foot end

      // PRIMARY: Place on east/west wall at foot end Z position (THIS IS THE ACTUAL FOOT END)
      const offset = railGap + halfWidth;

      if (bathAgainstEast) {
        const railZ = footEndZ + (footEndIsSouth ? offset : -offset);
        const railX = wallFaces.east - halfDepth - wallBuffer;
        console.log('🔥 East wall towel rail (bath along Z) - FOOT END:', {
          bathZ: bathZ.toFixed(1),
          footEndZ: footEndZ.toFixed(1),
          footEndIsSouth,
          calculatedRailZ: railZ.toFixed(1)
        });
        if (hasMinWallSpace(railX, railZ, 'east', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'east', orientation),
            wall: 'east',
            priority: 1  // HIGH priority - at foot end
          });
        }
      }

      if (bathAgainstWest) {
        const railZ = footEndZ + (footEndIsSouth ? offset : -offset);
        const railX = wallFaces.west + halfDepth + wallBuffer;
        console.log('🔥 West wall towel rail (bath along Z) - FOOT END:', {
          bathZ: bathZ.toFixed(1),
          footEndZ: footEndZ.toFixed(1),
          footEndIsSouth,
          calculatedRailZ: railZ.toFixed(1)
        });
        if (hasMinWallSpace(railX, railZ, 'west', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'west', orientation),
            wall: 'west',
            priority: 1  // HIGH priority - at foot end
          });
        }
      }

      // SECONDARY: Place on south/north wall (beside the bath, not at foot end)
      if (bathAgainstSouth) {
        // Place on south wall, offset in X direction away from the corner
        const railX = bathAgainstEast
          ? bathX - perpOffset  // SE corner: place west of bath
          : bathX + perpOffset; // SW corner: place east of bath
        const railZ = wallFaces.south - halfDepth - wallBuffer;

        console.log('🔥 South wall towel rail (bath along Z) - beside bath:', {
          bathX: bathX.toFixed(1),
          perpOffset: perpOffset.toFixed(1),
          bathAgainstEast,
          calculatedRailX: railX.toFixed(1)
        });

        if (hasMinWallSpace(railX, railZ, 'south', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'south', orientation),
            wall: 'south',
            priority: 2  // Lower priority - not at foot end
          });
        }
      }

      if (bathAgainstNorth) {
        const railX = bathAgainstEast
          ? bathX - perpOffset  // NE corner: place west of bath
          : bathX + perpOffset; // NW corner: place east of bath
        const railZ = wallFaces.north + halfDepth + wallBuffer;

        if (hasMinWallSpace(railX, railZ, 'north', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'north', orientation),
            wall: 'north',
            priority: 2  // Lower priority - not at foot end
          });
        }
      }

      // NOTCH WALLS for L-shaped rooms (bath along Z)
      if (bathAgainstNotchSouth && notch) {
        // Bath against notch-south wall (horizontal edge)
        // Place towel rail offset from bath in X direction
        const railX = bathAgainstNotchEast
          ? bathX + perpOffset  // Bath in notch corner: place east of bath
          : bathAgainstWest
            ? bathX + perpOffset  // Bath against west: place east of bath
            : bathX + perpOffset; // Default: place east of bath
        const railZ = notchSouthWall + halfDepth + wallBuffer;

        console.log('🔥 Notch-south wall towel rail (bath along Z):', {
          bathX: bathX.toFixed(1),
          notchSouthWall: notchSouthWall.toFixed(1),
          calculatedRailX: railX.toFixed(1)
        });

        if (hasMinWallSpace(railX, railZ, 'notch-south', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'north', orientation), // Same as north
            wall: 'notch-south',
            priority: 1  // HIGH priority
          });
        }
      }

      if (bathAgainstNotchEast && notch) {
        // Bath against notch-east wall (vertical edge)
        const railZ = footEndZ + (footEndIsSouth ? offset : -offset);
        const railX = notchEastWall + halfDepth + wallBuffer;

        console.log('🔥 Notch-east wall towel rail (bath along Z):', {
          bathZ: bathZ.toFixed(1),
          notchEastWall: notchEastWall.toFixed(1),
          calculatedRailZ: railZ.toFixed(1)
        });

        if (hasMinWallSpace(railX, railZ, 'notch-east', radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: railX, y: spawnHeight, z: railZ },
            rotation: getObjectRotationForWall('Radiator', 'west', orientation), // Same as west
            wall: 'notch-east',
            priority: 2  // Lower priority
          });
        }
      }
    }

    // FALLBACK: If bath isn't against any wall (freestanding in middle),
    // try placing on nearest wall at the foot end position
    if (footEndCandidates.length === 0) {
      console.log('🛁 Bath not against any wall, using fallback placement');

      // Find the nearest wall and place there
      const wallDistances = [
        { wall: 'north', dist: distToNorth, z: wallFaces.north + halfDepth + wallBuffer, x: bathX },
        { wall: 'south', dist: distToSouth, z: wallFaces.south - halfDepth - wallBuffer, x: bathX },
        { wall: 'east', dist: distToEast, x: wallFaces.east - halfDepth - wallBuffer, z: bathZ },
        { wall: 'west', dist: distToWest, x: wallFaces.west + halfDepth + wallBuffer, z: bathZ }
      ];

      wallDistances.sort((a, b) => a.dist - b.dist);

      for (const wd of wallDistances) {
        // Check both distance to bath AND minimum wall space
        if (wd.dist > MIN_WALL_SPACE_FOR_TOWEL_RAIL &&
            hasMinWallSpace(wd.x, wd.z, wd.wall, radiatorDimensions.width * scale)) {
          footEndCandidates.push({
            position: { x: wd.x, y: spawnHeight, z: wd.z },
            rotation: getObjectRotationForWall('Radiator', wd.wall as any, orientation),
            wall: wd.wall,
            priority: 3
          });
        }
      }
    }

    // Sort candidates by priority (lower is better)
    footEndCandidates.sort((a, b) => a.priority - b.priority);

    console.log('🔥 Towel rail foot end candidates:', footEndCandidates.length);

    // Try each candidate position
    for (const candidate of footEndCandidates) {
      console.log('🔥 Trying towel rail position on', candidate.wall, 'wall:', candidate.position);

      if (hasSpaceAtPosition(
        candidate.position,
        itemType,
        scale,
        existingItems,
        -1,
        radiatorVariant?.sku,
        roomWidth,
        roomHeight,
        notchWidth,
        notchHeight
      )) {
        console.log(`🔥 Auto-position: ${itemType} placed at bath foot end on`, candidate.wall, 'wall');
        return {
          position: candidate.position,
          rotation: candidate.rotation,
          anchorItem: bath,
          placementMethod: 'anchor'
        };
      } else {
        console.log('🔥 Position blocked, trying next candidate');
      }
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
      itemType,
      scale,
      existingItems,
      -1,
      radiatorVariant?.sku,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    )) {
      console.log(`🔥 Auto-position: ${itemType} placed beside vanity (opposite toilet)`);
      return {
        position,
        rotation,
        anchorItem: vanity,
        placementMethod: 'anchor'
      };
    }
  }

  // Fallback: Any available wall position
  const wallResult = findLongestEmptyWallSegment(context, itemType, scale, orientation, radiatorVariant?.sku);

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
): AutoPositionResult => {
  console.log(`🎯 Auto-positioning ${itemType}...`);

  let result: AutoPositionResult | null = null;

  switch (itemType) {
    case 'Mirror':
      result = positionMirror(context, variant, scale);
      break;

    case 'Toilet':
      result = positionToilet(context, variant, scale);
      break;

    case 'Bath':
      result = positionBath(context, variant, scale);
      break;

    case 'Shower':
      result = positionShower(context, variant, scale);
      break;

    case 'Furniture': // Vanity units
      result = positionVanity(context, variant, scale);
      break;

    case 'Radiator': // Radiator panels
      result = positionTowelRail(context, variant, scale, 'Radiator');
      break;

    case 'TowelRails': // Heated towel rails
      result = positionTowelRail(context, variant, scale, 'TowelRails');
      break;

    case 'Sink':
      result = positionSink(context, variant, scale);
      break;

    default:
      console.log(`⚠️ No auto-position logic for ${itemType}, using default placement`);
      break;
  }

  // Return structured no-op result if no position was found
  if (!result) {
    const spawnHeight = variant?.spawnHeight || 0;
    return {
      position: { x: 0, y: spawnHeight, z: 0 },
      rotation: 0,
      placementMethod: 'none',
      reason: itemType === 'Mirror' || itemType === 'Toilet' || itemType === 'Bath' ||
              itemType === 'Shower' || itemType === 'Furniture' || itemType === 'Radiator' ||
              itemType === 'TowelRails' || itemType === 'Sink'
        ? 'no-space-found'
        : 'no-auto-position-logic'
    };
  }

  return result;
};
