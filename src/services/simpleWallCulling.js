import * as THREE from "three";

export class SimpleWallCulling {
  constructor() {
    this.walls = [];
    this.camera = null;
    this.enabled = true;
    this.roomSize = { width: 10, height: 10 };
    this.wallMap = new Map(); // Store wall positions for identification
  }

  initialize(walls, camera) {
    this.walls = walls;
    this.camera = camera;
    this.identifyWalls();
  }

  identifyWalls() {
    // Clear the map
    this.wallMap.clear();

    const roomHalfWidth = this.roomSize.width / 2;
    const roomHalfHeight = this.roomSize.height / 2;

    // Identify each wall by its position
    this.walls.forEach(wall => {
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

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.showAllWalls();
    }
  }

  showAllWalls() {
    this.walls.forEach(wall => {
      wall.visible = true;
      // Reset material if it was made transparent
      if (wall.material.transparent) {
        wall.material.transparent = false;
        wall.material.opacity = 1;
      }
    });
  }

  updateRoomSize(width, height) {
    this.roomSize = { width, height };
    // Re-identify walls with new size
    if (this.walls.length > 0) {
      this.identifyWalls();
    }
  }

  updateWallVisibility() {
    if (!this.enabled || !this.camera) return;

    // First, show all walls
    this.walls.forEach(wall => {
      wall.visible = true;
    });

    // Get camera position
    const cameraPos = this.camera.position;
    const roomCenter = new THREE.Vector3(0, 0, 0);

    // Calculate which walls should be hidden based on camera position
    const wallsToHide = [];

    // Simple logic: hide walls that are closest to camera position
    const roomHalfWidth = this.roomSize.width / 2;
    const roomHalfHeight = this.roomSize.height / 2;

    // Check each direction and hide the wall if camera is on that side
    this.wallMap.forEach((direction, wall) => {
      let shouldHide = false;

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
    wallsToHide.forEach(({ wall, direction }) => {
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

  dispose() {
    this.walls = [];
    this.camera = null;
    this.wallMap.clear();
  }
}
