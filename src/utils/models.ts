// Helper function to get movement configuration for an object
import { ComponentType } from '../constants/components';

import {
  DEFAULT_ORIENTATION,
  FixtureConfig,
  type ModelConfig, MovementConfig, OrientationConfig, WALL_ROTATIONS
} from '../constants/models';
import { CONSTRAINTS } from '../constants/dimensions';
import { BathroomItem } from '../utils/constraints';
import productData from '../mocks/productData.ts';

export const getMovementConfig = (_objectType: ComponentType): MovementConfig => {
  // const config = FIXTURE_CONFIG[objectType];
  // return config?.movement || {
  //   // Default movement configuration for objects without explicit config
  //   snapToWall: true,
  //   allowVerticalMovement: false,
  //   allowFreeMovement: false,
  //   allowFreeRotation: false,
  //   maintainWallDistance: true
  // };

  return {
    // Default movement configuration for objects without explicit config
    snapToWall: true,
    allowVerticalMovement: false,
    allowFreeMovement: false,
    allowFreeRotation: false,
    maintainWallDistance: true
  }
};

// 🆕 NEW: Helper method to get orientation for an item
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


// 🆕 NEW: Helper method to get orientation from product data
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

// export const getProductData = (sku: string): any => {
//   const product = productData.find(item => item.sku === sku);
//   if (!product) {
//     console.warn(`Product with SKU ${sku} not found`);
//     return null;
//   }
//   return product;
// }

// NEW: Helper function to check if object can move freely
export const canMoveFreelyInRoom = (_objectType: ComponentType): boolean => {
  return false;
  // const movementConfig = getMovementConfig(objectType);
  // return !!movementConfig.allowFreeMovement;
};

// NEW: Helper function to check if object can move vertically
export const canMoveVertically = (objectType: ComponentType): boolean => {
  const movementConfig = getMovementConfig(objectType);
  return !!(movementConfig.allowVerticalMovement || movementConfig.allowFreeMovement);
};

// NEW: Helper function to check if object can rotate freely
export const canRotateFreely = (objectType: ComponentType): boolean => {
  const movementConfig = getMovementConfig(objectType);
  return !!(movementConfig.allowFreeRotation || movementConfig.allowFreeMovement);
};

// NEW: Helper function to get height constraints
export const getHeightConstraints = (objectType: ComponentType): { min: number; max: number } => {
  const movementConfig = getMovementConfig(objectType);
  return {
    min: movementConfig.minHeight || 0,
    max: movementConfig.maxHeight || 250
  };
};

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
  // const config = FIXTURE_CONFIG[objectType];
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
  // const config = FIXTURE_CONFIG[objectType];
  // const orientation = config?.orientation;
  const actualOrientation = orientation || DEFAULT_ORIENTATION; // Placeholder for actual orientation config
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

export const shouldSnapToWall = (objectType: ComponentType): boolean => {
  const movementConfig = getMovementConfig(objectType);
  return movementConfig.snapToWall || false; // Default to false if not specified
};
