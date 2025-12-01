// src/utils/axisIndicatorsDebug.js
// Utility for adding X and Z axis min/max indicators on walls

import * as THREE from 'three';

export class AxisIndicatorsDebug {
  constructor() {
    this.indicators = [];
    this.enabled = true;
  }

  /**
   * Create axis indicators showing min/max coordinates on walls
   * @param {THREE.Scene} scene - Your Three.js scene
   * @param {number} roomWidth - Room width in centimeters
   * @param {number} roomHeight - Room height in centimeters
   * @param {number} notchWidth - Notch width for L-shaped rooms (optional)
   * @param {number} notchHeight - Notch height for L-shaped rooms (optional)
   * @param {boolean} enabled - Whether to show indicators (default: true)
   */
  createAxisIndicators(scene, roomWidth, roomHeight, notchWidth = 0, notchHeight = 0, enabled = true) {
    // Clear existing indicators first
    this.clearIndicators(scene);

    if (!enabled) {
      this.enabled = false;
      return;
    }

    this.enabled = true;

    // Calculate interior boundaries (same as your getInteriorBoundaries function)
    const wallThickness = 5; // Matches your WALL_SETTINGS.THICKNESS
    const interior = {
      minX: -(roomWidth / 2) + wallThickness,
      maxX: (roomWidth / 2) - wallThickness,
      minZ: -(roomHeight / 2) + wallThickness,
      maxZ: (roomHeight / 2) - wallThickness
    };

    // Calculate notch boundaries for L-shaped rooms
    let notch = null;
    if (notchWidth > 0 && notchHeight > 0) {
      notch = {
        minX: -(roomWidth / 2) + wallThickness,
        maxX: -(roomWidth / 2) + notchWidth - wallThickness,
        minZ: -(roomHeight / 2) + wallThickness,
        maxZ: -(roomHeight / 2) + notchHeight - wallThickness
      };
    }

    const wallHeight = 250; // Matches your WALL_SETTINGS.HEIGHT
    const indicatorHeight = wallHeight * 0.3; // Position indicators at 30% of wall height
    const lineHeight = 50; // Height of the indicator lines
    const wallOffset = wallThickness / 2;

    // X-AXIS INDICATORS ON NORTH AND SOUTH WALLS
    this.createXAxisIndicators(scene, interior, notch, roomHeight, wallOffset, indicatorHeight, lineHeight);

    // Z-AXIS INDICATORS ON EAST AND WEST WALLS
    this.createZAxisIndicators(scene, interior, notch, roomWidth, wallOffset, indicatorHeight, lineHeight);

    console.log('📏 Axis indicators created:', {
      roomDimensions: `${roomWidth} × ${roomHeight}cm`,
      interiorBounds: {
        xRange: `${interior.minX.toFixed(1)} to ${interior.maxX.toFixed(1)}cm`,
        zRange: `${interior.minZ.toFixed(1)} to ${interior.maxZ.toFixed(1)}cm`
      },
      indicatorCount: this.indicators.length
    });
  }

  /**
   * Create X-axis indicators on North and South walls
   */
  createXAxisIndicators(scene, interior, notch, roomHeight, wallOffset, indicatorHeight, lineHeight) {
    const roomHalfHeight = roomHeight / 2;

    // For L-shaped rooms, north wall starts at notch.maxX, not interior.minX
    const northMinX = notch ? notch.maxX : interior.minX;

    // X-axis indicators on NORTH wall (negative Z)
    const northWallZ = -roomHalfHeight + wallOffset - 40; // Position in front of wall

    // X MIN indicator on North wall (notch boundary for L-shape)
    this.createAxisIndicator(
      scene,
      new THREE.Vector3(northMinX, indicatorHeight, northWallZ),
      `X: ${northMinX.toFixed(0)}`,
      '#ff4444', // Red like North wall
      'x-min',
      lineHeight,
      'vertical'
    );

    // X MAX indicator on North wall
    this.createAxisIndicator(
      scene,
      new THREE.Vector3(interior.maxX, indicatorHeight, northWallZ),
      `X: ${interior.maxX.toFixed(0)}`,
      '#ff4444', // Red like North wall
      'x-max',
      lineHeight,
      'vertical'
    );

    // X-axis indicators on SOUTH wall (positive Z)
    const southWallZ = roomHalfHeight - wallOffset + 40; // Position in front of wall

    // X MIN indicator on South wall
    this.createAxisIndicator(
      scene,
      new THREE.Vector3(interior.minX, indicatorHeight, southWallZ),
      `X: ${interior.minX.toFixed(0)}`,
      '#44ff44', // Green like South wall
      'x-min-south',
      lineHeight,
      'vertical'
    );

    // X MAX indicator on South wall
    this.createAxisIndicator(
      scene,
      new THREE.Vector3(interior.maxX, indicatorHeight, southWallZ),
      `X: ${interior.maxX.toFixed(0)}`,
      '#44ff44', // Green like South wall
      'x-max-south',
      lineHeight,
      'vertical'
    );

    // Create X-axis line on North wall
    this.createAxisLine(
      scene,
      new THREE.Vector3(interior.minX, indicatorHeight, northWallZ),
      new THREE.Vector3(interior.maxX, indicatorHeight, northWallZ),
      '#ff4444',
      'x-axis-north'
    );

    // Create X-axis line on South wall
    this.createAxisLine(
      scene,
      new THREE.Vector3(interior.minX, indicatorHeight, southWallZ),
      new THREE.Vector3(interior.maxX, indicatorHeight, southWallZ),
      '#44ff44',
      'x-axis-south'
    );
  }

