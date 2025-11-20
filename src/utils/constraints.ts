// src/utils/constraints.ts - ENHANCED with proper movement integration
import { WALL_SETTINGS } from '../constants/dimensions';
import type { ComponentType } from '../constants/components';
import { getMovementConfig } from '../utils/models';
import {
  type OrientationConfig,
  MovementConfig,
  DEFAULT_ORIENTATION,
  DefaultCornerObjectRotation
} from '../constants/models';
import { getObjectWallBuffer, getObjectRotationForWall } from '../utils/models';
import productData from '../mocks/productData';

// Interface for position
export interface Position {
  x: number;
  y: number;
  z: number;
}

// Wall identification
export type WallType = 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';
// Corner identification (includes notch corners for L-shaped rooms)
export type CornerType = 'north-east' | 'north-west' | 'south-east' | 'south-west' | 'notch-interior' | 'notch-corner' | 'notch-east-north';

export interface CornerInfo {
  type: CornerType;
  position: Position;
  walls: [WallType, WallType];
}

export type ObjectModel = {
  path: string;
  name: string;
  title?: string;
  id?: string;
  image?: string;
  link?: string;
  sku?: string;
  scale?: number;
  price?: number | string;
  rotation?: [number, number, number];
  position?: [number, number, number];
  movement?: MovementConfig;
  orientation?: OrientationConfig;
  floorOffset?: number; // Floor offset in centimeters, defines what is the height inside .glb file
  spawnHeight?: number; // Height above floor when spawning in the room
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
}

export type ObjectModelWithCategory = ObjectModel & {
  category: string;
};

export interface BathroomItem {
  id: number;
  type: ComponentType;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  sku?: string;
  productName?: string;
  model?: ObjectModel;
}

/**
 * Enhanced collision detection that includes walls and L-shape notch
 */
export const wouldCollideWithExistingOrWalls = (
  position: Position,
  objectType: ComponentType,
  scale: number,
  objectId: number,
  existingItems: BathroomItem[],
  roomWidth: number,
  roomHeight: number,
  currentItem?: BathroomItem,
  rotation?: number,
  notchWidth?: number,
  notchHeight?: number
): boolean => {

  // 1. Check wall collision using actual dimensions (with rotation for free-rotation objects and L-shape notch)
  if (checkWallCollision(position, objectType, scale, roomWidth, roomHeight, currentItem, rotation, notchWidth, notchHeight)) {
    return true;
  }

  // 2. Check collision with existing objects (passing room dimensions for accurate wall detection)
  return wouldCollideWithExisting(position, objectType, scale, objectId, existingItems, currentItem, roomWidth, roomHeight);
};

/**
 * Get all corner positions in the room
 * For L-shaped rooms with notch, excludes corners that are in the notch area
 */
export const getRoomCorners = (
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): CornerInfo[] => {
  const { wallFaces, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  const allCorners = [
    {
      type: 'north-west',
      position: { x: wallFaces.west, y: 0, z: wallFaces.north },
      walls: ['north', 'west'] as [WallType, WallType]
    },
    {
      type: 'north-east',
      position: { x: wallFaces.east, y: 0, z: wallFaces.north },
      walls: ['north', 'east'] as [WallType, WallType]
    },
    {
      type: 'south-west',
      position: { x: wallFaces.west, y: 0, z: wallFaces.south },
      walls: ['south', 'west'] as [WallType, WallType]
    },
    {
      type: 'south-east',
      position: { x: wallFaces.east, y: 0, z: wallFaces.south },
      walls: ['south', 'east'] as [WallType, WallType]
    }
  ];

  // ✅ For L-shaped rooms, exclude the northwest corner (which is in the notch)
  // and add two notch corners: notch-interior and notch-corner
  if (notch) {
    console.log('🔍 getRoomCorners: L-shaped room detected - excluding north-west, adding notch corners');
    const validCorners = allCorners.filter(corner => corner.type !== 'north-west');

    // Add the notch-interior corner (where west wall meets notch-south wall)
    validCorners.push({
      type: 'notch-interior' as CornerType,
      position: { x: notch.minX, y: 0, z: notch.maxZ },
      walls: ['west', 'notch-south'] as [WallType, WallType]
    });

    // Removed notch-corner (where notch-east wall meets notch-south wall)
    // User requested to disable corner install placement at this corner

    // Add the notch-east-north corner (where notch-east wall meets north wall)
    validCorners.push({
      type: 'notch-east-north' as CornerType,
      position: { x: notch.maxX, y: 0, z: notch.minZ },
      walls: ['notch-east', 'north'] as [WallType, WallType]
    });

    console.log('✅ Added notch-interior corner at:', { x: notch.minX.toFixed(1), z: notch.maxZ.toFixed(1) });
    console.log('✅ Added notch-east-north corner at:', { x: notch.maxX.toFixed(1), z: notch.minZ.toFixed(1) });
    return validCorners;
  }

  return allCorners;
};

/**
 * Find the nearest corner to a given position
 * For L-shaped rooms, only considers valid corners (excludes northwest corner in notch)
 */
export const getNearestCorner = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): CornerInfo => {
  const corners = getRoomCorners(roomWidth, roomHeight, notchWidth, notchHeight);

  let nearestCorner = corners[0];
  let minDistance = Infinity;

  corners.forEach(corner => {
    const distance = Math.sqrt(
      Math.pow(position.x - corner.position.x, 2) +
      Math.pow(position.z - corner.position.z, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestCorner = corner;
    }
  });

  return nearestCorner;
};

/**
 * Check if a position is in a corner (within tolerance)
 * For L-shaped rooms, only checks valid corners (excludes northwest corner in notch)
 */
export const isInCorner = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  tolerance: number = 30, // 30cm tolerance
  notchWidth?: number,
  notchHeight?: number
): boolean => {
  const corners = getRoomCorners(roomWidth, roomHeight, notchWidth, notchHeight);

  return corners.some(corner => {
    const distance = Math.sqrt(
      Math.pow(position.x - corner.position.x, 2) +
      Math.pow(position.z - corner.position.z, 2)
    );
    return distance <= tolerance;
  });
};

/**
 * Constrain position to nearest corner for corner-only items
 * Objects will be positioned flush in the corner
 * For L-shaped rooms, only considers valid corners (excludes northwest corner in notch)
 */
export const constrainToCorner = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  {
    type: objectType,
    scale = 1.0,
    orientation = DEFAULT_ORIENTATION,
    item,
    movement,
    sku,
    notchWidth,
    notchHeight
  }: {
    type: ComponentType | null;
    scale?: number;
    orientation?: OrientationConfig;
    item?: BathroomItem;
    movement?: MovementConfig;
    sku?: string;
    notchWidth?: number;
    notchHeight?: number;
  }
): { position: Position; rotation: number } => {

  if (!objectType) return { position, rotation: 0 };

  const dimensions = getDimensions(objectType, item?.sku ?? sku, item?.model);
  if (!dimensions) {
    console.warn(`>>>111 No dimensions found for ${objectType}`);
    return { position, rotation: 0 };
  }

  const nearestCorner = getNearestCorner(position, roomWidth, roomHeight, notchWidth, notchHeight);
  const movementConfig = movement ?? getMovementConfig(objectType, item);

  console.log('>>>111 constrainging To Corner for movement', movementConfig);

  // Get the wall buffer (usually 0 for flush-mounted items)
  const wallBuffer = (orientation?.wallBuffer !== undefined) ?
    orientation.wallBuffer * scale : 0;

  // For corner items, we position them flush in the corner
  // The object's center should be at half its dimensions from each wall
  const halfWidth = (dimensions.width * scale) / 2;
  const halfDepth = (dimensions.depth * scale) / 2;

  let constrainedPosition = { ...nearestCorner.position };
  let rotation = 0;

  console.log('>>>111 halfWidth');

  // cornerInstallOnly is either false or an object
  if (movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled) {
    rotation = movementConfig.cornerInstallOnly?.rotation?.[nearestCorner.type] ?? DefaultCornerObjectRotation[nearestCorner.type];
  } else {
    console.error(`>>>111 No corner rotation defined for ${objectType} in ${nearestCorner.type}`);
    return { position, rotation: 0 };
  }

  // Position object flush in corner
  // The object center is positioned at half-width/half-depth from the corner walls
  switch (nearestCorner.type) {
    case 'north-west':
      // Corner is at (west wall, north wall)

      constrainedPosition.x = nearestCorner.position.x + halfWidth + wallBuffer;
      constrainedPosition.z = nearestCorner.position.z + wallBuffer;
      // rotation = Math.PI / 2; // Facing into room from north-west corner
      break;

    case 'north-east':
      // For a corner shower that opens toward the room center
      constrainedPosition.x = nearestCorner.position.x - wallBuffer;
      constrainedPosition.z = nearestCorner.position.z + halfWidth + wallBuffer;
      // rotation = 0; // No rotation, faces south
      break;

    case 'south-east':
      // Same X as north-east
      constrainedPosition.x = nearestCorner.position.x - halfWidth - wallBuffer;
      constrainedPosition.z = nearestCorner.position.z - wallBuffer;
      // rotation = -Math.PI/2; // 180 degrees to face north
      break;

    case 'south-west':
      // Use same pattern as north-west but inverted for south
      constrainedPosition.x = nearestCorner.position.x + wallBuffer; // Just wallBuffer like north-west
      constrainedPosition.z = nearestCorner.position.z - halfWidth - wallBuffer; // halfWidth like north-west
      // rotation = Math.PI; // 180 degrees
      break;

    case 'notch-interior':
      // Corner where west wall meets notch-south wall
      // Object should be flush against both walls, opening toward the room
      // Same pattern as north-west: only X gets halfWidth, Z gets just wallBuffer
      constrainedPosition.x = nearestCorner.position.x + halfWidth + wallBuffer;
      constrainedPosition.z = nearestCorner.position.z + wallBuffer;
      console.log(`✅ Positioning at notch-interior corner: X=${constrainedPosition.x.toFixed(1)}, Z=${constrainedPosition.z.toFixed(1)}`);
      break;

    // Removed notch-corner case - corner install placement disabled at user's request

    case 'notch-east-north':
      // Corner where notch-east wall meets north wall
      // Same pattern as notch-interior: halfWidth for X, wallBuffer for Z
      constrainedPosition.x = nearestCorner.position.x + halfWidth + wallBuffer;
      constrainedPosition.z = nearestCorner.position.z + wallBuffer;
      console.log(`✅ Positioning at notch-east-north corner: X=${constrainedPosition.x.toFixed(1)}, Z=${constrainedPosition.z.toFixed(1)}`);
      break;
  }

  // Handle vertical positioning
  if (movementConfig.allowVerticalMovement) {
    const minHeight = movementConfig.minHeight || 0;
    const maxHeight = movementConfig.maxHeight || 250;
    constrainedPosition.y = Math.max(minHeight, Math.min(maxHeight, position.y));
  } else {
    constrainedPosition.y = movementConfig.minHeight || 0;
  }

  return { position: constrainedPosition, rotation };
};

