import { CONSTRAINTS } from '../constants/dimensions.ts';
import type { ComponentType } from '../constants/components';
import { getObjectRotationForWall, getOrientationInfo, getObjectWallBuffer } from '../constants/models';

// Model dimensions for more accurate constraint calculations
export const MODEL_DIMENSIONS: Record<ComponentType, { width: number; depth: number; height: number }> = {
  'Toilet': { width: 60, depth: 80, height: 80 },
  'Sink': { width: 60, depth: 60, height: 80 },
  'Bath': { width: 170, depth: 80, height: 60 },
  'Shower': { width: 80, depth: 80, height: 200 },
  'Radiator': { width: 80, depth: 10, height: 60 },
  'Mirror': { width: 80, depth: 5, height: 100 },
  'Door': { width: 10, depth: 80, height: 200 }
};

// Interface for position
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface BathroomItem {
  id: number;
  type: ComponentType;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}

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

// Check if two objects would collide at given positions
// Enhanced collision detection with better debugging
export const checkCollision = (
  pos1: Position,
  type1: ComponentType,
  scale1: number,
  pos2: Position,
  type2: ComponentType,
  scale2: number
): boolean => {
  const dims1 = MODEL_DIMENSIONS[type1];
  const dims2 = MODEL_DIMENSIONS[type2];

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

  // Debug logging
  console.log(`🔍 Collision check: ${type1} vs ${type2}`, {
    pos1: { x: pos1.x.toFixed(1), z: pos1.z.toFixed(1) },
    pos2: { x: pos2.x.toFixed(1), z: pos2.z.toFixed(1) },
    dims1: { w: (dims1.width * scale1).toFixed(1), d: (dims1.depth * scale1).toFixed(1) },
    dims2: { w: (dims2.width * scale2).toFixed(1), d: (dims2.depth * scale2).toFixed(1) },
    distance: { x: Math.abs(pos1.x - pos2.x).toFixed(1), z: Math.abs(pos1.z - pos2.z).toFixed(1) },
    required: { x: (halfWidth1 + halfWidth2 + buffer).toFixed(1), z: (halfDepth1 + halfDepth2 + buffer).toFixed(1) },
    collision: hasCollision
  });

  return hasCollision;
};

// Check if a position would cause collision with existing objects
export const wouldCollideWithExisting = (
  position: Position,
  objectType: ComponentType,
  scale: number,
  objectId: number, // ID of the object being moved (to exclude from collision check)
  existingItems: BathroomItem[]
): boolean => {
  console.log(`🔍 Checking collision for ${objectType} (ID: ${objectId}) at position:`, {
    x: position.x.toFixed(1),
    z: position.z.toFixed(1),
    scale: scale.toFixed(2),
    existingItems: existingItems.length
  });

  for (const item of existingItems) {
    // Skip checking collision with self
    if (item.id === objectId) {
      console.log(`  ⏭️ Skipping self-collision check for ID: ${objectId}`);
      continue;
    }

    const itemPosition = { x: item.position[0], y: item.position[1], z: item.position[2] };
    const itemScale = item.scale || 1.0;

    const hasCollision = checkCollision(
      position,
      objectType,
      scale,
      itemPosition,
      item.type,
      itemScale
    );

    if (hasCollision) {
      console.log(`  ❌ COLLISION DETECTED with ${item.type} (ID: ${item.id})`);
      return true;
    }
  }

  console.log(`  ✅ No collisions detected for ${objectType}`);
  return false;
};

// Constrain movement to walls only with configurable rotation and buffer
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
    // Snap to west wall
    constrainedPosition.x = westWallX;
    constrainedPosition.z = Math.max(northWallZ, Math.min(southWallZ, position.z));
    wallType = 'west';
  }

  // Get rotation from configuration instead of hardcoded logic
  if (objectType) {
    wallRotation = getObjectRotationForWall(objectType, wallType);
  }

  const orientationInfo = objectType ? getOrientationInfo(objectType) : { type: 'face_into_room', description: 'Default' };
  console.log(`🔗 Wall constraint applied to ${objectType}:`, {
    original: { x: position.x.toFixed(3), z: position.z.toFixed(3) },
    constrained: { x: constrainedPosition.x.toFixed(3), z: constrainedPosition.z.toFixed(3) },
    wall: wallType,
    wallBuffer: `${buffer.toFixed(3)}m`,
    rotation: `${(wallRotation * 180 / Math.PI).toFixed(0)}°`,
    orientation: orientationInfo.description
  });

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

