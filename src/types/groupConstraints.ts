// src/types/groupConstraints.ts
// Type definitions for the "Most Restrictive Wins" group constraint system

import * as THREE from 'three';
import type { WallType } from '../utils/constraints';

/**
 * Constraint levels in order of restrictiveness (1 = most restrictive)
 */
export enum ConstraintLevel {
  CORNER_ONLY = 1,   // Type C: Can only be placed in corners
  WALL_MOUNTED = 2,  // Type A/B: Must snap to walls
  FREE = 3           // Type D: Can move freely in room
}

/**
 * Constraint type codes for easy reference
 * A = Wall-Mounted (fixed height)
 * B = Wall + Height (adjustable)
 * C = Corner-Only
 * D = Free
 * L-SHAPE = Items on perpendicular walls (locked)
 */
export type ConstraintTypeCode = 'A' | 'B' | 'C' | 'D' | 'L-SHAPE';

/**
 * Result of analyzing a group's constraints
 */
export interface GroupConstraints {
  /** Most restrictive constraint level in the group */
  level: ConstraintLevel;

  /** Effective constraint type for the group */
  effectiveType: ConstraintTypeCode;

  /** Whether vertical movement is allowed for the group */
  allowVerticalMovement: boolean;

  /** Whether free rotation is allowed for the group */
  allowFreeRotation: boolean;

  /** Minimum height allowed for the group (cm) */
  minHeight: number;

  /** Maximum height allowed for the group (cm) */
  maxHeight: number;

  /** Whether items form an L-shape (on perpendicular walls) */
  isLShapeGroup: boolean;

  /** Whether the group contains a corner-only item */
  hasCornerItem: boolean;

  /** Map of wall names to item IDs on that wall */
  wallItems: Map<WallType, number[]>;

  /** Primary item ID (the one being dragged) */
  primaryItemId?: number;

  /** All item IDs in the group */
  itemIds: number[];
}

/**
 * Transform for a single item in the group
 */
export interface ItemTransform {
  position: THREE.Vector3;
  rotation: number;
}

/**
 * Transform state for the entire group
 */
export interface GroupTransform {
  /** Position of the primary (dragged) item */
  primaryPosition: { x: number; y: number; z: number };

  /** Rotation of the primary item */
  primaryRotation: number;

  /** Transforms for all items in the group, keyed by item ID */
  itemTransforms: Map<number, ItemTransform>;
}

/**
 * Magnetic snap information
 */
export interface MagneticSnapInfo {
  /** Direction of the snap (which axis or corner) */
  direction: 'x' | 'z' | 'corner';

  /** Target position to snap to */
  targetPosition: { x: number; z: number };

  /** Snap strength (0-1, higher = closer to target) */
  strength: number;

  /** Wall or corner being snapped to */
  target?: WallType | string;
}

/**
 * Validation status for a movement attempt
 */
export interface ValidationStatus {
  /** Whether the movement is blocked */
  blocked: boolean;

  /** Reason for blocking (if blocked) */
  reason?: string;

  /** Magnetic snap information (if within snap range) */
  magneticSnap?: MagneticSnapInfo;

  /** Which items are colliding (item IDs) */
  collidingItems?: number[];

  /** Whether the position is out of bounds */
  outOfBounds?: boolean;
}

/**
 * Result of validating a group transform
 */
export interface TransformValidationResult {
  /** Whether the transform is valid */
  isValid: boolean;

  /** The valid transform to apply (last known good position if invalid) */
  validTransform: GroupTransform;

  /** The invalid transform (cursor position when invalid) */
  invalidTransform?: GroupTransform;

  /** Detailed validation status */
  validationStatus: ValidationStatus;
}

/**
 * Movement input from user interaction
 */
export interface MovementInput {
  /** Target position from cursor/touch */
  targetPosition: THREE.Vector3;

  /** Target rotation (if rotating) */
  targetRotation?: number;

  /** Whether Ctrl key is held (for height adjustment) */
  ctrlHeld?: boolean;

  /** View mode (2D or 3D) */
  viewMode: '2d' | '3d';

  /** Current wall the primary object is on (for stickiness) */
  currentWall?: WallType;
}

/**
 * Room dimensions for constraint calculations
 */
export interface RoomDimensions {
  width: number;
  height: number;  // Actually room depth in world coords
  wallHeight: number;
  notchWidth?: number;
  notchHeight?: number;
}

/**
 * Single item's constraint classification result
 */
export interface ItemConstraintInfo {
  /** Constraint level for this item */
  level: ConstraintLevel;

  /** Constraint type code */
  type: ConstraintTypeCode;

  /** Which wall the item is currently on */
  currentWall?: WallType;

  /** Whether vertical movement is allowed */
  allowVerticalMovement: boolean;

  /** Whether free rotation is allowed */
  allowFreeRotation: boolean;

  /** Minimum height (cm) */
  minHeight: number;

  /** Maximum height (cm) */
  maxHeight: number;

  /** Whether this is a corner-only item */
  isCornerOnly: boolean;

  /** Whether this item snaps to walls */
  snapToWall: boolean;
}

/**
 * Configuration for ghost visualization
 */
export interface GhostConfig {
  /** Color of the ghost material (hex) */
  color: number;

  /** Opacity of the ghost (0-1) */
  opacity: number;

  /** Whether to show wireframe */
  wireframe: boolean;
}

/**
 * Default ghost configuration for invalid positions
 */
export const DEFAULT_GHOST_CONFIG: GhostConfig = {
  color: 0xff0000,  // Red
  opacity: 0.3,
  wireframe: false
};

/**
 * Constants for constraint system
 */
export const CONSTRAINT_CONSTANTS = {
  /** Wall stickiness threshold in cm */
  WALL_STICKINESS: 40,

  /** Magnetic snap threshold in cm */
  MAGNETIC_SNAP_THRESHOLD: 30,

  /** Corner snap tolerance in cm */
  CORNER_TOLERANCE: 30,

  /** Maximum allowed rotation for constrained items (90 degrees) */
  ROTATION_SNAP_ANGLE: Math.PI / 2
};
