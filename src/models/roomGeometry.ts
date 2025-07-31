import * as THREE from 'three';
import { WALL_SETTINGS, CONSTRAINTS } from '../constants/dimensions';

// Type definitions for internal use
interface WallConfig {
  geometry: THREE.BoxGeometry;
  position: [number, number, number];
}

// FIXED: Simplified - no need for GridInfo interface since we only return the group
// interface GridInfo {
//   floorGridGroup: THREE.Group;
//   wallGridMap: Map<THREE.Mesh, THREE.Line[]>;
// }

// FIXED: Single material creation section - no duplicates
const createGridMaterials = () => {
  const floorGridMaterial = new THREE.LineBasicMaterial({
    color: 0x888888,
    opacity: 0.3,
    transparent: true
  });

  const wallGridMaterial = new THREE.LineBasicMaterial({
    color: 0x888888,
    opacity: 1, // INCREASED opacity for better visibility
    transparent: false,
    linewidth: 2
  });

  console.log('📐 Grid materials created:', {
    floorMaterial: floorGridMaterial,
    wallMaterial: wallGridMaterial
  });

  return { floorGridMaterial, wallGridMaterial };
};

// FIXED: Simplified to return only the floor grid group
export const createCustomGrid = (width: number, height: number): THREE.Group => {
  console.log('🏗️ Creating custom grid with dimensions:', { width, height });

  const floorGridGroup = new THREE.Group();
  const { GRID_SPACING } = CONSTRAINTS;

  console.log('📏 Grid spacing:', GRID_SPACING);

  // Use single material creation
  const { floorGridMaterial } = createGridMaterials();

  let lineCount = 0;

  // FLOOR GRID - Create vertical lines (parallel to Z-axis)
  for (let x = -width / 2; x <= width / 2; x += GRID_SPACING) {
    const points: THREE.Vector3[] = [
      new THREE.Vector3(x, 0, -height / 2),
      new THREE.Vector3(x, 0, height / 2)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, floorGridMaterial);
    floorGridGroup.add(line);
    lineCount++;
  }

  // FLOOR GRID - Create horizontal lines (parallel to X-axis)
  for (let z = -height / 2; z <= height / 2; z += GRID_SPACING) {
    const points: THREE.Vector3[] = [
      new THREE.Vector3(-width / 2, 0, z),
      new THREE.Vector3(width / 2, 0, z)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, floorGridMaterial);
    floorGridGroup.add(line);
    lineCount++;
  }

  floorGridGroup.position.y = 0; // Position at floor level
  floorGridGroup.name = 'FloorGrid'; // Add name for debugging

  console.log('✅ Floor grid created:', {
    lineCount,
    groupPosition: floorGridGroup.position,
    groupName: floorGridGroup.name,
    children: floorGridGroup.children.length
  });

  // FIXED: Return only the floor grid group
  return floorGridGroup;
};

/**
 * UPDATED CONSTRAINT FUNCTIONS for interior walls
 */

// Get the actual interior room boundaries (accounting for wall thickness)
export const getInteriorBoundaries = (roomWidth: number, roomHeight: number) => {
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
    }
  };
};


/**
 * WALL GRID for interior walls
 */
