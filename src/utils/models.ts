// src/utils/models.ts - Enhanced movement system with type-based defaults and product overrides

import { ComponentType } from '../constants/components';
import {
  DEFAULT_ORIENTATION,
  FixtureConfig,
  type ModelConfig,
  MovementConfig,
  OrientationConfig,
  WALL_ROTATIONS
} from '../constants/models';
import { CONSTRAINTS } from '../constants/dimensions';
import { BathroomItem } from '../utils/constraints';
import productData from '../mocks/productData';

// ✅ SIMPLIFIED: Default movement configurations per object type
const DEFAULT_MOVEMENT_CONFIGS: Record<ComponentType, MovementConfig> = {
  // WALL-MOUNTED OBJECTS (snap to wall)
  Mirror: {
    snapToWall: true,
    allowVerticalMovement: true, // Mirrors can be adjusted up/down
    allowFreeRotation: false,
    minHeight: 0,
    maxHeight: 150
  },

  Sink: {
    snapToWall: true,
    allowVerticalMovement: false, // Fixed height for plumbing
    allowFreeRotation: false,
    minHeight: 0,
    maxHeight: 0 // Ground level
  },

  Toilet: {
    snapToWall: true,
    allowVerticalMovement: false, // Fixed to floor
    allowFreeRotation: false,
    minHeight: 0,
    maxHeight: 0
  },

  Furniture: {
    snapToWall: true,
    allowVerticalMovement: false, // Most furniture is floor-mounted
    allowFreeRotation: false,
    minHeight: 0,
    maxHeight: 50 // Some wall-hung units
  },

  Radiator: {
    snapToWall: true,
    allowVerticalMovement: true, // Can be positioned at different heights
    allowFreeRotation: false,
    minHeight: 0, // 10cm from floor
    maxHeight: 150 // 1.5m max
  },

  // FREE-STANDING OBJECTS (can move anywhere in room)
  Bath: {
    snapToWall: false,
    allowVerticalMovement: false, // Floor level only
    allowFreeRotation: true, // Baths can face any direction
    minHeight: 0,
    maxHeight: 0
  },

  Shower: {
    snapToWall: true, // Most showers are corner/wall mounted
    allowVerticalMovement: false,
    allowFreeRotation: false,
    minHeight: 0,
    maxHeight: 0
  },

  Door: {
    snapToWall: true,
    allowVerticalMovement: false,
    allowFreeRotation: false,
    minHeight: 0,
    maxHeight: 0
  }
};

// ✅ NEW: Enhanced function to get movement config with proper hierarchy
export const getMovementConfig = (objectType: ComponentType, item?: BathroomItem): MovementConfig => {
  console.log('🔧 Getting movement config for:', objectType, item?.sku);

  // Priority 1: Check if specific product variant has movement config
  if (item?.model?.movement) {
    console.log('✅ Using product-specific movement config:', item.model.movement);
    return item.model.movement;
  }

  // Priority 2: Check productData for SKU-specific movement config
  if (item?.sku) {
    const productMovement = getMovementFromProductData(item.sku, objectType);
    if (productMovement) {
      console.log('✅ Using productData movement config for SKU:', item.sku, productMovement);
      return productMovement;
    }
  }

  // Priority 3: Use default config for object type
  const defaultConfig = DEFAULT_MOVEMENT_CONFIGS[objectType];
  if (defaultConfig) {
    console.log('✅ Using default movement config for type:', objectType, defaultConfig);
    return defaultConfig;
  }

  // Priority 4: Global fallback (should rarely be used)
  console.warn('⚠️ Using global fallback movement config for:', objectType);
  return {
    // Default movement configuration for objects without explicit config
    snapToWall: true,
    allowVerticalMovement: false,
    allowFreeRotation: false
  };
};

// ✅ NEW: Helper to get movement config from productData
const getMovementFromProductData = (sku: string, objectType: ComponentType): MovementConfig | null => {
  if (!objectType || !productData[objectType]) {
    return null;
  }

  // Search through products to find the SKU and its movement config
  for (const product of productData[objectType]) {
    if (product.variants) {
      for (const variant of product.variants) {
        if (variant.sku === sku && variant.movement) {
          console.log('📦 Found movement config in productData:', variant.movement);
          return variant.movement;
        }
      }
    }
  }

  return null;
};

// ✅ SIMPLIFIED: Helper function to check if object can move freely
export const canMoveFreelyInRoom = (objectType: ComponentType, item?: BathroomItem): boolean => {
  const movementConfig = getMovementConfig(objectType, item);
  return !movementConfig.snapToWall; // ✅ Simple: if not snapped to wall, it's free
};

// ✅ SIMPLIFIED: Helper function to check if object snaps to wall
export const shouldSnapToWall = (objectType: ComponentType, item?: BathroomItem): boolean => {
  const movementConfig = getMovementConfig(objectType, item);
  return movementConfig.snapToWall; // ✅ Direct attribute check
};