// Function to get dimensions for a specific product
const getProductDimensions = (sku: string, type: ComponentType): {
  width: number;
  depth: number;
  height: number;
  floorOffset: number;
  spawnHeight: number; // Optional spawn height for the product
} | null => {

  if (!type || !productData[type]) {
    return null;
  }

  // Search through all product variants in the category
  for (const product of productData[type]) {
    if (product.variants) {
      for (const variant of product.variants) {
        if (variant.sku === sku && variant.dimensions) {
          return {
            width: variant.dimensions.width,
            depth: variant.dimensions.depth || variant.dimensions.height, // Use height as depth if depth not available
            height: variant.dimensions.height,
            floorOffset: variant.floorOffset || 0, // Use floor offset if available
            spawnHeight: variant.spawnHeight || 0 // Use spawn height if available
          };
        }
      }
    }
  }

  return null;
};

// Enhanced function to get dimensions with product-specific lookup
export const getDimensions = (
  type: ComponentType,
  sku?: string,
  model?: ObjectModel
): { width: number; depth: number; height: number, floorOffset: number, spawnHeight: number } | null => {

  // Priority 1: Try to get dimensions from model object if available
  if (model?.dimensions) {
    return {
      width: model.dimensions.width,
      depth: model.dimensions.depth || model.dimensions.height,
      height: model.dimensions.height,
      floorOffset: model.floorOffset || 0, // Use model's floor offset if available,
      spawnHeight: model.spawnHeight || 0
    };
  }

  // Priority 2: Try to get dimensions from product data using SKU
  if (sku) {
    const productDims = getProductDimensions(sku, type);
    if (productDims) {
      console.log(`🔍 Found specific dimensions for SKU ${sku}:`, productDims);
      return productDims;
    }
  }

  return null; // Fallback if no dimensions found
};

export interface WallInfo {
  type: WallType;
  position: Position;
  distance: number;
}

// Helper function to get orientation from product data (if not already available)
const getOrientationFromProductData = (sku?: string, objectType?: ComponentType): OrientationConfig | null => {
  if (!sku || !objectType || !productData[objectType]) {
    return null;
  }

  // Search through products to find the SKU and its orientation
  for (const product of productData[objectType]) {
    if (product.variants) {
      for (const variant of product.variants) {
        if (variant.sku === sku && variant.orientation) {
          return variant.orientation;
        }
      }
    }
  }

  return null;
};

/**
 * Enhanced wall collision detection that accounts for flush-mounted objects and L-shaped rooms
 */