  /**
   * Create Z-axis indicators on East and West walls
   */
  createZAxisIndicators(scene, interior, notch, roomWidth, wallOffset, indicatorHeight, lineHeight) {
    const roomHalfWidth = roomWidth / 2;

    // For L-shaped rooms, west wall starts at notch.maxZ, not interior.minZ
    const westMinZ = notch ? notch.maxZ : interior.minZ;

    // Z-axis indicators on EAST wall (positive X)
    const eastWallX = roomHalfWidth - wallOffset + 40; // Position in front of wall

    // Z MIN indicator on East wall
    this.createAxisIndicator(
      scene,
      new THREE.Vector3(eastWallX, indicatorHeight, interior.minZ),
      `Z: ${interior.minZ.toFixed(0)}`,
      '#4444ff', // Blue like East wall
      'z-min',
      lineHeight,
      'horizontal'
    );

    // Z MAX indicator on East wall
    this.createAxisIndicator(
      scene,
      new THREE.Vector3(eastWallX, indicatorHeight, interior.maxZ),
      `Z: ${interior.maxZ.toFixed(0)}`,
      '#4444ff', // Blue like East wall
      'z-max',
      lineHeight,
      'horizontal'
    );

    // Z-axis indicators on WEST wall (negative X)
    const westWallX = -roomHalfWidth + wallOffset - 40; // Position in front of wall

    // Z MIN indicator on West wall (notch boundary for L-shape)
    this.createAxisIndicator(
      scene,
      new THREE.Vector3(westWallX, indicatorHeight, westMinZ),
      `Z: ${westMinZ.toFixed(0)}`,
      '#ffaa00', // Orange like West wall
      'z-min-west',
      lineHeight,
      'horizontal'
    );

    // Z MAX indicator on West wall
    this.createAxisIndicator(
      scene,
      new THREE.Vector3(westWallX, indicatorHeight, interior.maxZ),
      `Z: ${interior.maxZ.toFixed(0)}`,
      '#ffaa00', // Orange like West wall
      'z-max-west',
      lineHeight,
      'horizontal'
    );

    // Create Z-axis line on East wall
    this.createAxisLine(
      scene,
      new THREE.Vector3(eastWallX, indicatorHeight, interior.minZ),
      new THREE.Vector3(eastWallX, indicatorHeight, interior.maxZ),
      '#4444ff',
      'z-axis-east'
    );

    // Create Z-axis line on West wall
    this.createAxisLine(
      scene,
      new THREE.Vector3(westWallX, indicatorHeight, interior.minZ),
      new THREE.Vector3(westWallX, indicatorHeight, interior.maxZ),
      '#ffaa00',
      'z-axis-west'
    );
  }

