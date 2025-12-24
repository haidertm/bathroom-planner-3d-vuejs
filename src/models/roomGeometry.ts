import * as THREE from 'three';
import { WALL_SETTINGS, CONSTRAINTS } from '../constants/dimensions';
import { getInteriorBoundaries } from '../utils/constraints';

// Debug flag - set to false for production builds
const DEBUG = import.meta.env.DEV;

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

  // console.log('✅ Floor grid created:', {
  //   lineCount,
  //   groupPosition: floorGridGroup.position,
  //   groupName: floorGridGroup.name,
  //   children: floorGridGroup.children.length
  // });

  // FIXED: Return only the floor grid group
  return floorGridGroup;
};

/**
 * BLUEPRINT GRID for 2D mode - 10cm (100mm) spacing for precise measurements
 * Creates a more detailed grid than the standard 15cm grid
 */
export const createBlueprintGrid = (width: number, height: number): THREE.Group => {
  if (DEBUG) console.log('📐 Creating blueprint grid (10cm spacing) with dimensions:', { width, height });

  const blueprintGridGroup = new THREE.Group();
  const BLUEPRINT_GRID_SPACING = 10; // 10cm = 100mm spacing

  // Create blueprint-specific material - lighter gray, more visible for 2D mode
  const blueprintGridMaterial = new THREE.LineBasicMaterial({
    color: 0x999999, // Lighter gray for blueprint aesthetic
    opacity: 0.5,
    transparent: true
  });

  // Create major grid material (every 50cm or 100cm)
  const majorGridMaterial = new THREE.LineBasicMaterial({
    color: 0x666666, // Darker for major lines
    opacity: 0.7,
    transparent: true,
    linewidth: 2
  });

  // BLUEPRINT GRID - Create vertical lines (parallel to Z-axis)
  for (let x = -width / 2; x <= width / 2; x += BLUEPRINT_GRID_SPACING) {
    const isMajorLine = Math.abs(x) % 50 < 0.1 || Math.abs(x) % 50 > 49.9; // Every 50cm
    const points: THREE.Vector3[] = [
      new THREE.Vector3(x, 0.5, -height / 2), // Slightly above floor to avoid z-fighting
      new THREE.Vector3(x, 0.5, height / 2)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, isMajorLine ? majorGridMaterial : blueprintGridMaterial);
    blueprintGridGroup.add(line);
  }

  // BLUEPRINT GRID - Create horizontal lines (parallel to X-axis)
  for (let z = -height / 2; z <= height / 2; z += BLUEPRINT_GRID_SPACING) {
    const isMajorLine = Math.abs(z) % 50 < 0.1 || Math.abs(z) % 50 > 49.9; // Every 50cm
    const points: THREE.Vector3[] = [
      new THREE.Vector3(-width / 2, 0.5, z),
      new THREE.Vector3(width / 2, 0.5, z)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, isMajorLine ? majorGridMaterial : blueprintGridMaterial);
    blueprintGridGroup.add(line);
  }

  blueprintGridGroup.position.y = 0;
  blueprintGridGroup.name = 'BlueprintGrid';
  blueprintGridGroup.visible = false; // Hidden by default, shown in 2D mode

  if (DEBUG) console.log('✅ Blueprint grid created (10cm spacing):', {
    lineCount: blueprintGridGroup.children.length,
    spacing: BLUEPRINT_GRID_SPACING
  });

  return blueprintGridGroup;
};

/**
 * WALL GRID for interior walls (supports regular and L-shaped rooms)
 */
