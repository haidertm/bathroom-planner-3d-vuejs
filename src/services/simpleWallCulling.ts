// src/services/simpleWallCulling.ts - UPDATED for Interior Walls System
import * as THREE from 'three';
import { WALL_SETTINGS } from '../constants/dimensions';

// Type definitions
type WallDirection = 'north' | 'south' | 'east' | 'west';

interface RoomSize {
  width: number;
  height: number;
}

interface WallToHide {
  wall: THREE.Mesh;
  direction: WallDirection;
}

export class SimpleWallCulling {
  private walls: THREE.Mesh[];
  private camera: THREE.Camera | null;
  public enabled: boolean;
  private roomSize: RoomSize;
  private wallMap: Map<THREE.Mesh, WallDirection>;
  private wallGridMap: Map<THREE.Mesh, THREE.Line[]>;

  constructor () {
    this.walls = [];
    this.camera = null;
    this.enabled = true;
    this.roomSize = { width: 10, height: 10 };
    this.wallMap = new Map<THREE.Mesh, WallDirection>();
    this.wallGridMap = new Map<THREE.Mesh, THREE.Line[]>();
  }

  initialize (walls: THREE.Mesh[], camera: THREE.Camera): void {
    this.walls = walls;
    this.camera = camera;
    this.identifyWalls();
  }

  registerWallGridLines (wall: THREE.Mesh, gridLines: THREE.Line[]): void {
    this.wallGridMap.set(wall, gridLines);
  }

  clearWallGridLines (): void {
    this.wallGridMap.clear();
  }

  /**
   * UPDATED: Wall identification for interior walls system
   */
  private identifyWalls (): void {
    console.log('🔍 Identifying walls for interior wall system...');
    this.wallMap.clear();

    const roomHalfWidth: number = this.roomSize.width / 2;
    const roomHalfHeight: number = this.roomSize.height / 2;
    const wallThickness = WALL_SETTINGS.THICKNESS;
    const wallOffset = wallThickness / 2;

    // Calculate expected wall positions for interior walls system
    const expectedPositions = {
      north: -roomHalfHeight + wallOffset,
      south: roomHalfHeight - wallOffset,
      east: roomHalfWidth - wallOffset,
      west: -roomHalfWidth + wallOffset
    };

    console.log('Expected wall positions (interior system):', expectedPositions);

    // Identify each wall by its position with updated logic
    this.walls.forEach((wall: THREE.Mesh, index) => {
      const pos = wall.position;
      console.log(`Wall ${index} position:`, { x: pos.x.toFixed(2), z: pos.z.toFixed(2) });

      const tolerance = wallThickness; // Use wall thickness as tolerance

      // North wall (negative Z, interior position)
      if (Math.abs(pos.z - expectedPositions.north) < tolerance) {
        this.wallMap.set(wall, 'north');
        console.log(`✅ Wall ${index} identified as NORTH wall`);
      }
      // South wall (positive Z, interior position)
      else if (Math.abs(pos.z - expectedPositions.south) < tolerance) {
        this.wallMap.set(wall, 'south');
        console.log(`✅ Wall ${index} identified as SOUTH wall`);
      }
      // East wall (positive X, interior position)
      else if (Math.abs(pos.x - expectedPositions.east) < tolerance) {
        this.wallMap.set(wall, 'east');
        console.log(`✅ Wall ${index} identified as EAST wall`);
      }
      // West wall (negative X, interior position)
      else if (Math.abs(pos.x - expectedPositions.west) < tolerance) {
        this.wallMap.set(wall, 'west');
        console.log(`✅ Wall ${index} identified as WEST wall`);
      }
      else {
        console.warn(`⚠️ Wall ${index} could not be identified! Position: (${pos.x.toFixed(2)}, ${pos.z.toFixed(2)})`);
      }
    });

    console.log('Wall identification complete:', Array.from(this.wallMap.entries()).map(([wall, direction]) =>
      `${direction}: (${wall.position.x.toFixed(1)}, ${wall.position.z.toFixed(1)})`
    ));
  }