export const checkWallCollision = (
  position: Position,
  objectType: ComponentType,
  scale: number,
  roomWidth: number,
  roomHeight: number,
  item?: BathroomItem,
  rotation?: number,
  notchWidth?: number,
  notchHeight?: number
): boolean => {

  // 🔍 DEBUG: Log notch dimensions to verify they're being passed
  if (notchWidth && notchHeight) {
    console.log('🔍 checkWallCollision received notch dimensions:', {
      notchWidth,
      notchHeight,
      objectType,
      position: { x: position.x.toFixed(1), z: position.z.toFixed(1) }
    });
  }

  const dimensions = getDimensions(objectType, item?.sku, item?.model);
  if (!dimensions) return false;

  // Get orientation config to check if object is flush-mounted
  const orientationConfig = item?.model?.orientation || getOrientationFromProductData(item?.sku, objectType) || DEFAULT_ORIENTATION;
  const wallBuffer = (orientationConfig?.wallBuffer !== undefined) ? orientationConfig.wallBuffer * scale : 0;
  const isFlushMounted = wallBuffer === 0;

  // Room interior boundaries (where objects can be placed)
  const { interior, wallFaces, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  // For wall-snapped objects, determine which wall they're on to account for rotation
  const movementConfig = getMovementConfig(objectType, item);
  let nearestWall: 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south' = 'north';

  if (movementConfig.snapToWall) {
    // ✅ CRITICAL FIX: Check notch walls FIRST for L-shaped rooms
    if (notch) {
      const tolerance = 30; // 30cm tolerance for wall detection

      // Check if object is on notch-east wall (vertical edge)
      if (Math.abs(position.x - notch.maxX) < tolerance &&
          position.z >= notch.minZ &&
          position.z <= interior.maxZ) {
        nearestWall = 'notch-east';
        console.log('🔧 checkWallCollision: Object detected on notch-east wall for bounding box');
      }
      // Check if object is on notch-south wall (horizontal edge)
      else if (Math.abs(position.z - notch.maxZ) < tolerance &&
               position.x >= notch.minX &&
               position.x <= interior.maxX) {
        nearestWall = 'notch-south';
        console.log('🔧 checkWallCollision: Object detected on notch-south wall for bounding box');
      }
    }

    // If not on notch wall, check main walls
    if (nearestWall === 'north') {
      // Calculate distances to each wall face
      const wallDistances = {
        north: Math.abs(position.z - wallFaces.north),
        south: Math.abs(position.z - wallFaces.south),
        east: Math.abs(position.x - wallFaces.east),
        west: Math.abs(position.x - wallFaces.west)
      };

      // Find the nearest wall
      nearestWall = Object.entries(wallDistances).reduce((a, b) =>
        wallDistances[a[0]] < wallDistances[b[0]] ? a : b
      )[0] as 'north' | 'south' | 'east' | 'west';
    }
  }

  // Calculate actual object bounds using productData dimensions
  // ✅ CRITICAL FIX: Account for rotation based on which wall the object is on
  const halfWidth = (dimensions.width * scale) / 2;
  const halfDepth = (dimensions.depth * scale) / 2;

  let objectMinX: number, objectMaxX: number, objectMinZ: number, objectMaxZ: number;

  // ✅ NEW: For free-rotation objects, calculate axis-aligned bounding box
  if (movementConfig.allowFreeRotation && !movementConfig.snapToWall && rotation !== undefined) {
    const cosAngle = Math.abs(Math.cos(rotation));
    const sinAngle = Math.abs(Math.sin(rotation));

    // Calculate rotated bounding box dimensions
    const rotatedWidth = (dimensions.width * scale * cosAngle) + (dimensions.depth * scale * sinAngle);
    const rotatedDepth = (dimensions.width * scale * sinAngle) + (dimensions.depth * scale * cosAngle);

    const halfRotatedWidth = rotatedWidth / 2;
    const halfRotatedDepth = rotatedDepth / 2;

    objectMinX = position.x - halfRotatedWidth;
    objectMaxX = position.x + halfRotatedWidth;
    objectMinZ = position.z - halfRotatedDepth;
    objectMaxZ = position.z + halfRotatedDepth;
  }
  // For objects on east/west walls (including notch-east), dimensions are swapped due to 90° rotation
  else if (movementConfig.snapToWall && (nearestWall === 'east' || nearestWall === 'west' || nearestWall === 'notch-east')) {
    // Object is rotated 90°: depth becomes width, width becomes depth
    objectMinX = position.x - halfDepth;
    objectMaxX = position.x + halfDepth;
    objectMinZ = position.z - halfWidth;
    objectMaxZ = position.z + halfWidth;
  } else {
    // Object faces north/south (including notch-south) or is freestanding: use normal dimensions
    objectMinX = position.x - halfWidth;
    objectMaxX = position.x + halfWidth;
    objectMinZ = position.z - halfDepth;
    objectMaxZ = position.z + halfDepth;
  }

  // Check if object extends beyond interior boundaries
  const collideWest = objectMinX < interior.minX;
  const collideEast = objectMaxX > interior.maxX;
  const collideNorth = objectMinZ < interior.minZ;
  const collideSouth = objectMaxZ > interior.maxZ;

  // ✅ CRITICAL: Check if object is ON notch walls FIRST (before checking if IN notch)
  if (notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0) {
    const wallThickness = WALL_SETTINGS.THICKNESS;
    const notchMaxX = -(roomWidth / 2) + notchWidth - wallThickness;
    const notchMaxZ = -(roomHeight / 2) + notchHeight - wallThickness;
    const notchMinX = -(roomWidth / 2) + wallThickness;
    const notchMinZ = -(roomHeight / 2) + wallThickness;

    // ✅ DYNAMIC tolerance: halfDepth + wallBuffer accounts for object positioning
    const notchWallTolerance = halfDepth + wallBuffer + 15;

    // Calculate distances to notch edges
    const distToNotchEast = Math.abs(position.x - notchMaxX);
    const distToNotchSouth = Math.abs(position.z - notchMaxZ);

    console.log('🔍 Notch wall check (BEFORE notch area check):', {
      objectType,
      posX: position.x.toFixed(1),
      posZ: position.z.toFixed(1),
      notchMaxX: notchMaxX.toFixed(1),
      notchMaxZ: notchMaxZ.toFixed(1),
      distToNotchEast: distToNotchEast.toFixed(1),
      distToNotchSouth: distToNotchSouth.toFixed(1),
      tolerance: notchWallTolerance.toFixed(1),
      wallBuffer: wallBuffer.toFixed(1)
    });

    // ✅ Check if object is positioned on notch-east wall FIRST
    // Object must be OUTSIDE the notch area (x >= notchMaxX) and close to the wall
    const dragBuffer = 20;
    // CRITICAL FIX: Object must be at or beyond notchMaxX (not inside notch)
    if (distToNotchEast <= notchWallTolerance &&
        position.x >= notchMaxX &&  // ✅ Must be at or beyond the wall, NOT inside notch
        position.z >= notchMinZ - dragBuffer && position.z <= interior.maxZ + dragBuffer) {
      console.log('✅ Object on notch-east wall - no red outline (returning false)', {
        distToNotchEast: distToNotchEast.toFixed(1),
        tolerance: notchWallTolerance.toFixed(1),
        posX: position.x.toFixed(1),
        posZ: position.z.toFixed(1),
        notchMaxX: notchMaxX.toFixed(1),
        validRange: `${(notchMinZ - dragBuffer).toFixed(1)} to ${(interior.maxZ + dragBuffer).toFixed(1)}`,
        collisions: { north: collideNorth, south: collideSouth, east: collideEast }
      });
      // Object is properly positioned on notch wall - allow placement
      return false;
    }

    // ✅ Check if object is positioned on notch-south wall FIRST
    // Object must be OUTSIDE the notch area (z >= notchMaxZ) and close to the wall
    // CRITICAL FIX: Object must be at or beyond notchMaxZ (not inside notch)
    if (distToNotchSouth <= notchWallTolerance &&
        position.z >= notchMaxZ &&  // ✅ Must be at or beyond the wall, NOT inside notch
        position.x >= notchMinX - dragBuffer && position.x <= interior.maxX + dragBuffer) {
      console.log('✅ Object on notch-south wall - no red outline (returning false)', {
        distToNotchSouth: distToNotchSouth.toFixed(1),
        tolerance: notchWallTolerance.toFixed(1),
        posX: position.x.toFixed(1),
        posZ: position.z.toFixed(1),
        notchMaxZ: notchMaxZ.toFixed(1),
        validRange: `${(notchMinX - dragBuffer).toFixed(1)} to ${(interior.maxX + dragBuffer).toFixed(1)}`,
        collisions: { east: collideEast, west: collideWest, south: collideSouth }
      });
      // Object is properly positioned on notch wall - allow placement
      return false;
    }

    // ✅ NOW check if object is IN the notch area (only if NOT on notch wall)
    // Calculate actual half dimensions based on the rotated bounding box
    const actualHalfWidth = (objectMaxX - objectMinX) / 2;
    const actualHalfDepth = (objectMaxZ - objectMinZ) / 2;

    const isInNotch = isPositionInNotch(
      position,
      actualHalfWidth,
      actualHalfDepth,
      roomWidth,
      roomHeight,
      notchWidth,
      notchHeight
    );

    if (isInNotch) {
      console.log('🔴 NOTCH COLLISION: Object is in L-shape notch area:', {
        objectType,
        position: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
        notchDimensions: `${notchWidth} × ${notchHeight}cm`
      });
      return true; // Block placement in notch area immediately
    }
  }

  // ✅ NEW: For flush-mounted objects, check if they are properly positioned against a wall
  if (isFlushMounted) {
    // Calculate distances to each wall face (for flush mounting check)
    const wallDistances = {
      north: Math.abs(position.z - wallFaces.north),
      south: Math.abs(position.z - wallFaces.south),
      east: Math.abs(position.x - wallFaces.east),
      west: Math.abs(position.x - wallFaces.west)
    };

    // Tolerance for flush mounting (2cm)
    const flushTolerance = 2;

    // Check if object is properly flush-mounted to the nearest wall
    const isProperlyFlushMounted = wallDistances[nearestWall] <= flushTolerance;

    if (isProperlyFlushMounted) {
      // For flush-mounted objects positioned correctly, only check collisions on non-wall sides
      switch (nearestWall) {
        case 'north':
          // Object is flush against north wall, only check east/west/south collisions
          return collideEast || collideWest || collideSouth;
        case 'south':
          // Object is flush against south wall, only check east/west/north collisions
          return collideEast || collideWest || collideNorth;
        case 'east':
          // Object is flush against east wall, only check north/south/west collisions
          return collideNorth || collideSouth || collideWest;
        case 'west':
          // Object is flush against west wall, only check north/south/east collisions
          return collideNorth || collideSouth || collideEast;
        case 'notch-east':
          // Object is flush against notch-east wall, allow placement
          console.log('✅ Flush-mounted object on notch-east wall - no red outline');
          return false;
        case 'notch-south':
          // Object is flush against notch-south wall, allow placement
          console.log('✅ Flush-mounted object on notch-south wall - no red outline');
          return false;
      }
    }
  }

  // ✅ CHECK: For objects on notch walls (L-shaped room), allow proper positioning
  console.log('🎯 Reached notch wall check section', {
    notchWidth,
    notchHeight,
    willCheck: !!(notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0)
  });

  if (notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0) {
    const wallThickness = WALL_SETTINGS.THICKNESS;
    const notchMaxX = -(roomWidth / 2) + notchWidth - wallThickness;
    const notchMaxZ = -(roomHeight / 2) + notchHeight - wallThickness;
    const notchMinX = -(roomWidth / 2) + wallThickness;
    const notchMinZ = -(roomHeight / 2) + wallThickness;

    // ✅ DYNAMIC tolerance: halfDepth + wallBuffer accounts for object positioning
    // Add 15cm extra margin for smooth dragging (increased from 10cm)
    const notchWallTolerance = halfDepth + wallBuffer + 15;

    // Calculate distances to notch edges
    const distToNotchEast = Math.abs(position.x - notchMaxX);
    const distToNotchSouth = Math.abs(position.z - notchMaxZ);

    console.log('🔍 Notch wall check:', {
      objectType,
      posX: position.x.toFixed(1),
      posZ: position.z.toFixed(1),
      notchMaxX: notchMaxX.toFixed(1),
      notchMaxZ: notchMaxZ.toFixed(1),
      distToNotchEast: distToNotchEast.toFixed(1),
      distToNotchSouth: distToNotchSouth.toFixed(1),
      tolerance: notchWallTolerance.toFixed(1),
      halfDepth: halfDepth.toFixed(1),
      wallBuffer: wallBuffer.toFixed(1)
    });

    // ✅ Check if object is positioned on notch-east wall
    // Object should be: east of notch edge AND within valid Z range (can slide to south wall)
    if (distToNotchEast <= notchWallTolerance &&
        position.x >= notchMaxX &&
        position.z >= notchMinZ && position.z <= interior.maxZ) {
      console.log('✅ Object on notch-east wall - no red outline (returning false)', {
        distToNotchEast: distToNotchEast.toFixed(1),
        tolerance: notchWallTolerance.toFixed(1),
        posX: position.x.toFixed(1),
        posZ: position.z.toFixed(1)
      });
      // Object is properly positioned on notch-east wall - allow placement
      return false;
    }

    // ✅ Check if object is positioned on notch-south wall
    // Object should be: south of notch edge AND within valid X range (can slide to east wall)
    if (distToNotchSouth <= notchWallTolerance &&
        position.z >= notchMaxZ &&
        position.x >= notchMinX && position.x <= interior.maxX) {
      console.log('✅ Object on notch-south wall - no red outline (returning false)', {
        distToNotchSouth: distToNotchSouth.toFixed(1),
        tolerance: notchWallTolerance.toFixed(1),
        posX: position.x.toFixed(1),
        posZ: position.z.toFixed(1)
      });
      // Object is properly positioned on notch-south wall - allow placement
      return false;
    }
  }

  // Standard collision detection for non-flush-mounted objects or improperly positioned flush-mounted objects
  const hasWallCollision = collideWest || collideEast || collideNorth || collideSouth;

  if (hasWallCollision) {
    console.log('🔴 WALL COLLISION:', {
      objectType,
      isFlushMounted,
      productDimensions: `${dimensions.width} × ${dimensions.depth}cm`,
      scaledSize: `${(dimensions.width * scale).toFixed(1)} × ${(dimensions.depth * scale).toFixed(1)}cm`,
      position: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
      collisions: { west: collideWest, east: collideEast, north: collideNorth, south: collideSouth }
    });
  }

  return hasWallCollision;
};


// ENHANCED: Collision detection with product-specific dimensions
export const checkCollision = (
  pos1: Position,
  type1: ComponentType,
  scale1: number,
  pos2: Position,
  type2: ComponentType,
  scale2: number,
  item1?: BathroomItem,
  item2?: BathroomItem,
  roomWidth?: number,
  roomHeight?: number
): boolean => {

  // Get enhanced dimensions including floorOffset
  const dims1 = getDimensions(type1, item1?.sku, item1?.model);
  const dims2 = getDimensions(type2, item2?.sku, item2?.model);

  if (!dims1 || !dims2) {
    console.warn(`Missing dimensions for collision check: ${type1} or ${type2}`);
    return false;
  }

  // ✅ CRITICAL: Calculate actual 3D bounding boxes accounting for floorOffset AND rotation

  // Determine which wall each object is on (for rotation calculation)
  const getObjectWall = (pos: Position, item?: BathroomItem): 'north' | 'south' | 'east' | 'west' | null => {
    if (!item) return null;
    const movementConfig = getMovementConfig(item.type, item);
    if (!movementConfig.snapToWall) return null;

    // Calculate distances to each wall face (using actual room dimensions)
    const roomHalfWidth = roomWidth ? roomWidth / 2 : 300; // Use actual room width or fallback to 300cm
    const roomHalfHeight = roomHeight ? roomHeight / 2 : 300; // Use actual room height or fallback to 300cm
    const wallThickness = WALL_SETTINGS.THICKNESS;

    const northWall = -roomHalfHeight + wallThickness;
    const southWall = roomHalfHeight - wallThickness;
    const eastWall = roomHalfWidth - wallThickness;
    const westWall = -roomHalfWidth + wallThickness;

    const distToNorth = Math.abs(pos.z - northWall);
    const distToSouth = Math.abs(pos.z - southWall);
    const distToEast = Math.abs(pos.x - eastWall);
    const distToWest = Math.abs(pos.x - westWall);

    const minDist = Math.min(distToNorth, distToSouth, distToEast, distToWest);
    if (minDist === distToNorth) return 'north';
    if (minDist === distToSouth) return 'south';
    if (minDist === distToEast) return 'east';
    return 'west';
  };

  const obj1Wall = getObjectWall(pos1, item1);
  const obj2Wall = getObjectWall(pos2, item2);

  // Object 1 bounding box (scaled dimensions, accounting for rotation)
  const obj1BaseWidth = dims1.width * scale1;
  const obj1BaseDepth = dims1.depth * scale1;
  const obj1Height = dims1.height * scale1;
  const obj1FloorOffset = dims1.floorOffset * scale1;

  // Swap width/depth if object is rotated 90° (on east/west walls)
  let obj1Width: number, obj1Depth: number;
  if (obj1Wall === 'east' || obj1Wall === 'west') {
    obj1Width = obj1BaseDepth; // Rotated: depth becomes width
    obj1Depth = obj1BaseWidth; // Rotated: width becomes depth
  } else {
    obj1Width = obj1BaseWidth;
    obj1Depth = obj1BaseDepth;
  }

  // Object 2 bounding box (scaled dimensions, accounting for rotation)
  const obj2BaseWidth = dims2.width * scale2;
  const obj2BaseDepth = dims2.depth * scale2;
  const obj2Height = dims2.height * scale2;
  const obj2FloorOffset = dims2.floorOffset * scale2;

  // Swap width/depth if object is rotated 90° (on east/west walls)
  let obj2Width: number, obj2Depth: number;
  if (obj2Wall === 'east' || obj2Wall === 'west') {
    obj2Width = obj2BaseDepth; // Rotated: depth becomes width
    obj2Depth = obj2BaseWidth; // Rotated: width becomes depth
  } else {
    obj2Width = obj2BaseWidth;
    obj2Depth = obj2BaseDepth;
  }

  // ✅ CRITICAL: Calculate actual 3D positions accounting for floorOffset
  const obj1ActualY = pos1.y + obj1FloorOffset;
  const obj2ActualY = pos2.y + obj2FloorOffset;

  // ✅ CRITICAL: Calculate bounding box boundaries in 3D space
  const obj1MinY = obj1ActualY;
  const obj1MaxY = obj1ActualY + obj1Height;
  const obj2MinY = obj2ActualY;
  const obj2MaxY = obj2ActualY + obj2Height;

  // Horizontal bounding boxes (now accounting for rotation)
  const obj1MinX = pos1.x - obj1Width / 2;
  const obj1MaxX = pos1.x + obj1Width / 2;
  const obj2MinX = pos2.x - obj2Width / 2;
  const obj2MaxX = pos2.x + obj2Width / 2;

  const obj1MinZ = pos1.z - obj1Depth / 2;
  const obj1MaxZ = pos1.z + obj1Depth / 2;
  const obj2MinZ = pos2.z - obj2Depth / 2;
  const obj2MaxZ = pos2.z + obj2Depth / 2;

  // Add collision buffers - expand each object's bounding box
  // Moderate buffers for realistic spacing while preventing false positives
  const horizontalBuffer = 5; // 5cm horizontal buffer (10cm total gap when near)
  const verticalBuffer = 2;   // 2cm vertical buffer (4cm total gap when stacked)

  // ✅ FIXED: Expand bounding boxes by buffer amount before checking overlap
  const obj1MinXWithBuffer = obj1MinX - horizontalBuffer;
  const obj1MaxXWithBuffer = obj1MaxX + horizontalBuffer;
  const obj1MinZWithBuffer = obj1MinZ - horizontalBuffer;
  const obj1MaxZWithBuffer = obj1MaxZ + horizontalBuffer;
  const obj1MinYWithBuffer = obj1MinY - verticalBuffer;
  const obj1MaxYWithBuffer = obj1MaxY + verticalBuffer;

  const obj2MinXWithBuffer = obj2MinX - horizontalBuffer;
  const obj2MaxXWithBuffer = obj2MaxX + horizontalBuffer;
  const obj2MinZWithBuffer = obj2MinZ - horizontalBuffer;
  const obj2MaxZWithBuffer = obj2MaxZ + horizontalBuffer;
  const obj2MinYWithBuffer = obj2MinY - verticalBuffer;
  const obj2MaxYWithBuffer = obj2MaxY + verticalBuffer;

  // ✅ CRITICAL: Proper 3D bounding box overlap detection with buffers
  const overlapX = !(obj1MaxXWithBuffer < obj2MinXWithBuffer || obj2MaxXWithBuffer < obj1MinXWithBuffer);
  const overlapZ = !(obj1MaxZWithBuffer < obj2MinZWithBuffer || obj2MaxZWithBuffer < obj1MinZWithBuffer);
  const overlapY = !(obj1MaxYWithBuffer < obj2MinYWithBuffer || obj2MaxYWithBuffer < obj1MinYWithBuffer);

  const hasCollision = overlapX && overlapZ && overlapY;

  // ✅ ENHANCED: Detailed logging for debugging
  if (hasCollision) {
    console.log('🔴 3D COLLISION DETECTED (with floorOffset):', {
      item1: {
        type: type1,
        sku: item1?.sku,
        logicalPos: { x: pos1.x.toFixed(1), y: pos1.y.toFixed(1), z: pos1.z.toFixed(1) },
        actualYRange: `${obj1MinY.toFixed(1)}cm to ${obj1MaxY.toFixed(1)}cm`,
        floorOffset: obj1FloorOffset.toFixed(1) + 'cm',
        dimensions: `${obj1Width.toFixed(1)} × ${obj1Height.toFixed(1)} × ${obj1Depth.toFixed(1)}`
      },
      item2: {
        type: type2,
        sku: item2?.sku,
        logicalPos: { x: pos2.x.toFixed(1), y: pos2.y.toFixed(1), z: pos2.z.toFixed(1) },
        actualYRange: `${obj2MinY.toFixed(1)}cm to ${obj2MaxY.toFixed(1)}cm`,
        floorOffset: obj2FloorOffset.toFixed(1) + 'cm',
        dimensions: `${obj2Width.toFixed(1)} × ${obj2Height.toFixed(1)} × ${obj2Depth.toFixed(1)}`
      },
      overlaps: { x: overlapX, z: overlapZ, y: overlapY },
      verticalGap: Math.max(obj1MinY - obj2MaxY, obj2MinY - obj1MaxY).toFixed(1) + 'cm'
    });
  } else {
    // ✅ Debug log for successful non-collisions (helps verify the fix)
    const verticalGap = Math.max(obj1MinY - obj2MaxY, obj2MinY - obj1MaxY);
    if (overlapX && overlapZ && verticalGap < 50) { // Log near-misses within 50cm
      console.log('🟢 NO COLLISION (vertical clearance):', {
        items: `${type1} & ${type2}`,
        obj1YRange: `${obj1MinY.toFixed(1)} to ${obj1MaxY.toFixed(1)}cm`,
        obj2YRange: `${obj2MinY.toFixed(1)} to ${obj2MaxY.toFixed(1)}cm`,
        verticalGap: verticalGap.toFixed(1) + 'cm',
        floorOffsets: `${obj1FloorOffset.toFixed(1)}cm, ${obj2FloorOffset.toFixed(1)}cm`
      });
    }
  }

  return hasCollision;
};

/**
 * NEW: Get interior room boundaries for the new wall system
 */
export const getInteriorBoundaries = (
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
) => {
  const wallThickness = WALL_SETTINGS.THICKNESS;

  return {
    // Interior usable space (where objects can be placed)
    interior: {
      width: roomWidth - (wallThickness * 2),
      height: roomHeight - (wallThickness * 2),
      minX: -(roomWidth / 2) + wallThickness,
      maxX: (roomWidth / 2) - wallThickness,
      minZ: -(roomHeight / 2) + wallThickness,
      maxZ: (roomHeight / 2) - wallThickness
    },
    // Wall inner face positions (for wall-mounted objects)
    wallFaces: {
      north: -(roomHeight / 2) + wallThickness,
      south: (roomHeight / 2) - wallThickness,
      east: (roomWidth / 2) - wallThickness,
      west: -(roomWidth / 2) + wallThickness
    },
    // L-shape notch info (if applicable)
    notch: notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0 ? {
      width: notchWidth,
      height: notchHeight,
      minX: -(roomWidth / 2) + wallThickness,
      maxX: -(roomWidth / 2) + notchWidth - wallThickness,
      minZ: -(roomHeight / 2) + wallThickness,
      maxZ: -(roomHeight / 2) + notchHeight - wallThickness
    } : null
  };
};

/**
 * Check if a position (with object dimensions) is in the L-shaped notch area
 * Returns true if ANY part of the object would be in the notch
 */
export const isPositionInNotch = (
  position: Position,
  objectHalfWidth: number,
  objectHalfDepth: number,
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): boolean => {
  // If no notch dimensions, this is not an L-shaped room
  if (!notchWidth || !notchHeight || notchWidth <= 0 || notchHeight <= 0) {
    return false;
  }

  const wallThickness = WALL_SETTINGS.THICKNESS;

  // Notch boundaries (top-left corner)
  const notchMinX = -(roomWidth / 2) + wallThickness;
  const notchMaxX = -(roomWidth / 2) + notchWidth - wallThickness;
  const notchMinZ = -(roomHeight / 2) + wallThickness;
  const notchMaxZ = -(roomHeight / 2) + notchHeight - wallThickness;

  // Object boundaries
  const objMinX = position.x - objectHalfWidth;
  const objMaxX = position.x + objectHalfWidth;
  const objMinZ = position.z - objectHalfDepth;
  const objMaxZ = position.z + objectHalfDepth;

  // Check if object overlaps with notch area
  const xOverlap = objMaxX > notchMinX && objMinX < notchMaxX;
  const zOverlap = objMaxZ > notchMinZ && objMinZ < notchMaxZ;

  const isInNotch = xOverlap && zOverlap;

  // 🔍 DEBUG: Log detailed notch check
  console.log('🔍 isPositionInNotch check:', {
    position: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
    objectHalfDims: { width: objectHalfWidth.toFixed(1), depth: objectHalfDepth.toFixed(1) },
    objectBounds: {
      minX: objMinX.toFixed(1),
      maxX: objMaxX.toFixed(1),
      minZ: objMinZ.toFixed(1),
      maxZ: objMaxZ.toFixed(1)
    },
    notchBounds: {
      minX: notchMinX.toFixed(1),
      maxX: notchMaxX.toFixed(1),
      minZ: notchMinZ.toFixed(1),
      maxZ: notchMaxZ.toFixed(1)
    },
    overlap: { x: xOverlap, z: zOverlap },
    result: isInNotch ? '❌ IN NOTCH' : '✅ NOT IN NOTCH'
  });

  return isInNotch;
};

// ENHANCED: Check if a position would cause collision with existing objects
export const wouldCollideWithExisting = (
  position: Position,
  objectType: ComponentType,
  scale: number,
  objectId: number,
  existingItems: BathroomItem[],
  currentItem?: BathroomItem, // Optional: the item being moved/placed
  roomWidth?: number,
  roomHeight?: number
): boolean => {
  for (const item of existingItems) {
    if (item.id === objectId) {
      continue;
    }

    const itemPosition = { x: item.position[0], y: item.position[1], z: item.position[2] };
    const itemScale = item.scale || 1.0;

    // Use enhanced collision detection with full item data AND room dimensions
    const hasCollision = checkCollision(
      position,
      objectType,
      scale,
      itemPosition,
      item.type,
      itemScale,
      currentItem,
      item,
      roomWidth,
      roomHeight
    );

    if (hasCollision) {
      console.log('🔴 Collision detected in wouldCollideWithExisting:', {
        movingObject: { type: objectType, sku: currentItem?.sku },
        existingObject: { type: item.type, sku: item.sku },
        positions: { moving: position, existing: itemPosition }
      });
      return true;
    }
  }

  return false;
};

/**
 * Clean room constraint using ONLY productData.ts values
 * Updated to handle L-shaped rooms with notch areas
 */
export const constrainToRoom = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  {
    type: objectType,
    scale = 1.0,
    orientation = DEFAULT_ORIENTATION,
    item,
    notchWidth,
    notchHeight
  }: {
    type: ComponentType | null;
    scale?: number;
    orientation?: OrientationConfig;
    item?: BathroomItem;
    notchWidth?: number;
    notchHeight?: number;
  }
): { position: Position; rotation: number } => {

  console.log('🎯 constrainToRoom CALLED:', {
    objectType,
    position: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
    notchWidth: notchWidth || 'NOT PROVIDED',
    notchHeight: notchHeight || 'NOT PROVIDED',
    hasNotch: !!(notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0)
  });

  if (!objectType) return { position, rotation: 0 };

  console.warn(`orientation`, orientation);

  const dimensions = getDimensions(objectType, item?.sku, item?.model);
  if (!dimensions) {
    console.warn(`No dimensions found for ${objectType}, using fallback`);
    return { position, rotation: 0 };
  }

  const movementConfig = getMovementConfig(objectType, item);
  const { interior } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  // Use actual product dimensions
  const halfWidth = (dimensions.width * scale) / 2;
  const halfDepth = (dimensions.depth * scale) / 2;

  console.log(`🏠 Room constraint using productData for ${objectType}:`, {
    productDimensions: `${dimensions.width} × ${dimensions.depth}cm`,
    scaledHalfSize: `${halfWidth.toFixed(1)} × ${halfDepth.toFixed(1)}cm`,
    sku: item?.sku,
    isLShape: notchWidth && notchHeight ? true : false
  });

  // ✅ UPDATED: For L-shaped rooms, adjust interior boundaries to exclude notch
  let effectiveMinX = interior.minX;
  let effectiveMinZ = interior.minZ;

  if (notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0) {
    const wallThickness = WALL_SETTINGS.THICKNESS;
    const notchMaxX = -(roomWidth / 2) + notchWidth - wallThickness;
    const notchMaxZ = -(roomHeight / 2) + notchHeight - wallThickness;

    console.log('🔧 constrainToRoom: L-shape notch boundary check:', {
      position: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
      halfDims: { width: halfWidth.toFixed(1), depth: halfDepth.toFixed(1) },
      notchMaxX: notchMaxX.toFixed(1),
      notchMaxZ: notchMaxZ.toFixed(1),
      leftEdge: (position.x - halfWidth).toFixed(1),
      topEdge: (position.z - halfDepth).toFixed(1),
      wouldEnterNotchX: position.x - halfWidth < notchMaxX,
      wouldEnterNotchZ: position.z - halfDepth < notchMaxZ
    });

    // The notch creates a restricted area in the top-left (northwest) corner
    // Treat notch boundaries as walls that objects cannot pass through

    // If object's left edge would be in notch X range, enforce notch boundary
    if (position.x - halfWidth < notchMaxX) {
      // Object is in the X range of the notch - set boundary at notch edge
      effectiveMinX = Math.max(effectiveMinX, notchMaxX);
      console.log(`🧱 Notch X boundary enforced: effectiveMinX = ${effectiveMinX.toFixed(1)}`);
    }

    // If object's top edge would be in notch Z range, enforce notch boundary
    if (position.z - halfDepth < notchMaxZ) {
      // Object is in the Z range of the notch - set boundary at notch edge
      effectiveMinZ = Math.max(effectiveMinZ, notchMaxZ);
      console.log(`🧱 Notch Z boundary enforced: effectiveMinZ = ${effectiveMinZ.toFixed(1)}`);
    }
  }

  // Calculate constrained position using effective boundaries (accounting for notch)
  let constrainedPosition = {
    x: Math.max(
      effectiveMinX + halfWidth,
      Math.min(interior.maxX - halfWidth, position.x)
    ),
    y: Math.max(0, position.y),
    z: Math.max(
      effectiveMinZ + halfDepth,
      Math.min(interior.maxZ - halfDepth, position.z)
    )
  };

  // Handle vertical movement
  if (movementConfig) {
    if (!movementConfig.allowVerticalMovement) {
      constrainedPosition.y = 0; // Keep on floor
    } else {
      const minHeight = movementConfig.minHeight || 0;
      const maxHeight = movementConfig.maxHeight || 250;
      constrainedPosition.y = Math.max(minHeight, Math.min(maxHeight, position.y));
    }
  }

  console.log(`🏠 Room constraint result:`, {
    originalPos: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
    constrainedPos: { x: constrainedPosition.x.toFixed(1), z: constrainedPosition.z.toFixed(1) },
    objectBounds: `${halfWidth.toFixed(1)}cm from center`
  });

  return { position: constrainedPosition, rotation: 0 };
};

