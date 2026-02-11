// src/utils/wallLabelsDebug.js
// Easy integration utility for adding wall direction labels to your existing 3D scene

import * as THREE from 'three';
import { WALL_SETTINGS } from '../constants/dimensions';

export class WallLabelsDebug {
  constructor() {
    this.labels = [];
    this.enabled = true;
  }

  /**
   * Create wall direction labels for debugging
   * @param {THREE.Scene} scene - Your Three.js scene
   * @param {number} roomWidth - Room width in centimeters
   * @param {number} roomHeight - Room height in centimeters
   * @param {boolean} enabled - Whether to show labels (default: true)
   */
  createWallLabels(scene, roomWidth, roomHeight, enabled = true) {
    // Clear existing labels first
    this.clearLabels(scene);

    if (!enabled) {
      this.enabled = false;
      return;
    }

    this.enabled = true;
    const roomHalfWidth = roomWidth / 2;
    const roomHalfHeight = roomHeight / 2;
    const wallHeight = WALL_SETTINGS.HEIGHT; // Matches your WALL_SETTINGS.HEIGHT
    const wallThickness = WALL_SETTINGS.THICKNESS; // Matches your WALL_SETTINGS.THICKNESS
    const wallOffset = wallThickness / 2;

    // Label configurations matching your interior walls system
    const labelConfigs = [
      {
        text: 'NORTH',
        position: [0, wallHeight * 0.8, -roomHalfHeight + wallOffset - 30],
        color: '#ff4444',
        direction: 'north',
        description: 'Negative Z axis'
      },
      {
        text: 'SOUTH',
        position: [0, wallHeight * 0.8, roomHalfHeight - wallOffset + 30],
        color: '#44ff44',
        direction: 'south',
        description: 'Positive Z axis'
      },
      {
        text: 'EAST',
        position: [roomHalfWidth - wallOffset + 30, wallHeight * 0.8, 0],
        color: '#4444ff',
        direction: 'east',
        description: 'Positive X axis'
      },
      {
        text: 'WEST',
        position: [-roomHalfWidth + wallOffset - 30, wallHeight * 0.8, 0],
        color: '#ffaa00',
        direction: 'west',
        description: 'Negative X axis'
      }
    ];

    labelConfigs.forEach(config => {
      // Create text sprite
      const sprite = this.createTextSprite(config.text, config.color);
      sprite.position.set(config.position[0], config.position[1], config.position[2]);
      sprite.name = `DebugWallLabel_${config.direction}`;
      sprite.userData.wallDirection = config.direction;
      sprite.userData.isDebugLabel = true;

      scene.add(sprite);
      this.labels.push(sprite);

      // Add directional arrow pointing toward the wall
      const arrow = this.createDirectionalArrow(config);
      arrow.name = `DebugWallArrow_${config.direction}`;
      arrow.userData.wallDirection = config.direction;
      arrow.userData.isDebugLabel = true;

      scene.add(arrow);
      this.labels.push(arrow);
    });

    // Add small coordinate system reference
    const axesHelper = new THREE.AxesHelper(40);
    axesHelper.position.set(-roomHalfWidth + 40, 20, -roomHalfHeight + 40);
    axesHelper.name = 'DebugAxesHelper';
    axesHelper.userData.isDebugLabel = true;
    scene.add(axesHelper);
    this.labels.push(axesHelper);
  }

  /**
   * Create a text sprite for wall labels
   */
  createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 32;
    const padding = 12;

    // Set font and measure text
    context.font = `bold ${fontSize}px Arial`;
    const textWidth = context.measureText(text).width;

    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Background with transparency
    context.fillStyle = 'rgba(0, 0, 0, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Colored border
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Text
    context.fillStyle = color;
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(canvas.width * 0.3, canvas.height * 0.3, 1);
    sprite.renderOrder = 999; // Render on top

    return sprite;
  }

  /**
   * Create directional arrow pointing toward wall
   */
  createDirectionalArrow(config) {
    const arrowGroup = new THREE.Group();

    // Arrow shaft
    const shaftGeometry = new THREE.CylinderGeometry(1, 1, 20, 8);
    const shaftMaterial = new THREE.MeshBasicMaterial({ color: config.color });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);

    // Arrow head
    const headGeometry = new THREE.ConeGeometry(3, 8, 8);
    const headMaterial = new THREE.MeshBasicMaterial({ color: config.color });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 14;

    arrowGroup.add(shaft);
    arrowGroup.add(head);

    // Position arrow below label
    let arrowPosition = [...config.position];
    arrowPosition[1] -= 50; // Below the label
    arrowGroup.position.set(arrowPosition[0], arrowPosition[1], arrowPosition[2]);

    // Orient arrow to point toward wall
    switch (config.direction) {
      case 'north':
        arrowGroup.rotation.x = Math.PI; // Point down toward north wall
        arrowGroup.position.z += 20;
        break;
      case 'south':
        // Default orientation (pointing up), no rotation needed
        arrowGroup.position.z -= 20;
        break;
      case 'east':
        arrowGroup.rotation.z = -Math.PI / 2; // Point right toward east wall
        arrowGroup.position.x -= 20;
        break;
      case 'west':
        arrowGroup.rotation.z = Math.PI / 2; // Point left toward west wall
        arrowGroup.position.x += 20;
        break;
    }

    return arrowGroup;
  }

  /**
   * Clear all debug labels from scene
   */
  clearLabels(scene) {
    this.labels.forEach(label => {
      scene.remove(label);

      // Dispose of geometries and materials
      if (label.geometry) label.geometry.dispose();
      if (label.material) {
        if (Array.isArray(label.material)) {
          label.material.forEach(mat => mat.dispose());
        } else {
          label.material.dispose();
        }
      }

      // Handle group objects
      if (label.children) {
        label.children.forEach(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
    });

    this.labels = [];
  }

  /**
   * Toggle label visibility
   */
  setVisible(visible) {
    this.enabled = visible;
    this.labels.forEach(label => {
      label.visible = visible;
    });
  }

  /**
   * Update labels when room dimensions change
   */
  updateLabels(scene, roomWidth, roomHeight) {
    if (this.enabled) {
      this.createWallLabels(scene, roomWidth, roomHeight, true);
    }
  }

  /**
   * Get wall position for debugging (matches your interior walls system)
   */
  getWallPositions(roomWidth, roomHeight) {
    const wallThickness = 5;
    const wallOffset = wallThickness / 2;
    const roomHalfWidth = roomWidth / 2;
    const roomHalfHeight = roomHeight / 2;

    return {
      north: { x: 0, z: -roomHalfHeight + wallOffset },
      south: { x: 0, z: roomHalfHeight - wallOffset },
      east: { x: roomHalfWidth - wallOffset, z: 0 },
      west: { x: -roomHalfWidth + wallOffset, z: 0 }
    };
  }
}

// Usage example for integration into your existing code:
/*
// In your scene setup or component:
import { WallLabelsDebug } from './utils/wallLabelsDebug';

// Initialize the debug utility
const wallLabelsDebug = new WallLabelsDebug();

// Add labels to your scene (call this after creating your room)
wallLabelsDebug.createWallLabels(scene, roomWidth, roomHeight, true);

// When room dimensions change:
wallLabelsDebug.updateLabels(scene, newRoomWidth, newRoomHeight);

// To toggle visibility:
wallLabelsDebug.setVisible(false); // Hide labels
wallLabelsDebug.setVisible(true);  // Show labels

// To remove all labels:
wallLabelsDebug.clearLabels(scene);
*/
