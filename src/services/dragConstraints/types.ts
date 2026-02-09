/**
 * Type definitions for the drag constraint system.
 */

import * as THREE from 'three';
import type { Ref } from 'vue';
import type { ComponentType } from '../../constants/components';
import type { BathroomItem } from '../../utils/constraints';

export type WallType = 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface RoomBoundaries {
  width: number;
  height: number;
  notchWidth: number;
  notchHeight: number;
  halfWidth: number;
  halfHeight: number;
}

export interface ObjectConfig {
  type: ComponentType;
  scale: number;
  rotation: number;
  itemId: number;
  item: BathroomItem | null;
  orientation?: {
    type?: string;
    wallBuffer?: number;
  };
  movement?: {
    snapToWall?: boolean;
    cornerInstallOnly?: boolean | { enabled: boolean };
    allowFreeRotation?: boolean;
    allowVerticalMovement?: boolean;
    minHeight?: number;
    maxHeight?: number;
  };
}

export interface DragState {
  isDragging: boolean;
  selectedObject: THREE.Object3D | null;
  selectedObjects: Map<number, THREE.Object3D>;
  dragPlane: THREE.Plane;
  dragOffset: THREE.Vector3;
  multiSelectLocalOffsets: Map<number, THREE.Vector3>;
  originalPositions: Map<number, THREE.Vector3>;
  currentWall: WallType | null;
}

export interface ConstraintResult {
  position: Position3D;
  rotation: number;
  wall: WallType;
  isColliding: boolean;
}

export interface GroupConstraint {
  movementType: string;
  rotationRestriction: string | null;
  heightRestriction: string | null;
  isLShapeGroup: boolean;
}

export interface DragContextRefs {
  roomWidthRef: Ref<number>;
  roomHeightRef: Ref<number>;
  notchWidthRef: Ref<number>;
  notchHeightRef: Ref<number>;
  preventCollisionPlacementRef: Ref<boolean>;
}

export interface DragCallbacks {
  getItems: () => BathroomItem[];
  getCurrentItemData: (itemId: number) => BathroomItem | null;
  queueUpdate: (itemId: number, update: Partial<BathroomItem>) => void;
  emitSchematicUpdate: (itemId: number) => void;
}
