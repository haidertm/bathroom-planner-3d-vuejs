// Complete enhanced constraints.ts with product-specific dimension lookup
// All functions included and enhanced

import { CONSTRAINTS, MODEL_DIMENSIONS } from '../constants/dimensions.ts';
import type { ComponentType } from '../constants/components';
import { getObjectRotationForWall, getOrientationInfo, getObjectWallBuffer } from '../constants/models';
import productData from '../mocks/productData'; // Import product data

// Interface for position
export interface Position {
  x: number;
  y: number;
  z: number;
}

export type ObjectModel = {
  path: string;
  name: string;
  scale: number;
  rotation?: [number, number, number]
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
}

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

// NEW: Function to get dimensions for a specific product
const getProductDimensions = (sku: string, type: ComponentType): {
  width: number;
  depth: number;
  height: number
} | null => {
  // Map component types to productData categories
  const typeMapping: Record<ComponentType, string> = {
    'Toilet': 'Toilet',
    'Sink': 'Furniture', // Assuming sinks are in Furniture category
    'Bath': 'Bath',
    'Shower': 'Shower',
    'Radiator': 'Radiator',
    'Mirror': 'Mirror',
    'Door': 'Door' // This might not exist in productData
  };

  const category = typeMapping[type];
  if (!category || !productData[category]) {
    return null;
  }

  // Search through all product variants in the category
  for (const product of productData[category]) {
    if (product.variants) {
      for (const variant of product.variants) {
        if (variant.sku === sku && variant.dimensions) {
          return {
            width: variant.dimensions.width,
            depth: variant.dimensions.depth || variant.dimensions.height, // Use height as depth if depth not available
            height: variant.dimensions.height
          };
        }
      }
    }
  }

  return null;
};

// NEW: Enhanced function to get dimensions with product-specific lookup
export const getDimensions = (
  type: ComponentType,
  sku?: string,
  model?: ObjectModel
): { width: number; depth: number; height: number } => {

  // Priority 1: Try to get dimensions from model object if available
  if (model?.dimensions) {
    return {
      width: model.dimensions.width,
      depth: model.dimensions.depth || model.dimensions.height,
      height: model.dimensions.height
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

  // Priority 3: Fall back to generic type dimensions
  const genericDims = MODEL_DIMENSIONS[type];
  if (genericDims) {
    console.log(`📏 Using generic dimensions for type ${type}:`, genericDims);
    return genericDims;
  }

  // Fallback: Return default dimensions if nothing found
  console.warn(`⚠️ No dimensions found for type ${type}, using default`);
  return { width: 60, depth: 60, height: 80 };
};

// Wall identification
export type WallType = 'north' | 'south' | 'east' | 'west';

export interface WallInfo {
  type: WallType;
  position: Position;
  distance: number;
}

// Find the nearest wall to a given position
export const findNearestWall = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0
): WallInfo => {
  // Use configurable wall buffer instead of generic buffer
  const buffer = objectType ? getObjectWallBuffer(objectType, scale) : CONSTRAINTS.OBJECT_BUFFER;

  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Calculate distances to each wall
  const walls = [
    {
      type: 'north' as WallType,
      position: { x: position.x, y: position.y, z: -roomHalfHeight + buffer },
      distance: Math.abs(position.z - (-roomHalfHeight + buffer))
    },
    {
      type: 'south' as WallType,
      position: { x: position.x, y: position.y, z: roomHalfHeight - buffer },
      distance: Math.abs(position.z - (roomHalfHeight - buffer))
    },
    {
      type: 'east' as WallType,
      position: { x: roomHalfWidth - buffer, y: position.y, z: position.z },
      distance: Math.abs(position.x - (roomHalfWidth - buffer))
    },
    {
      type: 'west' as WallType,
      position: { x: -roomHalfWidth + buffer, y: position.y, z: position.z },
      distance: Math.abs(position.x - (-roomHalfWidth + buffer))
    }
  ];

  // Find the nearest wall
  const nearestWall = walls.reduce((nearest, wall) =>
    wall.distance < nearest.distance ? wall : nearest
  );

  return nearestWall;
};

// ENHANCED: Collision detection with product-specific dimensions
export const checkCollision = (
  pos1: Position,
  type1: ComponentType,
  scale1: number,
  pos2: Position,
  type2: ComponentType,
  scale2: number,
  item1?: BathroomItem, // Optional: full item data for item 1
  item2?: BathroomItem  // Optional: full item data for item 2
): boolean => {

  // Get dimensions using enhanced lookup
  const dims1 = getDimensions(type1, item1?.sku, item1?.model);
  const dims2 = getDimensions(type2, item2?.sku, item2?.model);

  if (!dims1 || !dims2) {
    console.warn(`Missing dimensions for collision check: ${type1} or ${type2}`);
    return false;
  }

  // Calculate bounding boxes with scale (dimensions are in centimeters)
  const halfWidth1 = (dims1.width * scale1) / 2;
  const halfDepth1 = (dims1.depth * scale1) / 2;
  const halfWidth2 = (dims2.width * scale2) / 2;
  const halfDepth2 = (dims2.depth * scale2) / 2;

  // Add small buffer to prevent objects from being too close
  const buffer = 10; // 10cm buffer

  // Check if bounding boxes overlap with buffer
  const overlapX = Math.abs(pos1.x - pos2.x) < (halfWidth1 + halfWidth2 + buffer);
  const overlapZ = Math.abs(pos1.z - pos2.z) < (halfDepth1 + halfDepth2 + buffer);

  const hasCollision = overlapX && overlapZ;

  // Enhanced logging for debugging
  if (hasCollision) {
    console.log('🔴 COLLISION DETECTED:', {
      item1: { type: type1, sku: item1?.sku, dimensions: dims1 },
      item2: { type: type2, sku: item2?.sku, dimensions: dims2 },
      positions: { pos1, pos2 },
      overlap: { x: overlapX, z: overlapZ }
    });
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
      currentItem, // Current item being moved
      item         // Existing item to check against
    );

    if (hasCollision) {
      return true;
    }
  }

  return false;
};

