// src/utils/constraints.ts - ENHANCED with proper movement integration
import { WALL_SETTINGS } from '../constants/dimensions';
import type { ComponentType } from '../constants/components';
import { getMovementConfig } from '../utils/models';
import {
    type OrientationConfig,
    MovementConfig,
    DEFAULT_ORIENTATION,
    DefaultCornerObjectRotation
} from '../constants/models';
import { getObjectWallBuffer, getObjectRotationForWall } from '../utils/models';
import productData from '../mocks/productData';

// Interface for position
export interface Position {
    x: number;
    y: number;
    z: number;
}

// Wall identification
export type WallType = 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';
// Corner identification (includes notch corners for L-shaped rooms)
export type CornerType = 'north-east' | 'north-west' | 'south-east' | 'south-west' | 'notch-interior' | 'notch-corner' | 'notch-east-north';

export interface CornerInfo {
    type: CornerType;
    position: Position;
    walls: [WallType, WallType];
}

export type ObjectModel = {
    path: string;
    name: string;
    title?: string;
    id?: string;
    image?: string;
    link?: string;
    sku?: string;
    scale?: number;
    price?: number | string;
    rotation?: [number, number, number];
    position?: [number, number, number];
    movement?: MovementConfig;
    orientation?: OrientationConfig;
    floorOffset?: number; // Floor offset in centimeters, defines what is the height inside .glb file
    spawnHeight?: number; // Height above floor when spawning in the room
    dimensions: {
        width: number;
        height: number;
        depth?: number;
    };
    filterAttributes?: {
        // Common filters
        length?: string;
        type?: string;
        finish?: string;
        style?: string;
        // Furniture filters
        width?: string;
        colour?: string;
        mounting?: string;
        basinType?: string;
        depth?: string;
        // Toilet filters
        projection?: string;
        shape?: string;c
        rimless?: boolean;
        cisternEntry?: string;
        softCloseSeat?: boolean;
        // Shower filters
        doorType?: string;
        glassThickness?: string;
        frameType?: string;
        frameFinish?: string;
        range?: string;
        // Radiator filters
        orientation?: string;
        height?: string;
        btuOutput?: string;
        pipeCentres?: string;
        panel?: string;
        // Bath filters
        handed?: string;
        feetColour?: string;
        // Suite filters
        composition?: string;
        bathType?: string;
        toiletType?: string;
        // Plumbing filters
        diameter?: string;
        size?: string;
        material?: string;
    };
}

export type ObjectModelWithCategory = ObjectModel & {
    category: string;
};

export interface BathroomItem {
    id: number;
    type: ComponentType;
    position: [number, number, number];
    rotation?: number;
    scale?: number;
    sku?: string;
    productName?: string;
    model?: ObjectModel;
}

/**
 * Enhanced collision detection that includes walls and L-shape notch
 */
export const wouldCollideWithExistingOrWalls = (
    position: Position,
    objectType: ComponentType,
    scale: number,
    objectId: number,
    existingItems: BathroomItem[],
    roomWidth: number,
    roomHeight: number,
    currentItem?: BathroomItem,
    rotation?: number,
    notchWidth?: number,
    notchHeight?: number
): boolean => {

    // 1. Check wall collision using actual dimensions (with rotation for free-rotation objects and L-shape notch)
    if (checkWallCollision(position, objectType, scale, roomWidth, roomHeight, currentItem, rotation, notchWidth, notchHeight)) {
        return true;
    }

    // 2. Check collision with existing objects (passing room dimensions and notch dimensions for accurate wall detection)
    return wouldCollideWithExisting(position, objectType, scale, objectId, existingItems, currentItem, roomWidth, roomHeight, notchWidth, notchHeight);
};

/**
 * Get all corner positions in the room
 * For L-shaped rooms with notch, excludes corners that are in the notch area
 */
