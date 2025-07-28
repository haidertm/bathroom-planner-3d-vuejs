// STEP-BY-STEP INSTRUCTIONS TO FIX WALL PENETRATION ISSUES

/**
 * STEP 1: Create a new enhanced constraints helper file
 * Create: src/utils/dimensionConstraints.ts
 */

// File: src/utils/dimensionConstraints.ts
import productData from '../mocks/productData';
import type { ComponentType, BathroomItem } from '../types/index';

interface Position {
  x: number;
  y: number;
  z: number;
}

interface ProductDimensions {
  width: number;   // in cm
  height: number;  // in cm
  depth: number;   // in cm
}

// Small aesthetic gap from walls (2cm)
const AESTHETIC_GAP = 2;
const OBJECT_BUFFER = 3; // 3cm minimum between objects

/**
 * Get actual product dimensions from productData.ts
 */
export const getActualProductDimensions = (
  objectType: ComponentType,
  sku?: string
): ProductDimensions | null => {

  const categoryMap: Record<ComponentType, keyof typeof productData> = {
    'Toilet': 'Toilet',
    'Sink': 'Furniture',
    'Bath': 'Bath',
    'Shower': 'Shower',
    'Radiator': 'Radiator',
    'Mirror': 'Mirror',
    'Door': 'Furniture'
  };

  const category = categoryMap[objectType];
  if (!category || !productData[category]) {
    console.warn(`❌ No category mapping for ${objectType}`);
    return null;
  }

  // If we have a specific SKU, find that exact product
  if (sku) {
    for (const productGroup of productData[category]) {
      if (productGroup.variants) {
        for (const variant of productGroup.variants) {
          if (variant.sku === sku && variant.dimensions) {
            return {
              width: variant.dimensions.width,
              depth: variant.dimensions.depth || variant.dimensions.height,
              height: variant.dimensions.height
            };
          }
        }
      }
    }
  }

  // Fallback: use first available product dimensions
  for (const productGroup of productData[category]) {
    if (productGroup.variants && productGroup.variants[0]?.dimensions) {
      const dims = productGroup.variants[0].dimensions;
      return {
        width: dims.width,
        depth: dims.depth || dims.height,
        height: dims.height
      };
    }
  }

  return null;
};

/**
 * Check if object would penetrate walls using actual dimensions
 */
export const checkWallPenetration = (
  position: Position,
  objectType: ComponentType,
  scale: number = 1.0,
  roomWidth: number,
  roomHeight: number,
  sku?: string
): {
  penetratesWall: boolean;
  correctedPosition?: Position;
} => {

  const dimensions = getActualProductDimensions(objectType, sku);
  if (!dimensions) {
    return { penetratesWall: false };
  }

  // Calculate object boundaries with scale
  const halfWidth = (dimensions.width * scale) / 2;
  const halfDepth = (dimensions.depth * scale) / 2;

  // Room boundaries
  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Object boundaries
  const objectLeft = position.x - halfWidth;
  const objectRight = position.x + halfWidth;
  const objectFront = position.z - halfDepth;
  const objectBack = position.z + halfDepth;

  // Wall boundaries with aesthetic gap
  const wallLeft = -roomHalfWidth + AESTHETIC_GAP;
  const wallRight = roomHalfWidth - AESTHETIC_GAP;
  const wallFront = -roomHalfHeight + AESTHETIC_GAP;
  const wallBack = roomHalfHeight - AESTHETIC_GAP;

  // Check penetrations
  const penetratesLeft = objectLeft < wallLeft;
  const penetratesRight = objectRight > wallRight;
  const penetratesFront = objectFront < wallFront;
  const penetratesBack = objectBack > wallBack;

  const penetratesWall = penetratesLeft || penetratesRight || penetratesFront || penetratesBack;

  if (penetratesWall) {
    // Calculate corrected position
    let correctedX = position.x;
    let correctedZ = position.z;

    if (penetratesLeft) {
      correctedX = wallLeft + halfWidth;
    } else if (penetratesRight) {
      correctedX = wallRight - halfWidth;
    }

    if (penetratesFront) {
      correctedZ = wallFront + halfDepth;
    } else if (penetratesBack) {
      correctedZ = wallBack - halfDepth;
    }

    return {
      penetratesWall: true,
      correctedPosition: { x: correctedX, y: position.y, z: correctedZ }
    };
  }

  return { penetratesWall: false };
};

/**
 * Enhanced collision detection using actual dimensions
 */
export const checkObjectCollisionEnhanced = (
  pos1: Position,
  type1: ComponentType,
  scale1: number,
  sku1: string | undefined,
  pos2: Position,
  type2: ComponentType,
  scale2: number,
  sku2: string | undefined
): boolean => {

  const dims1 = getActualProductDimensions(type1, sku1);
  const dims2 = getActualProductDimensions(type2, sku2);

  if (!dims1 || !dims2) return false;

  // Calculate boundaries
  const halfWidth1 = (dims1.width * scale1) / 2;
  const halfDepth1 = (dims1.depth * scale1) / 2;
  const halfWidth2 = (dims2.width * scale2) / 2;
  const halfDepth2 = (dims2.depth * scale2) / 2;

  // Check overlap with buffer
  const distanceX = Math.abs(pos1.x - pos2.x);
  const distanceZ = Math.abs(pos1.z - pos2.z);

  const minDistanceX = halfWidth1 + halfWidth2 + OBJECT_BUFFER;
  const minDistanceZ = halfDepth1 + halfDepth2 + OBJECT_BUFFER;

  return distanceX < minDistanceX && distanceZ < minDistanceZ;
};

