import * as THREE from 'three';

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
  private wallGridMap: Map<THREE.Mesh, THREE.Line[]>; // NEW: Track grid lines for each wall

  constructor () {
    this.walls = [];
    this.camera = null;
    this.enabled = true;
    this.roomSize = { width: 10, height: 10 };
    this.wallMap = new Map<THREE.Mesh, WallDirection>();
    this.wallGridMap = new Map<THREE.Mesh, THREE.Line[]>(); // NEW: Initialize grid map
  }

  initialize (walls: THREE.Mesh[], camera: THREE.Camera): void {
    this.walls = walls;
    this.camera = camera;
    this.identifyWalls();
  }

  // NEW: Method to register grid lines for each wall
  registerWallGridLines (wall: THREE.Mesh, gridLines: THREE.Line[]): void {
    this.wallGridMap.set(wall, gridLines);
  }

  // NEW: Method to clear grid line associations
  clearWallGridLines (): void {
    this.wallGridMap.clear();
  }

  private identifyWalls (): void {
    // Clear the map
    this.wallMap.clear();

    const roomHalfWidth: number = this.roomSize.width / 2;
    const roomHalfHeight: number = this.roomSize.height / 2;

    // Identify each wall by its position
    this.walls.forEach((wall: THREE.Mesh) => {
      const pos = wall.position;

      // North wall (negative Z)
      if (Math.abs(pos.z + roomHalfHeight) < 0.5) {
        this.wallMap.set(wall, 'north');
      }
      // South wall (positive Z)
      else if (Math.abs(pos.z - roomHalfHeight) < 0.5) {
        this.wallMap.set(wall, 'south');
      }
      // East wall (positive X)
      else if (Math.abs(pos.x - roomHalfWidth) < 0.5) {
        this.wallMap.set(wall, 'east');
      }
      // West wall (negative X)
      else if (Math.abs(pos.x + roomHalfWidth) < 0.5) {
        this.wallMap.set(wall, 'west');
      }
    });

    console.log('Wall identification:', Array.from(this.wallMap.entries()).map(([wall, direction]) =>
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
      // Reset material if it was made transparent
      // Handle both single material and material array
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

      // NEW: Show associated grid lines when showing wall
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

  updateWallVisibility (): void {
    if (!this.enabled || !this.camera) {
      return;
    }

    console.log('🔄 ===== WALL CULLING UPDATE =====');
    console.log(`📷 Camera position: (${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)})`);

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

    // Get camera position and calculate which walls to hide
    const cameraPos = this.camera.position;
    const wallsToHide: WallToHide[] = [];
    const roomHalfWidth: number = this.roomSize.width / 2;
    const roomHalfHeight: number = this.roomSize.height / 2;

    // Check each wall
    this.wallMap.forEach((direction: WallDirection, wall: THREE.Mesh) => {
      let shouldHide: boolean = false;

      switch (direction) {
        case 'north':
          shouldHide = cameraPos.z < -roomHalfHeight + 2;
          break;
        case 'south':
          shouldHide = cameraPos.z > roomHalfHeight - 2;
          break;
        case 'east':
          shouldHide = cameraPos.x > roomHalfWidth - 2;
          break;
        case 'west':
          shouldHide = cameraPos.x < -roomHalfWidth + 2;
          break;
      }

      if (shouldHide) {
        wallsToHide.push({ wall, direction });
      }
    });

    // Hide walls and their grid lines
    wallsToHide.forEach(({ wall, direction }: WallToHide) => {
      console.log(`🚫 Hiding ${direction} wall...`);

      // Hide the wall
      wall.visible = false;

      // Hide associated grid lines
      const gridLines = this.wallGridMap.get(wall);
      if (gridLines) {
        gridLines.forEach(line => {
          line.visible = false;
        });
        console.log(`✅ Hid ${gridLines.length} grid lines for ${direction} wall`);
      } else {
        console.log(`❌ NO GRID LINES FOUND FOR ${direction} WALL - THIS IS THE PROBLEM!`);
      }
    });

    console.log('🔄 ===== WALL CULLING UPDATE END =====');
  }

  dispose (): void {
    this.walls = [];
    this.camera = null;
    this.wallMap.clear();
    this.wallGridMap.clear(); // NEW: Clear grid map
  }

  // Additional utility methods for better functionality
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
  }> {
    return Array.from(this.wallMap.entries()).map(([wall, direction]) => ({
      direction,
      visible: wall.visible,
      position: { x: wall.position.x, z: wall.position.z }
    }));
  }

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
