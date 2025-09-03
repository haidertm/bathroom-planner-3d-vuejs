// src/constants/dimensions.ts - Unit conversion utilities

export interface RoomDefaults {
  readonly WIDTH: number;
  readonly HEIGHT: number;
  readonly MIN_SIZE: number;
  readonly MAX_SIZE: number;
  readonly STEP: number;
}

export type WallType = 'north' | 'south' | 'east' | 'west';

export const ROOM_DEFAULTS: RoomDefaults = {
  WIDTH: 300, // default
  HEIGHT: 250, // default Length/Depth
  MIN_SIZE: 100,
  MAX_SIZE: 600,
  STEP: 10
} as const;

// Shape-specific default dimensions
export type RoomShape = 'square' | 'rectangular';

export interface ShapeDimensions {
    readonly width: number;
    readonly height: number;
}

export const SHAPE_DEFAULTS: Record<RoomShape, ShapeDimensions> = {
    square: {
        width: 300,   // 3m x 3m square room
        height: 300
    },
    rectangular: {
        width: 400,   // 5m x 2.5m rectangular room
        height: 250
    }
} as const;

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

export const MEASUREMENT_SETTINGS = {
  MIN_DISPLAY_DISTANCE: 5, // Don't show measurements less than 10cm
  LABEL_HEIGHT_OFFSET: 80,   // Height above objects for labels
  LINE_HEIGHT_OFFSET: 70,    // Height above objects for measurement lines
  TOLERANCE: 20,             // Alignment tolerance for objects
  UPDATE_INTERVAL: 500       // Measurement update interval in ms
} as const;

// Helper function to get default dimensions for a shape
export const getShapeDefaultDimensions = (shape: RoomShape | string): ShapeDimensions => {
    if (shape === 'square' || shape === 'rectangular') {
        console.log('>>> room shape default', SHAPE_DEFAULTS[shape]);
        return SHAPE_DEFAULTS[shape];
    }

    // Fallback to general defaults
    return {
        width: ROOM_DEFAULTS.WIDTH,
        height: ROOM_DEFAULTS.HEIGHT
    };
};

// Storage utilities - localStorage stores in meters for consistency with existing data
export const saveRoomDimensionsToStorage = (widthCm: number, heightCm: number): void => {
  try {
    const roomDimensionsInMeters = {
      width: widthCm / 100,  // Convert cm to meters inline
      height: heightCm / 100, // Convert cm to meters inline
      timestamp: Date.now()
    };
    localStorage.setItem('room-dimensions', JSON.stringify(roomDimensionsInMeters));
    console.log('Room dimensions saved to localStorage:', roomDimensionsInMeters);
    console.log('Original values in CM:', { width: widthCm + 'cm', height: heightCm + 'cm' });
  } catch (error) {
    console.warn('Failed to save room dimensions:', error);
  }
};

export const loadRoomDimensionsFromStorage = (): { width: number; height: number } | null => {
    try {
        const saved = localStorage.getItem('room-dimensions');
        if (!saved) return null;

        const parsed = JSON.parse(saved);

        // Convert from meters back to centimeters for internal use
        const dimensions = {
            width: Math.round(parsed.width * 100), // Convert meters to cm
            height: Math.round(parsed.height * 100) // Convert meters to cm
        };

        console.log('📂 Room dimensions loaded from localStorage (converted to cm):', dimensions);
        return dimensions;
    } catch (error) {
        console.error('❌ Failed to load room dimensions:', error);
        return null;
    }
};