// src/debug/wallLabelsDebug.ts
// Easy integration utility for adding wall direction labels to your existing 3D scene

import * as THREE from 'three'
import { WALL_SETTINGS } from '../constants/dimensions'

type WallDirection = 'north' | 'south' | 'east' | 'west'

interface LabelConfig {
  text: string
  position: [number, number, number]
  color: string
  direction: WallDirection
  description: string
}

interface WallPositions {
  north: { x: number; z: number }
  south: { x: number; z: number }
  east: { x: number; z: number }
  west: { x: number; z: number }
}

export class WallLabelsDebug {
  private labels: THREE.Object3D[] = []
  private enabled: boolean = true

  /**
   * Create wall direction labels for debugging
   */
  createWallLabels(
    scene: THREE.Scene,
    roomWidth: number,
    roomHeight: number,
    enabled: boolean = true
  ): void {
    // Clear existing labels first
    this.clearLabels(scene)

    if (!enabled) {
      this.enabled = false
      return
    }

    this.enabled = true
    const roomHalfWidth = roomWidth / 2
    const roomHalfHeight = roomHeight / 2
    const wallHeight = WALL_SETTINGS.HEIGHT
    const wallThickness = WALL_SETTINGS.THICKNESS
    const wallOffset = wallThickness / 2

    // Label configurations matching interior walls system
    const labelConfigs: LabelConfig[] = [
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
    ]

    labelConfigs.forEach(config => {
      // Create text sprite
      const sprite = this.createTextSprite(config.text, config.color)
      sprite.position.set(config.position[0], config.position[1], config.position[2])
      sprite.name = `DebugWallLabel_${config.direction}`
      sprite.userData.wallDirection = config.direction
      sprite.userData.isDebugLabel = true

      scene.add(sprite)
      this.labels.push(sprite)

      // Add directional arrow pointing toward the wall
      const arrow = this.createDirectionalArrow(config)
      arrow.name = `DebugWallArrow_${config.direction}`
      arrow.userData.wallDirection = config.direction
      arrow.userData.isDebugLabel = true

      scene.add(arrow)
      this.labels.push(arrow)
    })

    // Add small coordinate system reference
    const axesHelper = new THREE.AxesHelper(40)
    axesHelper.position.set(-roomHalfWidth + 40, 20, -roomHalfHeight + 40)
    axesHelper.name = 'DebugAxesHelper'
    axesHelper.userData.isDebugLabel = true
    scene.add(axesHelper)
    this.labels.push(axesHelper)

    console.log('Wall direction debug labels created:', {
      roomDimensions: `${roomWidth} x ${roomHeight}cm`,
      labelCount: this.labels.length,
      wallPositions: {
        north: `z = ${(-roomHalfHeight + wallOffset).toFixed(1)}cm`,
        south: `z = ${(roomHalfHeight - wallOffset).toFixed(1)}cm`,
        east: `x = ${(roomHalfWidth - wallOffset).toFixed(1)}cm`,
        west: `x = ${(-roomHalfWidth + wallOffset).toFixed(1)}cm`
      }
    })
  }

  /**
   * Create a text sprite for wall labels
   */
  private createTextSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const fontSize = 32
    const padding = 12

    // Set font and measure text
    context.font = `bold ${fontSize}px Arial`
    const textWidth = context.measureText(text).width

    canvas.width = textWidth + padding * 2
    canvas.height = fontSize + padding * 2

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height)

    // Background with transparency
    context.fillStyle = 'rgba(0, 0, 0, 0.9)'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Colored border
    context.strokeStyle = color
    context.lineWidth = 2
    context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)

    // Text
    context.fillStyle = color
    context.font = `bold ${fontSize}px Arial`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })

    const sprite = new THREE.Sprite(material)
    sprite.scale.set(canvas.width * 0.3, canvas.height * 0.3, 1)
    sprite.renderOrder = 999 // Render on top

    return sprite
  }

  /**
   * Create directional arrow pointing toward wall
   */
  private createDirectionalArrow(config: LabelConfig): THREE.Group {
    const arrowGroup = new THREE.Group()

    // Arrow shaft
    const shaftGeometry = new THREE.CylinderGeometry(1, 1, 20, 8)
    const shaftMaterial = new THREE.MeshBasicMaterial({ color: config.color })
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial)

    // Arrow head
    const headGeometry = new THREE.ConeGeometry(3, 8, 8)
    const headMaterial = new THREE.MeshBasicMaterial({ color: config.color })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 14

    arrowGroup.add(shaft)
    arrowGroup.add(head)

    // Position arrow below label
    const arrowPosition: [number, number, number] = [...config.position]
    arrowPosition[1] -= 50 // Below the label
    arrowGroup.position.set(arrowPosition[0], arrowPosition[1], arrowPosition[2])

    // Orient arrow to point toward wall
    switch (config.direction) {
      case 'north':
        arrowGroup.rotation.x = Math.PI // Point down toward north wall
        arrowGroup.position.z += 20
        break
      case 'south':
        // Default orientation (pointing up), no rotation needed
        arrowGroup.position.z -= 20
        break
      case 'east':
        arrowGroup.rotation.z = -Math.PI / 2 // Point right toward east wall
        arrowGroup.position.x -= 20
        break
      case 'west':
        arrowGroup.rotation.z = Math.PI / 2 // Point left toward west wall
        arrowGroup.position.x += 20
        break
    }

    return arrowGroup
  }

  /**
   * Clear all debug labels from scene
   */
  clearLabels(scene: THREE.Scene): void {
    this.labels.forEach(label => {
      scene.remove(label)

      // Dispose of geometries and materials
      if ('geometry' in label) {
        (label.geometry as THREE.BufferGeometry).dispose()
      }
      if ('material' in label) {
        const material = label.material
        if (Array.isArray(material)) {
          material.forEach(mat => mat.dispose())
        } else {
          (material as THREE.Material).dispose()
        }
      }

      // Handle group objects
      if (label.children) {
        label.children.forEach(child => {
          if ('geometry' in child) {
            (child.geometry as THREE.BufferGeometry).dispose()
          }
          if ('material' in child) {
            (child.material as THREE.Material).dispose()
          }
        })
      }
    })

    this.labels = []
  }

  /**
   * Toggle label visibility
   */
  setVisible(visible: boolean): void {
    this.enabled = visible
    this.labels.forEach(label => {
      label.visible = visible
    })
  }

  /**
   * Update labels when room dimensions change
   */
  updateLabels(scene: THREE.Scene, roomWidth: number, roomHeight: number): void {
    if (this.enabled) {
      this.createWallLabels(scene, roomWidth, roomHeight, true)
    }
  }

  /**
   * Get wall position for debugging (matches interior walls system)
   */
  getWallPositions(roomWidth: number, roomHeight: number): WallPositions {
    const wallThickness = 5
    const wallOffset = wallThickness / 2
    const roomHalfWidth = roomWidth / 2
    const roomHalfHeight = roomHeight / 2

    return {
      north: { x: 0, z: -roomHalfHeight + wallOffset },
      south: { x: 0, z: roomHalfHeight - wallOffset },
      east: { x: roomHalfWidth - wallOffset, z: 0 },
      west: { x: -roomHalfWidth + wallOffset, z: 0 }
    }
  }
}
