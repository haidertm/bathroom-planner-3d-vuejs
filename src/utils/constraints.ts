import { CONSTRAINTS, MODEL_DIMENSIONS } from '../constants/dimensions.ts';
import type { ComponentType } from '../constants/components';

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

export const constrainToRoom = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0
): Position => {
  let buffer = CONSTRAINTS.OBJECT_BUFFER;

  // If we have the object type, use its actual dimensions
  if (objectType && MODEL_DIMENSIONS[objectType]) {
    const modelDims = MODEL_DIMENSIONS[objectType];
    // Use the largest of width/depth as the buffer, scaled by object scale
    buffer = Math.max(modelDims.width, modelDims.depth) * scale / 2;
  }

  const maxX = (roomWidth / 2) - buffer;
  const maxZ = (roomHeight / 2) - buffer;

  console.log(`🔍 Constraining ${objectType}:`, {
    roomSize: { width: roomWidth, height: roomHeight },
    buffer: buffer.toFixed(3),
    bounds: { minX: -maxX, maxX, minZ: -maxZ, maxZ },
    originalPos: { x: position.x.toFixed(3), z: position.z.toFixed(3) }
  });

  const constrainedPos = {
    x: Math.max(-maxX, Math.min(maxX, position.x)),
    y: position.y,
    z: Math.max(-maxZ, Math.min(maxZ, position.z))
  };

  console.log(`🔍 Constraint result:`, {
    x: constrainedPos.x.toFixed(3),
    z: constrainedPos.z.toFixed(3)
  });

  return constrainedPos;
};

export const snapToWall = (
  position: Position,
  roomWidth: number,
  roomHeight: number,
  objectType: ComponentType | null = null,
  scale: number = 1.0
): Position => {
  const snappedPos = { ...position };
  const { SNAP_DISTANCE } = CONSTRAINTS;

  let buffer = CONSTRAINTS.OBJECT_BUFFER;

  // If we have the object type, use its actual dimensions
  if (objectType && MODEL_DIMENSIONS[objectType]) {
    const modelDims = MODEL_DIMENSIONS[objectType];
    buffer = Math.max(modelDims.width, modelDims.depth) * scale / 2;
  }

  const roomSizeX = roomWidth / 2;
  const roomSizeZ = roomHeight / 2;

  // Snap to walls with proper offset so objects stay inside the room
  // Check Z-axis walls (North/South walls)
  if (Math.abs(position.z - roomSizeZ) < SNAP_DISTANCE) {
    snappedPos.z = roomSizeZ - buffer; // South wall
  } else if (Math.abs(position.z - (-roomSizeZ)) < SNAP_DISTANCE) {
    snappedPos.z = -roomSizeZ + buffer; // North wall
  }

  // Check X-axis walls (East/West walls)
  if (Math.abs(position.x - roomSizeX) < SNAP_DISTANCE) {
    snappedPos.x = roomSizeX - buffer; // East wall
  } else if (Math.abs(position.x - (-roomSizeX)) < SNAP_DISTANCE) {
    snappedPos.x = -roomSizeX + buffer; // West wall
  }

  return snappedPos;
};

export const constrainAllObjectsToRoom = (
  items: BathroomItem[],
  roomWidth: number,
  roomHeight: number
): BathroomItem[] => {
  return items.map(item => {
    const buffer = MODEL_DIMENSIONS[item.type] ?
      Math.max(MODEL_DIMENSIONS[item.type].width, MODEL_DIMENSIONS[item.type].depth) * (item.scale || 1.0) / 2 :
      CONSTRAINTS.OBJECT_BUFFER;

    const maxX = (roomWidth / 2) - buffer;
    const maxZ = (roomHeight / 2) - buffer;

    return {
      ...item,
      position: [
        Math.max(-maxX, Math.min(maxX, item.position[0])),
        item.position[1], // Keep height unchanged
        Math.max(-maxZ, Math.min(maxZ, item.position[2]))
      ] as [number, number, number]
    };
  });
};
