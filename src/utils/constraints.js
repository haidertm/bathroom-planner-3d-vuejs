import { CONSTRAINTS } from '../constants/dimensions.js';

export const constrainToRoom = (position, roomWidth, roomHeight) => {
  const maxX = (roomWidth / 2) - CONSTRAINTS.OBJECT_BUFFER;
  const maxZ = (roomHeight / 2) - CONSTRAINTS.OBJECT_BUFFER;

  return {
    x: Math.max(-maxX, Math.min(maxX, position.x)),
    y: position.y,
    z: Math.max(-maxZ, Math.min(maxZ, position.z))
  };
};

export const snapToWall = (position, roomWidth, roomHeight) => {
  const snappedPos = { ...position };
  const roomSizeX = roomWidth / 2;
  const roomSizeZ = roomHeight / 2;
  const { SNAP_DISTANCE, OBJECT_BUFFER } = CONSTRAINTS;

  // Snap to walls with proper offset so objects stay inside the room
  // Check Z-axis walls (North/South walls)
  if (Math.abs(position.z - roomSizeZ) < SNAP_DISTANCE) {
    snappedPos.z = roomSizeZ - OBJECT_BUFFER; // South wall
  } else if (Math.abs(position.z - (-roomSizeZ)) < SNAP_DISTANCE) {
    snappedPos.z = -roomSizeZ + OBJECT_BUFFER; // North wall
  }

  // Check X-axis walls (East/West walls)
  if (Math.abs(position.x - roomSizeX) < SNAP_DISTANCE) {
    snappedPos.x = roomSizeX - OBJECT_BUFFER; // East wall
  } else if (Math.abs(position.x - (-roomSizeX)) < SNAP_DISTANCE) {
    snappedPos.x = -roomSizeX + OBJECT_BUFFER; // West wall
  }

  return snappedPos;
};

export const constrainAllObjectsToRoom = (items, roomWidth, roomHeight) => {
  const maxX = (roomWidth / 2) - CONSTRAINTS.OBJECT_BUFFER;
  const maxZ = (roomHeight / 2) - CONSTRAINTS.OBJECT_BUFFER;

  return items.map(item => ({
    ...item,
    position: [
      Math.max(-maxX, Math.min(maxX, item.position[0])),
      item.position[1], // Keep height unchanged
      Math.max(-maxZ, Math.min(maxZ, item.position[2]))
    ]
  }));
};