// ENHANCED: Constrain movement to room bounds without wall snapping
export const constrainToRoom = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0
): { position: Position; rotation: number } => {
  // Get object dimensions for better boundary calculation
  const buffer = objectType ? getObjectWallBuffer(objectType, scale) / 2 : CONSTRAINTS.OBJECT_BUFFER;

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

  // For room-constrained objects, maintain current rotation
  // (no automatic rotation based on position)
  const currentRotation = 0; // Default rotation for free objects

  console.log(`🏠 Room constraint applied to ${objectType}:`, {
    original: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
    constrained: { x: constrainedPosition.x.toFixed(1), z: constrainedPosition.z.toFixed(1) },
    roomBounds: {
      x: `${minX.toFixed(1)} to ${maxX.toFixed(1)}`,
      z: `${minZ.toFixed(1)} to ${maxZ.toFixed(1)}`
    },
    buffer: buffer.toFixed(1)
  });

  return { position: constrainedPosition, rotation: currentRotation };
};

// ENHANCED: Constrain movement to walls only with configurable rotation and buffer
export const constrainToWalls = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0
): { position: Position; rotation: number } => {
  // Use configurable wall buffer instead of generic buffer
  const buffer = objectType ? getObjectWallBuffer(objectType, scale) : CONSTRAINTS.OBJECT_BUFFER;

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
    constrainedPosition.x = westWallX;
    constrainedPosition.z = Math.max(northWallZ, Math.min(southWallZ, position.z));
    wallType = 'west';
  }

  if (objectType) {
    wallRotation = getObjectRotationForWall(objectType, wallType);
  }

  return { position: constrainedPosition, rotation: wallRotation };
};

// Snap position to the nearest wall (same as constrainToWalls)
export const snapToNearestWall = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0
): { position: Position; rotation: number } => {
  return constrainToWalls(position, roomWidth, roomHeight, objectType, scale);
};

