// src/constants/dimensions.ts - Unit conversion utilities

export interface RoomDefaults {
  readonly WIDTH: number;
  readonly HEIGHT: number;
  readonly MIN_SIZE: number;
  readonly MAX_SIZE: number;
  readonly STEP: number;
}

export const ROOM_DEFAULTS: RoomDefaults = {
  WIDTH: 300, // default
  HEIGHT: 250, // default Length/Depth
  MIN_SIZE: 100,
  MAX_SIZE: 600,
  STEP: 10
}  as const;

export interface WallSettings {
  readonly HEIGHT: number;
  readonly THICKNESS: number;
}

export const WALL_SETTINGS: WallSettings = {
  HEIGHT: 250,
  THICKNESS: 5
} as const;


export interface Constraints {
  readonly OBJECT_BUFFER: number;
  readonly SNAP_DISTANCE: number;
  readonly GRID_SPACING: number;
}

export const CONSTRAINTS: Constraints = {
  OBJECT_BUFFER: 40,
  SNAP_DISTANCE: 30,
  GRID_SPACING: 15 // in centimeters
} as const;

export interface ScaleLimits {
  readonly MIN: number;
  readonly MAX: number;
}

export const SCALE_LIMITS: ScaleLimits = {
  MIN: 0.2,
  MAX: 3.0
} as const;

export interface HeightLimits {
  readonly MIN: number;
  readonly MAX: number;
  readonly MIRROR_MAX: number;
}

export const HEIGHT_LIMITS: HeightLimits = {
  MIN: 0,
  MAX: 150,
  MIRROR_MAX: 250
} as const;

// Add model dimensions for better constraint handling
export const MODEL_DIMENSIONS = {
  Toilet: { width: 45, depth: 80, height: 80 },
  Sink: { width: 60, depth: 50, height: 90 },
  Bath: { width: 170, depth: 80, height: 60 },
  Shower: { width: 80, depth: 80, height: 200 },
  Radiator: { width: 70, depth: 20, height: 140 },
  Mirror: { width: 80, depth: 5, height: 0 },
  Door: { width: 80, depth: 10, height: 200 }
};

export type ComponentType = keyof typeof MODEL_DIMENSIONS;

export const MEASUREMENT_SETTINGS = {
  MIN_DISPLAY_DISTANCE: 5, // Don't show measurements less than 10cm
  LABEL_HEIGHT_OFFSET: 80,   // Height above objects for labels
  LINE_HEIGHT_OFFSET: 70,    // Height above objects for measurement lines
  TOLERANCE: 20,             // Alignment tolerance for objects
  UPDATE_INTERVAL: 500       // Measurement update interval in ms
} as const;