/**
 * ✅ FIXED: Clean wall constraint for flush-mounted objects
 * ✅ UPDATED: Now supports L-shaped room notch walls
 */
export const constrainToWalls = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  {
    type: objectType,
    scale = 1.0,
    orientation = DEFAULT_ORIENTATION,
    item,
    notchWidth,
    notchHeight
  }: {
    type: ComponentType | null;
    scale?: number;
    orientation?: OrientationConfig;
    item?: BathroomItem;
    notchWidth?: number;
    notchHeight?: number;
  }
): { position: Position; rotation: number } => {

  if (!objectType) return { position, rotation: 0 };

  const dimensions = getDimensions(objectType, item?.sku, item?.model);
  if (!dimensions) {
    console.warn(`No dimensions found for ${objectType}, using fallback`);
    return { position, rotation: 0 };
  }

  const movementConfig = getMovementConfig(objectType, item);

  // Check if this is a corner-only item
  if (movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled) {
    return constrainToCorner(position, roomWidth, roomHeight, {
      type: objectType,
      scale,
      orientation,
      item,
      notchWidth,
      notchHeight
    });
  }

  const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  // Use actual product dimensions
  const halfWidth = (dimensions.width * scale) / 2;
  const halfDepth = (dimensions.depth * scale) / 2;

  // Use wallBuffer from productData orientation config, or 0 if not specified
  const wallBuffer = (orientation?.wallBuffer !== undefined) ? orientation.wallBuffer * scale : 0;
  const isFlushMounted = wallBuffer === 0;

  console.log(`🔧 FIXED WALL CONSTRAINT for ${objectType}:`, {
    originalPosition: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
    productDimensions: `${dimensions.width} × ${dimensions.depth}cm`,
    halfSize: `${halfWidth.toFixed(1)} × ${halfDepth.toFixed(1)}cm`,
    wallBuffer: wallBuffer.toFixed(1) + 'cm',
    isFlushMounted,
    isLShape: !!notch,
    sku: item?.sku
  });

  // ✅ NEW: Calculate distances to all walls including notch walls
  const wallDistances: Record<string, number> = {
    north: Math.abs(position.z - wallFaces.north),
    south: Math.abs(position.z - wallFaces.south),
    east: Math.abs(position.x - wallFaces.east),
    west: Math.abs(position.x - wallFaces.west)
  };

  // ✅ NEW: Add notch walls if this is an L-shaped room
  if (notch) {
    wallDistances['notch-east'] = Math.abs(position.x - notch.maxX);
    wallDistances['notch-south'] = Math.abs(position.z - notch.maxZ);
  }

  const nearestWall = Object.entries(wallDistances).reduce((a, b) =>
    wallDistances[a[0]] < wallDistances[b[0]] ? a : b
  )[0] as 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';

  let constrainedPosition = { ...position }; // ✅ Start with original position
  let wallRotation = 0;

  // ✅ FIXED: Only constrain the coordinate affected by the specific wall
  switch (nearestWall) {
    case 'north':
      // ✅ Only modify Z coordinate for north wall
      console.log(':::: isFlushMounted>>>>', isFlushMounted);
      if (isFlushMounted) {
        constrainedPosition.z = wallFaces.north;
      } else {
        constrainedPosition.z = wallFaces.north + halfDepth + wallBuffer;
      }

      console.log(' :::: constrainedPosition.z>>>>>', constrainedPosition.z, constrainedPosition);

      // ✅ CRITICAL FIX: Only constrain X if object would actually extend beyond room bounds
      const wouldExtendWest = position.x - halfWidth < interior.minX;
      const wouldExtendEast = position.x + halfWidth > interior.maxX;

      if (wouldExtendWest || wouldExtendEast) {
        constrainedPosition.x = Math.max(
          interior.minX + halfWidth,
          Math.min(interior.maxX - halfWidth, position.x)
        );
        console.log(`🔧 :::: X constrained due to room bounds: ${position.x.toFixed(1)} → ${constrainedPosition.x.toFixed(1)}`);
      } else {
        // ✅ PRESERVE original X coordinate
        constrainedPosition.x = position.x;
        console.log(`🎯 :::: X preserved: ${position.x.toFixed(1)} (no room boundary conflict)`);
      }

      wallRotation = getObjectRotationForWall(objectType, 'north', orientation);
      break;

    case 'south':
      // ✅ Only modify Z coordinate for south wall
      if (isFlushMounted) {
        constrainedPosition.z = wallFaces.south;
      } else {
        constrainedPosition.z = wallFaces.south - halfDepth - wallBuffer;
      }

      // ✅ Only constrain X if object would actually extend beyond room bounds
      const wouldExtendWestSouth = position.x - halfWidth < interior.minX;
      const wouldExtendEastSouth = position.x + halfWidth > interior.maxX;

      if (wouldExtendWestSouth || wouldExtendEastSouth) {
        constrainedPosition.x = Math.max(
          interior.minX + halfWidth,
          Math.min(interior.maxX - halfWidth, position.x)
        );
        console.log(`🔧 X :::: constrained due to room bounds: ${position.x.toFixed(1)} → ${constrainedPosition.x.toFixed(1)}`);
      } else {
        constrainedPosition.x = position.x;
        console.log(`🎯 X :::: preserved: ${position.x.toFixed(1)} (no room boundary conflict)`);
      }

      wallRotation = getObjectRotationForWall(objectType, 'south', orientation);
      break;

    case 'east':
      // ✅ Only modify X coordinate for east wall
      if (isFlushMounted) {
        constrainedPosition.x = wallFaces.east;
      } else {
        constrainedPosition.x = wallFaces.east - halfDepth - wallBuffer;
      }

      // ✅ Only constrain Z if object would actually extend beyond room bounds
      const wouldExtendNorth = position.z - halfWidth < interior.minZ;
      const wouldExtendSouth = position.z + halfWidth > interior.maxZ;

      if (wouldExtendNorth || wouldExtendSouth) {
        constrainedPosition.z = Math.max(
          interior.minZ + halfWidth,
          Math.min(interior.maxZ - halfWidth, position.z)
        );
        console.log(`🔧 :::: Z constrained due to room bounds: ${position.z.toFixed(1)} → ${constrainedPosition.z.toFixed(1)}`);
      } else {
        constrainedPosition.z = position.z;
        console.log(`🎯 :::: Z preserved: ${position.z.toFixed(1)} (no room boundary conflict)`);
      }

      wallRotation = getObjectRotationForWall(objectType, 'east', orientation);
      break;

    case 'west':
      // ✅ Only modify X coordinate for west wall
      if (isFlushMounted) {
        constrainedPosition.x = wallFaces.west;
      } else {
        constrainedPosition.x = wallFaces.west + halfDepth + wallBuffer;
      }

      // ✅ Only constrain Z if object would actually extend beyond room bounds
      const wouldExtendNorthWest = position.z - halfWidth < interior.minZ;
      const wouldExtendSouthWest = position.z + halfWidth > interior.maxZ;

      if (wouldExtendNorthWest || wouldExtendSouthWest) {
        constrainedPosition.z = Math.max(
          interior.minZ + halfWidth,
          Math.min(interior.maxZ - halfWidth, position.z)
        );
        console.log(`🔧 :::: Z constrained due to room bounds: ${position.z.toFixed(1)} → ${constrainedPosition.z.toFixed(1)}`);
      } else {
        constrainedPosition.z = position.z;
        console.log(`🎯 :::: Z preserved: ${position.z.toFixed(1)} (no room boundary conflict)`);
      }

      wallRotation = getObjectRotationForWall(objectType, 'west', orientation);
      break;

    // ✅ NEW: Handle notch-east wall (vertical edge of L-shape notch)
    case 'notch-east':
      if (!notch) break; // Safety check

      // Treat like east wall - snap X coordinate to notch edge
      if (isFlushMounted) {
        constrainedPosition.x = notch.maxX;
      } else {
        constrainedPosition.x = notch.maxX - halfDepth - wallBuffer;  // Same pattern as regular east wall
      }

      // ✅ Allow Z to slide freely along the notch wall within valid range
      // Only constrain if object would extend beyond room bounds
      const wouldExtendNotchNorth = position.z - halfWidth < notch.minZ;
      const wouldExtendNotchSouth = position.z + halfWidth > interior.maxZ;

      if (wouldExtendNotchNorth || wouldExtendNotchSouth) {
        constrainedPosition.z = Math.max(
          notch.minZ + halfWidth,
          Math.min(interior.maxZ - halfWidth, position.z)
        );
        console.log(`🔧 NOTCH-EAST: Z constrained: ${position.z.toFixed(1)} → ${constrainedPosition.z.toFixed(1)}`);
      } else {
        constrainedPosition.z = position.z;
        console.log(`🎯 NOTCH-EAST: Z preserved for smooth sliding: ${position.z.toFixed(1)}`);
      }

      wallRotation = getObjectRotationForWall(objectType, 'east', orientation);
      console.log(`✅ NOTCH-EAST wall constraint applied: X=${constrainedPosition.x.toFixed(1)}, Z=${constrainedPosition.z.toFixed(1)}`);
      break;

    // ✅ NEW: Handle notch-south wall (horizontal edge of L-shape notch)
    case 'notch-south':
      if (!notch) break; // Safety check

      // Treat like south wall - snap Z coordinate to notch edge
      if (isFlushMounted) {
        constrainedPosition.z = notch.maxZ;
      } else {
        constrainedPosition.z = notch.maxZ - halfDepth - wallBuffer;  // Same pattern as regular south wall
      }

      // ✅ Allow X to slide freely along the notch wall within valid range
      // Only constrain if object would extend beyond room bounds
      const wouldExtendNotchWest = position.x - halfWidth < notch.minX;
      const wouldExtendNotchEast = position.x + halfWidth > interior.maxX;

      if (wouldExtendNotchWest || wouldExtendNotchEast) {
        constrainedPosition.x = Math.max(
          notch.minX + halfWidth,
          Math.min(interior.maxX - halfWidth, position.x)
        );
        console.log(`🔧 NOTCH-SOUTH: X constrained: ${position.x.toFixed(1)} → ${constrainedPosition.x.toFixed(1)}`);
      } else {
        constrainedPosition.x = position.x;
        console.log(`🎯 NOTCH-SOUTH: X preserved for smooth sliding: ${position.x.toFixed(1)}`);
      }

      wallRotation = getObjectRotationForWall(objectType, 'south', orientation);
      console.log(`✅ NOTCH-SOUTH wall constraint applied: X=${constrainedPosition.x.toFixed(1)}, Z=${constrainedPosition.z.toFixed(1)}`);
      break;
  }

  // Handle vertical positioning
  if (movementConfig.allowVerticalMovement) {
    const minHeight = movementConfig.minHeight || 0;
    const maxHeight = movementConfig.maxHeight || 250;
    constrainedPosition.y = Math.max(minHeight, Math.min(maxHeight, position.y));
  } else {
    constrainedPosition.y = movementConfig.minHeight || 0;
  }

  console.log(`🔧 :::: FIXED CONSTRAINT result for ${objectType}:`, {
    nearestWall,
    isFlushMounted,
    originalPos: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
    finalPos: { x: constrainedPosition.x.toFixed(1), z: constrainedPosition.z.toFixed(1) },
    coordinateChanges: {
      x: position.x !== constrainedPosition.x ? `${position.x.toFixed(1)} → ${constrainedPosition.x.toFixed(1)}` : 'preserved',
      z: position.z !== constrainedPosition.z ? `${position.z.toFixed(1)} → ${constrainedPosition.z.toFixed(1)}` : 'preserved'
    },
    wallFacePosition: wallFaces[nearestWall].toFixed(1) + 'cm',
    backEdgePosition: nearestWall === 'north' || nearestWall === 'south' ?
      (nearestWall === 'north' ? (constrainedPosition.z - halfDepth).toFixed(1) : (constrainedPosition.z + halfDepth).toFixed(1)) + 'cm' :
      (nearestWall === 'east' ? (constrainedPosition.x + halfDepth).toFixed(1) : (constrainedPosition.x - halfDepth).toFixed(1)) + 'cm'
  });

  return { position: constrainedPosition, rotation: wallRotation };
};


