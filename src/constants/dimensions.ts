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

export const MEASUREMENT_SETTINGS = {
  MIN_DISPLAY_DISTANCE: 5, // Don't show measurements less than 10cm
  LABEL_HEIGHT_OFFSET: 80,   // Height above objects for labels
  LINE_HEIGHT_OFFSET: 70,    // Height above objects for measurement lines
  TOLERANCE: 20,             // Alignment tolerance for objects
  UPDATE_INTERVAL: 500       // Measurement update interval in ms
} as const;

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
    const savedDimensions = localStorage.getItem('room-dimensions');
    if (savedDimensions) {
      const dimensions = JSON.parse(savedDimensions);
      if (dimensions.width && dimensions.height) {
        // Convert from meters (storage format) back to centimeters (app format)
        const result = {
          width: Math.round(dimensions.width * 100), // Convert meters to cm inline
          height: Math.round(dimensions.height * 100) // Convert meters to cm inline
        };
        console.log('Room dimensions loaded from localStorage and converted to CM:', result);
        return result;
      }
    }
  } catch (error) {
    console.warn('Failed to load room dimensions:', error);
  }
  return null;
};