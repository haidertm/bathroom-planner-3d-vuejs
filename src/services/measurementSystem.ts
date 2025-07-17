// src/services/measurementSystem.ts - IKEA-style measurement system
import * as THREE from 'three';
import type { ComponentType } from '../constants/components';
import type { BathroomItem } from '../utils/constraints';
import { MODEL_DIMENSIONS, WALL_SETTINGS } from '../constants/dimensions';

export interface MeasurementData {
  objectWidth: number;
  objectDepth: number;
  objectHeight: number;
  spaceLeft: number;
  spaceRight: number;
  spaceFront: number;
  spaceBack: number;
  spaceAbove: number;
  spaceBelow: number;
  isWallBound: boolean;
  wallDirection?: 'north' | 'south' | 'east' | 'west';
}

export interface MeasurementLabel {
  id: string;
  text: string;
  position: THREE.Vector3;
  direction: 'horizontal' | 'vertical';
  color: string;
  isObjectDimension: boolean;
}

export class MeasurementSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private enabled: boolean = false;
  private selectedObject: THREE.Object3D | null = null;
  private measurementLabels: THREE.Group;
  private measurementLines: THREE.Group;
  private currentMeasurements: MeasurementData | null = null;
  private roomWidth: number = 300;
  private roomHeight: number = 250;
  private existingItems: BathroomItem[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Create groups for measurement visuals
    this.measurementLabels = new THREE.Group();
    this.measurementLabels.name = 'MeasurementLabels';
    this.measurementLines = new THREE.Group();
    this.measurementLines.name = 'MeasurementLines';

    this.scene.add(this.measurementLabels);
    this.scene.add(this.measurementLines);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearMeasurements();
    } else if (this.selectedObject) {
      this.updateMeasurements();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setSelectedObject(object: THREE.Object3D | null): void {
    this.selectedObject = object;
    if (this.enabled) {
      this.updateMeasurements();
    }
  }

  public updateRoomDimensions(width: number, height: number): void {
    this.roomWidth = width;
    this.roomHeight = height;
    if (this.enabled && this.selectedObject) {
      this.updateMeasurements();
    }
  }

  public updateExistingItems(items: BathroomItem[]): void {
    this.existingItems = items;
    if (this.enabled && this.selectedObject) {
      this.updateMeasurements();
    }
  }

  private updateMeasurements(): void {
    this.clearMeasurements();

    if (!this.selectedObject || !this.enabled) return;

    const measurements = this.calculateMeasurements();
    if (!measurements) return;

    this.currentMeasurements = measurements;
    this.createMeasurementVisuals(measurements);
  }

  private calculateMeasurements(): MeasurementData | null {
    if (!this.selectedObject) return null;

    const objectType = this.selectedObject.userData.type as ComponentType;
    const objectScale = this.selectedObject.scale.x;
    const objectPosition = this.selectedObject.position;

    if (!objectType || !MODEL_DIMENSIONS[objectType]) return null;

    const dimensions = MODEL_DIMENSIONS[objectType];
    const scaledWidth = dimensions.width * objectScale;
    const scaledDepth = dimensions.depth * objectScale;
    const scaledHeight = dimensions.height * objectScale;

    // Check if object is wall-bound
    const isWallBound = this.isObjectWallBound(objectPosition, scaledWidth, scaledDepth);
    const wallDirection = this.getWallDirection(objectPosition, scaledWidth, scaledDepth);

    // Calculate available space
    const spaceCalculations = this.calculateAvailableSpace(
      objectPosition,
      scaledWidth,
      scaledDepth,
      scaledHeight,
      this.selectedObject.userData.itemId
    );

    return {
      objectWidth: scaledWidth,
      objectDepth: scaledDepth,
      objectHeight: scaledHeight,
      ...spaceCalculations,
      isWallBound,
      wallDirection
    };
  }

  private isObjectWallBound(position: THREE.Vector3, width: number, depth: number): boolean {
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;
    const tolerance = 50; // 5cm tolerance

    // Check if object is near any wall
    const nearNorth = Math.abs(position.z + roomHalfHeight) < tolerance;
    const nearSouth = Math.abs(position.z - roomHalfHeight) < tolerance;
    const nearEast = Math.abs(position.x - roomHalfWidth) < tolerance;
    const nearWest = Math.abs(position.x + roomHalfWidth) < tolerance;

    return nearNorth || nearSouth || nearEast || nearWest;
  }

  private getWallDirection(position: THREE.Vector3, width: number, depth: number): 'north' | 'south' | 'east' | 'west' | undefined {
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;
    const tolerance = 50;

    if (Math.abs(position.z + roomHalfHeight) < tolerance) return 'north';
    if (Math.abs(position.z - roomHalfHeight) < tolerance) return 'south';
    if (Math.abs(position.x - roomHalfWidth) < tolerance) return 'east';
    if (Math.abs(position.x + roomHalfWidth) < tolerance) return 'west';

    return undefined;
  }

  private calculateAvailableSpace(
    position: THREE.Vector3,
    width: number,
    depth: number,
    height: number,
    excludeItemId: number
  ): Omit<MeasurementData, 'objectWidth' | 'objectDepth' | 'objectHeight' | 'isWallBound' | 'wallDirection'> {
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;

    // Calculate space to room boundaries
    const spaceToWestWall = (position.x + roomHalfWidth) - width / 2;
    const spaceToEastWall = (roomHalfWidth - position.x) - width / 2;
    const spaceToNorthWall = (position.z + roomHalfHeight) - depth / 2;
    const spaceToSouthWall = (roomHalfHeight - position.z) - depth / 2;

    // Calculate space to other objects
    const spaceToObjects = this.calculateSpaceToOtherObjects(
      position, width, depth, height, excludeItemId
    );

    return {
      spaceLeft: Math.max(0, Math.min(spaceToWestWall, spaceToObjects.left)),
      spaceRight: Math.max(0, Math.min(spaceToEastWall, spaceToObjects.right)),
      spaceFront: Math.max(0, Math.min(spaceToNorthWall, spaceToObjects.front)),
      spaceBack: Math.max(0, Math.min(spaceToSouthWall, spaceToObjects.back)),
      spaceAbove: 250 - height, // Assume 250cm ceiling height
      spaceBelow: position.y
    };
  }

  private calculateSpaceToOtherObjects(
    position: THREE.Vector3,
    width: number,
    depth: number,
    height: number,
    excludeItemId: number
  ): { left: number; right: number; front: number; back: number } {
    let minLeft = Infinity;
    let minRight = Infinity;
    let minFront = Infinity;
    let minBack = Infinity;

    this.existingItems.forEach(item => {
      if (item.id === excludeItemId) return;

      const itemDimensions = MODEL_DIMENSIONS[item.type];
      if (!itemDimensions) return;

      const itemScale = item.scale || 1.0;
      const itemWidth = itemDimensions.width * itemScale;
      const itemDepth = itemDimensions.depth * itemScale;
      const itemHeight = itemDimensions.height * itemScale;

      const itemPos = new THREE.Vector3(item.position[0], item.position[1], item.position[2]);

      // Calculate distances between object edges
      const leftDistance = Math.abs(position.x - width/2 - (itemPos.x + itemWidth/2));
      const rightDistance = Math.abs(position.x + width/2 - (itemPos.x - itemWidth/2));
      const frontDistance = Math.abs(position.z - depth/2 - (itemPos.z + itemDepth/2));
      const backDistance = Math.abs(position.z + depth/2 - (itemPos.z - itemDepth/2));

      // Update minimum distances (considering object alignment)
      if (this.objectsAlignedOnAxis(position, itemPos, 'x')) {
        if (itemPos.x < position.x) minLeft = Math.min(minLeft, leftDistance);
        if (itemPos.x > position.x) minRight = Math.min(minRight, rightDistance);
      }

      if (this.objectsAlignedOnAxis(position, itemPos, 'z')) {
        if (itemPos.z < position.z) minFront = Math.min(minFront, frontDistance);
        if (itemPos.z > position.z) minBack = Math.min(minBack, backDistance);
      }
    });

    return {
      left: minLeft === Infinity ? 1000 : minLeft,
      right: minRight === Infinity ? 1000 : minRight,
      front: minFront === Infinity ? 1000 : minFront,
      back: minBack === Infinity ? 1000 : minBack
    };
  }

  private objectsAlignedOnAxis(pos1: THREE.Vector3, pos2: THREE.Vector3, axis: 'x' | 'z'): boolean {
    const tolerance = 20; // 2cm tolerance
    if (axis === 'x') {
      return Math.abs(pos1.z - pos2.z) < tolerance;
    } else {
      return Math.abs(pos1.x - pos2.x) < tolerance;
    }
  }

  private createMeasurementVisuals(measurements: MeasurementData): void {
    if (!this.selectedObject) return;

    const position = this.selectedObject.position;
    const labels: MeasurementLabel[] = [];

    if (measurements.isWallBound) {
      // Wall-bound object: show object width and side spaces
      this.createWallBoundMeasurements(measurements, position, labels);
    } else {
      // Free-standing object: show space in all directions
      this.createFreeStandingMeasurements(measurements, position, labels);
    }

    // Create visual elements for each label
    labels.forEach(label => {
      this.createMeasurementLabel(label);
      this.createMeasurementLine(label, measurements);
    });
  }

  private createWallBoundMeasurements(
    measurements: MeasurementData,
    position: THREE.Vector3,
    labels: MeasurementLabel[]
  ): void {
    const { objectWidth, objectDepth, spaceLeft, spaceRight, spaceFront, spaceBack, wallDirection } = measurements;

    if (wallDirection === 'north' || wallDirection === 'south') {
      // Object against north/south wall
      labels.push({
        id: 'object-width',
        text: `${Math.round(objectWidth)} cm`,
        position: new THREE.Vector3(position.x, position.y + 100, position.z),
        direction: 'horizontal',
        color: '#ff6b35',
        isObjectDimension: true
      });

      if (spaceLeft > 10) {
        labels.push({
          id: 'space-left',
          text: `${Math.round(spaceLeft)} cm`,
          position: new THREE.Vector3(position.x - objectWidth/2 - spaceLeft/2, position.y + 60, position.z),
          direction: 'horizontal',
          color: '#4CAF50',
          isObjectDimension: false
        });
      }

      if (spaceRight > 10) {
        labels.push({
          id: 'space-right',
          text: `${Math.round(spaceRight)} cm`,
          position: new THREE.Vector3(position.x + objectWidth/2 + spaceRight/2, position.y + 60, position.z),
          direction: 'horizontal',
          color: '#4CAF50',
          isObjectDimension: false
        });
      }
    } else {
      // Object against east/west wall
      labels.push({
        id: 'object-depth',
        text: `${Math.round(objectDepth)} cm`,
        position: new THREE.Vector3(position.x, position.y + 80, position.z),
        direction: 'horizontal',
        color: '#ff6b35',
        isObjectDimension: true
      });

      if (spaceFront > 10) {
        labels.push({
          id: 'space-front',
          text: `${Math.round(spaceFront)} cm`,
          position: new THREE.Vector3(position.x, position.y + 60, position.z - objectDepth/2 - spaceFront/2),
          direction: 'horizontal',
          color: '#4CAF50',
          isObjectDimension: false
        });
      }

      if (spaceBack > 10) {
        labels.push({
          id: 'space-back',
          text: `${Math.round(spaceBack)} cm`,
          position: new THREE.Vector3(position.x, position.y + 60, position.z + objectDepth/2 + spaceBack/2),
          direction: 'horizontal',
          color: '#4CAF50',
          isObjectDimension: false
        });
      }
    }
  }

  private createFreeStandingMeasurements(
    measurements: MeasurementData,
    position: THREE.Vector3,
    labels: MeasurementLabel[]
  ): void {
    const { objectWidth, objectDepth, spaceLeft, spaceRight, spaceFront, spaceBack } = measurements;

    // Show space in all four directions
    if (spaceLeft > 10) {
      labels.push({
        id: 'space-left',
        text: `${Math.round(spaceLeft)} cm`,
        position: new THREE.Vector3(position.x - objectWidth/2 - spaceLeft/2, position.y + 80, position.z),
        direction: 'horizontal',
        color: '#4CAF50',
        isObjectDimension: false
      });
    }

    if (spaceRight > 10) {
      labels.push({
        id: 'space-right',
        text: `${Math.round(spaceRight)} cm`,
        position: new THREE.Vector3(position.x + objectWidth/2 + spaceRight/2, position.y + 80, position.z),
        direction: 'horizontal',
        color: '#4CAF50',
        isObjectDimension: false
      });
    }

    if (spaceFront > 10) {
      labels.push({
        id: 'space-front',
        text: `${Math.round(spaceFront)} cm`,
        position: new THREE.Vector3(position.x, position.y + 80, position.z - objectDepth/2 - spaceFront/2),
        direction: 'horizontal',
        color: '#4CAF50',
        isObjectDimension: false
      });
    }

    if (spaceBack > 10) {
      labels.push({
        id: 'space-back',
        text: `${Math.round(spaceBack)} cm`,
        position: new THREE.Vector3(position.x, position.y + 80, position.z + objectDepth/2 + spaceBack/2),
        direction: 'horizontal',
        color: '#4CAF50',
        isObjectDimension: false
      });
    }

    // Show object dimensions
    labels.push({
      id: 'object-width',
      text: `${Math.round(objectWidth)} cm`,
      position: new THREE.Vector3(position.x, position.y + 120, position.z),
      direction: 'horizontal',
      color: '#ff6b35',
      isObjectDimension: true
    });
  }

  public forceUpdateMeasurements(): void {
    if (this.enabled && this.selectedObject) {
      this.updateMeasurements();
    }
  }

  private createMeasurementLabel(label: MeasurementLabel): void {
    // Create text sprite for the measurement label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

  // IKEA-style smaller labels
  const fontSize = 14;  // Much smaller (was 24)
  const padding = 4;    // Less padding (was 8)

  context.font = `bold ${fontSize}px Arial`;
  const textWidth = context.measureText(label.text).width;
  canvas.width = textWidth + padding * 2;
  canvas.height = fontSize + padding * 2;

  // Clear and redraw with IKEA-style background
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle rounded rectangle background
  context.fillStyle = 'rgba(0, 0, 0, 0.75)';
  if (context.roundRect) {
    context.roundRect(0, 0, canvas.width, canvas.height, 3);
  } else {
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.fill();

  // Clean white text
  context.fillStyle = 'white';
  context.font = `bold ${fontSize}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label.text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.1
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.copy(label.position);

  // Much smaller scale - IKEA style
  const scale = 0.8;  // Much smaller (was 2)
  sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);

  sprite.userData = { labelId: label.id };
  this.measurementLabels.add(sprite);
}

  private createMeasurementLine(label: MeasurementLabel, measurements: MeasurementData): void {
    if (!this.selectedObject) return;

    const position = this.selectedObject.position;
    const points: THREE.Vector3[] = [];

    // Create IKEA-style measurement lines
    const lineHeight = position.y + 40; // Lower height for cleaner look

    // Wall thickness to stop lines at wall surface, not inside wall
    const wallThickness = WALL_SETTINGS.THICKNESS; // Use actual wall thickness from constants
    const roomHalfWidth = this.roomWidth / 2;
    const roomHalfHeight = this.roomHeight / 2;

    if (label.isObjectDimension) {
      // Lines showing object dimensions - these go along the object edges
      const halfWidth = measurements.objectWidth / 2;
      const halfDepth = measurements.objectDepth / 2;

      if (label.id === 'object-width') {
        // Horizontal line across object width
        points.push(new THREE.Vector3(position.x - halfWidth, lineHeight, position.z));
        points.push(new THREE.Vector3(position.x + halfWidth, lineHeight, position.z));

        // Add end markers (small vertical lines)
        this.createEndMarker(new THREE.Vector3(position.x - halfWidth, lineHeight, position.z), 'vertical');
        this.createEndMarker(new THREE.Vector3(position.x + halfWidth, lineHeight, position.z), 'vertical');

      } else if (label.id === 'object-depth') {
        // Vertical line across object depth
        points.push(new THREE.Vector3(position.x, lineHeight, position.z - halfDepth));
        points.push(new THREE.Vector3(position.x, lineHeight, position.z + halfDepth));

        // Add end markers (small horizontal lines)
        this.createEndMarker(new THREE.Vector3(position.x, lineHeight, position.z - halfDepth), 'horizontal');
        this.createEndMarker(new THREE.Vector3(position.x, lineHeight, position.z + halfDepth), 'horizontal');
      }
    } else {
      // Lines showing available space - these extend FROM object TO walls/obstacles
      if (label.id === 'space-left') {
        const startX = position.x - measurements.objectWidth / 2;
        // Stop at wall inner surface, not room boundary
        const wallSurfaceX = -roomHalfWidth + wallThickness / 2;
        const endX = wallSurfaceX;

        points.push(new THREE.Vector3(startX, lineHeight, position.z));
        points.push(new THREE.Vector3(endX, lineHeight, position.z));

        // Add end markers
        this.createEndMarker(new THREE.Vector3(startX, lineHeight, position.z), 'vertical');
        this.createEndMarker(new THREE.Vector3(endX, lineHeight, position.z), 'vertical');

      } else if (label.id === 'space-right') {
        const startX = position.x + measurements.objectWidth / 2;
        // Stop at wall inner surface, not room boundary
        const wallSurfaceX = roomHalfWidth - wallThickness / 2;
        const endX = wallSurfaceX;

        points.push(new THREE.Vector3(startX, lineHeight, position.z));
        points.push(new THREE.Vector3(endX, lineHeight, position.z));

        // Add end markers
        this.createEndMarker(new THREE.Vector3(startX, lineHeight, position.z), 'vertical');
        this.createEndMarker(new THREE.Vector3(endX, lineHeight, position.z), 'vertical');

      } else if (label.id === 'space-front') {
        const startZ = position.z - measurements.objectDepth / 2;
        // Stop at wall inner surface, not room boundary
        const wallSurfaceZ = -roomHalfHeight + wallThickness / 2;
        const endZ = wallSurfaceZ;

        points.push(new THREE.Vector3(position.x, lineHeight, startZ));
        points.push(new THREE.Vector3(position.x, lineHeight, endZ));

        // Add end markers
        this.createEndMarker(new THREE.Vector3(position.x, lineHeight, startZ), 'horizontal');
        this.createEndMarker(new THREE.Vector3(position.x, lineHeight, endZ), 'horizontal');

      } else if (label.id === 'space-back') {
        const startZ = position.z + measurements.objectDepth / 2;
        // Stop at wall inner surface, not room boundary
        const wallSurfaceZ = roomHalfHeight - wallThickness / 2;
        const endZ = wallSurfaceZ;

        points.push(new THREE.Vector3(position.x, lineHeight, startZ));
        points.push(new THREE.Vector3(position.x, lineHeight, endZ));

        // Add end markers
        this.createEndMarker(new THREE.Vector3(position.x, lineHeight, startZ), 'horizontal');
        this.createEndMarker(new THREE.Vector3(position.x, lineHeight, endZ), 'horizontal');
      }
    }

    if (points.length === 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      // IKEA-style line material - thin and professional
      const material = new THREE.LineBasicMaterial({
        color: label.isObjectDimension ? '#ff6b35' : '#000000', // Orange for object, green for space
        linewidth: 2,
        transparent: true,
        opacity: 0.9
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { labelId: label.id };
      this.measurementLines.add(line);
    }
  }

  // NEW: Create end markers (small perpendicular lines at measurement ends)
  private createEndMarker(position: THREE.Vector3, direction: 'horizontal' | 'vertical'): void {
    const markerSize = 8; // Small marker size
    const points: THREE.Vector3[] = [];

    if (direction === 'vertical') {
      // Vertical end marker
      points.push(new THREE.Vector3(position.x, position.y - markerSize/2, position.z));
      points.push(new THREE.Vector3(position.x, position.y + markerSize/2, position.z));
    } else {
      // Horizontal end marker
      points.push(new THREE.Vector3(position.x, position.y, position.z - markerSize/2));
      points.push(new THREE.Vector3(position.x, position.y, position.z + markerSize/2));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: '#333333', // Dark gray for end markers
      linewidth: 2,
      transparent: true,
      opacity: 1.0
    });

    const marker = new THREE.Line(geometry, material);
    this.measurementLines.add(marker);
  }

  private clearMeasurements(): void {
    this.measurementLabels.clear();
    this.measurementLines.clear();
    this.currentMeasurements = null;
  }

  public getCurrentMeasurements(): MeasurementData | null {
    return this.currentMeasurements;
  }

  public dispose(): void {
    this.clearMeasurements();
    this.scene.remove(this.measurementLabels);
    this.scene.remove(this.measurementLines);
  }
}