// Snap position to the nearest wall (same as constrainToWalls)
export const snapToNearestWall = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  orientationDetails: {
    type: ComponentType | null;
    scale?: number;
    orientation?: OrientationConfig;
    item?: BathroomItem;
    notchWidth?: number;
    notchHeight?: number;
  }
): { position: Position; rotation: number } => {
  return constrainToWalls(position, roomWidth, roomHeight, orientationDetails);
};

/**
 * UPDATED: Find free wall position using interior wall system
 */
export const findFreeWallPosition = (
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType,
  scale: number = 1.0,
  existingItems: BathroomItem[] = [],
  maxAttempts: number = 50,
  orientation: OrientationConfig = DEFAULT_ORIENTATION,
  movement?: MovementConfig,
  spawnHeight?: number,
  _floorOffset?: number,
  sku?: string,
  notchWidth?: number,
  notchHeight?: number
): { position: Position; rotation: number } | null => {

  console.log('🎯 Finding free position on interior walls for:', objectType, movement);

  const movementConfig = movement ?? getMovementConfig(objectType);

  // For corner-only items, find a free corner
  if (movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled) {
    const cornerResult = findFreeCornerPosition(
      roomWidth,
      roomHeight,
      objectType,
      scale,
      existingItems,
      orientation,
      movementConfig,
      sku,
      notchWidth,
      notchHeight
    );

    // Return null if no free corner is available
    if (!cornerResult) {
      console.warn('⚠️ Cannot add corner item - all corners are occupied');
      return null;
    }

    return cornerResult;
  }

  if (!movementConfig.snapToWall) {
    return findFreeStandingPosition(roomWidth, roomHeight, objectType, scale, existingItems, maxAttempts, movementConfig, sku);
  }

  console.log('>>>111 SKU', sku);
  // GET OBJECT DIMENSIONS
  const dimensions = getDimensions(objectType, sku);

  // ✅ FIX: Add fallback dimensions to prevent placement outside room boundaries
  // If dimensions are not available, use a safe minimum size (30cm x 30cm)
  const DEFAULT_MIN_SIZE = 30; // 30cm minimum size

  if (!dimensions || !dimensions.width || !dimensions.depth) {
    console.warn(`⚠️ No dimensions found for ${objectType} (SKU: ${sku}). Using fallback size of ${DEFAULT_MIN_SIZE}cm to prevent boundary issues.`);
  }

  const halfWidth = dimensions && dimensions.width ? dimensions.width / 2 : DEFAULT_MIN_SIZE / 2;
  const halfDepth = dimensions && dimensions.depth ? dimensions.depth / 2 : DEFAULT_MIN_SIZE / 2;

  const buffer = getObjectWallBuffer({ orientation, scale });
  const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

  // ✅ FIX: Check if object is flush-mounted BEFORE creating walls
  const wallBuffer = (orientation?.wallBuffer !== undefined) ? orientation.wallBuffer * scale : 0;
  const isFlushMounted = wallBuffer === 0;

  console.log(`🔧 Initial placement flush check: ${isFlushMounted ? 'FLUSH-MOUNTED' : 'OFFSET'} (wallBuffer: ${wallBuffer})`);

  // Define walls with proper interior positioning
  const walls = [
    {
      name: 'north',
      getPosition: (t: number) => {
        // Calculate position along wall
        const minX = interior.minX + halfWidth;  // Don't go past west corner
        const maxX = interior.maxX - halfWidth;  // Don't go past east corner
        return {
          x: minX + t * (maxX - minX),
          y: getWallPositionY(movementConfig, spawnHeight),
          // ✅ FIX: Flush-mounted objects go directly at wall
          z: isFlushMounted ? wallFaces.north : wallFaces.north + halfDepth + wallBuffer
        }
      },
      rotation: getObjectRotationForWall(objectType, 'north', orientation)
    },
    {
      name: 'south',
      getPosition: (t: number) => {
        const minX = interior.minX + halfWidth;
        const maxX = interior.maxX - halfWidth;
        return {
          x: minX + t * (maxX - minX),
          y: getWallPositionY(movementConfig, spawnHeight),
          // ✅ FIX: Flush-mounted objects go directly at wall
          z: isFlushMounted ? wallFaces.south : wallFaces.south - halfDepth - wallBuffer
        };
      },
      rotation: getObjectRotationForWall(objectType, 'south', orientation)
    },
    {
      name: 'east',
      getPosition: (t: number) => {
        const minZ = interior.minZ + halfWidth;  // Don't go past north corner
        const maxZ = interior.maxZ - halfWidth;  // Don't go past south corner
        return {
          // ✅ FIX: Flush-mounted objects go directly at wall
          x: isFlushMounted ? wallFaces.east : wallFaces.east - halfDepth - wallBuffer,
          y: getWallPositionY(movementConfig, spawnHeight),
          z: minZ + t * (maxZ - minZ)
        };
      },
      rotation: getObjectRotationForWall(objectType, 'east', orientation)
    },
    {
      name: 'west',
      getPosition: (t: number) => {
        const minZ = interior.minZ + halfWidth;
        const maxZ = interior.maxZ - halfWidth;
        return {
          // ✅ FIX: Flush-mounted objects go directly at wall
          x: isFlushMounted ? wallFaces.west : wallFaces.west + halfDepth + wallBuffer,
          y: getWallPositionY(movementConfig, spawnHeight),
          z: minZ + t * (maxZ - minZ)
        };
      },
      rotation: getObjectRotationForWall(objectType, 'west', orientation)
    }
  ];

  // ✅ Add notch walls for L-shaped rooms if object fits
  if (notch && dimensions) {
    const objectWidth = dimensions.width * scale;

    // Calculate notch wall lengths
    const notchEastWallLength = notch.maxZ - notch.minZ;
    const notchSouthWallLength = notch.maxX - notch.minX;

    console.log('🔍 Checking notch wall fit:', {
      objectWidth: objectWidth.toFixed(1),
      notchEastLength: notchEastWallLength.toFixed(1),
      notchSouthLength: notchSouthWallLength.toFixed(1)
    });

    // Add notch-east wall if object fits
    if (objectWidth <= notchEastWallLength) {
      console.log('✅ Object fits on notch-east wall');
      walls.push({
        name: 'notch-east',
        getPosition: (t: number) => {
          const minZ = notch.minZ + halfWidth;
          const maxZ = notch.maxZ - halfWidth;
          return {
            x: notch.maxX - halfDepth - buffer,  // Match constrainToWalls pattern (same as regular east wall)
            y: getWallPositionY(movementConfig, spawnHeight),
            z: minZ + t * (maxZ - minZ)
          };
        },
        rotation: getObjectRotationForWall(objectType, 'east', orientation)
      });
    } else {
      console.log('⚠️ Object too wide for notch-east wall');
    }

    // Add notch-south wall if object fits
    if (objectWidth <= notchSouthWallLength) {
      console.log('✅ Object fits on notch-south wall');
      walls.push({
        name: 'notch-south',
        getPosition: (t: number) => {
          const minX = notch.minX + halfWidth;
          const maxX = notch.maxX - halfWidth;
          return {
            x: minX + t * (maxX - minX),
            y: getWallPositionY(movementConfig, spawnHeight),
            z: notch.maxZ - halfDepth - buffer  // Match constrainToWalls pattern (same as regular south wall)
          };
        },
        rotation: getObjectRotationForWall(objectType, 'south', orientation)
      });
    } else {
      console.log('⚠️ Object too wide for notch-south wall');
    }
  }

  // Try to find a free position
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick a random wall
    const wall = walls[Math.floor(Math.random() * walls.length)];

    // Pick a random position along the wall (t from 0 to 1)
    const t = Math.random();
    const position = wall.getPosition(t);

    // ✅ FIX: Create temporary item for proper collision detection
    const tempItem: BathroomItem = {
      id: -1,
      type: objectType,
      position: [position.x, position.y, position.z] as [number, number, number],
      scale: scale,
      sku: sku
    };

    // ✅ FIX: First check if position is valid (not in notch area or outside room boundaries)
    const hasWallCollision = checkWallCollision(
      position,
      objectType,
      scale,
      roomWidth,
      roomHeight,
      tempItem,
      undefined, // rotation not needed for wall-snapped items
      notchWidth,
      notchHeight
    );

    if (hasWallCollision) {
      // Position is in notch area or outside boundaries, try another position
      continue;
    }

    // ✅ Then check collision with existing items
    let hasCollision = false;
    for (const item of existingItems) {
      const findCollision = checkCollision(
        position,
        objectType,
        scale,
        { x: item.position[0], y: item.position[1], z: item.position[2] },
        item.type,
        item.scale || 1.0,
        tempItem,
        item
      );
      if (findCollision) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      console.log(`✅ Found valid position on ${wall.name} wall:`, {
        position: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
        attempt: attempt + 1
      });
      return { position, rotation: wall.rotation };
    }
  }

  // ✅ FIXED: No free position found - return null instead of forcing placement
  console.warn(`⚠️ Cannot find free wall position for ${objectType} - all positions are occupied`);
  return null;
};