/**
 * Find safe spawn position using actual dimensions
 */
export const findSafeSpawnPositionEnhanced = (
  objectType: ComponentType,
  roomWidth: number,
  roomHeight: number,
  scale: number = 1.0,
  existingItems: BathroomItem[] = [],
  sku?: string
): { position: Position; success: boolean } => {

  const dimensions = getActualProductDimensions(objectType, sku);
  if (!dimensions) {
    return { position: { x: 0, y: 0, z: 0 }, success: false };
  }

  const scaledHalfWidth = (dimensions.width * scale) / 2;
  const scaledHalfDepth = (dimensions.depth * scale) / 2;

  // Calculate safe spawn area
  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  const safeArea = {
    minX: -roomHalfWidth + AESTHETIC_GAP + scaledHalfWidth,
    maxX: roomHalfWidth - AESTHETIC_GAP - scaledHalfWidth,
    minZ: -roomHalfHeight + AESTHETIC_GAP + scaledHalfDepth,
    maxZ: roomHalfHeight - AESTHETIC_GAP - scaledHalfDepth
  };

  // Check if object can fit
  if (safeArea.minX >= safeArea.maxX || safeArea.minZ >= safeArea.maxZ) {
    console.error(`❌ Object ${objectType} too large for room!`);
    return { position: { x: 0, y: 0, z: 0 }, success: false };
  }

  // Try random positions
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidatePosition: Position = {
      x: safeArea.minX + Math.random() * (safeArea.maxX - safeArea.minX),
      y: objectType === 'Mirror' ? 120 : 0,
      z: safeArea.minZ + Math.random() * (safeArea.maxZ - safeArea.minZ)
    };

    // Check collision with existing objects
    let hasCollision = false;
    for (const existingItem of existingItems) {
      const existingPos = {
        x: existingItem.position[0],
        y: existingItem.position[1],
        z: existingItem.position[2]
      };

      if (checkObjectCollisionEnhanced(
        candidatePosition, objectType, scale, sku,
        existingPos, existingItem.type, existingItem.scale || 1.0, existingItem.sku
      )) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) {
      return { position: candidatePosition, success: true };
    }
  }

  // Try center as fallback
  const centerPosition = { x: 0, y: objectType === 'Mirror' ? 120 : 0, z: 0 };
  const wallCheck = checkWallPenetration(centerPosition, objectType, scale, roomWidth, roomHeight, sku);

  if (!wallCheck.penetratesWall) {
    return { position: centerPosition, success: true };
  }

  return { position: { x: 0, y: 0, z: 0 }, success: false };
};

/**
 * Enhanced drag constraint
 */
export const constrainDragPositionEnhanced = (
  newPosition: Position,
  objectType: ComponentType,
  scale: number,
  roomWidth: number,
  roomHeight: number,
  objectId: number,
  existingItems: BathroomItem[],
  sku?: string
): Position => {

  // First: Check wall penetration
  const wallCheck = checkWallPenetration(newPosition, objectType, scale, roomWidth, roomHeight, sku);

  let constrainedPosition = wallCheck.penetratesWall && wallCheck.correctedPosition
    ? wallCheck.correctedPosition
    : newPosition;

  // Second: Check object collisions
  for (const existingItem of existingItems) {
    if (existingItem.id === objectId) continue;

    const existingPos = {
      x: existingItem.position[0],
      y: existingItem.position[1],
      z: existingItem.position[2]
    };

    if (checkObjectCollisionEnhanced(
      constrainedPosition, objectType, scale, sku,
      existingPos, existingItem.type, existingItem.scale || 1.0, existingItem.sku
    )) {
      // Try small adjustments
      const adjustments = [
        { x: 5, z: 0 }, { x: -5, z: 0 }, { x: 0, z: 5 }, { x: 0, z: -5 }
      ];

      for (const adjustment of adjustments) {
        const adjustedPos = {
          x: constrainedPosition.x + adjustment.x,
          y: constrainedPosition.y,
          z: constrainedPosition.z + adjustment.z
        };

        const adjustedWallCheck = checkWallPenetration(adjustedPos, objectType, scale, roomWidth, roomHeight, sku);
        if (adjustedWallCheck.penetratesWall) continue;

        // Check if adjustment avoids collision
        let adjustedHasCollision = false;
        for (const checkItem of existingItems) {
          if (checkItem.id === objectId) continue;

          const checkPos = {
            x: checkItem.position[0],
            y: checkItem.position[1],
            z: checkItem.position[2]
          };

          if (checkObjectCollisionEnhanced(
            adjustedPos, objectType, scale, sku,
            checkPos, checkItem.type, checkItem.scale || 1.0, checkItem.sku
          )) {
            adjustedHasCollision = true;
            break;
          }
        }

        if (!adjustedHasCollision) {
          constrainedPosition = adjustedPos;
          break;
        }
      }
    }
  }

  return constrainedPosition;
};
