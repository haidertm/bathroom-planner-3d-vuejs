// src/constants/models.ts - Mixed approach configuration with orientation - CENTIMETER UNITS

import type { ComponentType } from './components';
import { CONSTRAINTS } from './dimensions';

export type OrientationType = 'face_into_room' | 'flush_with_wall' | 'custom';

export interface OrientationConfig {
  type: OrientationType;
  rotationOffset?: number; // Additional rotation offset in radians (optional)
  wallBuffer?: number; // Custom distance from wall in CENTIMETERS (optional, overrides default buffer)
  description?: string;
}

export interface ModelConfig {
  readonly name: string;
  readonly path: string;
  readonly scale?: number;
  readonly rotation?: readonly [number, number, number];
  readonly position?: readonly [number, number, number]; // In CENTIMETERS
  readonly orientation?: OrientationConfig;
  readonly fallbackColor?: number;
  readonly fallbackGeometry?: 'box' | 'cylinder' | 'sphere' | 'cone';
  readonly fallbackSize?: readonly [number, number, number]; // In CENTIMETERS
}

export interface ProceduralConfig {
  readonly name: string;
  readonly type: 'procedural';
  readonly orientation?: OrientationConfig;
  readonly fallbackColor?: number;
  readonly fallbackGeometry?: 'box' | 'cylinder' | 'sphere' | 'cone';
  readonly fallbackSize?: readonly [number, number, number]; // In CENTIMETERS
}

export type FixtureConfig = ModelConfig | ProceduralConfig;

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

// ONLY the models you want to load from .glb files - ALL VALUES IN CENTIMETERS
export const AVAILABLE_MODELS: readonly ModelConfig[] = [
  {
    name: 'Sink',
    path: '/models/sink.glb',
    scale: 100,
    orientation: {
      type: 'face_into_room',
      wallBuffer: 8, // 8cm - Stay away from wall for access
      description: 'Basin faces into room for use'
    },
    fallbackColor: 0xffffff,
    fallbackGeometry: 'cylinder',
    fallbackSize: [60, 80, 60] // 60cm x 80cm x 60cm
  },
  {
    name: 'Radiator',
    path: '/models/radiator.glb',
    scale: 80,
    rotation: [0, 0, 0],
    position: [0, 0, 0], // Keep at origin
    orientation: {
      type: 'face_into_room',
      wallBuffer: 12, // 12cm - Very close to wall for radiators
      description: 'Heat radiates into room'
    },
    fallbackColor: 0xffffff,
    fallbackGeometry: 'box',
    fallbackSize: [64.5, 130.2, 15.5] // 64.5cm x 130.2cm x 15.5cm
  },
  {
    name: 'Toilet',
    path: '/models/toilet.glb',
    scale: 90,
    orientation: {
      type: 'face_into_room',
      wallBuffer: 35, // 35cm - Some space from wall
      description: 'Seat faces into room for use'
    },
    fallbackColor: 0xffffff,
    fallbackGeometry: 'box',
    fallbackSize: [60, 80, 80] // 60cm x 80cm x 80cm
  },
  {
    name: 'Bath',
    scale: 72,
    path: '/models/bath.glb',
    orientation: {
      type: 'face_into_room',
      wallBuffer: 89, // 89cm - Close to wall but accessible
      description: 'Tub opening faces into room'
    },
    fallbackColor: 0xffffff,
    fallbackGeometry: 'box',
    fallbackSize: [170, 60, 80] // 170cm x 60cm x 80cm
  },
  {
    name: 'Door',
    path: '/models/door.glb',
    scale: 90,
    orientation: {
      type: 'flush_with_wall',
      wallBuffer: 4.5, // 4.5cm - Flush with wall - minimal gap
      description: 'Door is part of wall opening'
    },
    fallbackColor: 0x8B4513,
    fallbackGeometry: 'box',
    fallbackSize: [10, 200, 80] // 10cm x 200cm x 80cm
  },
  {
    name: 'Mirror',
    path: '/models/mirror.glb',
    scale: 90,
    position: [0, 0, 0], // -120cm (was -1.2m)
    orientation: {
      type: 'face_into_room',
      rotationOffset: Math.PI, // Flip the mirror 180 degrees
      wallBuffer: 10, // 10cm - Almost flush with wall
      description: 'Reflective surface faces into room'
    },
    fallbackColor: 0x87CEEB,
    fallbackGeometry: 'box',
    fallbackSize: [80, 100, 5] // 80cm x 100cm x 5cm
  },
  {
    name: 'Shower',
    path: '/models/shower.glb',
    scale: 70,
    orientation: {
      type: 'face_into_room',
      wallBuffer: 100, // 139cm - Very close to wall
      description: 'Shower opening faces into room'
    },
    fallbackColor: 0xffffff,
    fallbackGeometry: 'cylinder',
    fallbackSize: [80, 200, 80] // 80cm x 200cm x 80cm
  }
  // Only add models here that you want to load from .glb files
] as const;