// New function for finding free corner positions
export const findFreeCornerPosition = (
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType,
  scale: number = 1.0,
  existingItems: BathroomItem[] = [],
  orientation: OrientationConfig = DEFAULT_ORIENTATION,
  movement?: MovementConfig,
  sku?: string,
  notchWidth?: number,
  notchHeight?: number
): { position: Position; rotation: number } | null => {

  const corners = getRoomCorners(roomWidth, roomHeight, notchWidth, notchHeight);

  const dimensions = getDimensions(objectType, sku);

  if (!dimensions || dimensions.width === 0 || dimensions.depth === 0) {
    console.warn(`No dimensions found for ${objectType} (SKU: ${sku}) in findFreeCornerPosition`);
    // Return null if no dimensions found
    return null;
  }

  // Try each corner
  for (const corner of corners) {

    const result = constrainToCorner(corner.position, roomWidth, roomHeight, {
      type: objectType,
      scale: 1.0,
      orientation,
      movement,
      sku
    });

    console.log(`🔍 Checking corner ${corner.type} at position:`, result.position);
    console.log(`🔍 Existing items count:`, existingItems.length);
    console.log(`🔍 Existing items:`, existingItems.map(item => ({
      type: item.type,
      sku: item.sku,
      position: item.position
    })));

    // Create temporary item with SKU for proper collision detection
    const tempItem: BathroomItem = {
      id: -1,
      type: objectType,
      position: [result.position.x, result.position.y, result.position.z] as [number, number, number],
      scale: scale,
      sku: sku
    };

    // Check if this corner position would collide with existing items
    const wouldCollide = wouldCollideWithExisting(
      result.position,
      objectType,
      scale,
      -1, // New item, no ID yet
      existingItems,
      tempItem // Pass temporary item for proper dimension lookup
    );

    console.log(`🔍 Corner ${corner.type} collision check result: ${wouldCollide ? '❌ OCCUPIED' : '✅ FREE'}`);

    if (!wouldCollide) {
      console.log(`>>>111 ✅ Found free corner: ${corner.type}`);
      return result;
    }
  }

  // If no free corner, return null instead of forcing placement
  console.warn('⚠️ No free corners available for corner stall shower');
  return null;
};

