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

export const createTestWallGridLines = (
  wallDirection: 'north' | 'south' | 'east' | 'west',
  roomWidth: number,
  roomHeight: number
): THREE.Line[] => {
  console.log(`🧪 Creating TEST wall grid lines for ${wallDirection} wall (bright colors)`);

  const { GRID_SPACING } = CONSTRAINTS;
  const wallHeight = WALL_SETTINGS.HEIGHT;
  const wallGridLines: THREE.Line[] = [];

  // Create VERY bright, obvious materials for testing
  const colors = {
    north: 0xff0000,  // Bright red
    south: 0x00ff00,  // Bright green
    east: 0x0000ff,   // Bright blue
    west: 0xffff00    // Bright yellow
  };

  const testWallGridMaterial = new THREE.LineBasicMaterial({
    color: colors[wallDirection],
    linewidth: 5,     // Thick lines
    opacity: 1.0,     // Fully opaque
    transparent: false
  });

  console.log(`🎨 Test material color for ${wallDirection}:`, testWallGridMaterial.color.getHexString());

  // Create just a few test lines to avoid clutter
  if (wallDirection === 'north' || wallDirection === 'south') {
    const wallZ = wallDirection === 'north' ? -roomHeight / 2 : roomHeight / 2;

    // Create 3 vertical test lines
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * (roomWidth / 4); // -1/4, 0, 1/4 of room width
      const points: THREE.Vector3[] = [
        new THREE.Vector3(x, 0, wallZ),
        new THREE.Vector3(x, wallHeight, wallZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, testWallGridMaterial);
      line.name = `TestWallGrid_${wallDirection}_v${i}`;
      wallGridLines.push(line);
    }

    // Create 3 horizontal test lines
    for (let i = 0; i < 3; i++) {
      const y = (i + 1) * (wallHeight / 4); // 1/4, 2/4, 3/4 of wall height
      const points: THREE.Vector3[] = [
        new THREE.Vector3(-roomWidth / 2, y, wallZ),
        new THREE.Vector3(roomWidth / 2, y, wallZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, testWallGridMaterial);
      line.name = `TestWallGrid_${wallDirection}_h${i}`;
      wallGridLines.push(line);
    }
  } else if (wallDirection === 'east' || wallDirection === 'west') {
    const wallX = wallDirection === 'east' ? roomWidth / 2 : -roomWidth / 2;

    // Create 3 vertical test lines
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * (roomHeight / 4); // -1/4, 0, 1/4 of room height
      const points: THREE.Vector3[] = [
        new THREE.Vector3(wallX, 0, z),
        new THREE.Vector3(wallX, wallHeight, z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, testWallGridMaterial);
      line.name = `TestWallGrid_${wallDirection}_v${i}`;
      wallGridLines.push(line);
    }

    // Create 3 horizontal test lines
    for (let i = 0; i < 3; i++) {
      const y = (i + 1) * (wallHeight / 4); // 1/4, 2/4, 3/4 of wall height
      const points: THREE.Vector3[] = [
        new THREE.Vector3(wallX, y, -roomHeight / 2),
        new THREE.Vector3(wallX, y, roomHeight / 2)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, testWallGridMaterial);
      line.name = `TestWallGrid_${wallDirection}_h${i}`;
      wallGridLines.push(line);
    }
  }

  console.log(`🧪 Created ${wallGridLines.length} TEST grid lines for ${wallDirection} wall`);
  return wallGridLines;
};

// Function to create wall grid lines for a specific wall direction
export const createWallGridLines = (
  wallDirection: 'north' | 'south' | 'east' | 'west',
  roomWidth: number,
  roomHeight: number
): THREE.Line[] => {
  console.log(`🧱 Creating wall grid lines for ${wallDirection} wall:`, { roomWidth, roomHeight });

  const { GRID_SPACING } = CONSTRAINTS;
  const wallHeight = WALL_SETTINGS.HEIGHT;
  const wallThickness = WALL_SETTINGS.THICKNESS;
  const wallGridLines: THREE.Line[] = [];

  // Use single material creation
  const { wallGridMaterial } = createGridMaterials();

  // FIXED: Calculate inner wall surface positions (offset by half wall thickness)
  const roomHalfWidth = roomWidth / 2;
  const roomHalfHeight = roomHeight / 2;
  const halfWallThickness = wallThickness / 2;

  if (wallDirection === 'north' || wallDirection === 'south') {
    // For north/south walls, adjust Z position to be on inner surface
    const wallZ = wallDirection === 'north'
      ? -roomHalfHeight + halfWallThickness  // North wall inner surface
      : roomHalfHeight - halfWallThickness;  // South wall inner surface

    console.log(`📍 ${wallDirection} wall inner surface Z position:`, wallZ);

    // Vertical lines on north/south walls
    for (let x = -roomHalfWidth; x <= roomHalfWidth; x += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(x, 0, wallZ),
        new THREE.Vector3(x, wallHeight, wallZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_v_${x}`;
      wallGridLines.push(line);
    }

    // Horizontal lines on north/south walls
    for (let y = 0; y <= wallHeight; y += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(-roomHalfWidth, y, wallZ),
        new THREE.Vector3(roomHalfWidth, y, wallZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_h_${y}`;
      wallGridLines.push(line);
    }
  } else if (wallDirection === 'east' || wallDirection === 'west') {
    // For east/west walls, adjust X position to be on inner surface
    const wallX = wallDirection === 'east'
      ? roomHalfWidth - halfWallThickness   // East wall inner surface
      : -roomHalfWidth + halfWallThickness; // West wall inner surface

    console.log(`📍 ${wallDirection} wall inner surface X position:`, wallX);

    // Vertical lines on east/west walls
    for (let z = -roomHalfHeight; z <= roomHalfHeight; z += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(wallX, 0, z),
        new THREE.Vector3(wallX, wallHeight, z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_v_${z}`;
      wallGridLines.push(line);
    }

    // Horizontal lines on east/west walls
    for (let y = 0; y <= wallHeight; y += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(wallX, y, -roomHalfHeight),
        new THREE.Vector3(wallX, y, roomHalfHeight)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_h_${y}`;
      wallGridLines.push(line);
    }
  }

  console.log(`✅ Wall grid lines created for ${wallDirection}:`, {
    lineCount: wallGridLines.length,
    wallHeight,
    gridSpacing: GRID_SPACING,
    wallThickness,
    innerSurfaceOffset: halfWallThickness
  });

  return wallGridLines;
};

export const createWalls = (
  roomWidth: number,
  roomHeight: number,
  wallMaterial: THREE.Material
): THREE.Mesh[] => {
  console.log('🏗️ Creating walls with dimensions:', { roomWidth, roomHeight });

  const { HEIGHT: wallHeight, THICKNESS: wallThickness } = WALL_SETTINGS;
  const roomSizeX = roomWidth / 2;
  const roomSizeZ = roomHeight / 2;

  const walls: THREE.Mesh[] = [];

  // FIXED: Position walls to start from floor level (y=0) and extend upward
  const wallConfigs: WallConfig[] = [
    { // North wall
      geometry: new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
      position: [0, wallHeight / 2, -roomSizeZ] // Bottom at y=0, top at y=wallHeight
    },
    { // South wall
      geometry: new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
      position: [0, wallHeight / 2, roomSizeZ] // Bottom at y=0, top at y=wallHeight
    },
    { // East wall
      geometry: new THREE.BoxGeometry(wallThickness, wallHeight, roomHeight),
      position: [roomSizeX, wallHeight / 2, 0] // Bottom at y=0, top at y=wallHeight
    },
    { // West wall
      geometry: new THREE.BoxGeometry(wallThickness, wallHeight, roomHeight),
      position: [-roomSizeX, wallHeight / 2, 0] // Bottom at y=0, top at y=wallHeight
    }
  ];

  wallConfigs.forEach((wallData: WallConfig, index: number) => {
    const wall = new THREE.Mesh(wallData.geometry, wallMaterial);
    wall.position.set(wallData.position[0], wallData.position[1], wallData.position[2]);
    wall.receiveShadow = true;
    wall.userData.isWall = true;

    // Add wall direction to userData for easier identification
    const directions = ['north', 'south', 'east', 'west'];
    wall.userData.wallDirection = directions[index];
    wall.name = `Wall_${directions[index]}`; // Add name for debugging

    walls.push(wall);
  });

  console.log('✅ Walls created:', walls.map(wall => ({
    name: wall.name,
    direction: wall.userData.wallDirection,
    position: wall.position
  })));

  return walls;
};

export const createFloor = (
  roomWidth: number,
  roomHeight: number,
  floorMaterial: THREE.Material
): THREE.Mesh => {
  console.log('🏗️ Creating floor with dimensions:', { roomWidth, roomHeight });

  // FIXED: Create a thinner floor that sits exactly at y=0 (floor level)
  const floorThickness = 2; // Reduced thickness for better appearance
  const floorGeometry = new THREE.BoxGeometry(roomWidth, floorThickness, roomHeight);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);

  // FIXED: Position floor so its top surface is at y=0 (same level as wall bottoms)
  floor.position.y = -floorThickness / 2; // This puts the top at y=0
  floor.receiveShadow = true;
  floor.userData.isFloor = true;
  floor.name = 'Floor'; // Add name for debugging

  console.log('✅ Floor created:', {
    name: floor.name,
    position: floor.position,
    thickness: floorThickness
  });

  return floor;
}