// ✅ Helper function to check if object can move vertically (unchanged)
export const canMoveVertically = (objectType: ComponentType, item?: BathroomItem): boolean => {
  const movementConfig = getMovementConfig(objectType, item);
  return !!movementConfig.allowVerticalMovement;
};

// ✅ Helper function to check if object can rotate freely (unchanged)
export const canRotateFreely = (objectType: ComponentType, item?: BathroomItem): boolean => {
  const movementConfig = getMovementConfig(objectType, item);
  return !!movementConfig.allowFreeRotation;
};

// ✅ Helper function to get height constraints (unchanged)
export const getHeightConstraints = (objectType: ComponentType, item?: BathroomItem): { min: number; max: number } => {
  const movementConfig = getMovementConfig(objectType, item);
  return {
    min: movementConfig.minHeight || 0,
    max: movementConfig.maxHeight || 250
  };
};

// ✅ Convenience function to get movement config for a BathroomItem (unchanged)
export const getMovementConfigForItem = (item: BathroomItem): MovementConfig => {
  return getMovementConfig(item.type, item);
};

// ✅ SIMPLIFIED: Helper to check if an object type is free-standing by default
export const isDefaultFreeMovement = (objectType: ComponentType): boolean => {
  const defaultConfig = DEFAULT_MOVEMENT_CONFIGS[objectType];
  return !defaultConfig?.snapToWall; // ✅ Simple: not wall-snapped = free movement
};

// ✅ SIMPLIFIED: Helper to get all object types that are free-standing by default
export const getFreeStandingObjectTypes = (): ComponentType[] => {
  return Object.entries(DEFAULT_MOVEMENT_CONFIGS)
    .filter(([_, config]) => !config.snapToWall) // ✅ Simple check
    .map(([type, _]) => type as ComponentType);
};

// ✅ SIMPLIFIED: Helper to get all object types that snap to wall by default
export const getWallSnappingObjectTypes = (): ComponentType[] => {
  return Object.entries(DEFAULT_MOVEMENT_CONFIGS)
    .filter(([_, config]) => config.snapToWall) // ✅ Simple check
    .map(([type, _]) => type as ComponentType);
};

// 🆕 NEW: Helper method to get orientation for an item (unchanged)
export const getOrientationForItem = (item: BathroomItem): OrientationConfig => {
  console.log('getTheOrientationForItem called with item:', item);
  // If orientation is stored directly on the item
  if (item.model?.orientation) {
    return item.model?.orientation as OrientationConfig;
  }

  // If we need to look it up from product data using SKU
  if (item.sku) {
    const orientation = getOrientationFromProductData(item.sku, item.type);
    if (orientation) {
      console.log('Using orientation from product data:', orientation);
      return orientation;
    }
  }

  // Priority 3: Fall back to default configuration
  console.log('⚠️ Using DEFAULT_ORIENTATION fallback:', DEFAULT_ORIENTATION);
  return { ...DEFAULT_ORIENTATION };
}

// 🆕 NEW: Helper method to get orientation from product data (unchanged)
const getOrientationFromProductData = (sku: string, objectType: ComponentType): OrientationConfig | null => {
  if (!objectType || !productData[objectType]) {
    return null;
  }

  // Search through products to find the SKU and its orientation
  for (const product of productData[objectType]) {
    if (product.variants) {
      for (const variant of product.variants) {
        if (variant.sku === sku && variant.orientation) {
          return variant.orientation;
        }
      }
    }
  }

  return null;
}

// Existing helper functions (unchanged)
export const getObjectWallBuffer = (
  { orientation }: { orientation: OrientationConfig; scale?: number }
): number => {
  return orientation?.wallBuffer ?? CONSTRAINTS.OBJECT_BUFFER;
};

export const getObjectRotationForWall = (
  objectType: ComponentType,
  wallType: 'north' | 'south' | 'east' | 'west',
  orientation?: OrientationConfig
): number => {
  console.log('selectedOrientationWouldBe>>>:::', orientation);
  if (!orientation) {
    console.warn(`No orientation config found for ${objectType}, using default face_into_room`);
    return WALL_ROTATIONS.face_into_room[wallType];
  }
  let baseRotation = WALL_ROTATIONS[orientation.type][wallType];
  if (orientation.rotationOffset) {
    baseRotation += orientation.rotationOffset;
  }
  return baseRotation;
};

export const getOrientationInfo = (orientation?: OrientationConfig) => {
  const actualOrientation = orientation || DEFAULT_ORIENTATION;
  return {
    type: orientation?.type || 'face_into_room',
    description: orientation?.description || 'Default orientation',
    hasOffset: !!orientation?.rotationOffset,
    wallBuffer: actualOrientation.wallBuffer
  };
};

export const isModelBased = (config: FixtureConfig): config is ModelConfig => {
  return 'path' in config;
};