// Helper function for free-standing objects (updated for interior space)
const findFreeStandingPosition = (
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType,
  scale: number,
  existingItems: BathroomItem[],
  maxAttempts: number,
  movement?: MovementConfig,
  sku?: string
): { position: Position; rotation: number } | null => {

  const movementConfig = movement ?? getMovementConfig(objectType);

  // Get actual object dimensions
  const dimensions = getDimensions(objectType, sku);
  if (!dimensions) {
    console.warn(`No dimensions found for ${objectType} (SKU: ${sku}) in findFreeStandingPosition`);
    // Fallback to center if no dimensions
    const { interior } = getInteriorBoundaries(roomWidth, roomHeight);
    return {
      position: {
        x: (interior.minX + interior.maxX) / 2,
        y: movementConfig.allowVerticalMovement ? (movementConfig.minHeight || 0) : 0,
        z: (interior.minZ + interior.maxZ) / 2
      },
      rotation: 0
    };
  }

  // Use actual object dimensions as buffer from walls
  const halfWidth = (dimensions.width * scale) / 2;
  const halfDepth = (dimensions.depth * scale) / 2;

  const { interior } = getInteriorBoundaries(roomWidth, roomHeight);

  // Define free-standing area within interior space using actual object dimensions
  const minX = interior.minX + halfWidth;
  const maxX = interior.maxX - halfWidth;
  const minZ = interior.minZ + halfDepth;
  const maxZ = interior.maxZ - halfDepth;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const position = {
      x: minX + Math.random() * (maxX - minX),
      y: movementConfig.allowVerticalMovement ? (movementConfig.minHeight || 0) : 0,
      z: minZ + Math.random() * (maxZ - minZ)
    };

    const rotation = 0;

    // Create temporary item for collision detection with SKU
    const tempItem: BathroomItem = {
      id: -1,
      type: objectType,
      position: [position.x, position.y, position.z] as [number, number, number],
      scale: scale,
      sku: sku
    };

    // Check for collisions
    let hasCollision = false;
    for (const item of existingItems) {
      if (checkCollision(
        position,
        objectType,
        scale,
        { x: item.position[0], y: item.position[1], z: item.position[2] },
        item.type,
        item.scale || 1.0,
        tempItem, // ✅ Pass temporary item for enhanced dimensions lookup
        item      // ✅ Pass existing item for product-specific dimensions
      )) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      console.log(`🏊 Found free-standing position in interior space for ${objectType}:`, {
        position: { x: position.x.toFixed(1), y: position.y.toFixed(1), z: position.z.toFixed(1) },
        rotation: `${(rotation * 180 / Math.PI).toFixed(0)}°`,
        interiorSpace: `${interior.width.toFixed(1)}x${interior.height.toFixed(1)}cm`,
        attempt: attempt + 1
      });
      return { position, rotation };
    }
  }

  // ✅ FIXED: Check if fallback center position is free before using it
  const fallbackPosition = {
    x: (interior.minX + interior.maxX) / 2,
    y: movementConfig.allowVerticalMovement ? (movementConfig.minHeight || 0) : 0,
    z: (interior.minZ + interior.maxZ) / 2
  };

  // Create temporary item for collision detection
  const fallbackTempItem: BathroomItem = {
    id: -1,
    type: objectType,
    position: [fallbackPosition.x, fallbackPosition.y, fallbackPosition.z] as [number, number, number],
    scale: scale,
    sku: sku
  };

  // Check if fallback position collides
  let fallbackHasCollision = false;
  for (const item of existingItems) {
    if (checkCollision(
      fallbackPosition,
      objectType,
      scale,
      { x: item.position[0], y: item.position[1], z: item.position[2] },
      item.type,
      item.scale || 1.0,
      fallbackTempItem,
      item
    )) {
      fallbackHasCollision = true;
      break;
    }
  }

  if (fallbackHasCollision) {
    // No free position available, even at center
    console.warn(`⚠️ Cannot find free standing position for ${objectType} - all positions occupied including center`);
    return null;
  }

  // Fallback position is free, use it
  console.log(`⚠️ Using fallback center position in interior space for ${objectType}`);
  return {
    position: fallbackPosition,
    rotation: 0
  };
};