// ENHANCED: Wall constraint that also checks for collisions and returns rotation
export const constrainToWallsWithCollision = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0,
  objectId: number = -1,
  existingItems: BathroomItem[] = [],
  currentItem?: BathroomItem // NEW: Optional current item for specific dimensions
): { position: Position; rotation: number } => {
  // First apply wall constraints
  const {
    position: wallConstrainedPos,
    rotation: wallRotation
  } = constrainToWalls(position, roomWidth, roomHeight, objectType, scale);

  // If no collision checking needed, return wall constrained position and rotation
  if (existingItems.length === 0 || objectId === -1) {
    return { position: wallConstrainedPos, rotation: wallRotation };
  }

  // Check if the wall constrained position would collide
  if (!wouldCollideWithExisting(wallConstrainedPos, objectType!, scale, objectId, existingItems, currentItem)) {
    return { position: wallConstrainedPos, rotation: wallRotation };
  }

  // Try to find a nearby non-colliding position
  const searchRadius = 50; // Increased search radius
  const searchSteps = 12; // More search steps

  for (let radius = 20; radius <= searchRadius; radius += 10) {
    for (let step = 0; step < searchSteps; step++) {
      const angle = (step / searchSteps) * Math.PI * 2;
      const testPos = {
        x: wallConstrainedPos.x + Math.cos(angle) * radius,
        y: wallConstrainedPos.y,
        z: wallConstrainedPos.z + Math.sin(angle) * radius
      };

      // Re-apply wall constraints to the test position
      const {
        position: testWallPos,
        rotation: testWallRotation
      } = constrainToWalls(testPos, roomWidth, roomHeight, objectType, scale);

      // Check if this position is collision-free
      if (!wouldCollideWithExisting(testWallPos, objectType!, scale, objectId, existingItems, currentItem)) {
        console.log(`🔄 Found collision-free position after adjustment:`, {
          original: { x: wallConstrainedPos.x.toFixed(3), z: wallConstrainedPos.z.toFixed(3) },
          adjusted: { x: testWallPos.x.toFixed(3), z: testWallPos.z.toFixed(3) },
          rotation: `${(testWallRotation * 180 / Math.PI).toFixed(0)}°`
        });
        return { position: testWallPos, rotation: testWallRotation };
      }
    }
  }

  // If we still can't find a good position, return the wall constrained position
  console.warn(`⚠️ Could not find collision-free position for ${objectType}, using wall constrained position`);
  return { position: wallConstrainedPos, rotation: wallRotation };
};

// ENHANCED: Find a free position anywhere in the room for free movement objects
export const findFreeRoomPosition = (
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType,
  scale: number = 1.0,
  existingItems: BathroomItem[] = [],
  maxAttempts: number = 100
): { position: Position; rotation: number } => {
  const buffer = getObjectWallBuffer(objectType, scale);
  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Define room boundaries
  const minX = -roomHalfWidth + buffer;
  const maxX = roomHalfWidth - buffer;
  const minZ = -roomHalfHeight + buffer;
  const maxZ = roomHalfHeight - buffer;

  // Try to find a free position anywhere in the room
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const position = {
      x: minX + Math.random() * (maxX - minX),
      y: minX + Math.random() * (maxX - minX),
      z: minZ + Math.random() * (maxZ - minZ)
    };

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
        undefined, // No current item data for free positioning
        item       // Existing item
      )) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      console.log(`🎯 Found free room position for ${objectType}:`, {
        position: { x: position.x.toFixed(1), z: position.z.toFixed(1) },
        attempt: attempt + 1,
        roomBounds: {
          x: `${minX.toFixed(1)} to ${maxX.toFixed(1)}`,
          z: `${minZ.toFixed(1)} to ${maxZ.toFixed(1)}`
        }
      });
      return { position, rotation: 0 }; // Free objects start with no rotation
    }
  }

  // Fallback position in center of room
  console.warn(`⚠️ Could not find free room position for ${objectType} after ${maxAttempts} attempts, using center`);
  return {
    position: {
      x: 0,
      y: objectType === 'Mirror' ? 120 : 0,
      z: 0
    },
    rotation: 0
  };
};

