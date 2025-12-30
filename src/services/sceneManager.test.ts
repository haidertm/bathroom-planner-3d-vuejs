import { describe, it, expect, beforeEach } from 'vitest'
import * as THREE from 'three'
import { SceneManager } from './sceneManager'

/**
 * Unit tests for SceneManager.transformPanDeltasToWorld
 * Tests the pure coordinate transformation logic for 2D panning
 * across all camera up vector orientations.
 */
describe('SceneManager.transformPanDeltasToWorld', () => {
  let sceneManager: SceneManager

  // Access private method for testing
  const callTransformPanDeltasToWorld = (
    instance: SceneManager,
    deltaX: number,
    deltaZ: number,
    upVector: THREE.Vector3
  ): { worldDeltaX: number; worldDeltaZ: number } => {
    return (instance as any).transformPanDeltasToWorld(deltaX, deltaZ, upVector)
  }

  beforeEach(() => {
    sceneManager = new SceneManager()
  })

  describe('when up vector is along Z axis (default or 180 rotation)', () => {
    it('should map deltas directly when up = (0, 0, -1) - north at top (default)', () => {
      const upVector = new THREE.Vector3(0, 0, -1)
      const deltaX = 10
      const deltaZ = 5

      const result = callTransformPanDeltasToWorld(sceneManager, deltaX, deltaZ, upVector)

      // Default: Screen right = +X, Screen up = -Z
      // So worldDeltaX = deltaX, worldDeltaZ = deltaZ
      expect(result.worldDeltaX).toBe(10)
      expect(result.worldDeltaZ).toBe(5)
    })

    it('should negate both deltas when up = (0, 0, 1) - south at top (180 rotation)', () => {
      const upVector = new THREE.Vector3(0, 0, 1)
      const deltaX = 10
      const deltaZ = 5

      const result = callTransformPanDeltasToWorld(sceneManager, deltaX, deltaZ, upVector)

      // 180 rotation: Screen right = -X, Screen up = +Z
      // So worldDeltaX = -deltaX, worldDeltaZ = -deltaZ
      expect(result.worldDeltaX).toBe(-10)
      expect(result.worldDeltaZ).toBe(-5)
    })

    it('should handle negative deltas correctly with up = (0, 0, -1)', () => {
      const upVector = new THREE.Vector3(0, 0, -1)
      const deltaX = -15
      const deltaZ = -20

      const result = callTransformPanDeltasToWorld(sceneManager, deltaX, deltaZ, upVector)

      expect(result.worldDeltaX).toBe(-15)
      expect(result.worldDeltaZ).toBe(-20)
    })

    it('should handle negative deltas correctly with up = (0, 0, 1)', () => {
      const upVector = new THREE.Vector3(0, 0, 1)
      const deltaX = -15
      const deltaZ = -20

      const result = callTransformPanDeltasToWorld(sceneManager, deltaX, deltaZ, upVector)

      expect(result.worldDeltaX).toBe(15)
      expect(result.worldDeltaZ).toBe(20)
    })
  })

  describe('when up vector is along X axis (90 degree rotations)', () => {
    it('should swap and negate correctly when up = (-1, 0, 0) - west at top (90 CW)', () => {
      const upVector = new THREE.Vector3(-1, 0, 0)
      const deltaX = 10
      const deltaZ = 5

      const result = callTransformPanDeltasToWorld(sceneManager, deltaX, deltaZ, upVector)

      // 90 CW: Screen right = -Z, Screen up = -X
      // So worldDeltaX = deltaZ, worldDeltaZ = -deltaX
      expect(result.worldDeltaX).toBe(5)
      expect(result.worldDeltaZ).toBe(-10)
    })

    it('should swap and negate correctly when up = (1, 0, 0) - east at top (90 CCW)', () => {
      const upVector = new THREE.Vector3(1, 0, 0)
      const deltaX = 10
      const deltaZ = 5

      const result = callTransformPanDeltasToWorld(sceneManager, deltaX, deltaZ, upVector)

      // 90 CCW: Screen right = +Z, Screen up = +X
      // So worldDeltaX = -deltaZ, worldDeltaZ = deltaX
      expect(result.worldDeltaX).toBe(-5)
      expect(result.worldDeltaZ).toBe(10)
    })

    it('should handle negative deltas correctly with up = (-1, 0, 0)', () => {
      const upVector = new THREE.Vector3(-1, 0, 0)
      const deltaX = -15
      const deltaZ = -20

      const result = callTransformPanDeltasToWorld(sceneManager, deltaX, deltaZ, upVector)

      expect(result.worldDeltaX).toBe(-20)
      expect(result.worldDeltaZ).toBe(15)
    })

    it('should handle negative deltas correctly with up = (1, 0, 0)', () => {
      const upVector = new THREE.Vector3(1, 0, 0)
      const deltaX = -15
      const deltaZ = -20

      const result = callTransformPanDeltasToWorld(sceneManager, deltaX, deltaZ, upVector)

      expect(result.worldDeltaX).toBe(20)
      expect(result.worldDeltaZ).toBe(-15)
    })
  })

  describe('edge cases', () => {
    it('should handle zero deltas', () => {
      const upVector = new THREE.Vector3(0, 0, -1)
      const result = callTransformPanDeltasToWorld(sceneManager, 0, 0, upVector)

      expect(result.worldDeltaX).toBe(0)
      expect(result.worldDeltaZ).toBe(0)
    })

    it('should handle very small deltas', () => {
      const upVector = new THREE.Vector3(0, 0, -1)
      const result = callTransformPanDeltasToWorld(sceneManager, 0.001, 0.002, upVector)

      expect(result.worldDeltaX).toBeCloseTo(0.001)
      expect(result.worldDeltaZ).toBeCloseTo(0.002)
    })

    it('should handle very large deltas', () => {
      const upVector = new THREE.Vector3(0, 0, -1)
      const result = callTransformPanDeltasToWorld(sceneManager, 10000, 20000, upVector)

      expect(result.worldDeltaX).toBe(10000)
      expect(result.worldDeltaZ).toBe(20000)
    })

    it('should use Z-axis branch when |up.z| is exactly 0.5', () => {
      // When |up.z| === 0.5, should still use Z-axis branch (> 0.5 check fails)
      // This tests the boundary condition
      const upVector = new THREE.Vector3(0.866, 0, 0.5) // Normalized ~60 degree angle
      const result = callTransformPanDeltasToWorld(sceneManager, 10, 5, upVector)

      // |0.5| is NOT > 0.5, so it falls into the X-axis branch
      // up.x > 0, so worldDeltaX = -deltaZ, worldDeltaZ = deltaX
      expect(result.worldDeltaX).toBe(-5)
      expect(result.worldDeltaZ).toBe(10)
    })

    it('should use Z-axis branch when |up.z| is slightly above 0.5', () => {
      const upVector = new THREE.Vector3(0, 0, -0.51)
      const result = callTransformPanDeltasToWorld(sceneManager, 10, 5, upVector)

      // |0.51| > 0.5, so Z-axis branch, up.z < 0
      expect(result.worldDeltaX).toBe(10)
      expect(result.worldDeltaZ).toBe(5)
    })
  })

  describe('transformation consistency (round-trip verification)', () => {
    it('should produce opposite results for opposite up vectors on Z axis', () => {
      const deltaX = 7
      const deltaZ = 3

      const resultNorth = callTransformPanDeltasToWorld(
        sceneManager,
        deltaX,
        deltaZ,
        new THREE.Vector3(0, 0, -1)
      )
      const resultSouth = callTransformPanDeltasToWorld(
        sceneManager,
        deltaX,
        deltaZ,
        new THREE.Vector3(0, 0, 1)
      )

      expect(resultNorth.worldDeltaX).toBe(-resultSouth.worldDeltaX)
      expect(resultNorth.worldDeltaZ).toBe(-resultSouth.worldDeltaZ)
    })

    it('should produce 90-degree rotated results between Z and X up vectors', () => {
      const deltaX = 10
      const deltaZ = 0

      // With north up, moving right on screen = +X in world
      const resultNorth = callTransformPanDeltasToWorld(
        sceneManager,
        deltaX,
        deltaZ,
        new THREE.Vector3(0, 0, -1)
      )

      // With west up (90 CW), moving right on screen = -Z in world
      const resultWest = callTransformPanDeltasToWorld(
        sceneManager,
        deltaX,
        deltaZ,
        new THREE.Vector3(-1, 0, 0)
      )

      expect(resultNorth.worldDeltaX).toBe(10)
      expect(resultNorth.worldDeltaZ).toBe(0)
      expect(resultWest.worldDeltaX).toBe(0)
      expect(resultWest.worldDeltaZ).toBe(-10)
    })
  })
})