export const createWallGridLines = (
  wallDirection: 'north' | 'south' | 'east' | 'west',
  roomWidth: number,
  roomHeight: number
): THREE.Line[] => {
  console.log(`🧱 Creating wall grid for ${wallDirection} wall (interior system)`);

  const { GRID_SPACING } = CONSTRAINTS;
  const wallHeight = WALL_SETTINGS.HEIGHT;
  const { wallFaces } = getInteriorBoundaries(roomWidth, roomHeight);

  const wallGridLines: THREE.Line[] = [];

  // Use single material creation
  const { wallGridMaterial } = createGridMaterials();

  if (wallDirection === 'north' || wallDirection === 'south') {
    const wallZ = wallFaces[wallDirection];

    // Vertical lines
    for (let x = -(roomWidth / 2); x <= (roomWidth / 2); x += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(x, 0, wallZ),
        new THREE.Vector3(x, wallHeight, wallZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_v_${x}`;
      wallGridLines.push(line);
    }

    // Horizontal lines
    for (let y = 0; y <= wallHeight; y += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(-(roomWidth / 2), y, wallZ),
        new THREE.Vector3((roomWidth / 2), y, wallZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_h_${y}`;
      wallGridLines.push(line);
    }
  } else if (wallDirection === 'east' || wallDirection === 'west') {
    const wallX = wallFaces[wallDirection];

    // Vertical lines
    for (let z = -(roomHeight / 2); z <= (roomHeight / 2); z += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(wallX, 0, z),
        new THREE.Vector3(wallX, wallHeight, z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_v_${z}`;
      wallGridLines.push(line);
    }

    // Horizontal lines
    for (let y = 0; y <= wallHeight; y += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(wallX, y, -(roomHeight / 2)),
        new THREE.Vector3(wallX, y, (roomHeight / 2))
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_h_${y}`;
      wallGridLines.push(line);
    }
  }

  console.log(`✅ Wall grid created for ${wallDirection}: ${wallGridLines.length} lines`);
  return wallGridLines;
};

/**
 * INTERIOR WALLS APPROACH - RECOMMENDED
 *
 * Floor dimensions = Interior usable space
 * Walls extend INWARD from floor edges by wall thickness
 * Clean alignment, no overhang issues
 */
export const createWalls = (
  roomWidth: number,
  roomHeight: number,
  wallMaterial: THREE.Material
): THREE.Mesh[] => {
  console.log('🏗️ Creating interior walls with dimensions:', { roomWidth, roomHeight });

  const { HEIGHT: wallHeight, THICKNESS: wallThickness } = WALL_SETTINGS;

  // Calculate half dimensions for positioning
  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;

  // Calculate wall positions - INTERIOR APPROACH
  // Walls sit INSIDE the floor boundaries
  const wallOffset = wallThickness / 2;

  const walls: THREE.Mesh[] = [];

  const wallConfigs: WallConfig[] = [
    {
      // North wall - inner face at room boundary
      geometry: new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
      position: [0, wallHeight / 2, -roomHalfHeight + wallOffset]
    },
    {
      // South wall - inner face at room boundary
      geometry: new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
      position: [0, wallHeight / 2, roomHalfHeight - wallOffset]
    },
    {
      // East wall - inner face at room boundary
      geometry: new THREE.BoxGeometry(wallThickness, wallHeight, roomHeight),
      position: [roomHalfWidth - wallOffset, wallHeight / 2, 0]
    },
    {
      // West wall - inner face at room boundary
      geometry: new THREE.BoxGeometry(wallThickness, wallHeight, roomHeight),
      position: [-roomHalfWidth + wallOffset, wallHeight / 2, 0]
    }
  ];

  wallConfigs.forEach((wallData: WallConfig, index: number) => {
    const wall = new THREE.Mesh(wallData.geometry, wallMaterial);
    wall.position.set(wallData.position[0], wallData.position[1], wallData.position[2]);
    wall.receiveShadow = true;
    // wall.castShadow = true;
    wall.userData.isWall = true;

    // Add wall direction for easier identification
    const directions = ['north', 'south', 'east', 'west'];
    wall.userData.wallDirection = directions[index];
    wall.name = `Wall_${directions[index]}`;

    walls.push(wall);
  });

  console.log('✅ Interior walls created - no overhang issues:',
    walls.map(wall => ({
      name: wall.name,
      direction: wall.userData.wallDirection,
      position: wall.position,
      innerFacePosition: getInnerFacePosition(wall)
    }))
  );

  return walls;
};

/**
 * Helper function to get inner face position of walls
 * Useful for object placement calculations
 */
function getInnerFacePosition(wall: THREE.Mesh): { x?: number, z?: number } {
  const direction = wall.userData.wallDirection;
  const wallThickness = WALL_SETTINGS.THICKNESS;
  const halfThickness = wallThickness / 2;

  switch (direction) {
    case 'north':
      return { z: wall.position.z + halfThickness };
    case 'south':
      return { z: wall.position.z - halfThickness };
    case 'east':
      return { x: wall.position.x - halfThickness };
    case 'west':
      return { x: wall.position.x + halfThickness };
    default:
      return {};
  }
}

/**
 * IMPROVED FLOOR - perfectly aligned with interior walls
 */
export const createFloor = (
  roomWidth: number,
  roomHeight: number,
  floorMaterial: THREE.Material
): THREE.Mesh => {
  console.log('🏗️ Creating floor with dimensions:', { roomWidth, roomHeight });

  const floorThickness = 1; // Thin floor for better appearance
  const floorGeometry = new THREE.BoxGeometry(roomWidth, floorThickness, roomHeight);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);

  // Position floor so its TOP surface is exactly at y=0 (floor level)
  floor.position.y = -floorThickness / 2;
  floor.receiveShadow = true;
  floor.userData.isFloor = true;
  floor.name = 'Floor';

  console.log('✅ Floor created - perfectly aligned with interior walls');

  return floor;
}