  setEnabled (enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.showAllWalls();
    }
  }

  private showAllWalls (): void {
    this.walls.forEach((wall: THREE.Mesh) => {
      wall.visible = true;

      // Reset material transparency
      if (Array.isArray(wall.material)) {
        wall.material.forEach((mat: THREE.Material) => {
          if (mat.transparent) {
            mat.transparent = false;
            mat.opacity = 1;
          }
        });
      } else {
        if (wall.material.transparent) {
          wall.material.transparent = false;
          wall.material.opacity = 1;
        }
      }

      // Show associated grid lines
      const gridLines = this.wallGridMap.get(wall);
      if (gridLines) {
        gridLines.forEach(line => {
          line.visible = true;
        });
      }
    });
  }

  updateRoomSize (width: number, height: number): void {
    this.roomSize = { width, height };
    // Re-identify walls with new size
    if (this.walls.length > 0) {
      this.identifyWalls();
    }
  }

  /**
   * UPDATED: Wall visibility logic for interior walls system
   */
  updateWallVisibility (): void {
    if (!this.enabled || !this.camera) {
      return;
    }

    // First, show all walls and their grid lines
    this.walls.forEach((wall: THREE.Mesh) => {
      wall.visible = true;
      const gridLines = this.wallGridMap.get(wall);
      if (gridLines) {
        gridLines.forEach(line => {
          line.visible = true;
        });
      }
    });

    // Get camera position and room dimensions
    const cameraPos = this.camera.position;
    const roomHalfWidth: number = this.roomSize.width / 2;
    const roomHalfHeight: number = this.roomSize.height / 2;
    const wallThickness = WALL_SETTINGS.THICKNESS;

    // Calculate wall hiding zones (areas where camera should hide walls)
    // For interior walls, we need to account for the actual wall positions
    const hideDistance = wallThickness + 20; // Distance from wall center to start hiding

    const wallsToHide: WallToHide[] = [];

    this.wallMap.forEach((direction: WallDirection, wall: THREE.Mesh) => {
      let shouldHide: boolean = false;

      switch (direction) {
        case 'north':
          // Hide north wall if camera is north of the wall position
          const northWallPos = -roomHalfHeight + wallThickness / 2;
          shouldHide = cameraPos.z < northWallPos - hideDistance;
          break;

        case 'south':
          // Hide south wall if camera is south of the wall position
          const southWallPos = roomHalfHeight - wallThickness / 2;
          shouldHide = cameraPos.z > southWallPos + hideDistance;
          break;

        case 'east':
          // Hide east wall if camera is east of the wall position
          const eastWallPos = roomHalfWidth - wallThickness / 2;
          shouldHide = cameraPos.x > eastWallPos + hideDistance;
          break;

        case 'west':
          // Hide west wall if camera is west of the wall position
          const westWallPos = -roomHalfWidth + wallThickness / 2;
          shouldHide = cameraPos.x < westWallPos - hideDistance;
          break;
      }

      if (shouldHide) {
        wallsToHide.push({ wall, direction });
      }
    });

    // Hide the identified walls and their grid lines
    wallsToHide.forEach(({ wall }: WallToHide) => {
      // Hide the wall
      wall.visible = false;

      // Hide associated grid lines
      const gridLines = this.wallGridMap.get(wall);
      if (gridLines) {
        gridLines.forEach(line => {
          line.visible = false;
        });
      }
    });
  }

  dispose (): void {
    this.walls = [];
    this.camera = null;
    this.wallMap.clear();
    this.wallGridMap.clear();
  }

  // Utility methods
  getWallCount (): number {
    return this.walls.length;
  }

  getVisibleWalls (): THREE.Mesh[] {
    return this.walls.filter(wall => wall.visible);
  }

  getHiddenWalls (): THREE.Mesh[] {
    return this.walls.filter(wall => !wall.visible);
  }

  getWallDirection (wall: THREE.Mesh): WallDirection | undefined {
    return this.wallMap.get(wall);
  }

  getRoomSize (): RoomSize {
    return { ...this.roomSize };
  }

  isWallVisible (wall: THREE.Mesh): boolean {
    return wall.visible;
  }

  // Debug method to get wall visibility status
  getWallVisibilityStatus (): Array<{
    direction: WallDirection;
    visible: boolean;
    position: { x: number; z: number }
    expectedPosition: { x?: number; z?: number }
  }> {
    const roomHalfWidth: number = this.roomSize.width / 2;
    const roomHalfHeight: number = this.roomSize.height / 2;
    const wallThickness = WALL_SETTINGS.THICKNESS;
    const wallOffset = wallThickness / 2;

    const expectedPositions = {
      north: { z: -roomHalfHeight + wallOffset },
      south: { z: roomHalfHeight - wallOffset },
      east: { x: roomHalfWidth - wallOffset },
      west: { x: -roomHalfWidth + wallOffset }
    };

    return Array.from(this.wallMap.entries()).map(([wall, direction]) => ({
      direction,
      visible: wall.visible,
      position: { x: wall.position.x, z: wall.position.z },
      expectedPosition: expectedPositions[direction] || {}
    }));
  }

  // Debug method for grid line status
  getGridLineStatus (): Array<{
    direction: WallDirection;
    gridLineCount: number;
    visibleGridLines: number;
  }> {
    return Array.from(this.wallMap.entries()).map(([wall, direction]) => {
      const gridLines = this.wallGridMap.get(wall);
      const gridLineCount = gridLines ? gridLines.length : 0;
      const visibleGridLines = gridLines ? gridLines.filter(line => line.visible).length : 0;

      return {
        direction,
        gridLineCount,
        visibleGridLines
      };
    });
  }
}