export const getRoomCorners = (
    roomWidth: number,
    roomHeight: number,
    notchWidth?: number,
    notchHeight?: number
): CornerInfo[] => {
    const { wallFaces, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

    const allCorners: CornerInfo[] = [
        {
            type: 'north-west' as CornerType,
            position: { x: wallFaces.west, y: 0, z: wallFaces.north },
            walls: ['north', 'west'] as [WallType, WallType]
        },
        {
            type: 'north-east' as CornerType,
            position: { x: wallFaces.east, y: 0, z: wallFaces.north },
            walls: ['north', 'east'] as [WallType, WallType]
        },
        {
            type: 'south-west' as CornerType,
            position: { x: wallFaces.west, y: 0, z: wallFaces.south },
            walls: ['south', 'west'] as [WallType, WallType]
        },
        {
            type: 'south-east' as CornerType,
            position: { x: wallFaces.east, y: 0, z: wallFaces.south },
            walls: ['south', 'east'] as [WallType, WallType]
        }
    ];

    // For L-shaped rooms, exclude the northwest corner and add notch corners
    if (notch) {
        const validCorners: CornerInfo[] = allCorners.filter(corner => corner.type !== 'north-west');

        validCorners.push({
            type: 'notch-interior' as CornerType,
            position: { x: notch.minX, y: 0, z: notch.maxZ },
            walls: ['west', 'notch-south'] as [WallType, WallType]
        });

        validCorners.push({
            type: 'notch-east-north' as CornerType,
            position: { x: notch.maxX, y: 0, z: notch.minZ },
            walls: ['notch-east', 'north'] as [WallType, WallType]
        });

        return validCorners;
    }

    return allCorners;
};

/**
 * Find the nearest corner to a given position
 * For L-shaped rooms, only considers valid corners (excludes northwest corner in notch)
 */
export const getNearestCorner = (
    position: Position,
    roomWidth: number,
    roomHeight: number,
    notchWidth?: number,
    notchHeight?: number
): CornerInfo => {
    const corners = getRoomCorners(roomWidth, roomHeight, notchWidth, notchHeight);

    let nearestCorner = corners[0];
    let minDistance = Infinity;

    corners.forEach(corner => {
        const distance = Math.sqrt(
            Math.pow(position.x - corner.position.x, 2) +
            Math.pow(position.z - corner.position.z, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            nearestCorner = corner;
        }
    });

    return nearestCorner;
};

/**
 * Check if a position is in a corner (within tolerance)
 * For L-shaped rooms, only checks valid corners (excludes northwest corner in notch)
 */
export const isInCorner = (
    position: Position,
    roomWidth: number,
    roomHeight: number,
    tolerance: number = 30, // 30cm tolerance
    notchWidth?: number,
    notchHeight?: number
): boolean => {
    const corners = getRoomCorners(roomWidth, roomHeight, notchWidth, notchHeight);

    return corners.some(corner => {
        const distance = Math.sqrt(
            Math.pow(position.x - corner.position.x, 2) +
            Math.pow(position.z - corner.position.z, 2)
        );
        return distance <= tolerance;
    });
};

/**
 * Constrain position to nearest corner for corner-only items
 * Objects will be positioned flush in the corner
 * For L-shaped rooms, only considers valid corners (excludes northwest corner in notch)
 */
export const constrainToCorner = (
    position: Position,
    roomWidth: number,
    roomHeight: number,
    {
        type: objectType,
        scale = 1.0,
        orientation = DEFAULT_ORIENTATION,
        item,
        movement,
        sku,
        notchWidth,
        notchHeight
    }: {
        type: ComponentType | null;
        scale?: number;
        orientation?: OrientationConfig;
        item?: BathroomItem;
        movement?: MovementConfig;
        sku?: string;
        notchWidth?: number;
        notchHeight?: number;
    }
): { position: Position; rotation: number } => {

    if (!objectType) return { position, rotation: 0 };

    const dimensions = getDimensions(objectType, item?.sku ?? sku, item?.model);
    if (!dimensions) {
        return { position, rotation: 0 };
    }

    const nearestCorner = getNearestCorner(position, roomWidth, roomHeight, notchWidth, notchHeight);
    const movementConfig = movement ?? getMovementConfig(objectType, item);

    // Get the wall buffer (usually 0 for flush-mounted items)
    // Add a minimum visual buffer (2cm) to prevent model clipping into walls
    const configuredWallBuffer = (orientation?.wallBuffer !== undefined) ?
        orientation.wallBuffer * scale : 0;
    const minVisualBuffer = 2; // 2cm minimum to prevent visual wall clipping
    const wallBuffer = Math.max(configuredWallBuffer, minVisualBuffer);

    // For corner items, we position them flush in the corner
    const halfWidth = (dimensions.width * scale) / 2;
    const halfDepth = (dimensions.depth * scale) / 2;

    let constrainedPosition = { ...nearestCorner.position };
    let rotation = 0;

    // Get rotation for this corner
    if (movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled) {
        rotation = movementConfig.cornerInstallOnly?.rotation?.[nearestCorner.type] ?? DefaultCornerObjectRotation[nearestCorner.type];
    } else {
        return { position, rotation: 0 };
    }

    // At 90° or -90°, width and depth are swapped on the X/Z axes
    const isRotated90 = Math.abs(Math.abs(rotation) - Math.PI / 2) < 0.01;
    const halfX = isRotated90 ? halfDepth : halfWidth;
    const halfZ = isRotated90 ? halfWidth : halfDepth;

    // Check if this is a center-pivot model (freestanding items with snapToWall: false)
    // Center-pivot models need halfX/halfZ added to positioning to prevent wall clipping
    const isCenterPivot = movementConfig.snapToWall === false;

    // Position object flush in corner based on corner type
    // CORNER POSITIONING WITH PIVOT OFFSET COMPENSATION
    //
    // Bath models have their pivot at the SOUTH edge of geometry (not center).
    // When we set position, we're setting the PIVOT position.
    // The visual geometry extends NORTH from the pivot by fullDepth.
    //
    // At different rotations, the "south edge" rotates:
    // - 0°: pivot at world-south edge (geometry extends north)
    // - 90°: pivot at world-west edge (geometry extends east)
    // - 180°: pivot at world-north edge (geometry extends south)
    // - -90°: pivot at world-east edge (geometry extends west)
    //
    // DefaultCornerObjectRotation:
    // - NW: 0° → pivot at south edge → place pivot at south wall position
    // - NE: -90° → pivot at east edge → place pivot at east wall position
    // - SE: 180° → pivot at north edge → place pivot at north wall position
    // - SW: 90° → pivot at west edge → place pivot at west wall position

    // For each corner, place pivot at the appropriate wall face
    // The geometry will extend INTO the room from the pivot
    //
    // CENTER-PIVOT models (freestanding, snapToWall: false): Use halfX/halfZ to account for geometry centered on pivot
    // EDGE-PIVOT models (rectangular baths, snapToWall: true): Pivot is at edge, need custom positioning per corner
    switch (nearestCorner.type) {
        case 'north-west':
            // Center-pivot positioning: geometry centered, add half dimensions to each axis
            constrainedPosition.x = nearestCorner.position.x + halfX + wallBuffer;
            constrainedPosition.z = nearestCorner.position.z + halfZ + wallBuffer;

            // Edge-pivot override for rectangular baths (pivot at south edge)
            if (!isCenterPivot) {
                // - X: center along X from west wall
                // - Z: pivot at north wall, geometry extends south (into room)
                constrainedPosition.x = nearestCorner.position.x + halfWidth + wallBuffer;
                constrainedPosition.z = nearestCorner.position.z + wallBuffer;
            }
            break;
        case 'north-east':
            // Center-pivot positioning
            constrainedPosition.x = nearestCorner.position.x - halfX - wallBuffer;
            constrainedPosition.z = nearestCorner.position.z + halfZ + wallBuffer;

            // Edge-pivot override (pivot at east edge)
            if (!isCenterPivot) {
                // - X: pivot at east wall (geometry extends west)
                // - Z: pivot at north wall + halfWidth (center along Z since rotated)
                constrainedPosition.x = nearestCorner.position.x - wallBuffer;
                constrainedPosition.z = nearestCorner.position.z + halfWidth + wallBuffer;
            }
            break;
        case 'south-east':
            // Center-pivot positioning
            constrainedPosition.x = nearestCorner.position.x - halfX - wallBuffer;
            constrainedPosition.z = nearestCorner.position.z - halfZ - wallBuffer;

            // Edge-pivot override (pivot at north edge)
            if (!isCenterPivot) {
                // - X: pivot at east wall - halfWidth (center along X)
                // - Z: pivot at south wall (geometry extends north from pivot)
                constrainedPosition.x = nearestCorner.position.x - halfWidth - wallBuffer;
                constrainedPosition.z = nearestCorner.position.z - wallBuffer;
            }
            break;
        case 'south-west':
            // Center-pivot positioning
            constrainedPosition.x = nearestCorner.position.x + halfX + wallBuffer;
            constrainedPosition.z = nearestCorner.position.z - halfZ - wallBuffer;

            // Edge-pivot override (pivot at west edge)
            if (!isCenterPivot) {
                // - X: pivot at west wall (geometry extends east)
                // - Z: pivot at south wall - halfWidth (center along Z since rotated)
                constrainedPosition.x = nearestCorner.position.x + wallBuffer;
                constrainedPosition.z = nearestCorner.position.z - halfWidth - wallBuffer;
            }
            break;
        case 'notch-interior':
            // Center-pivot positioning
            constrainedPosition.x = nearestCorner.position.x + halfX + wallBuffer;
            constrainedPosition.z = nearestCorner.position.z + halfZ + wallBuffer;

            // Edge-pivot override (similar to NW)
            if (!isCenterPivot) {
                constrainedPosition.x = nearestCorner.position.x + halfWidth + wallBuffer;
                constrainedPosition.z = nearestCorner.position.z + wallBuffer;
            }
            break;

        case 'notch-east-north':
            // Center-pivot positioning
            constrainedPosition.x = nearestCorner.position.x + halfX + wallBuffer;
            constrainedPosition.z = nearestCorner.position.z + halfZ + wallBuffer;

            // Edge-pivot override (similar to NW)
            if (!isCenterPivot) {
                constrainedPosition.x = nearestCorner.position.x + halfWidth + wallBuffer;
                constrainedPosition.z = nearestCorner.position.z + wallBuffer;
            }
            break;
    }

    // Handle vertical positioning
    if (movementConfig.allowVerticalMovement) {
        const minHeight = movementConfig.minHeight || 0;
        // Handle -1, 0, undefined, null as "unlimited" (use default ceiling height)
        const maxHeight = (movementConfig.maxHeight && movementConfig.maxHeight > 0) ? movementConfig.maxHeight : 250;
        constrainedPosition.y = Math.max(minHeight, Math.min(maxHeight, position.y));
    } else {
        constrainedPosition.y = movementConfig.minHeight || 0;
    }

    return { position: constrainedPosition, rotation };
};

// Function to get dimensions for a specific product
const getProductDimensions = (sku: string, type: ComponentType): {
    width: number;
    depth: number;
    height: number;
    floorOffset: number;
    spawnHeight: number; // Optional spawn height for the product
} | null => {

    if (!type || !productData[type]) {
        return null;
    }

    // Search through all product variants in the category
    for (const product of productData[type]) {
        if (product.variants) {
            for (const variant of product.variants) {
                if (variant.sku === sku && variant.dimensions) {
                    return {
                        width: variant.dimensions.width,
                        depth: variant.dimensions.depth || variant.dimensions.height, // Use height as depth if depth not available
                        height: variant.dimensions.height,
                        floorOffset: variant.floorOffset || 0, // Use floor offset if available
                        spawnHeight: variant.spawnHeight || 0 // Use spawn height if available
                    };
                }
            }
        }
    }

    return null;
};

// Enhanced function to get dimensions with product-specific lookup
export const getDimensions = (
    type: ComponentType,
    sku?: string,
    model?: ObjectModel
): { width: number; depth: number; height: number, floorOffset: number, spawnHeight: number } | null => {

    // Priority 1: Try to get dimensions from model object if available
    if (model?.dimensions) {
        return {
            width: model.dimensions.width,
            depth: model.dimensions.depth || model.dimensions.height,
            height: model.dimensions.height,
            floorOffset: model.floorOffset || 0, // Use model's floor offset if available,
            spawnHeight: model.spawnHeight || 0
        };
    }

    // Priority 2: Try to get dimensions from product data using SKU
    if (sku) {
        const productDims = getProductDimensions(sku, type);
        if (productDims) {
            return productDims;
        }
    }

    return null; // Fallback if no dimensions found
};

export interface WallInfo {
    type: WallType;
    position: Position;
    distance: number;
}

// Helper function to get orientation from product data (if not already available)
const getOrientationFromProductData = (sku?: string, objectType?: ComponentType): OrientationConfig | null => {
    if (!sku || !objectType || !productData[objectType]) {
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
};

/**
 * Wall collision detection for objects in room
 */
export const checkWallCollision = (
    position: Position,
    objectType: ComponentType,
    scale: number,
    roomWidth: number,
    roomHeight: number,
    item?: BathroomItem,
    rotation?: number,
    notchWidth?: number,
    notchHeight?: number
): boolean => {
    const dimensions = getDimensions(objectType, item?.sku, item?.model);
    if (!dimensions) return false;

    const orientationConfig = item?.model?.orientation || getOrientationFromProductData(item?.sku, objectType) || DEFAULT_ORIENTATION;
    const wallBuffer = (orientationConfig?.wallBuffer !== undefined) ? orientationConfig.wallBuffer * scale : 0;

    const { interior, wallFaces, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

    // For wall-snapped objects, determine which wall they're on to account for rotation
    const movementConfig = getMovementConfig(objectType, item);
    let nearestWall: 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south' = 'north';

    if (movementConfig.snapToWall) {
        // Check notch walls FIRST for L-shaped rooms
        if (notch) {
            const tolerance = 30;
            if (Math.abs(position.x - notch.maxX) < tolerance &&
                position.z >= notch.minZ && position.z <= notch.maxZ + tolerance) {
                nearestWall = 'notch-east';
            } else if (Math.abs(position.z - notch.maxZ) < tolerance &&
                position.x >= notch.minX && position.x <= notch.maxX + tolerance) {
                nearestWall = 'notch-south';
            }
        }

        // If not on notch wall, find nearest main wall
        if (nearestWall === 'north') {
            const wallDistances = {
                north: Math.abs(position.z - wallFaces.north),
                south: Math.abs(position.z - wallFaces.south),
                east: Math.abs(position.x - wallFaces.east),
                west: Math.abs(position.x - wallFaces.west)
            };
            nearestWall = Object.entries(wallDistances).reduce((a, b) =>
                wallDistances[a[0]] < wallDistances[b[0]] ? a : b
            )[0] as 'north' | 'south' | 'east' | 'west';
        }
    }

    // Calculate object bounds
    const halfWidth = (dimensions.width * scale) / 2;
    const halfDepth = (dimensions.depth * scale) / 2;
    let objectMinX: number, objectMaxX: number, objectMinZ: number, objectMaxZ: number;

    // For rotated objects, calculate proper bounding box
    if (rotation !== undefined && rotation !== 0) {
        const cosAngle = Math.abs(Math.cos(rotation));
        const sinAngle = Math.abs(Math.sin(rotation));
        const halfRotatedWidth = ((dimensions.width * scale * cosAngle) + (dimensions.depth * scale * sinAngle)) / 2;
        const halfRotatedDepth = ((dimensions.width * scale * sinAngle) + (dimensions.depth * scale * cosAngle)) / 2;

        objectMinX = position.x - halfRotatedWidth;
        objectMaxX = position.x + halfRotatedWidth;
        objectMinZ = position.z - halfRotatedDepth;
        objectMaxZ = position.z + halfRotatedDepth;
    } else if (movementConfig.snapToWall && (nearestWall === 'east' || nearestWall === 'west' || nearestWall === 'notch-east')) {
        // Objects on east/west walls are rotated 90°
        objectMinX = position.x - halfDepth;
        objectMaxX = position.x + halfDepth;
        objectMinZ = position.z - halfWidth;
        objectMaxZ = position.z + halfWidth;
    } else {
        objectMinX = position.x - halfWidth;
        objectMaxX = position.x + halfWidth;
        objectMinZ = position.z - halfDepth;
        objectMaxZ = position.z + halfDepth;
    }

    // Check if object is flush-mounted (embedded in wall)
    const isFlushMounted = wallBuffer === 0;

    // Small tolerance to prevent false collision during drag (floating-point precision)
    const dragTolerance = 2; // 2cm tolerance

    // Check if object extends beyond interior boundaries
    // For flush-mounted items, allow them to extend beyond the wall they're mounted on
    let collideWest = objectMinX < interior.minX - dragTolerance;
    let collideEast = objectMaxX > interior.maxX + dragTolerance;
    let collideNorth = objectMinZ < interior.minZ - dragTolerance;
    let collideSouth = objectMaxZ > interior.maxZ + dragTolerance;

    // Flush-mounted items (windows, doors) are allowed to extend into the wall they're mounted on
    if (isFlushMounted && movementConfig.snapToWall) {
        if (nearestWall === 'north') collideNorth = false;
        if (nearestWall === 'south') collideSouth = false;
        if (nearestWall === 'east') collideEast = false;
        if (nearestWall === 'west') collideWest = false;
    }

    // Check for L-shaped room notch collisions
    if (notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0) {
        const wallThickness = WALL_SETTINGS.THICKNESS;
        const notchMaxX = -(roomWidth / 2) + notchWidth - wallThickness;
        const notchMaxZ = -(roomHeight / 2) + notchHeight - wallThickness;
        const notchMinX = -(roomWidth / 2) + wallThickness;
        const notchMinZ = -(roomHeight / 2) + wallThickness;
        const notchWallTolerance = halfDepth + wallBuffer + 15;
        const dragBuffer = 20;

        const distToNotchEast = Math.abs(position.x - notchMaxX);
        const distToNotchSouth = Math.abs(position.z - notchMaxZ);

        // Check if object is on notch-east wall
        if (distToNotchEast <= notchWallTolerance &&
            position.x >= notchMaxX &&
            position.z >= notchMinZ - dragBuffer && position.z <= interior.maxZ + dragBuffer) {
            return false; // Valid placement on notch wall
        }

        // Check if object is on notch-south wall
        if (distToNotchSouth <= notchWallTolerance &&
            position.z >= notchMaxZ &&
            position.x >= notchMinX - dragBuffer && position.x <= interior.maxX + dragBuffer) {
            return false; // Valid placement on notch wall
        }

        // Check if object is IN the notch area
        const actualHalfWidth = (objectMaxX - objectMinX) / 2;
        const actualHalfDepth = (objectMaxZ - objectMinZ) / 2;

        if (isPositionInNotch(position, actualHalfWidth, actualHalfDepth, roomWidth, roomHeight, notchWidth, notchHeight)) {
            return true; // Block placement in notch area
        }
    }

    // Standard wall collision detection
    const hasWallCollision = collideWest || collideEast || collideNorth || collideSouth;
    return hasWallCollision;
};


// ENHANCED: Collision detection with product-specific dimensions
export const checkCollision = (
    pos1: Position,
    type1: ComponentType,
    scale1: number,
    pos2: Position,
    type2: ComponentType,
    scale2: number,
    item1?: BathroomItem,
    item2?: BathroomItem,
    roomWidth?: number,
    roomHeight?: number,
    notchWidth?: number,
    notchHeight?: number
): boolean => {

    // Get enhanced dimensions including floorOffset
    const dims1 = getDimensions(type1, item1?.sku, item1?.model);
    const dims2 = getDimensions(type2, item2?.sku, item2?.model);

    if (!dims1 || !dims2) {
        console.warn(`Missing dimensions for collision check: ${type1} or ${type2}`);
        return false;
    }

    // ✅ CRITICAL: Calculate actual 3D bounding boxes accounting for floorOffset AND rotation

    // Determine if the object should have its dimensions swapped (rotated 90°)
    // This handles both wall-snapped items and corner-install items
    const shouldSwapDimensions = (pos: Position, item?: BathroomItem): boolean => {
        if (!item) return false;
        const movementConfig = getMovementConfig(item.type, item);

        // For corner-install items, determine rotation based on nearest corner
        if (movementConfig.cornerInstallOnly &&
            typeof movementConfig.cornerInstallOnly === 'object' &&
            movementConfig.cornerInstallOnly.enabled) {
            // Find nearest corner to determine rotation
            const corners = getRoomCorners(roomWidth || 300, roomHeight || 300, notchWidth, notchHeight);
            let nearestCorner: CornerInfo | null = null;
            let minDistance = Infinity;

            for (const corner of corners) {
                const distance = Math.sqrt(
                    Math.pow(pos.x - corner.position.x, 2) +
                    Math.pow(pos.z - corner.position.z, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestCorner = corner;
                }
            }

            // NE and SW corners have 90° rotation, so dimensions should be swapped
            // NW and SE corners have 0° or 180° rotation, so no swap needed
            if (nearestCorner) {
                const cornerType = nearestCorner.type;
                // north-east: -90° (or 270°), south-west: 90° - these need swap
                // north-west: 0°, south-east: 180° - these don't need swap
                // notch-east-north: similar to NW (0°) - no swap
                // notch-interior: similar to NW (0°) - no swap
                const needsSwap = cornerType === 'north-east' ||
                    cornerType === 'south-west';
                return needsSwap;
            }
            return false;
        }

        // For wall-snapped items, use the existing wall-based logic
        if (!movementConfig.snapToWall) return false;

        // Calculate distances to each wall face (using actual room dimensions)
        const roomHalfWidth = roomWidth ? roomWidth / 2 : 300; // Use actual room width or fallback to 300cm
        const roomHalfHeight = roomHeight ? roomHeight / 2 : 300; // Use actual room height or fallback to 300cm
        const wallThickness = WALL_SETTINGS.THICKNESS;

        const northWall = -roomHalfHeight + wallThickness;
        const southWall = roomHalfHeight - wallThickness;
        const eastWall = roomHalfWidth - wallThickness;
        const westWall = -roomHalfWidth + wallThickness;

        // Check for notch walls first (if notch exists)
        if (notchWidth && notchHeight) {
            const notchMaxX = -roomHalfWidth + notchWidth - wallThickness;
            const notchMinZ = -roomHalfHeight + wallThickness;
            const notchMaxZ = -roomHalfHeight + notchHeight - wallThickness;
            const notchMinX = -roomHalfWidth + wallThickness;

            const tolerance = 30; // 30cm tolerance for notch wall detection

            // Check if on notch-east wall (vertical edge of notch) - needs dimension swap (like east/west walls)
            if (Math.abs(pos.x - notchMaxX) < tolerance &&
                pos.z >= notchMinZ &&
                pos.z <= roomHalfHeight - wallThickness) {
                return true; // Notch-east is vertical like east/west walls, needs swap
            }

            // Check if on notch-south wall (horizontal edge of notch) - no swap needed (like north/south walls)
            if (Math.abs(pos.z - notchMaxZ) < tolerance &&
                pos.x >= notchMinX &&
                pos.x <= notchMaxX) {
                return false; // Notch-south is horizontal like north/south walls, no swap
            }
        }

        const distToNorth = Math.abs(pos.z - northWall);
        const distToSouth = Math.abs(pos.z - southWall);
        const distToEast = Math.abs(pos.x - eastWall);
        const distToWest = Math.abs(pos.x - westWall);

        const minDist = Math.min(distToNorth, distToSouth, distToEast, distToWest);
        // East and West walls are rotated 90°, so dimensions should be swapped
        return minDist === distToEast || minDist === distToWest;
    };

    const obj1NeedsSwap = shouldSwapDimensions(pos1, item1);
    const obj2NeedsSwap = shouldSwapDimensions(pos2, item2);

    // Helper function to compute AABB dimensions for a rotated rectangle
    // Returns [aabbWidth, aabbDepth] accounting for any rotation angle
    const getRotatedAABB = (baseWidth: number, baseDepth: number, rotation: number | undefined): [number, number] => {
        if (rotation === undefined || rotation === 0) {
            return [baseWidth, baseDepth];
        }
        // For any rotation, the AABB is:
        // width = |baseWidth * cos(θ)| + |baseDepth * sin(θ)|
        // depth = |baseWidth * sin(θ)| + |baseDepth * cos(θ)|
        const cosR = Math.abs(Math.cos(rotation));
        const sinR = Math.abs(Math.sin(rotation));
        const aabbWidth = baseWidth * cosR + baseDepth * sinR;
        const aabbDepth = baseWidth * sinR + baseDepth * cosR;
        return [aabbWidth, aabbDepth];
    };

    // Object 1 bounding box (scaled dimensions, accounting for rotation)
    const obj1BaseWidth = dims1.width * scale1;
    const obj1BaseDepth = dims1.depth * scale1;
    const obj1Height = dims1.height * scale1;
    const obj1FloorOffset = dims1.floorOffset * scale1;

    // Swap width/depth if object is rotated 90°
    // Calculate AABB dimensions accounting for rotation (wall-snapped OR free-rotation objects)
    let obj1Width: number, obj1Depth: number;
    const obj1Movement = item1 ? getMovementConfig(item1.type, item1) : null;
    const obj1IsFreeRotation = obj1Movement?.allowFreeRotation && !obj1Movement?.snapToWall;

    if (obj1NeedsSwap) {
        // Object is on east/west/notch-east wall - dimensions are swapped
        obj1Width = obj1BaseDepth; // Rotated: depth becomes width
        obj1Depth = obj1BaseWidth; // Rotated: width becomes depth
    } else if (obj1IsFreeRotation && item1?.rotation !== undefined && item1.rotation !== 0) {
        // Free-rotation object with any rotation - compute proper AABB
        [obj1Width, obj1Depth] = getRotatedAABB(obj1BaseWidth, obj1BaseDepth, item1.rotation);
    } else {
        obj1Width = obj1BaseWidth;
        obj1Depth = obj1BaseDepth;
    }

    // Object 2 bounding box (scaled dimensions, accounting for rotation)
    const obj2BaseWidth = dims2.width * scale2;
    const obj2BaseDepth = dims2.depth * scale2;
    const obj2Height = dims2.height * scale2;
    const obj2FloorOffset = dims2.floorOffset * scale2;

    // Swap width/depth if object is rotated 90°
    // Calculate AABB dimensions accounting for rotation (wall-snapped OR free-rotation objects)
    let obj2Width: number, obj2Depth: number;
    const obj2Movement = item2 ? getMovementConfig(item2.type, item2) : null;
    const obj2IsFreeRotation = obj2Movement?.allowFreeRotation && !obj2Movement?.snapToWall;

    if (obj2NeedsSwap) {
        // Object is on east/west/notch-east wall - dimensions are swapped
        obj2Width = obj2BaseDepth; // Rotated: depth becomes width
        obj2Depth = obj2BaseWidth; // Rotated: width becomes depth
    } else if (obj2IsFreeRotation && item2?.rotation !== undefined && item2.rotation !== 0) {
        // Free-rotation object with any rotation - compute proper AABB
        [obj2Width, obj2Depth] = getRotatedAABB(obj2BaseWidth, obj2BaseDepth, item2.rotation);
    } else {
        obj2Width = obj2BaseWidth;
        obj2Depth = obj2BaseDepth;
    }

    // ✅ CRITICAL: Calculate actual 3D positions accounting for floorOffset
    const obj1ActualY = pos1.y + obj1FloorOffset;
    const obj2ActualY = pos2.y + obj2FloorOffset;

    // ✅ FIX: Adjust position for wall-mounted items
    // When items are placed via templates, position is at wall face, not center
    // We need to offset to get the true center position for collision detection
    const getAdjustedCenterPosition = (
        pos: Position,
        item: BathroomItem | undefined,
        halfWidth: number,
        halfDepth: number,
        needsSwap: boolean
    ): Position => {
        if (!item) return pos;

        const movementConfig = getMovementConfig(item.type, item);

        // Only adjust for wall-snapped items (not free-standing)
        if (!movementConfig.snapToWall) return pos;

        // Calculate wall distances to determine which wall the item is on
        const rw = roomWidth || 300;
        const rh = roomHeight || 300;
        const wallThickness = WALL_SETTINGS.THICKNESS;

        const northWall = -rh / 2 + wallThickness;
        const southWall = rh / 2 - wallThickness;
        const eastWall = rw / 2 - wallThickness;
        const westWall = -rw / 2 + wallThickness;

        const distToNorth = Math.abs(pos.z - northWall);
        const distToSouth = Math.abs(pos.z - southWall);
        const distToEast = Math.abs(pos.x - eastWall);
        const distToWest = Math.abs(pos.x - westWall);

        const minDist = Math.min(distToNorth, distToSouth, distToEast, distToWest);
        const wallTolerance = 10; // 10cm tolerance for wall detection

        // Only adjust if item is very close to a wall (within tolerance)
        if (minDist > wallTolerance) return pos;

        // For corner-install items, check if actually in a corner
        // If in a corner (close to two walls), skip adjustment as position is at corner intersection
        if (movementConfig.cornerInstallOnly &&
            typeof movementConfig.cornerInstallOnly === 'object' &&
            movementConfig.cornerInstallOnly.enabled) {
            // Check if item is near two walls (in a corner)
            const closeToNorthOrSouth = distToNorth <= wallTolerance || distToSouth <= wallTolerance;
            const closeToEastOrWest = distToEast <= wallTolerance || distToWest <= wallTolerance;
            if (closeToNorthOrSouth && closeToEastOrWest) {
                // Item is in a corner - position is at corner, extends diagonally into room
                // Skip adjustment for true corner placements
                return pos;
            }
            // Item has cornerInstallOnly config but is placed on a wall (not corner)
            // Continue with wall adjustment
        }

        const adjustedPos = { ...pos };

        // Use depth after potential swap for wall-perpendicular dimension
        const effectiveHalfDepth = needsSwap ? halfWidth : halfDepth;

        if (minDist === distToNorth && distToNorth <= wallTolerance) {
            // On north wall - item extends in +z direction
            adjustedPos.z = pos.z + effectiveHalfDepth;
        } else if (minDist === distToSouth && distToSouth <= wallTolerance) {
            // On south wall - item extends in -z direction
            adjustedPos.z = pos.z - effectiveHalfDepth;
        } else if (minDist === distToEast && distToEast <= wallTolerance) {
            // On east wall - item extends in -x direction
            adjustedPos.x = pos.x - effectiveHalfDepth;
        } else if (minDist === distToWest && distToWest <= wallTolerance) {
            // On west wall - item extends in +x direction
            adjustedPos.x = pos.x + effectiveHalfDepth;
        }

        return adjustedPos;
    };

    // Get adjusted center positions for wall-mounted items
    const obj1AdjustedPos = getAdjustedCenterPosition(pos1, item1, obj1Width / 2, obj1Depth / 2, obj1NeedsSwap);
    const obj2AdjustedPos = getAdjustedCenterPosition(pos2, item2, obj2Width / 2, obj2Depth / 2, obj2NeedsSwap);

    // ✅ CRITICAL: Calculate bounding box boundaries in 3D space
    const obj1MinY = obj1ActualY;
    const obj1MaxY = obj1ActualY + obj1Height;
    const obj2MinY = obj2ActualY;
    const obj2MaxY = obj2ActualY + obj2Height;

    // Horizontal bounding boxes (now accounting for rotation and wall-mounted position adjustment)
    const obj1MinX = obj1AdjustedPos.x - obj1Width / 2;
    const obj1MaxX = obj1AdjustedPos.x + obj1Width / 2;
    const obj2MinX = obj2AdjustedPos.x - obj2Width / 2;
    const obj2MaxX = obj2AdjustedPos.x + obj2Width / 2;

    const obj1MinZ = obj1AdjustedPos.z - obj1Depth / 2;
    const obj1MaxZ = obj1AdjustedPos.z + obj1Depth / 2;
    const obj2MinZ = obj2AdjustedPos.z - obj2Depth / 2;
    const obj2MaxZ = obj2AdjustedPos.z + obj2Depth / 2;

    // Add collision buffers - expand each object's bounding box
    const horizontalBuffer = 2; // 2cm horizontal buffer (4cm total gap when near)
    const verticalBuffer = 2;   // 2cm vertical buffer (4cm total gap when stacked)

    // ✅ FIXED: Expand bounding boxes by buffer amount before checking overlap
    const obj1MinXWithBuffer = obj1MinX - horizontalBuffer;
    const obj1MaxXWithBuffer = obj1MaxX + horizontalBuffer;
    const obj1MinZWithBuffer = obj1MinZ - horizontalBuffer;
    const obj1MaxZWithBuffer = obj1MaxZ + horizontalBuffer;
    const obj1MinYWithBuffer = obj1MinY - verticalBuffer;
    const obj1MaxYWithBuffer = obj1MaxY + verticalBuffer;

    const obj2MinXWithBuffer = obj2MinX - horizontalBuffer;
    const obj2MaxXWithBuffer = obj2MaxX + horizontalBuffer;
    const obj2MinZWithBuffer = obj2MinZ - horizontalBuffer;
    const obj2MaxZWithBuffer = obj2MaxZ + horizontalBuffer;
    const obj2MinYWithBuffer = obj2MinY - verticalBuffer;
    const obj2MaxYWithBuffer = obj2MaxY + verticalBuffer;

    // ✅ CRITICAL: Proper 3D bounding box overlap detection with buffers
    const overlapX = !(obj1MaxXWithBuffer < obj2MinXWithBuffer || obj2MaxXWithBuffer < obj1MinXWithBuffer);
    const overlapZ = !(obj1MaxZWithBuffer < obj2MinZWithBuffer || obj2MaxZWithBuffer < obj1MinZWithBuffer);
    const overlapY = !(obj1MaxYWithBuffer < obj2MinYWithBuffer || obj2MaxYWithBuffer < obj1MinYWithBuffer);

    const hasCollision = overlapX && overlapZ && overlapY;

    // ✅ ENHANCED: Detailed logging for debugging
    if (hasCollision) {
    } else {
        // ✅ Debug log for successful non-collisions (helps verify the fix)
        const verticalGap = Math.max(obj1MinY - obj2MaxY, obj2MinY - obj1MaxY);
        if (overlapX && overlapZ && verticalGap < 50) { // Log near-misses within 50cm
        }
    }

    return hasCollision;
};

/**
 * NEW: Get interior room boundaries for the new wall system
 */
export const getInteriorBoundaries = (
    roomWidth: number,
    roomHeight: number,
    notchWidth?: number,
    notchHeight?: number
) => {
    const wallThickness = WALL_SETTINGS.THICKNESS;

    return {
        // Interior usable space (where objects can be placed)
        interior: {
            width: roomWidth - (wallThickness * 2),
            height: roomHeight - (wallThickness * 2),
            minX: -(roomWidth / 2) + wallThickness,
            maxX: (roomWidth / 2) - wallThickness,
            minZ: -(roomHeight / 2) + wallThickness,
            maxZ: (roomHeight / 2) - wallThickness
        },
        // Wall inner face positions (for wall-mounted objects)
        wallFaces: {
            north: -(roomHeight / 2) + wallThickness,
            south: (roomHeight / 2) - wallThickness,
            east: (roomWidth / 2) - wallThickness,
            west: -(roomWidth / 2) + wallThickness
        },
        // L-shape notch info (if applicable)
        notch: notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0 ? {
            width: notchWidth,
            height: notchHeight,
            minX: -(roomWidth / 2) + wallThickness,
            maxX: -(roomWidth / 2) + notchWidth - wallThickness,
            minZ: -(roomHeight / 2) + wallThickness,
            maxZ: -(roomHeight / 2) + notchHeight - wallThickness
        } : null
    };
};

/**
 * Check if a position (with object dimensions) is in the L-shaped notch area
 * Returns true if ANY part of the object would be in the notch
 */
export const isPositionInNotch = (
    position: Position,
    objectHalfWidth: number,
    objectHalfDepth: number,
    roomWidth: number,
    roomHeight: number,
    notchWidth?: number,
    notchHeight?: number
): boolean => {
    // If no notch dimensions, this is not an L-shaped room
    if (!notchWidth || !notchHeight || notchWidth <= 0 || notchHeight <= 0) {
        return false;
    }

    const wallThickness = WALL_SETTINGS.THICKNESS;
    // Tolerance buffer - only block if object is significantly inside the notch
    const notchTolerance = 5; // 5cm tolerance to avoid false positives at boundary

    // Notch boundaries (top-left corner) - shrink by tolerance for less strict checking
    const notchMinX = -(roomWidth / 2) + wallThickness + notchTolerance;
    const notchMaxX = -(roomWidth / 2) + notchWidth - wallThickness - notchTolerance;
    const notchMinZ = -(roomHeight / 2) + wallThickness + notchTolerance;
    const notchMaxZ = -(roomHeight / 2) + notchHeight - wallThickness - notchTolerance;

    // Object boundaries
    const objMinX = position.x - objectHalfWidth;
    const objMaxX = position.x + objectHalfWidth;
    const objMinZ = position.z - objectHalfDepth;
    const objMaxZ = position.z + objectHalfDepth;

    // Check if object overlaps with notch area (with tolerance applied)
    const xOverlap = objMaxX > notchMinX && objMinX < notchMaxX;
    const zOverlap = objMaxZ > notchMinZ && objMinZ < notchMaxZ;

    const isInNotch = xOverlap && zOverlap;

    // 🔍 DEBUG: Log detailed notch check

    return isInNotch;
};

// ENHANCED: Check if a position would cause collision with existing objects
export const wouldCollideWithExisting = (
    position: Position,
    objectType: ComponentType,
    scale: number,
    objectId: number,
    existingItems: BathroomItem[],
    currentItem?: BathroomItem, // Optional: the item being moved/placed
    roomWidth?: number,
    roomHeight?: number,
    notchWidth?: number,
    notchHeight?: number
): boolean => {
    for (const item of existingItems) {
        if (item.id === objectId) {
            continue;
        }

        const itemPosition = { x: item.position[0], y: item.position[1], z: item.position[2] };
        const itemScale = item.scale || 1.0;

        // Use enhanced collision detection with full item data, room dimensions, and notch dimensions
        const hasCollision = checkCollision(
            position,
            objectType,
            scale,
            itemPosition,
            item.type,
            itemScale,
            currentItem,
            item,
            roomWidth,
            roomHeight,
            notchWidth,
            notchHeight
        );

        if (hasCollision) {
            return true;
        }
    }

    return false;
};

/**
 * Clean room constraint using ONLY productData.ts values
 * Updated to handle L-shaped rooms with notch areas
 */
export const constrainToRoom = (
    position: Position,
    roomWidth: number,
    roomHeight: number,
    {
        type: objectType,
        scale = 1.0,
        orientation = DEFAULT_ORIENTATION,
        item,
        notchWidth,
        notchHeight
    }: {
        type: ComponentType | null;
        scale?: number;
        orientation?: OrientationConfig;
        item?: BathroomItem;
        notchWidth?: number;
        notchHeight?: number;
    }
): { position: Position; rotation: number } => {

    if (!objectType) return { position, rotation: 0 };

    console.warn(`orientation`, orientation);

    const dimensions = getDimensions(objectType, item?.sku, item?.model);
    if (!dimensions) {
        console.warn(`No dimensions found for ${objectType}, using fallback`);
        return { position, rotation: 0 };
    }

    const movementConfig = getMovementConfig(objectType, item);
    const { interior } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

    // Use actual product dimensions
    const halfWidth = (dimensions.width * scale) / 2;
    const halfDepth = (dimensions.depth * scale) / 2;

    // Calculate initial constrained position within main room boundaries
    let constrainedX = Math.max(interior.minX + halfWidth, Math.min(interior.maxX - halfWidth, position.x));
    let constrainedZ = Math.max(interior.minZ + halfDepth, Math.min(interior.maxZ - halfDepth, position.z));

    // ✅ UPDATED: For L-shaped rooms, push object out of notch area if it overlaps
    if (notchWidth && notchHeight && notchWidth > 0 && notchHeight > 0) {
        const wallThickness = WALL_SETTINGS.THICKNESS;
        const notchMaxX = -(roomWidth / 2) + notchWidth - wallThickness;
        const notchMaxZ = -(roomHeight / 2) + notchHeight - wallThickness;
        const notchMinX = -(roomWidth / 2) + wallThickness;
        const notchMinZ = -(roomHeight / 2) + wallThickness;

        // Object boundaries at current constrained position
        const objMinX = constrainedX - halfWidth;
        const objMaxX = constrainedX + halfWidth;
        const objMinZ = constrainedZ - halfDepth;
        const objMaxZ = constrainedZ + halfDepth;

        // Check if object overlaps with notch area
        const xOverlap = objMaxX > notchMinX && objMinX < notchMaxX;
        const zOverlap = objMaxZ > notchMinZ && objMinZ < notchMaxZ;

        if (xOverlap && zOverlap) {
            // Object is in the notch area - push it out to nearest valid position
            const pushEast = notchMaxX + halfWidth - constrainedX;
            const pushSouth = notchMaxZ + halfDepth - constrainedZ;

            if (pushEast <= pushSouth) {
                constrainedX = notchMaxX + halfWidth;
                // Clamp to room bounds after push
                constrainedX = Math.max(interior.minX + halfWidth, Math.min(interior.maxX - halfWidth, constrainedX));
            } else {
                constrainedZ = notchMaxZ + halfDepth;
                // Clamp to room bounds after push
                constrainedZ = Math.max(interior.minZ + halfDepth, Math.min(interior.maxZ - halfDepth, constrainedZ));
            }
        }
    }

    let constrainedPosition = {
        x: constrainedX,
        y: Math.max(0, position.y),
        z: constrainedZ
    };

    // Handle vertical movement
    if (movementConfig) {
        if (!movementConfig.allowVerticalMovement) {
            constrainedPosition.y = 0; // Keep on floor
        } else {
            const minHeight = movementConfig.minHeight || 0;
            const maxHeight = movementConfig.maxHeight || 250;
            constrainedPosition.y = Math.max(minHeight, Math.min(maxHeight, position.y));
        }
    }

    return { position: constrainedPosition, rotation: 0 };
};

/**
 * ✅ FIXED: Clean wall constraint for flush-mounted objects
 * ✅ UPDATED: Now supports L-shaped room notch walls
 */
export const constrainToWalls = (
    position: Position,
    roomWidth: number,
    roomHeight: number,
    {
        type: objectType,
        scale = 1.0,
        orientation = DEFAULT_ORIENTATION,
        item,
        notchWidth,
        notchHeight
    }: {
        type: ComponentType | null;
        scale?: number;
        orientation?: OrientationConfig;
        item?: BathroomItem;
        notchWidth?: number;
        notchHeight?: number;
    },
    targetWall?: WallType // ✅ NEW: Optional target wall to force snap to
): { position: Position; rotation: number } => {

    if (!objectType) return { position, rotation: 0 };

    const dimensions = getDimensions(objectType, item?.sku, item?.model);
    if (!dimensions) {
        console.warn(`No dimensions found for ${objectType}, using fallback`);
        return { position, rotation: 0 };
    }

    const movementConfig = getMovementConfig(objectType, item);

    // Check if this is a corner-only item
    if (movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled) {
        return constrainToCorner(position, roomWidth, roomHeight, {
            type: objectType,
            scale,
            orientation,
            item,
            notchWidth,
            notchHeight
        });
    }

    const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

    // Use actual product dimensions
    const halfWidth = (dimensions.width * scale) / 2;
    const halfDepth = (dimensions.depth * scale) / 2;

    // Use wallBuffer from productData orientation config, or 0 if not specified
    const wallBuffer = (orientation?.wallBuffer !== undefined) ? orientation.wallBuffer * scale : 0;
    const isFlushMounted = wallBuffer === 0;

    // ✅ NEW: Calculate distances to all walls including notch walls
    const wallDistances: Record<string, number> = {
        north: Math.abs(position.z - wallFaces.north),
        south: Math.abs(position.z - wallFaces.south),
        east: Math.abs(position.x - wallFaces.east),
        west: Math.abs(position.x - wallFaces.west)
    };

    // ✅ NEW: Add notch walls if this is an L-shaped room
    if (notch) {
        wallDistances['notch-east'] = Math.abs(position.x - notch.maxX);
        wallDistances['notch-south'] = Math.abs(position.z - notch.maxZ);
    }

    // Validate targetWall - if it refers to a notch wall that no longer exists, ignore it
    let validTargetWall = targetWall;
    if (targetWall === 'notch-east' && !notch) validTargetWall = undefined;
    if (targetWall === 'notch-south' && !notch) validTargetWall = undefined;

    // ✅ NEW: Implement stickiness logic within constrainToWalls
    const STICKINESS_THRESHOLD = 40; // 40cm stickiness
    let nearestWall: 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';

    if (validTargetWall && wallDistances[validTargetWall] !== undefined) {
        // Find the absolute closest wall
        const absoluteClosest = Object.entries(wallDistances).reduce((a, b) =>
            wallDistances[a[0]] < wallDistances[b[0]] ? a : b
        )[0] as 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';

        // Prefer targetWall if it's within the stickiness threshold of the absolute closest
        if (wallDistances[validTargetWall] < wallDistances[absoluteClosest] + STICKINESS_THRESHOLD) {
            nearestWall = validTargetWall as any;
        } else {
            nearestWall = absoluteClosest;
        }
    } else {
        // Standard nearest wall calculation
        nearestWall = Object.entries(wallDistances).reduce((a, b) =>
            wallDistances[a[0]] < wallDistances[b[0]] ? a : b
        )[0] as 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';
    }

    let constrainedPosition = { ...position }; // ✅ Start with original position
    let wallRotation = 0;

    // ✅ FIXED: Only constrain the coordinate affected by the specific wall
    switch (nearestWall) {
        case 'north':
            // ✅ Only modify Z coordinate for north wall
            if (isFlushMounted) {
                constrainedPosition.z = wallFaces.north;
            } else {
                constrainedPosition.z = wallFaces.north + halfDepth + wallBuffer;
            }

            // ✅ CRITICAL FIX: Only constrain X if object would actually extend beyond room bounds
            // AND respect notch boundaries if present
            const northMinX = notch ? notch.maxX : interior.minX;

            const wouldExtendWest = position.x - halfWidth < northMinX;
            const wouldExtendEast = position.x + halfWidth > interior.maxX;

            if (wouldExtendWest || wouldExtendEast) {
                constrainedPosition.x = Math.max(
                    northMinX + halfWidth,
                    Math.min(interior.maxX - halfWidth, position.x)
                );
            } else {
                // ✅ PRESERVE original X coordinate
                constrainedPosition.x = position.x;
            }

            wallRotation = getObjectRotationForWall(objectType, 'north', orientation);
            break;

        case 'south':
            // ✅ Only modify Z coordinate for south wall
            if (isFlushMounted) {
                constrainedPosition.z = wallFaces.south;
            } else {
                constrainedPosition.z = wallFaces.south - halfDepth - wallBuffer;
            }

            // ✅ Only constrain X if object would actually extend beyond room bounds
            const wouldExtendWestSouth = position.x - halfWidth < interior.minX;
            const wouldExtendEastSouth = position.x + halfWidth > interior.maxX;

            if (wouldExtendWestSouth || wouldExtendEastSouth) {
                constrainedPosition.x = Math.max(
                    interior.minX + halfWidth,
                    Math.min(interior.maxX - halfWidth, position.x)
                );
            } else {
                constrainedPosition.x = position.x;
            }

            wallRotation = getObjectRotationForWall(objectType, 'south', orientation);
            break;

        case 'east':
            // ✅ Only modify X coordinate for east wall
            if (isFlushMounted) {
                constrainedPosition.x = wallFaces.east;
            } else {
                constrainedPosition.x = wallFaces.east - halfDepth - wallBuffer;
            }

            // ✅ Only constrain Z if object would actually extend beyond room bounds
            const wouldExtendNorth = position.z - halfWidth < interior.minZ;
            const wouldExtendSouth = position.z + halfWidth > interior.maxZ;

            if (wouldExtendNorth || wouldExtendSouth) {
                constrainedPosition.z = Math.max(
                    interior.minZ + halfWidth,
                    Math.min(interior.maxZ - halfWidth, position.z)
                );
            } else {
                constrainedPosition.z = position.z;
            }

            wallRotation = getObjectRotationForWall(objectType, 'east', orientation);
            break;

        case 'west':
            // ✅ Only modify X coordinate for west wall
            if (isFlushMounted) {
                constrainedPosition.x = wallFaces.west;
            } else {
                constrainedPosition.x = wallFaces.west + halfDepth + wallBuffer;
            }

            // ✅ Only constrain Z if object would actually extend beyond room bounds
            // AND respect notch boundaries if present
            const westMinZ = notch ? notch.maxZ : interior.minZ;

            const wouldExtendNorthWest = position.z - halfWidth < westMinZ;
            const wouldExtendSouthWest = position.z + halfWidth > interior.maxZ;

            if (wouldExtendNorthWest || wouldExtendSouthWest) {
                constrainedPosition.z = Math.max(
                    westMinZ + halfWidth,
                    Math.min(interior.maxZ - halfWidth, position.z)
                );
            } else {
                constrainedPosition.z = position.z;
            }

            wallRotation = getObjectRotationForWall(objectType, 'west', orientation);
            break;

        // ✅ NEW: Handle notch-east wall (vertical edge of L-shape notch)
        case 'notch-east':
            if (!notch) break; // Safety check

            // Treat like west wall (faces east) - snap X coordinate to notch edge
            if (isFlushMounted) {
                constrainedPosition.x = notch.maxX;
            } else {
                constrainedPosition.x = notch.maxX + halfDepth + wallBuffer;  // Faces east, so object is to the east (+)
            }

            // ✅ Allow Z to slide freely along the notch wall within valid range
            // Only constrain if object would extend beyond room bounds OR notch bounds
            const wouldExtendNotchNorth = position.z - halfWidth < notch.minZ;
            const wouldExtendNotchSouth = position.z + halfWidth > notch.maxZ; // Corrected from interior.maxZ

            if (wouldExtendNotchNorth || wouldExtendNotchSouth) {
                constrainedPosition.z = Math.max(
                    notch.minZ + halfWidth,
                    Math.min(notch.maxZ - halfWidth, position.z) // Corrected from interior.maxZ
                );
            } else {
                constrainedPosition.z = position.z;
            }

            wallRotation = getObjectRotationForWall(objectType, 'west', orientation);
            break;

        // ✅ NEW: Handle notch-south wall (horizontal edge of L-shape notch)
        case 'notch-south':
            if (!notch) break; // Safety check

            // Treat like north wall (faces south) - snap Z coordinate to notch edge
            if (isFlushMounted) {
                constrainedPosition.z = notch.maxZ;
            } else {
                constrainedPosition.z = notch.maxZ + halfDepth + wallBuffer;  // Faces south, so object is to the south (+)
            }

            // ✅ Allow X to slide freely along the notch wall within valid range
            // Only constrain if object would extend beyond room bounds OR notch bounds
            const wouldExtendNotchWest = position.x - halfWidth < notch.minX;
            const wouldExtendNotchEast = position.x + halfWidth > notch.maxX; // Corrected from interior.maxX

            if (wouldExtendNotchWest || wouldExtendNotchEast) {
                constrainedPosition.x = Math.max(
                    notch.minX + halfWidth,
                    Math.min(notch.maxX - halfWidth, position.x) // Corrected from interior.maxX
                );
            } else {
                constrainedPosition.x = position.x;
            }

            wallRotation = getObjectRotationForWall(objectType, 'north', orientation);
            break;
    }

    // Handle vertical positioning
    if (movementConfig.allowVerticalMovement) {
        const minHeight = movementConfig.minHeight || 0;
        // Handle -1, 0, undefined, null as "unlimited" (use default ceiling height)
        const maxHeight = (movementConfig.maxHeight && movementConfig.maxHeight > 0) ? movementConfig.maxHeight : 250;
        constrainedPosition.y = Math.max(minHeight, Math.min(maxHeight, position.y));
    } else {
        constrainedPosition.y = movementConfig.minHeight || 0;
    }

    return { position: constrainedPosition, rotation: wallRotation };
};


// Snap position to the nearest wall (same as constrainToWalls)
export const snapToNearestWall = (
    position: Position,
    roomWidth: number,
    roomHeight: number,
    orientationDetails: {
        type: ComponentType | null;
        scale?: number;
        orientation?: OrientationConfig;
        item?: BathroomItem;
        notchWidth?: number;
        notchHeight?: number;
    }
): { position: Position; rotation: number } => {
    return constrainToWalls(position, roomWidth, roomHeight, orientationDetails);
};

/**
 * UPDATED: Find free wall position using interior wall system
 */
export const findFreeWallPosition = (
    roomWidth: number,
    roomHeight: number,
    objectType: ComponentType,
    scale: number = 1.0,
    existingItems: BathroomItem[] = [],
    maxAttempts: number = 50,
    orientation: OrientationConfig = DEFAULT_ORIENTATION,
    movement?: MovementConfig,
    spawnHeight?: number,
    _floorOffset?: number,
    sku?: string,
    notchWidth?: number,
    notchHeight?: number
): { position: Position; rotation: number } | null => {

    const movementConfig = movement ?? getMovementConfig(objectType);

    // For corner-only items, find a free corner
    if (movementConfig.cornerInstallOnly && movementConfig.cornerInstallOnly.enabled) {
        const cornerResult = findFreeCornerPosition(
            roomWidth,
            roomHeight,
            objectType,
            scale,
            existingItems,
            orientation,
            movementConfig,
            sku,
            notchWidth,
            notchHeight
        );

        // Return null if no free corner is available
        if (!cornerResult) {
            console.warn('⚠️ Cannot add corner item - all corners are occupied');
            return null;
        }

        return cornerResult;
    }

    if (!movementConfig.snapToWall) {
        return findFreeStandingPosition(roomWidth, roomHeight, objectType, scale, existingItems, maxAttempts, movementConfig, sku, notchWidth, notchHeight);
    }

    const dimensions = getDimensions(objectType, sku);

    // ✅ FIX: Add fallback dimensions to prevent placement outside room boundaries
    // If dimensions are not available, use a safe minimum size (30cm x 30cm)
    const DEFAULT_MIN_SIZE = 30; // 30cm minimum size

    if (!dimensions || !dimensions.width || !dimensions.depth) {
        console.warn(`⚠️ No dimensions found for ${objectType} (SKU: ${sku}). Using fallback size of ${DEFAULT_MIN_SIZE}cm to prevent boundary issues.`);
    }

    const halfWidth = dimensions && dimensions.width ? dimensions.width / 2 : DEFAULT_MIN_SIZE / 2;
    const halfDepth = dimensions && dimensions.depth ? dimensions.depth / 2 : DEFAULT_MIN_SIZE / 2;

    const buffer = getObjectWallBuffer({ orientation, scale });
    const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

    // ✅ FIX: Check if object is flush-mounted BEFORE creating walls
    const wallBuffer = (orientation?.wallBuffer !== undefined) ? orientation.wallBuffer * scale : 0;
    const isFlushMounted = wallBuffer === 0;

    // Define walls with proper interior positioning
    const walls = [
        {
            name: 'north',
            getPosition: (t: number) => {
                // Calculate position along wall
                const minX = interior.minX + halfWidth;  // Don't go past west corner
                const maxX = interior.maxX - halfWidth;  // Don't go past east corner
                return {
                    x: minX + t * (maxX - minX),
                    y: getWallPositionY(movementConfig, spawnHeight),
                    // ✅ FIX: Flush-mounted objects go directly at wall
                    z: isFlushMounted ? wallFaces.north : wallFaces.north + halfDepth + wallBuffer
                }
            },
            rotation: getObjectRotationForWall(objectType, 'north', orientation)
        },
        {
            name: 'south',
            getPosition: (t: number) => {
                const minX = interior.minX + halfWidth;
                const maxX = interior.maxX - halfWidth;
                return {
                    x: minX + t * (maxX - minX),
                    y: getWallPositionY(movementConfig, spawnHeight),
                    // ✅ FIX: Flush-mounted objects go directly at wall
                    z: isFlushMounted ? wallFaces.south : wallFaces.south - halfDepth - wallBuffer
                };
            },
            rotation: getObjectRotationForWall(objectType, 'south', orientation)
        },
        {
            name: 'east',
            getPosition: (t: number) => {
                const minZ = interior.minZ + halfWidth;  // Don't go past north corner
                const maxZ = interior.maxZ - halfWidth;  // Don't go past south corner
                return {
                    // ✅ FIX: Flush-mounted objects go directly at wall
                    x: isFlushMounted ? wallFaces.east : wallFaces.east - halfDepth - wallBuffer,
                    y: getWallPositionY(movementConfig, spawnHeight),
                    z: minZ + t * (maxZ - minZ)
                };
            },
            rotation: getObjectRotationForWall(objectType, 'east', orientation)
        },
        {
            name: 'west',
            getPosition: (t: number) => {
                const minZ = interior.minZ + halfWidth;
                const maxZ = interior.maxZ - halfWidth;
                return {
                    // ✅ FIX: Flush-mounted objects go directly at wall
                    x: isFlushMounted ? wallFaces.west : wallFaces.west + halfDepth + wallBuffer,
                    y: getWallPositionY(movementConfig, spawnHeight),
                    z: minZ + t * (maxZ - minZ)
                };
            },
            rotation: getObjectRotationForWall(objectType, 'west', orientation)
        }
    ];

    // ✅ Add notch walls for L-shaped rooms if object fits
    if (notch && dimensions) {
        const objectWidth = dimensions.width * scale;

        // Calculate notch wall lengths
        const notchEastWallLength = notch.maxZ - notch.minZ;
        const notchSouthWallLength = notch.maxX - notch.minX;

        // Add notch-east wall if object fits
        if (objectWidth <= notchEastWallLength) {
            walls.push({
                name: 'notch-east',
                getPosition: (t: number) => {
                    const minZ = notch.minZ + halfWidth;
                    const maxZ = notch.maxZ - halfWidth;
                    return {
                        x: notch.maxX - halfDepth - buffer,  // Match constrainToWalls pattern (same as regular east wall)
                        y: getWallPositionY(movementConfig, spawnHeight),
                        z: minZ + t * (maxZ - minZ)
                    };
                },
                rotation: getObjectRotationForWall(objectType, 'east', orientation)
            });
        } else {
        }

        // Add notch-south wall if object fits
        if (objectWidth <= notchSouthWallLength) {
            walls.push({
                name: 'notch-south',
                getPosition: (t: number) => {
                    const minX = notch.minX + halfWidth;
                    const maxX = notch.maxX - halfWidth;
                    return {
                        x: minX + t * (maxX - minX),
                        y: getWallPositionY(movementConfig, spawnHeight),
                        z: notch.maxZ - halfDepth - buffer  // Match constrainToWalls pattern (same as regular south wall)
                    };
                },
                rotation: getObjectRotationForWall(objectType, 'south', orientation)
            });
        } else {
        }
    }

    // Try to find a free position
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Pick a random wall
        const wall = walls[Math.floor(Math.random() * walls.length)];

        // Pick a random position along the wall (t from 0 to 1)
        const t = Math.random();
        const position = wall.getPosition(t);

        // ✅ FIX: Create temporary item for proper collision detection
        const tempItem: BathroomItem = {
            id: -1,
            type: objectType,
            position: [position.x, position.y, position.z] as [number, number, number],
            scale: scale,
            sku: sku
        };

        // ✅ FIX: First check if position is valid (not in notch area or outside room boundaries)
        const hasWallCollision = checkWallCollision(
            position,
            objectType,
            scale,
            roomWidth,
            roomHeight,
            tempItem,
            undefined, // rotation not needed for wall-snapped items
            notchWidth,
            notchHeight
        );

        if (hasWallCollision) {
            // Position is in notch area or outside boundaries, try another position
            continue;
        }

        // ✅ Then check collision with existing items
        let hasCollision = false;
        for (const item of existingItems) {
            const findCollision = checkCollision(
                position,
                objectType,
                scale,
                { x: item.position[0], y: item.position[1], z: item.position[2] },
                item.type,
                item.scale || 1.0,
                tempItem,
                item,
                roomWidth,
                roomHeight,
                notchWidth,
                notchHeight
            );
            if (findCollision) {
                hasCollision = true;
                break;
            }
        }

        if (!hasCollision) {
            return { position, rotation: wall.rotation };
        }
    }

    // ✅ FIXED: No free position found - return null instead of forcing placement
    console.warn(`⚠️ Cannot find free wall position for ${objectType} - all positions are occupied`);
    return null;
};

// New function for finding free corner positions
export const findFreeCornerPosition = (
    roomWidth: number,
    roomHeight: number,
    objectType: ComponentType,
    scale: number = 1.0,
    existingItems: BathroomItem[] = [],
    orientation: OrientationConfig = DEFAULT_ORIENTATION,
    movement?: MovementConfig,
    sku?: string,
    notchWidth?: number,
    notchHeight?: number
): { position: Position; rotation: number } | null => {

    const corners = getRoomCorners(roomWidth, roomHeight, notchWidth, notchHeight);

    const dimensions = getDimensions(objectType, sku);

    if (!dimensions || dimensions.width === 0 || dimensions.depth === 0) {
        console.warn(`No dimensions found for ${objectType} (SKU: ${sku}) in findFreeCornerPosition`);
        // Return null if no dimensions found
        return null;
    }

    // Check for preferred corner from movement config
    const preferredCorner = movement?.cornerInstallOnly &&
        typeof movement.cornerInstallOnly === 'object' ?
        movement.cornerInstallOnly.preferredCorner : undefined;

    // Reorder corners: preferred corner first, north-east second, then others
    let cornersToTry = corners;
    if (preferredCorner) {
        const preferredCornerObj = corners.find(c => c.type === preferredCorner);
        const northEastCorner = corners.find(c => c.type === 'north-east');

        if (preferredCornerObj) {
            // Start with preferred corner
            const priorityCorners = [preferredCornerObj];

            // Add north-east as second priority (if not already preferred)
            if (northEastCorner && preferredCorner !== 'north-east') {
                priorityCorners.push(northEastCorner);
            }

            // Add remaining corners
            const remainingCorners = corners.filter(c =>
                c.type !== preferredCorner && c.type !== 'north-east'
            );
            cornersToTry = [...priorityCorners, ...remainingCorners];
        }
    }

    // Try each corner
    for (const corner of cornersToTry) {

        const result = constrainToCorner(corner.position, roomWidth, roomHeight, {
            type: objectType,
            scale: 1.0,
            orientation,
            movement,
            sku
        });

        // Create temporary item with SKU for proper collision detection
        const tempItem: BathroomItem = {
            id: -1,
            type: objectType,
            position: [result.position.x, result.position.y, result.position.z] as [number, number, number],
            scale: scale,
            sku: sku
        };

        // Check if this corner position would collide with existing items
        const wouldCollide = wouldCollideWithExisting(
            result.position,
            objectType,
            scale,
            -1, // New item, no ID yet
            existingItems,
            tempItem // Pass temporary item for proper dimension lookup
        );

        if (!wouldCollide) {
            return result;
        }
    }

    // If no free corner, return null instead of forcing placement
    console.warn('⚠️ No free corners available for corner stall shower');
    return null;
};

// Helper function for free-standing objects (updated for interior space)
const findFreeStandingPosition = (
    roomWidth: number,
    roomHeight: number,
    objectType: ComponentType,
    scale: number,
    existingItems: BathroomItem[],
    maxAttempts: number,
    movement?: MovementConfig,
    sku?: string,
    notchWidth?: number,
    notchHeight?: number
): { position: Position; rotation: number } | null => {

    const movementConfig = movement ?? getMovementConfig(objectType);

    // Get actual object dimensions
    const dimensions = getDimensions(objectType, sku);
    if (!dimensions) {
        console.warn(`No dimensions found for ${objectType} (SKU: ${sku}) in findFreeStandingPosition`);
        // Fallback to center if no dimensions
        const { interior } = getInteriorBoundaries(roomWidth, roomHeight);
        return {
            position: {
                x: (interior.minX + interior.maxX) / 2,
                y: movementConfig.allowVerticalMovement ? (movementConfig.minHeight || 0) : 0,
                z: (interior.minZ + interior.maxZ) / 2
            },
            rotation: 0
        };
    }

    // Use actual object dimensions as buffer from walls
    const halfWidth = (dimensions.width * scale) / 2;
    const halfDepth = (dimensions.depth * scale) / 2;

    const { interior } = getInteriorBoundaries(roomWidth, roomHeight);

    // Define free-standing area within interior space using actual object dimensions
    const minX = interior.minX + halfWidth;
    const maxX = interior.maxX - halfWidth;
    const minZ = interior.minZ + halfDepth;
    const maxZ = interior.maxZ - halfDepth;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const position = {
            x: minX + Math.random() * (maxX - minX),
            y: movementConfig.allowVerticalMovement ? (movementConfig.minHeight || 0) : 0,
            z: minZ + Math.random() * (maxZ - minZ)
        };

        const rotation = 0;

        // Create temporary item for collision detection with SKU
        const tempItem: BathroomItem = {
            id: -1,
            type: objectType,
            position: [position.x, position.y, position.z] as [number, number, number],
            scale: scale,
            sku: sku
        };

        // Check for collisions
        let hasCollision = false;
        for (const item of existingItems) {
            if (checkCollision(
                position,
                objectType,
                scale,
                { x: item.position[0], y: item.position[1], z: item.position[2] },
                item.type,
                item.scale || 1.0,
                tempItem, // ✅ Pass temporary item for enhanced dimensions lookup
                item,     // ✅ Pass existing item for product-specific dimensions
                roomWidth,
                roomHeight,
                notchWidth,
                notchHeight
            )) {
                hasCollision = true;
                break;
            }
        }

        if (!hasCollision) {
            return { position, rotation };
        }
    }

    // ✅ FIXED: Check if fallback center position is free before using it
    const fallbackPosition = {
        x: (interior.minX + interior.maxX) / 2,
        y: movementConfig.allowVerticalMovement ? (movementConfig.minHeight || 0) : 0,
        z: (interior.minZ + interior.maxZ) / 2
    };

    // Create temporary item for collision detection
    const fallbackTempItem: BathroomItem = {
        id: -1,
        type: objectType,
        position: [fallbackPosition.x, fallbackPosition.y, fallbackPosition.z] as [number, number, number],
        scale: scale,
        sku: sku
    };

    // Check if fallback position collides
    let fallbackHasCollision = false;
    for (const item of existingItems) {
        if (checkCollision(
            fallbackPosition,
            objectType,
            scale,
            { x: item.position[0], y: item.position[1], z: item.position[2] },
            item.type,
            item.scale || 1.0,
            fallbackTempItem,
            item,
            roomWidth,
            roomHeight,
            notchWidth,
            notchHeight
        )) {
            fallbackHasCollision = true;
            break;
        }
    }

    if (fallbackHasCollision) {
        // No free position available, even at center
        console.warn(`⚠️ Cannot find free standing position for ${objectType} - all positions occupied including center`);
        return null;
    }

    // Fallback position is free, use it
    return {
        position: fallbackPosition,
        rotation: 0
    };
};

// Helper to get appropriate Y position for wall-mounted objects
const getWallPositionY = (movementConfig: MovementConfig, objectSpawnHeight?: number): number => {
    const minHeight = movementConfig.minHeight ?? 0;

    if (!objectSpawnHeight && objectSpawnHeight !== 0) {
        return minHeight; // Default to minimum height when no spawn height specified
    }
    // Use spawn height but ensure it's at least at minimum height
    return Math.max(objectSpawnHeight, minHeight);
};

/**
 * UPDATED: Constrain all objects to interior room boundaries
 */
export const constrainAllObjectsToRoom = (
    items: BathroomItem[],
    roomWidth: number,
    roomHeight: number,
    notchWidth?: number,
    notchHeight?: number,
    oldRoomWidth?: number,
    oldRoomHeight?: number,
    oldNotchWidth?: number,
    oldNotchHeight?: number
): BathroomItem[] => {
    // ✅ STEP 1: Pre-calculate target walls and sort items
    // Sorting is crucial for collision resolution to work by "stacking" items correctly
    const itemsWithMetadata = items.map(item => {
        const position = { x: item.position[0], y: item.position[1], z: item.position[2] };
        const movementConfig = getMovementConfig(item.type, item);
        let targetWall: WallType | undefined;

        if (movementConfig.snapToWall && oldRoomWidth && oldRoomHeight) {
            targetWall = getNearestWall(
                position,
                oldRoomWidth,
                oldRoomHeight,
                oldNotchWidth,
                oldNotchHeight
            );
        }

        return { item, targetWall, position, movementConfig };
    });

    // Sort items to process them in a logical spatial order (e.g., left-to-right, top-to-bottom)
    // This prevents items from "jumping" over each other during resize
    itemsWithMetadata.sort((a, b) => {
        // Primary sort: Wall
        if (a.targetWall !== b.targetWall) {
            return (a.targetWall || '').localeCompare(b.targetWall || '');
        }

        // Secondary sort: Position along the wall
        if (a.targetWall === 'north' || a.targetWall === 'south' || a.targetWall === 'notch-south') {
            return a.position.x - b.position.x; // Sort by X for horizontal walls
        } else {
            return a.position.z - b.position.z; // Sort by Z for vertical walls (and default)
        }
    });

    const processedItems: BathroomItem[] = [];

    // ✅ STEP 2: Process sorted items
    for (const { item, targetWall, position, movementConfig } of itemsWithMetadata) {
        let constrainedPosition: Position;
        let constrainedRotation: number;

        if (movementConfig.snapToWall) {
            // Wall-snapped objects - constrain to interior walls
            const result = constrainToWalls(
                position,
                roomWidth,
                roomHeight,
                {
                    type: item.type,
                    scale: item.scale,
                    orientation: item.model?.orientation,
                    item,
                    notchWidth,
                    notchHeight
                },
                targetWall // Pass the sticky wall
            );
            constrainedPosition = result.position;
            constrainedRotation = result.rotation;
        } else {
            // Free-standing objects - constrain to interior room bounds
            const result = constrainToRoom(position, roomWidth, roomHeight, {
                type: item.type,
                scale: item.scale,
                orientation: item.model?.orientation,
                item,
                notchWidth,
                notchHeight
            });
            constrainedPosition = result.position;
            constrainedRotation = item.rotation || 0;
        }

        // ✅ NEW: Collision Resolution
        // Check if the constrained position collides with any ALREADY PROCESSED items OR extends outside room bounds
        let hasCollision = wouldCollideWithExistingOrWalls(
            constrainedPosition,
            item.type,
            item.scale || 1, // Fix: Ensure scale is a number
            item.id,
            processedItems, // Only check against items we've already placed in this pass
            roomWidth,
            roomHeight,
            item,
            constrainedRotation,
            notchWidth,
            notchHeight
        );

        if (hasCollision) {
            const originalConstrainedPos = { ...constrainedPosition };

            // Expanded search pattern to handle larger items
            const offsets = [
                30, -30,
                60, -60,
                90, -90,
                120, -120,
                150, -150,
                180, -180,
                210, -210
            ];

            let resolved = false;

            // Determine primary axis for shifting based on wall
            let axis: 'x' | 'z' = 'x';
            if (targetWall) {
                if (['east', 'west', 'notch-east'].includes(targetWall)) axis = 'z';
            } else {
                // For free-standing, try X first
                axis = 'x';
            }

            for (const offset of offsets) {
                const testPos = { ...originalConstrainedPos };
                testPos[axis] += offset;

                // Re-constrain to ensure we stay on wall/in room
                let reConstrained: { position: Position; rotation: number };

                if (movementConfig.snapToWall) {
                    reConstrained = constrainToWalls(
                        testPos,
                        roomWidth,
                        roomHeight,
                        {
                            type: item.type,
                            scale: item.scale,
                            orientation: item.model?.orientation,
                            item,
                            notchWidth,
                            notchHeight
                        },
                        targetWall
                    );
                } else {
                    reConstrained = constrainToRoom(testPos, roomWidth, roomHeight, {
                        type: item.type,
                        scale: item.scale,
                        orientation: item.model?.orientation,
                        item,
                        notchWidth,
                        notchHeight
                    });
                }

                // Check collision again
                if (!wouldCollideWithExistingOrWalls(
                    reConstrained.position,
                    item.type,
                    item.scale || 1, // Fix: Ensure scale is a number
                    item.id,
                    processedItems,
                    roomWidth,
                    roomHeight,
                    item,
                    reConstrained.rotation,
                    notchWidth,
                    notchHeight
                )) {
                    constrainedPosition = reConstrained.position;
                    constrainedRotation = reConstrained.rotation;
                    resolved = true;
                    break;
                }
            }

            if (!resolved) {
                console.warn(`❌ Could not resolve collision for ${item.type} on ${targetWall || 'current wall'}. Trying other walls...`);

                // If we couldn't find a spot on the current wall, try to find a free spot on ANY wall
                // using the existing findFreeWallPosition logic (but simplified here for direct use)

                const otherWalls: WallType[] = ['north', 'south', 'east', 'west'];
                if (notchWidth && notchHeight) {
                    otherWalls.push('notch-east', 'notch-south');
                }

                // Filter out the current targetWall to avoid retrying it immediately (though it might be valid with a full search)
                const candidateWalls = otherWalls.filter(w => w !== targetWall);

                for (const wall of candidateWalls) {
                    // Try to place on this wall
                    const reConstrained = constrainToWalls(
                        originalConstrainedPos, // Start from original position (will be snapped to new wall)
                        roomWidth,
                        roomHeight,
                        {
                            type: item.type,
                            scale: item.scale,
                            orientation: item.model?.orientation,
                            item,
                            notchWidth,
                            notchHeight
                        },
                        wall // Force snap to this candidate wall
                    );

                    // Check collision on this new wall
                    if (!wouldCollideWithExistingOrWalls(
                        reConstrained.position,
                        item.type,
                        item.scale || 1,
                        item.id,
                        processedItems,
                        roomWidth,
                        roomHeight,
                        item,
                        reConstrained.rotation,
                        notchWidth,
                        notchHeight
                    )) {
                        constrainedPosition = reConstrained.position;
                        constrainedRotation = reConstrained.rotation;
                        resolved = true;
                        break;
                    }

                    // If direct snap failed, maybe try offsets on this new wall too?
                    // For now, let's keep it simple. If the direct snap to another wall works, great.
                    // If not, we could try offsets here too, but that might be overkill for this step.
                }
            }

            if (!resolved) {
                console.warn(`❌ Could not resolve collision for ${item.type} on any wall.`);
                // Fallback: Keep original constrained position (overlap is better than disappearing)
            }
        }

        processedItems.push({
            ...item,
            position: [constrainedPosition.x, constrainedPosition.y, constrainedPosition.z] as [number, number, number],
            rotation: constrainedRotation
        });
    }

    return processedItems;
};

/**
 * Helper to determine the nearest wall for a position
 */
export const getNearestWall = (
    position: Position,
    roomWidth: number,
    roomHeight: number,
    notchWidth?: number,
    notchHeight?: number
): WallType => {
    const { wallFaces, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

    const wallDistances: Record<string, number> = {
        north: Math.abs(position.z - wallFaces.north),
        south: Math.abs(position.z - wallFaces.south),
        east: Math.abs(position.x - wallFaces.east),
        west: Math.abs(position.x - wallFaces.west)
    };

    if (notch) {
        wallDistances['notch-east'] = Math.abs(position.x - notch.maxX);
        wallDistances['notch-south'] = Math.abs(position.z - notch.maxZ);
    }

    return Object.entries(wallDistances).reduce((a, b) =>
        wallDistances[a[0]] < wallDistances[b[0]] ? a : b
    )[0] as WallType;
};

/**
 * Validate if an object fits in the room (checks wall lengths)
 */
export const validateObjectFitsInRoom = (
    objectDimensions: { width: number; height: number; depth?: number },
    roomWidth: number,
    roomHeight: number,
    objectName?: string
): { isValid: boolean; errorMessage: string | null } => {
    const { interior } = getInteriorBoundaries(roomWidth, roomHeight);

    // Calculate available wall lengths (account for wall thickness)
    const availableWallWidth = interior.maxX - interior.minX; // East-West walls
    const availableWallDepth = interior.maxZ - interior.minZ; // North-South walls

    const objectWidth = objectDimensions.width;

    // Check if object is too wide for any wall
    // Object can be placed on North/South walls (uses width) or East/West walls (uses width as well)
    const fitsOnNorthSouthWall = objectWidth <= availableWallWidth;
    const fitsOnEastWestWall = objectWidth <= availableWallDepth;

    if (!fitsOnNorthSouthWall && !fitsOnEastWestWall) {
        const itemName = objectName || 'This fixture';
        return {
            isValid: false,
            errorMessage: `${itemName} (${objectWidth}cm wide) is too large to fit on any wall. Available wall lengths: ${availableWallWidth.toFixed(0)}cm and ${availableWallDepth.toFixed(0)}cm.`
        };
    }

    return { isValid: true, errorMessage: null };
};

/**
 * Validate if an object at a specific position would overlap with existing items
 * Used for pre-checking template items before loading
 */
export const validateNoOverlap = (
    position: Position,
    objectType: ComponentType,
    scale: number,
    existingItems: BathroomItem[],
    roomWidth: number,
    roomHeight: number,
    sku?: string,
    notchWidth?: number,
    notchHeight?: number,
    model?: ObjectModel,
    isTemplateValidation?: boolean
): { isValid: boolean; collidingItem: BathroomItem | null } => {
    // Create a temporary item for collision checking
    const tempItem: BathroomItem = {
        id: -999, // Temporary ID
        type: objectType,
        position: [position.x, position.y, position.z],
        scale,
        sku,
        model // Include model info for proper height-based collision detection
    };

    // For template validation, skip item-to-item collision check (they're pre-designed)
    // But still check wall boundaries to ensure items fit in room
    if (isTemplateValidation) {
        // Check wall collision - items must still fit within room boundaries
        const hasWallCollision = checkWallCollision(
            position,
            objectType,
            scale,
            roomWidth,
            roomHeight,
            tempItem,
            undefined, // rotation
            notchWidth,
            notchHeight
        );

        if (hasWallCollision) {
            return { isValid: false, collidingItem: null };
        }

        // Skip item-to-item collision for templates (pre-designed to fit)
        return { isValid: true, collidingItem: null };
    }

    for (const item of existingItems) {
        const itemPosition = { x: item.position[0], y: item.position[1], z: item.position[2] };
        const itemScale = item.scale || 1.0;

        const hasCollision = checkCollision(
            position,
            objectType,
            scale,
            itemPosition,
            item.type,
            itemScale,
            tempItem,
            item,
            roomWidth,
            roomHeight,
            notchWidth,
            notchHeight
        );

        if (hasCollision) {
            return { isValid: false, collidingItem: item };
        }
    }

    return { isValid: true, collidingItem: null };
};

/**
 * Calculate available space for a variant at the current item's position
 */
export const calculateAvailableSpaceForVariant = (
    currentItem: BathroomItem,
    existingItems: BathroomItem[],
    roomWidth: number,
    roomHeight: number,
    notchWidth?: number,
    notchHeight?: number
): { availableWidth: number; limitingFactor: 'wall' | 'object' | 'none' } => {
    const position: Position = {
        x: currentItem.position[0],
        y: currentItem.position[1],
        z: currentItem.position[2]
    };

    const scale = currentItem.scale || 1.0;
    const currentDimensions = getDimensions(currentItem.type, currentItem.sku, currentItem.model);

    if (!currentDimensions) {
        return { availableWidth: Infinity, limitingFactor: 'none' };
    }

    const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
    // Determine which wall the item is on
    let nearestWall: WallType = 'north';
    const tolerance = 50; // 50cm tolerance for wall detection

    if (notch) {
        if (Math.abs(position.x - notch.maxX) < tolerance &&
            position.z >= notch.minZ && position.z <= notch.maxZ + tolerance) {
            nearestWall = 'notch-east';
        } else if (Math.abs(position.z - notch.maxZ) < tolerance &&
            position.x >= notch.minX && position.x <= notch.maxX + tolerance) {
            nearestWall = 'notch-south';
        }
    }

    if (nearestWall === 'north') {
        const wallDistances = {
            north: Math.abs(position.z - wallFaces.north),
            south: Math.abs(position.z - wallFaces.south),
            east: Math.abs(position.x - wallFaces.east),
            west: Math.abs(position.x - wallFaces.west)
        };

        nearestWall = (Object.entries(wallDistances).reduce((a, b) =>
            wallDistances[a[0] as keyof typeof wallDistances] < wallDistances[b[0] as keyof typeof wallDistances] ? a : b
        )[0] as WallType);
    }

    // Calculate available space along the wall
    let spaceLeft = 0;
    let spaceRight = 0;

    if (nearestWall === 'north' || nearestWall === 'south') {
        // Object is on north/south wall - width runs along X axis
        spaceLeft = position.x - interior.minX;
        spaceRight = interior.maxX - position.x;
    } else if (nearestWall === 'east' || nearestWall === 'west') {
        // Object is on east/west wall - width runs along Z axis
        spaceLeft = position.z - interior.minZ;
        spaceRight = interior.maxZ - position.z;
    } else if (nearestWall === 'notch-east') {
        // On notch east wall - width runs along Z axis, limited by notch bounds
        spaceLeft = position.z - (notch?.minZ ?? interior.minZ);
        spaceRight = (notch?.maxZ ?? interior.maxZ) - position.z;
    } else if (nearestWall === 'notch-south') {
        // On notch south wall - width runs along X axis, limited by notch bounds
        spaceLeft = position.x - (notch?.minX ?? interior.minX);
        spaceRight = (notch?.maxX ?? interior.maxX) - position.x;
    }

    // Total wall space available (from both sides of current position)
    let totalWallSpace = spaceLeft + spaceRight;
    let limitingFactor: 'wall' | 'object' | 'none' = 'wall';

    // Check for nearby objects that might limit space
    const currentHalfWidth = (currentDimensions.width * scale) / 2;

    for (const item of existingItems) {
        if (item.id === currentItem.id) continue; // Skip self

        const itemPos: Position = {
            x: item.position[0],
            y: item.position[1],
            z: item.position[2]
        };

        const itemDimensions = getDimensions(item.type, item.sku, item.model);
        if (!itemDimensions) continue;

        const itemScale = item.scale || 1.0;
        const itemHalfWidth = (itemDimensions.width * itemScale) / 2;
        const itemHalfDepth = (itemDimensions.depth * itemScale) / 2;

        // Check if item is on the same wall (within tolerance)
        let isOnSameWall = false;
        let distanceAlongWall = 0;

        if (nearestWall === 'north' || nearestWall === 'south') {
            // Check if item is on same horizontal wall
            const wallZ = nearestWall === 'north' ? wallFaces.north : wallFaces.south;
            if (Math.abs(itemPos.z - wallZ) < tolerance + itemHalfDepth) {
                isOnSameWall = true;
                distanceAlongWall = Math.abs(itemPos.x - position.x);
            }
        } else if (nearestWall === 'east' || nearestWall === 'west') {
            // Check if item is on same vertical wall
            const wallX = nearestWall === 'east' ? wallFaces.east : wallFaces.west;
            if (Math.abs(itemPos.x - wallX) < tolerance + itemHalfDepth) {
                isOnSameWall = true;
                distanceAlongWall = Math.abs(itemPos.z - position.z);
            }
        }

        if (isOnSameWall) {
            // Calculate the edge-to-edge distance
            const edgeToEdgeDistance = distanceAlongWall - itemHalfWidth - currentHalfWidth;

            if (edgeToEdgeDistance < totalWallSpace / 2) {
                // This object is closer than the wall, limits available space
                if (itemPos.x < position.x || itemPos.z < position.z) {
                    // Object is to the left/above
                    const newSpaceLeft = distanceAlongWall - itemHalfWidth;
                    if (newSpaceLeft < spaceLeft) {
                        spaceLeft = Math.max(0, newSpaceLeft);
                        limitingFactor = 'object';
                    }
                } else {
                    // Object is to the right/below
                    const newSpaceRight = distanceAlongWall - itemHalfWidth;
                    if (newSpaceRight < spaceRight) {
                        spaceRight = Math.max(0, newSpaceRight);
                        limitingFactor = 'object';
                    }
                }
            }
        }
    }

    // Total available width for the variant
    totalWallSpace = spaceLeft + spaceRight;

    return {
        availableWidth: totalWallSpace,
        limitingFactor: totalWallSpace === Infinity ? 'none' : limitingFactor
    };
};

/**
 * Check if a specific variant would fit at the current item's position
 * Allows repositioning along the wall if one side has space and the other is against a wall/object
 */
export const checkVariantFitsAtPosition = (
    variantDimensions: { width: number; height: number; depth?: number },
    currentItem: BathroomItem,
    existingItems: BathroomItem[],
    roomWidth: number,
    roomHeight: number,
    notchWidth?: number,
    notchHeight?: number,
    allowPositionAdjustment: boolean = true
): { fits: boolean; availableWidth: number; requiredWidth: number; reason?: string } => {
    const movementConfig = getMovementConfig(currentItem.type, currentItem);
    const isFreestanding = !movementConfig.snapToWall;

    let availableWidth: number;
    const requiredWidth = variantDimensions.width;

    if (isFreestanding) {
        // For freestanding items, use room dimensions as available space
        // They can be placed anywhere, so we check actual room size
        const { interior } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
        availableWidth = Math.max(interior.maxX - interior.minX, interior.maxZ - interior.minZ);
    } else {
        // For wall-snapped items, calculate space along the wall
        const result = calculateAvailableSpaceForVariant(
            currentItem,
            existingItems,
            roomWidth,
            roomHeight,
            notchWidth,
            notchHeight
        );
        availableWidth = result.availableWidth;
    }

    // First check: Does the width fit in available space?
    let fits = requiredWidth <= availableWidth;
    let reason: string | undefined;

    if (!fits) {
        reason = 'width';
    }

    // Get current item dimensions to calculate position adjustment
    const currentDimensions = getDimensions(currentItem.type, currentItem.sku, currentItem.model);
    const scale = currentItem.scale || 1.0;
    const currentHalfWidth = currentDimensions ? (currentDimensions.width * scale) / 2 : 0;
    const newHalfWidth = (variantDimensions.width * scale) / 2;
    const widthDifference = newHalfWidth - currentHalfWidth;

    // Determine which wall the item is on and calculate potential adjusted positions
    const { wallFaces, interior, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);
    const currentPosition: Position = {
        x: currentItem.position[0],
        y: currentItem.position[1],
        z: currentItem.position[2]
    };

    // Detect nearest wall
    let nearestWall: 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south' = 'north';
    const tolerance = 50;

    if (notch) {
        if (Math.abs(currentPosition.x - notch.maxX) < tolerance &&
            currentPosition.z >= notch.minZ && currentPosition.z <= notch.maxZ + tolerance) {
            nearestWall = 'notch-east';
        } else if (Math.abs(currentPosition.z - notch.maxZ) < tolerance &&
            currentPosition.x >= notch.minX && currentPosition.x <= notch.maxX + tolerance) {
            nearestWall = 'notch-south';
        }
    }

    if (nearestWall === 'north') {
        const wallDistances = {
            north: Math.abs(currentPosition.z - wallFaces.north),
            south: Math.abs(currentPosition.z - wallFaces.south),
            east: Math.abs(currentPosition.x - wallFaces.east),
            west: Math.abs(currentPosition.x - wallFaces.west)
        };
        nearestWall = Object.entries(wallDistances).reduce((a, b) =>
            wallDistances[a[0] as keyof typeof wallDistances] < wallDistances[b[0] as keyof typeof wallDistances] ? a : b
        )[0] as 'north' | 'south' | 'east' | 'west';
    }

    // Calculate possible adjusted positions (shift towards center to fit larger variant)
    const getAdjustedPositions = (): Position[] => {
        const positions: Position[] = [currentPosition]; // Original position first

        if (widthDifference <= 0) return positions; // No adjustment needed for smaller variants

        // Calculate space on each side and possible shifts
        if (nearestWall === 'north' || nearestWall === 'south' || nearestWall === 'notch-south') {
            // Width runs along X axis
            const spaceToWest = currentPosition.x - interior.minX;
            const spaceToEast = interior.maxX - currentPosition.x;

            // If close to west wall, try shifting east
            if (spaceToWest < newHalfWidth && spaceToEast > newHalfWidth) {
                positions.push({
                    ...currentPosition,
                    x: Math.min(interior.maxX - newHalfWidth, currentPosition.x + widthDifference)
                });
            }
            // If close to east wall, try shifting west
            if (spaceToEast < newHalfWidth && spaceToWest > newHalfWidth) {
                positions.push({
                    ...currentPosition,
                    x: Math.max(interior.minX + newHalfWidth, currentPosition.x - widthDifference)
                });
            }
            // Also try centered position if there's enough total space
            if (spaceToWest + spaceToEast >= requiredWidth) {
                const centeredX = Math.max(
                    interior.minX + newHalfWidth,
                    Math.min(interior.maxX - newHalfWidth, currentPosition.x)
                );
                if (centeredX !== currentPosition.x) {
                    positions.push({ ...currentPosition, x: centeredX });
                }
            }
        } else if (nearestWall === 'east' || nearestWall === 'west' || nearestWall === 'notch-east') {
            // Width runs along Z axis (rotated 90 degrees)
            const spaceToNorth = currentPosition.z - interior.minZ;
            const spaceToSouth = interior.maxZ - currentPosition.z;

            // If close to north wall, try shifting south
            if (spaceToNorth < newHalfWidth && spaceToSouth > newHalfWidth) {
                positions.push({
                    ...currentPosition,
                    z: Math.min(interior.maxZ - newHalfWidth, currentPosition.z + widthDifference)
                });
            }
            // If close to south wall, try shifting north
            if (spaceToSouth < newHalfWidth && spaceToNorth > newHalfWidth) {
                positions.push({
                    ...currentPosition,
                    z: Math.max(interior.minZ + newHalfWidth, currentPosition.z - widthDifference)
                });
            }
            // Also try centered position if there's enough total space
            if (spaceToNorth + spaceToSouth >= requiredWidth) {
                const centeredZ = Math.max(
                    interior.minZ + newHalfWidth,
                    Math.min(interior.maxZ - newHalfWidth, currentPosition.z)
                );
                if (centeredZ !== currentPosition.z) {
                    positions.push({ ...currentPosition, z: centeredZ });
                }
            }
        }

        return positions;
    };

    // Only use current position if allowPositionAdjustment is false
    const adjustedPositions = allowPositionAdjustment ? getAdjustedPositions() : [currentPosition];

    // Second check: Would the new dimensions cause wall collision?
    // Skip for freestanding items - they're not bound to walls, just need to fit in room
    // Try all adjusted positions to find one that works (or just current position if adjustment disabled)
    if (fits && variantDimensions.depth && !isFreestanding) {
        let foundValidPosition = false;

        for (const testPosition of adjustedPositions) {
            // Create a temporary item with the new variant dimensions to check wall collision
            const tempItem: BathroomItem = {
                ...currentItem,
                model: currentItem.model ? {
                    ...currentItem.model,
                    path: currentItem.model.path || '',
                    dimensions: variantDimensions
                } : undefined
            };

            const hasWallCollision = checkWallCollision(
                testPosition,
                currentItem.type,
                currentItem.scale || 1.0,
                roomWidth,
                roomHeight,
                tempItem,
                currentItem.rotation,
                notchWidth,
                notchHeight
            );

            if (!hasWallCollision) {
                foundValidPosition = true;
                break;
            }
        }

        if (!foundValidPosition) {
            fits = false;
            reason = 'wall_collision';
        }
    }

    // Third check: Would the new dimensions cause collision with other items?
    // Try all adjusted positions to find one that works
    if (fits) {
        let foundValidPosition = false;

        for (const testPosition of adjustedPositions) {
            // Create a temporary item with the new variant dimensions
            const tempItem: BathroomItem = {
                ...currentItem,
                model: currentItem.model ? {
                    ...currentItem.model,
                    path: currentItem.model.path || '',
                    dimensions: variantDimensions
                } : undefined
            };

            // Check collision with each existing item (except self)
            let hasAnyCollision = false;
            for (const item of existingItems) {
                if (item.id === currentItem.id) continue; // Skip self

                const itemPosition = { x: item.position[0], y: item.position[1], z: item.position[2] };
                const hasItemCollision = checkCollision(
                    testPosition,
                    currentItem.type,
                    currentItem.scale || 1.0,
                    itemPosition,
                    item.type,
                    item.scale || 1.0,
                    tempItem,
                    item,
                    roomWidth,
                    roomHeight,
                    notchWidth,
                    notchHeight
                );

                if (hasItemCollision) {
                    hasAnyCollision = true;
                    break;
                }
            }

            if (!hasAnyCollision) {
                foundValidPosition = true;
                break;
            }
        }

        if (!foundValidPosition) {
            fits = false;
            reason = 'item_collision';
        }
    }

    return {
        fits,
        availableWidth,
        requiredWidth,
        reason
    };
};