// Helper to get appropriate Y position for wall-mounted objects
const getWallPositionY = (movementConfig: MovementConfig, objectSpawnHeight?: number): number => {
  const minHeight = movementConfig.minHeight ?? 0;

  if (!objectSpawnHeight && objectSpawnHeight !== 0) {
    return minHeight; // Default to minimum height when no spawn height specified
  }
  // Use spawn height but ensure it's at least at minimum height
  return Math.max(objectSpawnHeight, minHeight);
};

/**
 * UPDATED: Constrain all objects to interior room boundaries
 */
export const constrainAllObjectsToRoom = (
  items: BathroomItem[],
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): BathroomItem[] => {
  return items.map(item => {
    const position = { x: item.position[0], y: item.position[1], z: item.position[2] };
    const movementConfig = getMovementConfig(item.type, item);

    let constrainedPosition: Position;
    let constrainedRotation: number;

    if (movementConfig.snapToWall) {
      // Wall-snapped objects - constrain to interior walls
      const result = constrainToWalls(position, roomWidth, roomHeight, {
        type: item.type,
        scale: item.scale,
        orientation: item.model?.orientation,
        item,
        notchWidth,
        notchHeight
      });
      constrainedPosition = result.position;
      constrainedRotation = result.rotation;
    } else {
      // Free-standing objects - constrain to interior room bounds
      const result = constrainToRoom(position, roomWidth, roomHeight, {
        type: item.type,
        scale: item.scale,
        orientation: item.model?.orientation,
        item,
        notchWidth,
        notchHeight
      });
      constrainedPosition = result.position;
      constrainedRotation = item.rotation || 0;
    }

    return {
      ...item,
      position: [constrainedPosition.x, constrainedPosition.y, constrainedPosition.z] as [number, number, number],
      rotation: constrainedRotation
    };
  });
};