  /**
   * Create a single axis indicator with text and line
   */
  createAxisIndicator(scene, position, text, color, id, lineHeight, direction) {
    // Create text sprite
    const textSprite = this.createTextSprite(text, color, 'small');
    textSprite.position.copy(position);
    textSprite.position.y += 25; // Slightly above the indicator line
    textSprite.name = `AxisIndicator_Text_${id}`;
    textSprite.userData.isAxisIndicator = true;
    textSprite.userData.axisType = id;

    scene.add(textSprite);
    this.indicators.push(textSprite);

    // Create indicator line (vertical or horizontal)
    const lineGeometry = new THREE.BufferGeometry();
    let linePoints;

    if (direction === 'vertical') {
      // Vertical line for X-axis indicators
      linePoints = [
        new THREE.Vector3(position.x, position.y - lineHeight/2, position.z),
        new THREE.Vector3(position.x, position.y + lineHeight/2, position.z)
      ];
    } else {
      // Horizontal line for Z-axis indicators
      linePoints = [
        new THREE.Vector3(position.x, position.y, position.z - lineHeight/2),
        new THREE.Vector3(position.x, position.y, position.z + lineHeight/2)
      ];
    }

    lineGeometry.setFromPoints(linePoints);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 3,
      transparent: true,
      opacity: 0.8
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.name = `AxisIndicator_Line_${id}`;
    line.userData.isAxisIndicator = true;
    line.userData.axisType = id;

    scene.add(line);
    this.indicators.push(line);

    // Create small arrow/tick at the end
    const tickGeometry = new THREE.BufferGeometry();
    const tickSize = 8;
    let tickPoints;

    if (direction === 'vertical') {
      // Small horizontal ticks for vertical lines
      tickPoints = [
        new THREE.Vector3(position.x - tickSize, position.y + lineHeight/2, position.z),
        new THREE.Vector3(position.x + tickSize, position.y + lineHeight/2, position.z)
      ];
    } else {
      // Small vertical ticks for horizontal lines
      tickPoints = [
        new THREE.Vector3(position.x, position.y + tickSize, position.z + lineHeight/2),
        new THREE.Vector3(position.x, position.y - tickSize, position.z + lineHeight/2)
      ];
    }

    tickGeometry.setFromPoints(tickPoints);
    const tick = new THREE.Line(tickGeometry, lineMaterial);
    tick.name = `AxisIndicator_Tick_${id}`;
    tick.userData.isAxisIndicator = true;

    scene.add(tick);
    this.indicators.push(tick);
  }

  /**
   * Create axis line connecting min and max indicators
   */
  createAxisLine(scene, startPos, endPos, color, id) {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([startPos, endPos]);

    const material = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 2,
      transparent: true,
      opacity: 0.6,
      dashSize: 10,
      gapSize: 5
    });

    const line = new THREE.Line(geometry, material);
    line.name = `AxisLine_${id}`;
    line.userData.isAxisIndicator = true;
    line.userData.isAxisLine = true;

    scene.add(line);
    this.indicators.push(line);
  }

  /**
   * Create text sprite for axis labels
   */
  createTextSprite(text, color, size = 'normal') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = size === 'small' ? 28 : 32;
    const padding = size === 'small' ? 8 : 12;

    // Set font and measure text
    context.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    const textWidth = context.measureText(text).width;

    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Background with rounded corners
    context.fillStyle = 'rgba(0, 0, 0, 0.85)';
    context.roundRect = context.roundRect || function(x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };

    context.roundRect(0, 0, canvas.width, canvas.height, 4);
    context.fill();

    // Colored border
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.roundRect(1, 1, canvas.width - 2, canvas.height - 2, 3);
    context.stroke();

    // Text
    context.fillStyle = '#ffffff';
    context.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1
    });

    const sprite = new THREE.Sprite(spriteMaterial);

    // Scale sprite appropriately
    const scale = size === 'small' ? 0.8 : 1.0;
    sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);

    return sprite;
  }

  /**
   * Clear all axis indicators from the scene
   */
  clearIndicators(scene) {
    this.indicators.forEach(indicator => {
      if (indicator.parent) {
        indicator.parent.remove(indicator);
      }
      // Dispose of materials and geometries
      if (indicator.material) {
        if (indicator.material.map) indicator.material.map.dispose();
        indicator.material.dispose();
      }
      if (indicator.geometry) {
        indicator.geometry.dispose();
      }
    });
    this.indicators = [];
  }

  /**
   * Toggle axis indicators visibility
   */
  toggleVisibility(visible) {
    this.enabled = visible;
    this.indicators.forEach(indicator => {
      indicator.visible = visible;
    });
  }

  /**
   * Update indicators when room size changes
   */
  updateIndicators(scene, roomWidth, roomHeight) {
    if (this.enabled) {
      this.createAxisIndicators(scene, roomWidth, roomHeight, true);
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(scene) {
    this.clearIndicators(scene);
  }
}