// Components that will use procedural code (your existing bathroomFixtures logic)
export const PROCEDURAL_FIXTURES: readonly ProceduralConfig[] = [
  // {
  //   name: 'Shower',
  //   type: 'procedural',
  //   orientation: {
  //     type: 'face_into_room',
  //     wallBuffer: 85, // 85cm - Very close to wall
  //     description: 'Shower opening faces into room'
  //   },
  //   fallbackColor: 0xffffff,
  //   fallbackGeometry: 'cylinder',
  //   fallbackSize: [80, 200, 80] // 80cm x 200cm x 80cm
  // }
] as const;

// HERE'S WHERE YOU CHOOSE: Map each component to either model or procedural
export const FIXTURE_CONFIG: Record<ComponentType, FixtureConfig> = {
  // These will use .glb files
  Sink: AVAILABLE_MODELS.find(m => m.name === 'Sink')!,
  Door: AVAILABLE_MODELS.find(m => m.name === 'Door')!,
  Radiator: AVAILABLE_MODELS.find(f => f.name === 'Radiator')!,
  Toilet: AVAILABLE_MODELS.find(f => f.name === 'Toilet')!,
  Bath: AVAILABLE_MODELS.find(f => f.name === 'Bath')!,
  Mirror: AVAILABLE_MODELS.find(f => f.name === 'Mirror')!,
  Shower: AVAILABLE_MODELS.find(f => f.name === 'Shower')!

  // These will use your existing procedural code
  // Shower: PROCEDURAL_FIXTURES.find(f => f.name === 'Shower')!
};

// Helper function to get wall buffer for an object - ALL VALUES IN CENTIMETERS
export const getObjectWallBuffer = (
  objectType: ComponentType,
  scale: number = 1.0
): number => {
  const config = FIXTURE_CONFIG[objectType];

  // If object has custom wallBuffer defined, use it (already in centimeters)
  if (config?.orientation?.wallBuffer !== undefined) {
    return config.orientation.wallBuffer * scale;
  }

  // Fallback to default buffer calculation (fallbackSize already in centimeters)
  if (config && 'fallbackSize' in config && config.fallbackSize) {
    const [width, , depth] = config.fallbackSize;
    return Math.max(width, depth) * scale / 2;
  }

  // Ultimate fallback (CONSTRAINTS.OBJECT_BUFFER already in centimeters)
  return CONSTRAINTS.OBJECT_BUFFER;
};

// Helper function to get rotation for an object on a specific wall
export const getObjectRotationForWall = (
  objectType: ComponentType,
  wallType: 'north' | 'south' | 'east' | 'west'
): number => {
  const config = FIXTURE_CONFIG[objectType];

  if (!config || !config.orientation) {
    console.warn(`No orientation config found for ${objectType}, using default face_into_room`);
    return WALL_ROTATIONS.face_into_room[wallType];
  }

  // Get base rotation from wall rotation mappings
  let baseRotation = WALL_ROTATIONS[config.orientation.type][wallType];

  // Apply any additional rotation offset
  if (config.orientation.rotationOffset) {
    baseRotation += config.orientation.rotationOffset;
  }

  return baseRotation;
};

// Helper function to get orientation config for debugging
export const getOrientationInfo = (objectType: ComponentType) => {
  const config = FIXTURE_CONFIG[objectType];
  const orientation = config?.orientation;

  return {
    type: orientation?.type || 'face_into_room',
    description: orientation?.description || 'Default orientation',
    hasOffset: !!orientation?.rotationOffset
  };
};

// Utility functions
export const getModelConfig = (componentType: ComponentType): FixtureConfig => {
  return FIXTURE_CONFIG[componentType];
};

export const isModelBased = (config: FixtureConfig): config is ModelConfig => {
  return 'path' in config;
};

export const isProceduralBased = (config: FixtureConfig): config is ProceduralConfig => {
  return 'type' in config && config.type === 'procedural';
};

// Only preload the models you're actually using
export const getPreloadModels = (): ModelConfig[] => {
  return AVAILABLE_MODELS.filter(model =>
    Object.values(FIXTURE_CONFIG).some(config =>
      isModelBased(config) && config.name === model.name
    )
  );
};
