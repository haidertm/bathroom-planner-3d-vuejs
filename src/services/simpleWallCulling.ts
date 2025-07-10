import * as THREE from "three";

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

  constructor() {
    this.walls = [];
    this.camera = null;
    this.enabled = true;
    this.roomSize = { width: 10, height: 10 };
    this.wallMap = new Map<THREE.Mesh, WallDirection>();
  }

  initialize(walls: THREE.Mesh[], camera: THREE.Camera): void {
    this.walls = walls;
    this.camera = camera;
    this.identifyWalls();
  }

  private identifyWalls(): void {
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

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.showAllWalls();
    }
  }

  private showAllWalls(): void {
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
    });
  }

  updateRoomSize(width: number, height: number): void {
    this.roomSize = { width, height };
    // Re-identify walls with new size
    if (this.walls.length > 0) {
      this.identifyWalls();
    }
  }

  updateWallVisibility(): void {
    if (!this.enabled || !this.camera) return;

    // First, show all walls
    this.walls.forEach((wall: THREE.Mesh) => {
      wall.visible = true;
    });

    // Get camera position
    const cameraPos = this.camera.position;
    const roomCenter = new THREE.Vector3(0, 0, 0);

    // Calculate which walls should be hidden based on camera position
    const wallsToHide: WallToHide[] = [];

    // Simple logic: hide walls that are closest to camera position
    const roomHalfWidth: number = this.roomSize.width / 2;
    const roomHalfHeight: number = this.roomSize.height / 2;

    // Check each direction and hide the wall if camera is on that side
    this.wallMap.forEach((direction: WallDirection, wall: THREE.Mesh) => {
      let shouldHide: boolean = false;

      switch (direction) {
        case 'north':
          // Hide north wall if camera is north of room center
          shouldHide = cameraPos.z < -roomHalfHeight + 2;
          break;
        case 'south':
          // Hide south wall if camera is south of room center
          shouldHide = cameraPos.z > roomHalfHeight - 2;
          break;
        case 'east':
          // Hide east wall if camera is east of room center
          shouldHide = cameraPos.x > roomHalfWidth - 2;
          break;
        case 'west':
          // Hide west wall if camera is west of room center
          shouldHide = cameraPos.x < -roomHalfWidth + 2;
          break;
      }

      if (shouldHide) {
        wallsToHide.push({ wall, direction });
      }
    });

    // Hide the identified walls completely
    wallsToHide.forEach(({ wall, direction }: WallToHide) => {
      wall.visible = false;
      // console.log(`Hiding ${direction} wall - visible: ${wall.visible}`);
    });

    // // Debug: Log current wall states
    // console.log('Current wall visibility:', Array.from(this.wallMap.entries()).map(([wall, direction]) =>
    //   `${direction}: ${wall.visible}`
    // ));

    // Debug output for camera position
    // if (wallsToHide.length > 0) {
    //   console.log(`Camera at (${cameraPos.x.toFixed(1)}, ${cameraPos.z.toFixed(1)}) - Hiding: ${wallsToHide.map(w => w.direction).join(', ')}`);
    // }
  }

  dispose(): void {
    this.walls = [];
    this.camera = null;
    this.wallMap.clear();
  }

  // Additional utility methods for better functionality
  getWallCount(): number {
    return this.walls.length;
  }

  getVisibleWalls(): THREE.Mesh[] {
    return this.walls.filter(wall => wall.visible);
  }

  getHiddenWalls(): THREE.Mesh[] {
    return this.walls.filter(wall => !wall.visible);
  }

  getWallDirection(wall: THREE.Mesh): WallDirection | undefined {
    return this.wallMap.get(wall);
  }

  getRoomSize(): RoomSize {
    return { ...this.roomSize };
  }

  isWallVisible(wall: THREE.Mesh): boolean {
    return wall.visible;
  }

  // Debug method to get wall visibility status
  getWallVisibilityStatus(): Array<{ direction: WallDirection; visible: boolean; position: { x: number; z: number } }> {
    return Array.from(this.wallMap.entries()).map(([wall, direction]) => ({
      direction,
      visible: wall.visible,
      position: { x: wall.position.x, z: wall.position.z }
    }));
  }
}