// ENHANCED: Find a free position on any wall that doesn't collide with existing objects
export const findFreeWallPosition = (
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType,
  scale: number = 1.0,
  existingItems: BathroomItem[] = [],
  maxAttempts: number = 50
): { position: Position; rotation: number } => {
  // Use configurable wall buffer instead of generic buffer
  const buffer = getObjectWallBuffer(objectType, scale);

  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Define the four walls with configurable orientations and buffers
  const walls = [
    { // North wall
      name: 'north',
      getPosition: (t: number) => ({
        x: -roomHalfWidth + buffer + t * (roomWidth - 2 * buffer),
        y: objectType === 'Mirror' ? 120 : 0,
        z: -roomHalfHeight + buffer
      }),
      rotation: getObjectRotationForWall(objectType, 'north')
    },
    { // South wall
      name: 'south',
      getPosition: (t: number) => ({
        x: -roomHalfWidth + buffer + t * (roomWidth - 2 * buffer),
        y: objectType === 'Mirror' ? 120 : 0,
        z: roomHalfHeight - buffer
      }),
      rotation: getObjectRotationForWall(objectType, 'south')
    },
    { // East wall
      name: 'east',
      getPosition: (t: number) => ({
        x: roomHalfWidth - buffer,
        y: objectType === 'Mirror' ? 120 : 0,
        z: -roomHalfHeight + buffer + t * (roomHeight - 2 * buffer)
      }),
      rotation: getObjectRotationForWall(objectType, 'east')
    },
    { // West wall
      name: 'west',
      getPosition: (t: number) => ({
        x: -roomHalfWidth + buffer,
        y: objectType === 'Mirror' ? 120 : 0,
        z: -roomHalfHeight + buffer + t * (roomHeight - 2 * buffer)
      }),
      rotation: getObjectRotationForWall(objectType, 'west')
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
        undefined, // No current item data for free positioning
        item       // Existing item
      )) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      const orientationInfo = getOrientationInfo(objectType);
      console.log(`🎯 Found free position for ${objectType} on ${wall.name} wall:`, {
        position: { x: position.x.toFixed(3), z: position.z.toFixed(3) },
        wallBuffer: `${buffer.toFixed(3)}cm`,
        rotation: `${(wall.rotation * 180 / Math.PI).toFixed(0)}°`,
        orientation: orientationInfo.description,
        attempt: attempt + 1
      });
      return { position, rotation: wall.rotation };
    }
  }

  // Fallback position
  const fallbackRotation = getObjectRotationForWall(objectType, 'south');
  return {
    position: {
      x: 0,
      y: objectType === 'Mirror' ? 120 : 0,
      z: roomHalfHeight - buffer
    },
    rotation: fallbackRotation
  };
};

// LEGACY FUNCTIONS for backward compatibility
export const snapToWall = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0
): Position => {
  const { position: snappedPos } = snapToNearestWall(position, roomWidth, roomHeight, objectType, scale);
  return snappedPos;
};

// ENHANCED: Function that respects movement configuration
export const constrainAllObjectsToRoom = (
  items: BathroomItem[],
  roomWidth: number,
  roomHeight: number
): BathroomItem[] => {
  return items.map(item => {
    // Import movement configuration check
    const { shouldSnapToWall, canMoveFreelyInRoom } = require('../constants/models');

    const position = { x: item.position[0], y: item.position[1], z: item.position[2] };

    let constrainedPosition: Position;
    let constrainedRotation: number;

    if (canMoveFreelyInRoom(item.type)) {
      // Free movement objects - constrain to room bounds
      const result = constrainToRoom(position, roomWidth, roomHeight, item.type, item.scale || 1.0);
      constrainedPosition = result.position;
      constrainedRotation = item.rotation || 0; // Keep current rotation
    } else if (shouldSnapToWall(item.type)) {
      // Wall-snapped objects - constrain to walls
      const result = constrainToWalls(position, roomWidth, roomHeight, item.type, item.scale || 1.0);
      constrainedPosition = result.position;
      constrainedRotation = result.rotation;
    } else {
      // Default behavior - constrain to room bounds
      const result = constrainToRoom(position, roomWidth, roomHeight, item.type, item.scale || 1.0);
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