// Enhanced wall constraint that also checks for collisions and returns rotation
export const constrainToWallsWithCollision = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0,
  objectId: number = -1,
  existingItems: BathroomItem[] = []
): { position: Position; rotation: number } => {
  // First apply wall constraints
  const { position: wallConstrainedPos, rotation: wallRotation } = constrainToWalls(position, roomWidth, roomHeight, objectType, scale);

  // If no collision checking needed, return wall constrained position and rotation
  if (existingItems.length === 0 || objectId === -1) {
    return { position: wallConstrainedPos, rotation: wallRotation };
  }

  // Check if the wall constrained position would collide
  if (!wouldCollideWithExisting(wallConstrainedPos, objectType!, scale, objectId, existingItems)) {
    return { position: wallConstrainedPos, rotation: wallRotation };
  }

  // If it would collide, try to find a nearby non-colliding position
  const searchRadius = 0.5;
  const searchSteps = 8;

  for (let radius = 0.2; radius <= searchRadius; radius += 0.1) {
    for (let step = 0; step < searchSteps; step++) {
      const angle = (step / searchSteps) * Math.PI * 2;
      const testPos = {
        x: wallConstrainedPos.x + Math.cos(angle) * radius,
        y: wallConstrainedPos.y,
        z: wallConstrainedPos.z + Math.sin(angle) * radius
      };

      // Re-apply wall constraints to the test position
      const { position: testWallPos, rotation: testWallRotation } = constrainToWalls(testPos, roomWidth, roomHeight, objectType, scale);

      // Check if this position is collision-free
      if (!wouldCollideWithExisting(testWallPos, objectType!, scale, objectId, existingItems)) {
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

// Find a free position on any wall that doesn't collide with existing objects
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
        y: objectType === 'Mirror' ? 1.2 : 0,
        z: -roomHalfHeight + buffer // Distance from wall based on object config
      }),
      rotation: getObjectRotationForWall(objectType, 'north')
    },
    { // South wall
      name: 'south',
      getPosition: (t: number) => ({
        x: -roomHalfWidth + buffer + t * (roomWidth - 2 * buffer),
        y: objectType === 'Mirror' ? 1.2 : 0,
        z: roomHalfHeight - buffer // Distance from wall based on object config
      }),
      rotation: getObjectRotationForWall(objectType, 'south')
    },
    { // East wall
      name: 'east',
      getPosition: (t: number) => ({
        x: roomHalfWidth - buffer, // Distance from wall based on object config
        y: objectType === 'Mirror' ? 1.2 : 0,
        z: -roomHalfHeight + buffer + t * (roomHeight - 2 * buffer)
      }),
      rotation: getObjectRotationForWall(objectType, 'east')
    },
    { // West wall
      name: 'west',
      getPosition: (t: number) => ({
        x: -roomHalfWidth + buffer, // Distance from wall based on object config
        y: objectType === 'Mirror' ? 1.2 : 0,
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
        item.scale || 1.0
      )) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      const orientationInfo = getOrientationInfo(objectType);
console.log(`🎯 Found free position for ${objectType} on ${wall.name} wall:`, {
  position: { x: position.x.toFixed(3), z: position.z.toFixed(3) },
  wallBuffer: `${buffer.toFixed(3)}cm`, // Changed from 'm' to 'cm'
  rotation: `${(wall.rotation * 180 / Math.PI).toFixed(0)}°`,
  orientation: orientationInfo.description,
  attempt: attempt + 1
});
      return { position, rotation: wall.rotation };
    }
  }

  // If we couldn't find a free position, return a fallback position
  console.warn(`⚠️ Could not find free position for ${objectType} after ${maxAttempts} attempts, using fallback`);
  const fallbackRotation = getObjectRotationForWall(objectType, 'south'); // Default to south wall
  return {
    position: {
      x: 0,
      y: objectType === 'Mirror' ? 1.2 : 0,
      z: roomHalfHeight - buffer
    },
    rotation: fallbackRotation
  };
};

// LEGACY FUNCTIONS for backward compatibility
export const constrainToRoom = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0
): { position: Position; rotation: number } => {
  return constrainToWalls(position, roomWidth, roomHeight, objectType, scale);
};

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

export const constrainAllObjectsToRoom = (
  items: BathroomItem[],
  roomWidth: number,
  roomHeight: number
): BathroomItem[] => {
  return items.map(item => {
    const { position: wallPosition, rotation: wallRotation } = constrainToWalls(
      { x: item.position[0], y: item.position[1], z: item.position[2] },
      roomWidth,
      roomHeight,
      item.type,
      item.scale || 1.0
    );

    return {
      ...item,
      position: [wallPosition.x, wallPosition.y, wallPosition.z] as [number, number, number],
      rotation: wallRotation // Update rotation to match the wall
    };
  });
};
