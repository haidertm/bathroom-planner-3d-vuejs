import * as THREE from "three";
import { WALL_SETTINGS, CONSTRAINTS } from '../constants/dimensions.js';

export const createCustomGrid = (width, height) => {
  const gridGroup = new THREE.Group();
  const { GRID_SPACING } = CONSTRAINTS;

  // Create material for grid lines
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x888888,
    opacity: 0.3,
    transparent: true
  });

  // Create vertical lines (parallel to Z-axis)
  for (let x = -width/2; x <= width/2; x += GRID_SPACING) {
    const points = [
      new THREE.Vector3(x, 0, -height/2),
      new THREE.Vector3(x, 0, height/2)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, gridMaterial);
    gridGroup.add(line);
  }

  // Create horizontal lines (parallel to X-axis)
  for (let z = -height/2; z <= height/2; z += GRID_SPACING) {
    const points = [
      new THREE.Vector3(-width/2, 0, z),
      new THREE.Vector3(width/2, 0, z)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, gridMaterial);
    gridGroup.add(line);
  }

  gridGroup.position.y = 0.01;
  return gridGroup;
};

export const createWalls = (roomWidth, roomHeight, wallMaterial) => {
  const { HEIGHT: wallHeight, THICKNESS: wallThickness } = WALL_SETTINGS;
  const roomSizeX = roomWidth / 2;
  const roomSizeZ = roomHeight / 2;

  const walls = [];

  // Create 4 walls with dynamic sizing
  const wallConfigs = [
    { // North wall
      geometry: new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
      position: [0, wallHeight / 2, -roomSizeZ]
    },
    { // South wall
      geometry: new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness),
      position: [0, wallHeight / 2, roomSizeZ]
    },
    { // East wall
      geometry: new THREE.BoxGeometry(wallThickness, wallHeight, roomHeight),
      position: [roomSizeX, wallHeight / 2, 0]
    },
    { // West wall
      geometry: new THREE.BoxGeometry(wallThickness, wallHeight, roomHeight),
      position: [-roomSizeX, wallHeight / 2, 0]
    }
  ];

  wallConfigs.forEach(wallData => {
    const wall = new THREE.Mesh(wallData.geometry, wallMaterial);
    wall.position.set(wallData.position[0], wallData.position[1], wallData.position[2]);
    wall.receiveShadow = true;
    wall.userData.isWall = true;
    walls.push(wall);
  });

  return walls;
};

export const createFloor = (roomWidth, roomHeight, floorMaterial) => {
  const floorGeometry = new THREE.BoxGeometry(roomWidth, 0.1, roomHeight);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  floor.userData.isFloor = true;
  return floor;
};
