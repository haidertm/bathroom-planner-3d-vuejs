export interface RoomDefaults {
  readonly WIDTH: number;
  readonly HEIGHT: number;
  readonly MIN_SIZE: number;
  readonly MAX_SIZE: number;
  readonly STEP: number;
}

export const ROOM_DEFAULTS: RoomDefaults = {
  WIDTH: 6,
  HEIGHT: 6,
  MIN_SIZE: 6,
  MAX_SIZE: 20,
  STEP: 0.5
}  as const;

export interface WallSettings {
  readonly HEIGHT: number;
  readonly THICKNESS: number;
}

export const WALL_SETTINGS: WallSettings = {
  HEIGHT: 3,
  THICKNESS: 0.1
} as const;


export interface Constraints {
  readonly OBJECT_BUFFER: number;
  readonly SNAP_DISTANCE: number;
  readonly GRID_SPACING: number;
}

export const CONSTRAINTS: Constraints = {
  OBJECT_BUFFER: 0.4,
  SNAP_DISTANCE: 0.3,
  GRID_SPACING: 0.5
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
  MAX: 1.5,
  MIRROR_MAX: 2.5
} as const;

// Add model dimensions for better constraint handling
export const MODEL_DIMENSIONS = {
  Toilet: { width: 0.8, depth: 0.8, height: 0.8 },
  Sink: { width: 0.6, depth: 0.5, height: 0.9 },
  Bath: { width: 1.7, depth: 0.8, height: 0.6 },
  Shower: { width: 0.8, depth: 0.8, height: 2.0 },
  Radiator: { width: 0.7, depth: 0.2, height: 1.4 },
  Mirror: { width: 0.8, depth: 0.05, height: 0 },
  Door: { width: 0.8, depth: 0.1, height: 2.0 }
};

export type ComponentType = keyof typeof MODEL_DIMENSIONS;