export const createWallGridLines = (
  wallDirection: 'north' | 'south' | 'east' | 'west' | 'notch-east' | 'notch-south',
  roomWidth: number,
  roomHeight: number,
  notchWidth?: number,
  notchHeight?: number
): THREE.Line[] => {
  console.log(`🧱 Creating wall grid for ${wallDirection} wall (interior system)`);

  const { GRID_SPACING } = CONSTRAINTS;
  const wallHeight = WALL_SETTINGS.HEIGHT;
  const { wallFaces, notch } = getInteriorBoundaries(roomWidth, roomHeight, notchWidth, notchHeight);

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
  } else if (wallDirection === 'notch-east' && notch) {
    // NOTCH-EAST: Vertical wall at X = notch.maxX, runs from notch.minZ to notch.maxZ
    const wallX = notch.maxX;

    // Vertical lines (along Z axis)
    for (let z = notch.minZ; z <= notch.maxZ; z += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(wallX, 0, z),
        new THREE.Vector3(wallX, wallHeight, z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_v_${z}`;
      wallGridLines.push(line);
    }

    // Horizontal lines (along Y axis)
    for (let y = 0; y <= wallHeight; y += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(wallX, y, notch.minZ),
        new THREE.Vector3(wallX, y, notch.maxZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_h_${y}`;
      wallGridLines.push(line);
    }
  } else if (wallDirection === 'notch-south' && notch) {
    // NOTCH-SOUTH: Horizontal wall at Z = notch.maxZ, runs from notch.minX to notch.maxX
    const wallZ = notch.maxZ;

    // Vertical lines (along Y axis)
    for (let x = notch.minX; x <= notch.maxX; x += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(x, 0, wallZ),
        new THREE.Vector3(x, wallHeight, wallZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_v_${x}`;
      wallGridLines.push(line);
    }

    // Horizontal lines (along X axis)
    for (let y = 0; y <= wallHeight; y += GRID_SPACING) {
      const points: THREE.Vector3[] = [
        new THREE.Vector3(notch.minX, y, wallZ),
        new THREE.Vector3(notch.maxX, y, wallZ)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallGridMaterial);
      line.name = `WallGrid_${wallDirection}_h_${y}`;
      wallGridLines.push(line);
    }
  }

  // console.log(`✅ Wall grid created for ${wallDirection}: ${wallGridLines.length} lines`);
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
  roomHeight: number, // Length of the room
  wallMaterial: THREE.Material
): THREE.Mesh[] => {
  const { HEIGHT: wallHeight, THICKNESS: wallThickness } = WALL_SETTINGS;

  // Calculate half dimensions for positioning
  const roomHalfWidth = roomWidth / 2;
  const roomHalfLength = roomHeight / 2;

  // Calculate wall positions - INTERIOR APPROACH
  // Walls sit INSIDE the floor boundaries
  const wallOffset = wallThickness / 2;

  const walls: THREE.Mesh[] = [];

  const wallConfigs: WallConfig[] = [
    {
      // North wall - inner face at room boundary
      geometry: new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
      position: [0, wallHeight / 2, -roomHalfLength + wallOffset]
    },
    {
      // South wall - inner face at room boundary
      geometry: new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
      position: [0, wallHeight / 2, roomHalfLength - wallOffset]
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

  return walls;
};

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

/**
 * Create L-shaped walls (6 walls total)
 * The L-shape is defined by total width, height, and notch dimensions
 */
export const createLShapeWalls = (
  totalWidth: number,
  totalHeight: number,
  notchWidth: number,
  notchHeight: number,
  wallMaterial: THREE.Material
): THREE.Mesh[] => {
  const { HEIGHT: wallHeight, THICKNESS: wallThickness } = WALL_SETTINGS;
  const walls: THREE.Mesh[] = [];
  const wallOffset = wallThickness / 2;

  // Calculate key positions
  // The notch is in the top-left corner
  const halfWidth = totalWidth / 2;
  const halfHeight = totalHeight / 2;

  // L-shape walls (6 walls):
  // 1. NORTH wall (right side of notch) - shortened to exclude notch area
  const topWallWidth = totalWidth - notchWidth;
  const topWallCenterX = halfWidth - topWallWidth / 2;
  walls.push(
    createWall(
      new THREE.BoxGeometry(topWallWidth, wallHeight, wallThickness),
      [topWallCenterX, wallHeight / 2, -halfHeight + wallOffset],
      'north',
      wallMaterial
    )
  );

  // 2. EAST wall (full height)
  walls.push(
    createWall(
      new THREE.BoxGeometry(wallThickness, wallHeight, totalHeight),
      [halfWidth - wallOffset, wallHeight / 2, 0],
      'east',
      wallMaterial
    )
  );

  // 3. SOUTH wall (full width)
  walls.push(
    createWall(
      new THREE.BoxGeometry(totalWidth, wallHeight, wallThickness),
      [0, wallHeight / 2, halfHeight - wallOffset],
      'south',
      wallMaterial
    )
  );

  // 4. WEST wall (bottom portion, below notch)
  const leftWallHeight = totalHeight - notchHeight;
  const leftWallCenterZ = halfHeight - leftWallHeight / 2;
  walls.push(
    createWall(
      new THREE.BoxGeometry(wallThickness, wallHeight, leftWallHeight),
      [-halfWidth + wallOffset, wallHeight / 2, leftWallCenterZ],
      'west',
      wallMaterial
    )
  );

  // 5. NOTCH-SOUTH wall (horizontal edge at bottom of notch, runs east-west)
  walls.push(
    createWall(
      new THREE.BoxGeometry(notchWidth, wallHeight, wallThickness),
      [-halfWidth + notchWidth / 2, wallHeight / 2, -halfHeight + notchHeight - wallOffset],
      'notch-south',
      wallMaterial
    )
  );

  // 6. NOTCH-EAST wall (vertical edge at right of notch, runs north-south)
  walls.push(
    createWall(
      new THREE.BoxGeometry(wallThickness, wallHeight, notchHeight),
      [-halfWidth + notchWidth - wallOffset, wallHeight / 2, -halfHeight + notchHeight / 2],
      'notch-east',
      wallMaterial
    )
  );

  console.log('✅ L-shaped walls created: 6 walls');
  return walls;
};

/**
 * Helper function to create a single wall
 */
const createWall = (
  geometry: THREE.BoxGeometry,
  position: [number, number, number],
  direction: string,
  material: THREE.Material
): THREE.Mesh => {
  const wall = new THREE.Mesh(geometry, material);
  wall.position.set(position[0], position[1], position[2]);
  wall.receiveShadow = true;
  wall.userData.isWall = true;
  wall.userData.wallDirection = direction;
  wall.name = `Wall_${direction}`;
  return wall;
};

/**
 * Create L-shaped floor
 * Uses THREE.Shape to create a custom L-shaped geometry
 */
export const createLShapeFloor = (
  totalWidth: number,
  totalHeight: number,
  notchWidth: number,
  notchHeight: number,
  floorMaterial: THREE.Material
): THREE.Mesh => {
  console.log('🏗️ Creating L-shaped floor with dimensions:', { totalWidth, totalHeight, notchWidth, notchHeight });

  const floorThickness = 1;

  // Create L-shape using Shape
  const shape = new THREE.Shape();

  // Start from bottom-left corner and trace the L-shape clockwise
  const halfWidth = totalWidth / 2;
  const halfHeight = totalHeight / 2;

  // Start at bottom-left
  shape.moveTo(-halfWidth, -halfHeight);

  // Go to top-left (below the notch)
  shape.lineTo(-halfWidth, -halfHeight + (totalHeight - notchHeight));

  // Go right to the inner corner (bottom of notch)
  shape.lineTo(-halfWidth + notchWidth, -halfHeight + (totalHeight - notchHeight));

  // Go up to top (right of notch)
  shape.lineTo(-halfWidth + notchWidth, halfHeight);

  // Go right to top-right corner
  shape.lineTo(halfWidth, halfHeight);

  // Go down to bottom-right corner
  shape.lineTo(halfWidth, -halfHeight);

  // Close the shape back to start
  shape.lineTo(-halfWidth, -halfHeight);

  // Extrude the shape to create 3D geometry
  const extrudeSettings = {
    depth: floorThickness,
    bevelEnabled: false
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // Rotate to lay flat (ExtrudeGeometry extrudes along Z-axis)
  geometry.rotateX(-Math.PI / 2);

  // CRITICAL FIX: Normalize UV coordinates to 0-1 range
  // ExtrudeGeometry generates UVs based on world coordinates (e.g., -1.5 to 1.5)
  // but BoxGeometry (used for regular floors) uses 0-1 range
  // This normalization ensures consistent texture scaling between room shapes
  const uvAttribute = geometry.getAttribute('uv');
  if (uvAttribute) {
    const uvArray = uvAttribute.array as Float32Array;
    for (let i = 0; i < uvArray.length; i += 2) {
      // Normalize X: map from [-halfWidth, halfWidth] to [0, 1]
      uvArray[i] = (uvArray[i] + halfWidth) / totalWidth;
      // Normalize Y: map from [-halfHeight, halfHeight] to [0, 1]
      uvArray[i + 1] = (uvArray[i + 1] + halfHeight) / totalHeight;
    }
    uvAttribute.needsUpdate = true;
  }

  const floor = new THREE.Mesh(geometry, floorMaterial);
  floor.position.y = -floorThickness / 2;
  floor.receiveShadow = true;
  floor.userData.isFloor = true;
  floor.userData.isLShape = true;
  floor.name = 'LShapeFloor';

  console.log('✅ L-shaped floor created');

  return floor;
};
