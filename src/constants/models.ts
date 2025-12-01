// src/constants/models.ts - Mixed approach configuration with orientation - CENTIMETER UNITS

export type OrientationType = 'face_into_room' | 'flush_with_wall' | 'custom';


export const CONFIG = {
  preloadModels: false,
  selectivePreload: true
}

export type OrientationConfig = {
  type: OrientationType;
  rotationOffset?: number; // Additional rotation offset in radians (optional)
  wallBuffer?: number; // Custom distance from wall in CENTIMETERS (optional, overrides default buffer)
  description?: string;
}

export const DEFAULT_ORIENTATION: OrientationConfig = {
  type: 'face_into_room',
  // rotationOffset: Math.PI, // Flip the mirror 180 degrees
  wallBuffer: 0, // 10cm - Almost flush with wall
  description: 'Reflective surface faces into room'
}

export const DefaultCornerObjectRotation = {
  'north-west': 0,
  'north-east': -Math.PI / 2,
  'south-east': Math.PI,
  'south-west': Math.PI / 2,
  'notch-interior': 0, // Interior corner where west wall meets notch-south wall (similar to north-west)
  'notch-corner': -Math.PI / 2, // Corner where notch-east meets notch-south wall (similar to north-east)
  'notch-east-north': 0 // Corner where notch-east meets north wall (same as notch-interior)
}

export type cornerInstallOnly = {
  enabled: boolean;
  rotation?: { // Optional, if not provided Default will be used
    'north-west': number,
    'north-east': number,
    'south-west': number,
    'south-east': number,
    'notch-interior'?: number // Optional: for L-shaped rooms
    'notch-corner'?: number // Optional: for L-shaped rooms
    'notch-east-north'?: number // Optional: for L-shaped rooms (where notch-east meets north wall)
  }
} | false

export type MovementConfig = { // NEW: Sink movement configuration
  snapToWall: boolean,
  cornerInstallOnly?: cornerInstallOnly,
  allowVerticalMovement?: boolean,
  allowFreeRotation?: boolean,
  minHeight?: number,
  maxHeight?: number
}

export interface ModelConfig {
  readonly name: string;
  // readonly path: string;
  readonly scale?: number;
  readonly rotation?: readonly [number, number, number];
  readonly position?: readonly [number, number, number]; // In CENTIMETERS
  readonly movement?: MovementConfig;
  readonly orientation?: OrientationConfig;
}

export type FixtureConfig = ModelConfig;

// Wall rotation mappings for different orientation types
export const WALL_ROTATIONS: Record<OrientationType, Record<string, number>> = {
  // Objects that should face INTO the room (sink, toilet, mirror, etc.)
  face_into_room: {
    north: 0,           // Face south (into room)
    south: Math.PI,     // Face north (into room)
    east: -Math.PI / 2, // Face west (into room)
    west: Math.PI / 2   // Face east (into room)
  },

  // Objects that should be flush WITH the wall (doors, windows, etc.)
  flush_with_wall: {
    north: Math.PI / 2,  // Flush with north wall
    south: Math.PI / 2,  // Flush with south wall
    east: 0,             // Flush with east wall
    west: 0              // Flush with west wall
  },

  // Custom rotations (can be overridden per object)
  custom: {
    north: 0,
    south: 0,
    east: 0,
    west: 0
  }
};
