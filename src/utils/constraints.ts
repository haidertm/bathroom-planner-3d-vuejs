// src/utils/constraints.ts - ENHANCED with proper movement integration
import { CONSTRAINTS } from '../constants/dimensions';
import type { ComponentType } from '../constants/components';
import { getMovementConfig } from '../utils/models';
import { type OrientationConfig, MovementConfig, DEFAULT_ORIENTATION } from '../constants/models';
import { getObjectWallBuffer, getObjectRotationForWall, getOrientationInfo } from '../utils/models';
import productData from '../mocks/productData';

// Interface for position
export interface Position {
  x: number;
  y: number;
  z: number;
}

export type ObjectModel = {
  path: string;
  name: string;
  title?: string;
  id?: string;
  sku?: string;
  scale?: number;
  price?: number | string;
  rotation?: [number, number, number];
  position?: [number, number, number];
  movement?: MovementConfig;
  orientation?: OrientationConfig;
  floorOffset?: number; // Floor offset in centimeters
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

// Function to get dimensions for a specific product
const getProductDimensions = (sku: string, type: ComponentType): {
  width: number;
  depth: number;
  height: number;
  floorOffset: number;
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
            floorOffset: variant.floorOffset || 0 // Use floor offset if available
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
): { width: number; depth: number; height: number, floorOffset: number } => {

  // Priority 1: Try to get dimensions from model object if available
  if (model?.dimensions) {
    return {
      width: model.dimensions.width,
      depth: model.dimensions.depth || model.dimensions.height,
      height: model.dimensions.height,
      floorOffset: model.floorOffset || 0 // Use model's floor offset if available
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

  return { width: 0, depth: 0, height: 0, floorOffset: 0 };
};

// Wall identification
export type WallType = 'north' | 'south' | 'east' | 'west';

export interface WallInfo {
  type: WallType;
  position: Position;
  distance: number;
}

// ENHANCED: Collision detection with product-specific dimensions
export const checkCollision = (
  pos1: Position,
  type1: ComponentType,
  scale1: number,
  pos2: Position,
  type2: ComponentType,
  scale2: number,
  item1?: BathroomItem,
  item2?: BathroomItem
): boolean => {

  // Get enhanced dimensions including floorOffset
  const dims1 = getDimensions(type1, item1?.sku, item1?.model);
  const dims2 = getDimensions(type2, item2?.sku, item2?.model);

  if (!dims1 || !dims2) {
    console.warn(`Missing dimensions for collision check: ${type1} or ${type2}`);
    return false;
  }

  // ✅ CRITICAL: Calculate actual 3D bounding boxes accounting for floorOffset

  // Object 1 bounding box (scaled dimensions)
  const obj1Width = dims1.width * scale1;
  const obj1Height = dims1.height * scale1;
  const obj1Depth = dims1.depth * scale1;
  const obj1FloorOffset = dims1.floorOffset * scale1; // ✅ Scale the floor offset too

  // Object 2 bounding box (scaled dimensions)
  const obj2Width = dims2.width * scale2;
  const obj2Height = dims2.height * scale2;
  const obj2Depth = dims2.depth * scale2;
  const obj2FloorOffset = dims2.floorOffset * scale2; // ✅ Scale the floor offset too

  // ✅ CRITICAL: Calculate actual 3D positions accounting for floorOffset
  // The floorOffset represents how much the object is elevated in its GLB model
  const obj1ActualY = pos1.y + obj1FloorOffset; // Object's bottom position in 3D space
  const obj2ActualY = pos2.y + obj2FloorOffset; // Object's bottom position in 3D space

  // ✅ CRITICAL: Calculate bounding box boundaries in 3D space
  const obj1MinY = obj1ActualY; // Bottom of object 1
  const obj1MaxY = obj1ActualY + obj1Height; // Top of object 1

  const obj2MinY = obj2ActualY; // Bottom of object 2
  const obj2MaxY = obj2ActualY + obj2Height; // Top of object 2

  // Horizontal bounding boxes (unchanged)
  const obj1MinX = pos1.x - obj1Width / 2;
  const obj1MaxX = pos1.x + obj1Width / 2;
  const obj2MinX = pos2.x - obj2Width / 2;
  const obj2MaxX = pos2.x + obj2Width / 2;

  const obj1MinZ = pos1.z - obj1Depth / 2;
  const obj1MaxZ = pos1.z + obj1Depth / 2;
  const obj2MinZ = pos2.z - obj2Depth / 2;
  const obj2MaxZ = pos2.z + obj2Depth / 2;

  // Add collision buffers
  const horizontalBuffer = 10; // 10cm horizontal buffer
  const verticalBuffer = 3;    // 3cm vertical buffer

  // ✅ CRITICAL: Proper 3D bounding box overlap detection
  const overlapX = !(obj1MaxX + horizontalBuffer < obj2MinX || obj2MaxX + horizontalBuffer < obj1MinX);
  const overlapZ = !(obj1MaxZ + horizontalBuffer < obj2MinZ || obj2MaxZ + horizontalBuffer < obj1MinZ);
  const overlapY = !(obj1MaxY + verticalBuffer < obj2MinY || obj2MaxY + verticalBuffer < obj1MinY);

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

// ENHANCED: Check if a position would cause collision with existing objects
export const wouldCollideWithExisting = (
  position: Position,
  objectType: ComponentType,
  scale: number,
  objectId: number,
  existingItems: BathroomItem[],
  currentItem?: BathroomItem // Optional: the item being moved/placed
): boolean => {
  for (const item of existingItems) {
    if (item.id === objectId) {
      continue;
    }

    const itemPosition = { x: item.position[0], y: item.position[1], z: item.position[2] };
    const itemScale = item.scale || 1.0;

    // Use enhanced collision detection with full item data
    const hasCollision = checkCollision(
      position,
      objectType,
      scale,
      itemPosition,
      item.type,
      itemScale,
      currentItem,
      item
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

// 🆕 ENHANCED: Constrain movement to room bounds for free-standing objects
export const constrainToRoom = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  {
    type: objectType,
    scale = 1.0,
    orientation = DEFAULT_ORIENTATION,
    item
  }: {
    type: ComponentType | null;
    scale?: number;
    orientation?: OrientationConfig;
    item?: BathroomItem;
  }
): { position: Position; rotation: number } => {

  // 🆕 CRITICAL: Get movement configuration for the object
  const movementConfig = objectType ? getMovementConfig(objectType, item) : null;

  // Get object dimensions for better boundary calculation
  const buffer = objectType ? getObjectWallBuffer({ orientation, scale }) / 2 : CONSTRAINTS.OBJECT_BUFFER;

  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Calculate the boundaries (inside the room, away from walls)
  const minX = -roomHalfWidth + buffer;
  const maxX = roomHalfWidth - buffer;
  const minZ = -roomHalfHeight + buffer;
  const maxZ = roomHalfHeight - buffer;

  // Constrain position to room boundaries
  const constrainedPosition = {
    x: Math.max(minX, Math.min(maxX, position.x)),
    y: Math.max(0, position.y), // Keep above floor
    z: Math.max(minZ, Math.min(maxZ, position.z))
  };

  // 🆕 CRITICAL: Handle vertical position based on movement configuration
  if (movementConfig) {
    if (!movementConfig.allowVerticalMovement) {
      // Force free-standing objects to floor level
      constrainedPosition.y = 0;
      console.log(`🔒 Forced ${objectType} to floor level (no vertical movement allowed)`);
    } else {
      // Allow vertical movement within limits
      const minHeight = movementConfig.minHeight || 0;
      const maxHeight = movementConfig.maxHeight || 250;
      constrainedPosition.y = Math.max(minHeight, Math.min(maxHeight, position.y));
      console.log(`📏 Vertical position constrained for ${objectType}: ${constrainedPosition.y}cm`);
    }
  } else {
    // Default: keep above floor
    constrainedPosition.y = Math.max(0, position.y);
  }

  // For room-constrained objects, maintain current rotation
  // (no automatic rotation based on position)
  const currentRotation = 0; // Default rotation for free objects

  console.log(`🏠 Room constraint applied to ${objectType}:`, {
    original: { x: position.x.toFixed(1), y: position.y.toFixed(1), z: position.z.toFixed(1) },
    constrained: {
      x: constrainedPosition.x.toFixed(1),
      y: constrainedPosition.y.toFixed(1),
      z: constrainedPosition.z.toFixed(1)
    },
    roomBounds: {
      x: `${minX.toFixed(1)} to ${maxX.toFixed(1)}`,
      z: `${minZ.toFixed(1)} to ${maxZ.toFixed(1)}`
    },
    buffer: buffer.toFixed(1),
    movementType: movementConfig?.snapToWall ? 'WALL-SNAPPED' : 'FREE-STANDING',
    verticalMovement: movementConfig?.allowVerticalMovement ? 'allowed' : 'restricted'
  });

  return { position: constrainedPosition, rotation: currentRotation };
};

// 🆕 ENHANCED: Constrain movement to walls with movement configuration
export const constrainToWalls = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  {
    type: objectType,
    scale = 1.0,
    orientation = DEFAULT_ORIENTATION,
    item
  }: {
    type: ComponentType | null;
    scale?: number;
    orientation?: OrientationConfig;
    item?: BathroomItem;
  }
): { position: Position; rotation: number } => {

  console.log('🔗 Constraining to walls:', objectType, { scale, orientation: orientation?.type });

  // 🆕 Get movement configuration
  const movementConfig = objectType ? getMovementConfig(objectType, item) : null;

  // Use configurable wall buffer instead of generic buffer
  const buffer = objectType ? getObjectWallBuffer({ orientation, scale }) : CONSTRAINTS.OBJECT_BUFFER;

  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Wall positions (accounting for object-specific buffer)
  const northWallZ = -roomHalfHeight + buffer;
  const southWallZ = roomHalfHeight - buffer;
  const eastWallX = roomHalfWidth - buffer;
  const westWallX = -roomHalfWidth + buffer;

  // Calculate distances to each wall
  const distanceToNorth = Math.abs(position.z - northWallZ);
  const distanceToSouth = Math.abs(position.z - southWallZ);
  const distanceToEast = Math.abs(position.x - eastWallX);
  const distanceToWest = Math.abs(position.x - westWallX);

  // Find the minimum distance to determine which wall to snap to
  const minDistance = Math.min(distanceToNorth, distanceToSouth, distanceToEast, distanceToWest);

  let constrainedPosition = { ...position };
  let wallRotation = 0;
  let wallType: 'north' | 'south' | 'east' | 'west' = 'south';

  if (minDistance === distanceToNorth) {
    // Snap to north wall
    constrainedPosition.z = northWallZ;
    constrainedPosition.x = Math.max(westWallX, Math.min(eastWallX, position.x));
    wallType = 'north';
  } else if (minDistance === distanceToSouth) {
    // Snap to south wall
    constrainedPosition.z = southWallZ;
    constrainedPosition.x = Math.max(westWallX, Math.min(eastWallX, position.x));
    wallType = 'south';
  } else if (minDistance === distanceToEast) {
    // Snap to east wall
    constrainedPosition.x = eastWallX;
    constrainedPosition.z = Math.max(northWallZ, Math.min(southWallZ, position.z));
    wallType = 'east';
  } else {
    // Snap to west wall
    constrainedPosition.x = westWallX;
    constrainedPosition.z = Math.max(northWallZ, Math.min(southWallZ, position.z));
    wallType = 'west';
  }

  // 🆕 ENHANCED: Handle vertical position based on movement configuration
  if (movementConfig) {
    if (movementConfig.allowVerticalMovement) {
      // Allow vertical movement within specified limits
      const minHeight = movementConfig.minHeight || 0;
      const maxHeight = movementConfig.maxHeight || 250;
      constrainedPosition.y = Math.max(minHeight, Math.min(maxHeight, position.y));
      console.log(`📏 Wall-mounted ${objectType} vertical position: ${constrainedPosition.y}cm (range: ${minHeight}-${maxHeight}cm)`);
    } else {
      // Force to floor level or specific height
      constrainedPosition.y = movementConfig.minHeight || 0;
      console.log(`🔒 Wall-mounted ${objectType} forced to height: ${constrainedPosition.y}cm`);
    }
  } else {
    // Default: keep at floor level
    constrainedPosition.y = Math.max(0, position.y);
  }

  // Calculate rotation based on wall and orientation
  if (objectType) {
    wallRotation = getObjectRotationForWall(objectType, wallType, orientation);
  }

  console.log(`🔗 Wall constraint result for ${objectType}:`, {
    wallType,
    position: {
      x: constrainedPosition.x.toFixed(1),
      y: constrainedPosition.y.toFixed(1),
      z: constrainedPosition.z.toFixed(1)
    },
    rotation: `${(wallRotation * 180 / Math.PI).toFixed(0)}°`,
    buffer: `${buffer.toFixed(1)}cm`,
    verticalMovement: movementConfig?.allowVerticalMovement ? 'allowed' : 'restricted'
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
  }
): { position: Position; rotation: number } => {
  return constrainToWalls(position, roomWidth, roomHeight, orientationDetails);
};

// 🆕 ENHANCED: Find a free position with movement-aware placement
export const findFreeWallPosition = (
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType,
  scale: number = 1.0,
  existingItems: BathroomItem[] = [],
  maxAttempts: number = 50,
  orientation: OrientationConfig = DEFAULT_ORIENTATION,
  movement?: MovementConfig
): { position: Position; rotation: number } => {

  console.log('🎯 Finding free position for:', objectType, 'with movement config');

  // 🆕 Get movement configuration to determine placement strategy
  const movementConfig = movement ?? getMovementConfig(objectType);

  // 🆕 ENHANCED: Handle free-standing objects differently
  if (!movementConfig.snapToWall) {
    console.log('🏊 Finding free-standing position for:', objectType);
    return findFreeStandingPosition(roomWidth, roomHeight, objectType, scale, existingItems, maxAttempts, movementConfig);
  }

  // Continue with wall-based placement for wall-snapped objects
  const buffer = getObjectWallBuffer({ orientation, scale });

  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Define the four walls with configurable orientations and buffers
  const walls = [
    { // North wall
      name: 'north',
      getPosition: (t: number) => ({
        x: -roomHalfWidth + buffer + t * (roomWidth - 2 * buffer),
        y: getWallPositionY(objectType, movementConfig),
        z: -roomHalfHeight + buffer
      }),
      rotation: getObjectRotationForWall(objectType, 'north', orientation)
    },
    { // South wall
      name: 'south',
      getPosition: (t: number) => ({
        x: -roomHalfWidth + buffer + t * (roomWidth - 2 * buffer),
        y: getWallPositionY(objectType, movementConfig),
        z: roomHalfHeight - buffer
      }),
      rotation: getObjectRotationForWall(objectType, 'south', orientation)
    },
    { // East wall
      name: 'east',
      getPosition: (t: number) => ({
        x: roomHalfWidth - buffer,
        y: getWallPositionY(objectType, movementConfig),
        z: -roomHalfHeight + buffer + t * (roomHeight - 2 * buffer)
      }),
      rotation: getObjectRotationForWall(objectType, 'east', orientation)
    },
    { // West wall
      name: 'west',
      getPosition: (t: number) => ({
        x: -roomHalfWidth + buffer,
        y: getWallPositionY(objectType, movementConfig),
        z: -roomHalfHeight + buffer + t * (roomHeight - 2 * buffer)
      }),
      rotation: getObjectRotationForWall(objectType, 'west', orientation)
    }
  ];

  // Try to find a free position
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick a random wall
    const wall = walls[Math.floor(Math.random() * walls.length)];

    // Pick a random position along the wall (t from 0 to 1)
    const t = Math.random();
    const position = wall.getPosition(t);

    // Check if this position collides with any existing items
    let hasCollision = false;
    for (const item of existingItems) {
      if (checkCollision(
        position,
        objectType,
        scale,
        { x: item.position[0], y: item.position[1], z: item.position[2] },
        item.type,
        item.scale || 1.0,
        undefined,
        item
      )) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      const orientationInfo = getOrientationInfo(orientation);
      console.log(`🎯 Found free wall position for ${objectType} on ${wall.name} wall:`, {
        position: { x: position.x.toFixed(3), y: position.y.toFixed(1), z: position.z.toFixed(3) },
        wallBuffer: `${buffer.toFixed(3)}cm`,
        rotation: `${(wall.rotation * 180 / Math.PI).toFixed(0)}°`,
        orientation: orientationInfo.description,
        attempt: attempt + 1,
        movementType: 'WALL-SNAPPED'
      });
      return { position, rotation: wall.rotation };
    }
  }

  // Fallback position for wall-snapped objects
  const fallbackRotation = getObjectRotationForWall(objectType, 'south', orientation);
  return {
    position: {
      x: 0,
      y: getWallPositionY(objectType, movementConfig),
      z: roomHalfHeight - buffer
    },
    rotation: fallbackRotation
  };
};

// 🆕 NEW: Find free-standing position for objects that don't snap to walls
const findFreeStandingPosition = (
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType,
  scale: number,
  existingItems: BathroomItem[],
  maxAttempts: number,
  movement?: MovementConfig
): { position: Position; rotation: number } => {

  const movementConfig = movement ?? getMovementConfig(objectType);
  const buffer = 50; // 50cm buffer from walls for free-standing objects

  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Define free-standing area (away from walls)
  const minX = -roomHalfWidth + buffer;
  const maxX = roomHalfWidth - buffer;
  const minZ = -roomHalfHeight + buffer;
  const maxZ = roomHalfHeight - buffer;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Random position in the free area
    const position = {
      x: minX + Math.random() * (maxX - minX),
      y: movementConfig.allowVerticalMovement ? (movementConfig.minHeight || 0) : 0,
      z: minZ + Math.random() * (maxZ - minZ)
    };

    // Random rotation if allowed
    const rotation = movementConfig.allowFreeRotation ? Math.random() * Math.PI * 2 : 0;

    // ✅ FIXED: Create temporary item for enhanced collision detection
    const tempItem: BathroomItem = {
      id: -1, // Temporary ID
      type: objectType,
      position: [position.x, position.y, position.z] as [number, number, number],
      scale: scale
    };

    // Check for collisions with enhanced detection
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
      console.log(`🏊 Found free-standing position for ${objectType}:`, {
        position: { x: position.x.toFixed(3), y: position.y.toFixed(1), z: position.z.toFixed(3) },
        rotation: `${(rotation * 180 / Math.PI).toFixed(0)}°`,
        attempt: attempt + 1,
        movementType: 'FREE-STANDING'
      });
      return { position, rotation };
    }
  }

  // Fallback to center of room
  console.log(`⚠️ Using fallback center position for free-standing ${objectType}`);
  return {
    position: {
      x: 0,
      y: movementConfig.allowVerticalMovement ? (movementConfig.minHeight || 0) : 0,
      z: 0
    },
    rotation: movementConfig.allowFreeRotation ? 0 : 0
  };
};

// 🆕 NEW: Helper to get appropriate Y position for wall-mounted objects
const getWallPositionY = (_objectType: ComponentType, movementConfig: MovementConfig): number => {
  return movementConfig.minHeight || 0; // Floor level for most objects
};

// 🆕 ENHANCED: Function that respects movement configuration
export const constrainAllObjectsToRoom = (
  items: BathroomItem[],
  roomWidth: number,
  roomHeight: number
): BathroomItem[] => {
  return items.map(item => {

    const position = { x: item.position[0], y: item.position[1], z: item.position[2] };

    let constrainedPosition: Position;
    let constrainedRotation: number;

    console.log('🔧 Constraining object:', item.type, item.sku);

    // 🆕 ENHANCED: Use movement configuration to determine constraint type
    const movementConfig = getMovementConfig(item.type, item);

    if (movementConfig.snapToWall) {
      // Wall-snapped objects - constrain to walls
      console.log(`🔗 Applying wall constraints to ${item.type}`);
      const result = constrainToWalls(position, roomWidth, roomHeight, {
        type: item.type,
        scale: item.scale,
        orientation: item.model?.orientation,
        item
      });
      constrainedPosition = result.position;
      constrainedRotation = result.rotation;
    } else {
      // Free-standing objects - constrain to room bounds
      console.log(`🏊 Applying room constraints to ${item.type}`);
      const result = constrainToRoom(position, roomWidth, roomHeight, {
        type: item.type,
        scale: item.scale,
        orientation: item.model?.orientation,
        item
      });
      constrainedPosition = result.position;
      constrainedRotation = item.rotation || 0; // Keep current rotation for free-standing
    }

    return {
      ...item,
      position: [constrainedPosition.x, constrainedPosition.y, constrainedPosition.z] as [number, number, number],
      rotation: constrainedRotation
    };
  });
};
