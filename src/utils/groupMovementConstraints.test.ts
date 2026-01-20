/**
 * Test cases for Group Movement Constraints ("Rigid Body" Rule)
 *
 * Golden Rule: When items are grouped, they act as a single rigid object that
 * inherits the strictest constraint of any item inside it. The group must never
 * be allowed to enter a state where any single item inside it is invalid.
 *
 * Based on lead review specifications for multi-select movement behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { BathroomItem } from './constraints'
import type { MovementConfig } from '../constants/models'
import {
  getMovementConfig,
  mustBeInCorner,
  canMoveVertically,
  canRotateFreely,
  shouldSnapToWall,
  getHeightConstraints
} from './models'
import {
  wouldCollideWithExistingOrWalls,
  getRoomCorners,
  getNearestCorner,
  isInCorner,
  constrainToCorner,
  constrainToWalls,
  constrainToRoom
} from './constraints'

// =============================================================================
// TEST UTILITIES - Group Constraint Calculation (Mimics EventHandler logic)
// =============================================================================

/**
 * Calculate merged constraints for a group of items
 * Implements the "Most Restrictive Wins" strategy as per lead review
 */
function calculateGroupConstraints(items: BathroomItem[]) {
  const constraints = {
    snapToWall: false,
    cornerInstallOnly: false,
    allowVerticalMovement: true,
    allowFreeRotation: true,
    minHeight: 0,
    maxHeight: 250
  }

  if (items.length === 0) return constraints

  items.forEach(item => {
    const movement = getMovementConfig(item.type, item)

    // Most restrictive: if ANY item snaps to wall, group snaps to wall
    if (shouldSnapToWall(item.type, item)) {
      constraints.snapToWall = true
    }

    // Most restrictive: if ANY item is corner-only, group is corner-only
    if (mustBeInCorner(item.type, item)) {
      constraints.cornerInstallOnly = true
    }

    // Most restrictive: if ANY item prohibits vertical movement, group cannot move vertically
    if (!canMoveVertically(item.type, item)) {
      constraints.allowVerticalMovement = false
    }

    // Most restrictive: if ANY item prohibits free rotation, group uses 90 deg steps
    if (!canRotateFreely(item.type, item)) {
      constraints.allowFreeRotation = false
    }

    // Height constraints: use the most restrictive range
    const itemHeightConstraints = getHeightConstraints(item.type, item)
    constraints.minHeight = Math.max(constraints.minHeight, itemHeightConstraints.min)
    constraints.maxHeight = Math.min(constraints.maxHeight, itemHeightConstraints.max)
  })

  return constraints
}

/**
 * Snap rotation to 90 degree increments (as required when group has fixed rotation items)
 */
function snapRotationTo90Degrees(rotation: number): number {
  const snap = Math.PI / 2
  return Math.round(rotation / snap) * snap
}

/**
 * Check if position is near a wall (within tolerance)
 */
function isPositionNearWall(
  position: { x: number; z: number },
  roomWidth: number,
  roomHeight: number,
  tolerance: number = 20
): boolean {
  return (
    position.x < tolerance ||
    position.x > roomWidth - tolerance ||
    position.z < tolerance ||
    position.z > roomHeight - tolerance
  )
}

// =============================================================================
// MOCK DATA FACTORIES
// =============================================================================

function createMockToilet(overrides?: Partial<BathroomItem>): BathroomItem {
  return {
    id: 1,
    type: 'Toilet',
    position: [50, 0, 50],
    rotation: 0,
    sku: 'toilet-001',
    model: {
      path: '/models/toilet.glb',
      name: 'Standard Toilet',
      dimensions: { width: 40, height: 40, depth: 60 },
      movement: {
        snapToWall: true,
        allowVerticalMovement: false,
        allowFreeRotation: false,
        minHeight: 0,
        maxHeight: 0
      },
      orientation: { type: 'face_into_room' }
    },
    ...overrides
  }
}

function createMockBath(overrides?: Partial<BathroomItem>): BathroomItem {
  return {
    id: 2,
    type: 'Bath',
    position: [150, 0, 100],
    rotation: 0,
    sku: 'bath-001',
    model: {
      path: '/models/bath.glb',
      name: 'Freestanding Bath',
      dimensions: { width: 80, height: 60, depth: 170 },
      movement: {
        snapToWall: false,
        allowVerticalMovement: false,
        allowFreeRotation: true,
        minHeight: 0,
        maxHeight: 0
      }
    },
    ...overrides
  }
}

function createMockSink(overrides?: Partial<BathroomItem>): BathroomItem {
  return {
    id: 3,
    type: 'Sink',
    position: [100, 0, 20],
    rotation: 0,
    sku: 'sink-001',
    model: {
      path: '/models/sink.glb',
      name: 'Wall Mounted Sink',
      dimensions: { width: 60, height: 20, depth: 50 },
      movement: {
        snapToWall: true,
        allowVerticalMovement: false,
        allowFreeRotation: false,
        minHeight: 0,
        maxHeight: 0
      },
      orientation: { type: 'face_into_room' }
    },
    ...overrides
  }
}

function createMockShower(overrides?: Partial<BathroomItem>): BathroomItem {
  return {
    id: 4,
    type: 'Shower',
    position: [20, 0, 20],
    rotation: 0,
    sku: 'shower-001',
    model: {
      path: '/models/shower.glb',
      name: 'Corner Shower',
      dimensions: { width: 90, height: 200, depth: 90 },
      movement: {
        snapToWall: true,
        cornerInstallOnly: {
          enabled: true,
          preferredCorner: 'north-west'
        },
        allowVerticalMovement: false,
        allowFreeRotation: false,
        minHeight: 0,
        maxHeight: 0
      }
    },
    ...overrides
  }
}

function createMockMirror(overrides?: Partial<BathroomItem>): BathroomItem {
  return {
    id: 5,
    type: 'Mirror',
    position: [100, 100, 10],
    rotation: 0,
    sku: 'mirror-001',
    model: {
      path: '/models/mirror.glb',
      name: 'Wall Mirror',
      dimensions: { width: 80, height: 60, depth: 5 },
      movement: {
        snapToWall: true,
        allowVerticalMovement: true,
        allowFreeRotation: false,
        minHeight: 0,
        maxHeight: 150
      },
      orientation: { type: 'face_into_room' }
    },
    ...overrides
  }
}

function createMockRadiator(overrides?: Partial<BathroomItem>): BathroomItem {
  return {
    id: 6,
    type: 'Radiator',
    position: [200, 30, 10],
    rotation: 0,
    sku: 'radiator-001',
    model: {
      path: '/models/radiator.glb',
      name: 'Wall Radiator',
      dimensions: { width: 60, height: 80, depth: 10 },
      movement: {
        snapToWall: true,
        allowVerticalMovement: true,
        allowFreeRotation: false,
        minHeight: 0,
        maxHeight: 150
      },
      orientation: { type: 'face_into_room' }
    },
    ...overrides
  }
}

// =============================================================================
// TEST SUITES
// =============================================================================

describe('Group Movement Constraints - "Rigid Body" Rule', () => {
  const ROOM_WIDTH = 300
  const ROOM_HEIGHT = 250

  describe('Scenario 1: Wall-Mounted + Free Floor (Toilet + Bath)', () => {
    /**
     * Decision: Restrict to Wall
     * Behavior: The entire group snaps to the wall. The Freestanding Bath
     * essentially becomes a "passenger" and moves with the Toilet.
     */

    let toilet: BathroomItem
    let bath: BathroomItem

    beforeEach(() => {
      toilet = createMockToilet()
      bath = createMockBath()
    })

    it('should identify toilet as wall-snapping', () => {
      expect(shouldSnapToWall(toilet.type, toilet)).toBe(true)
    })

    it('should identify bath as NOT wall-snapping', () => {
      expect(shouldSnapToWall(bath.type, bath)).toBe(false)
    })

    it('should calculate group constraint as wall-snapping (most restrictive wins)', () => {
      const groupConstraints = calculateGroupConstraints([toilet, bath])
      expect(groupConstraints.snapToWall).toBe(true)
    })

    it('should NOT allow free rotation for group (Toilet restricts it)', () => {
      const groupConstraints = calculateGroupConstraints([toilet, bath])
      expect(groupConstraints.allowFreeRotation).toBe(false)
    })

    it('should verify bath alone allows free rotation', () => {
      expect(canRotateFreely(bath.type, bath)).toBe(true)
    })

    it('should verify toilet does NOT allow free rotation', () => {
      expect(canRotateFreely(toilet.type, toilet)).toBe(false)
    })

    it('should enforce wall position for group (magnetic resistance)', () => {
      const groupConstraints = calculateGroupConstraints([toilet, bath])

      // Center position should be invalid for wall-snapped group
      const centerPosition = { x: ROOM_WIDTH / 2, z: ROOM_HEIGHT / 2 }
      const isNearWall = isPositionNearWall(centerPosition, ROOM_WIDTH, ROOM_HEIGHT)

      expect(groupConstraints.snapToWall).toBe(true)
      expect(isNearWall).toBe(false) // Center is NOT near wall
    })

    it('should allow group movement along wall', () => {
      const wallPosition = { x: 100, z: 10 } // Near north wall
      const isNearWall = isPositionNearWall(wallPosition, ROOM_WIDTH, ROOM_HEIGHT)
      expect(isNearWall).toBe(true)
    })
  })

  describe('Scenario 2: Wall-Mounted + Corner-Only (Sink + Shower)', () => {
    /**
     * Decision: Restrict to Corner-Only
     * Behavior: Since the Shower becomes invalid anywhere except a corner,
     * the entire group can only "jump" from corner to corner.
     */

    let sink: BathroomItem
    let shower: BathroomItem

    beforeEach(() => {
      sink = createMockSink()
      shower = createMockShower()
    })

    it('should identify shower as corner-only', () => {
      expect(mustBeInCorner(shower.type, shower)).toBe(true)
    })

    it('should identify sink as NOT corner-only', () => {
      expect(mustBeInCorner(sink.type, sink)).toBe(false)
    })

    it('should calculate group constraint as corner-only (most restrictive wins)', () => {
      const groupConstraints = calculateGroupConstraints([sink, shower])
      expect(groupConstraints.cornerInstallOnly).toBe(true)
      expect(groupConstraints.snapToWall).toBe(true)
    })

    it('should get valid room corners', () => {
      const corners = getRoomCorners(ROOM_WIDTH, ROOM_HEIGHT)
      expect(corners.length).toBe(4)
      expect(corners.map(c => c.type)).toContain('north-west')
      expect(corners.map(c => c.type)).toContain('north-east')
      expect(corners.map(c => c.type)).toContain('south-west')
      expect(corners.map(c => c.type)).toContain('south-east')
    })

    it('should detect corner position as valid', () => {
      // Room is centered at (0,0), wall thickness is 5cm
      // For 300x250 room: NW corner is at (-145, -120)
      const cornerPosition = { x: -145, y: 0, z: -120 }
      const inCorner = isInCorner(cornerPosition, ROOM_WIDTH, ROOM_HEIGHT)
      expect(inCorner).toBe(true)
    })

    it('should detect mid-wall position as NOT in corner', () => {
      // Mid-point of north wall (x=0, z=-120)
      const midWallPosition = { x: 0, y: 0, z: -120 }
      const inCorner = isInCorner(midWallPosition, ROOM_WIDTH, ROOM_HEIGHT)
      expect(inCorner).toBe(false)
    })

    it('should find nearest corner for a position', () => {
      // Position near NW corner (-145, -120)
      const position = { x: -130, y: 0, z: -110 }
      const nearestCorner = getNearestCorner(position, ROOM_WIDTH, ROOM_HEIGHT)
      expect(nearestCorner.type).toBe('north-west')
    })
  })

  describe('Scenario 3: Split Walls / L-Shape (Mirror North + Toilet East)', () => {
    /**
     * Decision: Treat as a "Rigid Corner Unit"
     * Behavior: This group effectively becomes a "Corner Item."
     */

    let mirror: BathroomItem
    let toilet: BathroomItem

    beforeEach(() => {
      // Mirror on North wall
      mirror = createMockMirror({
        position: [100, 100, 10],
        rotation: 0
      })

      // Toilet on East wall
      toilet = createMockToilet({
        position: [290, 0, 100],
        rotation: -Math.PI / 2
      })
    })

    it('should identify both items as wall-snapping', () => {
      expect(shouldSnapToWall(mirror.type, mirror)).toBe(true)
      expect(shouldSnapToWall(toilet.type, toilet)).toBe(true)
    })

    it('should calculate group as wall-snapping', () => {
      const groupConstraints = calculateGroupConstraints([mirror, toilet])
      expect(groupConstraints.snapToWall).toBe(true)
    })

    it('should lock vertical movement (toilet restricts it)', () => {
      const groupConstraints = calculateGroupConstraints([mirror, toilet])
      expect(groupConstraints.allowVerticalMovement).toBe(false)
    })

    it('should lock rotation to 90 degree steps', () => {
      const groupConstraints = calculateGroupConstraints([mirror, toilet])
      expect(groupConstraints.allowFreeRotation).toBe(false)
    })
  })

  describe('Scenario 4: Free Rotation + Fixed Rotation (Bath + Toilet)', () => {
    /**
     * Decision: Rotate Group (90 degree Steps Only)
     * Behavior: Because the Toilet is restricted to 90-degree increments,
     * the Bath must follow that restriction.
     */

    let bath: BathroomItem
    let toilet: BathroomItem

    beforeEach(() => {
      bath = createMockBath()
      toilet = createMockToilet()
    })

    it('should identify bath as free-rotation', () => {
      expect(canRotateFreely(bath.type, bath)).toBe(true)
    })

    it('should identify toilet as fixed-rotation', () => {
      expect(canRotateFreely(toilet.type, toilet)).toBe(false)
    })

    it('should calculate group as fixed-rotation (most restrictive wins)', () => {
      const groupConstraints = calculateGroupConstraints([bath, toilet])
      expect(groupConstraints.allowFreeRotation).toBe(false)
    })

    it('should snap 45 degree rotation to 90 degrees', () => {
      const requested = Math.PI / 4 // 45 degrees
      const snapped = snapRotationTo90Degrees(requested)
      expect(snapped).toBeCloseTo(Math.PI / 2) // 90 degrees
    })

    it('should snap 30 degree rotation to 0 degrees', () => {
      const requested = Math.PI / 6 // 30 degrees
      const snapped = snapRotationTo90Degrees(requested)
      expect(snapped).toBeCloseTo(0)
    })

    it('should snap 60 degree rotation to 90 degrees', () => {
      const requested = Math.PI / 3 // 60 degrees
      const snapped = snapRotationTo90Degrees(requested)
      expect(snapped).toBeCloseTo(Math.PI / 2)
    })

    it('should keep 90 degree rotation as-is', () => {
      const requested = Math.PI / 2
      const snapped = snapRotationTo90Degrees(requested)
      expect(snapped).toBeCloseTo(Math.PI / 2)
    })

    it('should keep 180 degree rotation as-is', () => {
      const requested = Math.PI
      const snapped = snapRotationTo90Degrees(requested)
      expect(snapped).toBeCloseTo(Math.PI)
    })

    it('should allow free rotation when ALL items support it', () => {
      const bath1 = createMockBath({ id: 10 })
      const bath2 = createMockBath({ id: 11 })

      const groupConstraints = calculateGroupConstraints([bath1, bath2])
      expect(groupConstraints.allowFreeRotation).toBe(true)
    })
  })

  describe('Scenario 5: Height-Adjustable + Fixed Height (Mirror + Toilet)', () => {
    /**
     * Decision: Lock Vertical Movement
     * Behavior: The Toilet is anchored to the floor (Y=0). Therefore,
     * the vertical axis for the whole group is locked.
     */

    let mirror: BathroomItem
    let toilet: BathroomItem

    beforeEach(() => {
      mirror = createMockMirror()
      toilet = createMockToilet()
    })

    it('should identify mirror as height-adjustable', () => {
      expect(canMoveVertically(mirror.type, mirror)).toBe(true)
    })

    it('should identify toilet as fixed-height', () => {
      expect(canMoveVertically(toilet.type, toilet)).toBe(false)
    })

    it('should calculate group as fixed-height (most restrictive wins)', () => {
      const groupConstraints = calculateGroupConstraints([mirror, toilet])
      expect(groupConstraints.allowVerticalMovement).toBe(false)
    })

    it('should allow vertical movement when only mirror selected', () => {
      const groupConstraints = calculateGroupConstraints([mirror])
      expect(groupConstraints.allowVerticalMovement).toBe(true)
    })

    it('should get correct height constraints for mirror', () => {
      const constraints = getHeightConstraints(mirror.type, mirror)
      expect(constraints.min).toBe(0)
      expect(constraints.max).toBe(150)
    })

    it('should get correct height constraints for toilet', () => {
      const constraints = getHeightConstraints(toilet.type, toilet)
      expect(constraints.min).toBe(0)
      expect(constraints.max).toBe(0) // Floor level only
    })

    it('should calculate group height range as intersection', () => {
      const groupConstraints = calculateGroupConstraints([mirror, toilet])
      // Mirror: 0-150, Toilet: 0-0 => Intersection: 0-0
      expect(groupConstraints.minHeight).toBe(0)
      expect(groupConstraints.maxHeight).toBe(0)
    })

    it('should allow vertical movement when all items support it', () => {
      const mirror1 = createMockMirror({ id: 20 })
      const radiator = createMockRadiator({ id: 21 })

      const groupConstraints = calculateGroupConstraints([mirror1, radiator])
      expect(groupConstraints.allowVerticalMovement).toBe(true)
      expect(groupConstraints.minHeight).toBe(0)
      expect(groupConstraints.maxHeight).toBe(150)
    })
  })

  describe('Mixed-Constraint Selection Validation', () => {
    it('should allow mixed-constraint selections', () => {
      const toilet = createMockToilet()
      const sink = createMockSink()
      const shower = createMockShower()

      const constraints = calculateGroupConstraints([toilet, sink, shower])

      expect(constraints).toBeDefined()
      expect(constraints.snapToWall).toBe(true)
      expect(constraints.cornerInstallOnly).toBe(true)
    })

    it('should handle entire suite selection (Toilet + Sink + Shower)', () => {
      const suite = [
        createMockToilet({ id: 100 }),
        createMockSink({ id: 101 }),
        createMockShower({ id: 102 })
      ]

      const constraints = calculateGroupConstraints(suite)

      expect(constraints.cornerInstallOnly).toBe(true)
      expect(constraints.snapToWall).toBe(true)
      expect(constraints.allowFreeRotation).toBe(false)
      expect(constraints.allowVerticalMovement).toBe(false)
    })

    it('should handle empty selection gracefully', () => {
      const constraints = calculateGroupConstraints([])

      expect(constraints.snapToWall).toBe(false)
      expect(constraints.cornerInstallOnly).toBe(false)
      expect(constraints.allowVerticalMovement).toBe(true)
      expect(constraints.allowFreeRotation).toBe(true)
    })

    it('should handle single item selection correctly', () => {
      const bath = createMockBath()
      const constraints = calculateGroupConstraints([bath])

      expect(constraints.snapToWall).toBe(false)
      expect(constraints.allowFreeRotation).toBe(true)
    })
  })

  describe('Bug Prevention: Freestanding + Wall-Snapped Group Movement', () => {
    /**
     * BUG SCENARIO: When a freestanding item (Bath) is grouped with a wall-snapped
     * item (Toilet), dragging the Bath should NOT pull the Toilet away from the wall.
     *
     * The wall-snapped constraint MUST win - the entire group should remain
     * constrained to the wall.
     */

    let bath: BathroomItem
    let toilet: BathroomItem

    beforeEach(() => {
      bath = createMockBath()   // snapToWall: false (freestanding)
      toilet = createMockToilet() // snapToWall: true (wall-snapped)
    })

    it('should NOT allow freestanding item to pull wall-snapped item away from wall', () => {
      const groupConstraints = calculateGroupConstraints([bath, toilet])

      // The group MUST be wall-snapped because toilet requires it
      expect(groupConstraints.snapToWall).toBe(true)
    })

    it('should enforce wall-snap even when freestanding item is primary selection', () => {
      // Even if Bath is selected first (primary), group must respect Toilet's wall constraint
      const groupConstraints = calculateGroupConstraints([bath, toilet])

      expect(groupConstraints.snapToWall).toBe(true)

      // Center room position should be INVALID for this group
      const centerPosition = { x: ROOM_WIDTH / 2, z: ROOM_HEIGHT / 2 }
      const isValidPosition = isPositionNearWall(centerPosition, ROOM_WIDTH, ROOM_HEIGHT)

      expect(isValidPosition).toBe(false) // Group cannot go to center
    })

    it('should enforce wall-snap regardless of selection order', () => {
      // Order 1: Bath first, then Toilet
      const constraints1 = calculateGroupConstraints([bath, toilet])

      // Order 2: Toilet first, then Bath
      const constraints2 = calculateGroupConstraints([toilet, bath])

      // Both should result in wall-snapped group
      expect(constraints1.snapToWall).toBe(true)
      expect(constraints2.snapToWall).toBe(true)
    })

    it('should restrict group to wall positions only', () => {
      const groupConstraints = calculateGroupConstraints([bath, toilet])

      expect(groupConstraints.snapToWall).toBe(true)

      // Valid positions: near any wall
      const validPositions = [
        { x: 10, z: 100 },   // Near west wall
        { x: 290, z: 100 },  // Near east wall
        { x: 150, z: 10 },   // Near north wall
        { x: 150, z: 240 }   // Near south wall
      ]

      // Invalid positions: away from walls
      const invalidPositions = [
        { x: 150, z: 125 },  // Center
        { x: 100, z: 100 },  // Interior
        { x: 200, z: 150 }   // Interior
      ]

      validPositions.forEach(pos => {
        expect(isPositionNearWall(pos, ROOM_WIDTH, ROOM_HEIGHT)).toBe(true)
      })

      invalidPositions.forEach(pos => {
        expect(isPositionNearWall(pos, ROOM_WIDTH, ROOM_HEIGHT)).toBe(false)
      })
    })

    it('should apply magnetic resistance when dragging group away from wall', () => {
      const groupConstraints = calculateGroupConstraints([bath, toilet])

      // When user tries to drag to invalid position, magnetic resistance should prevent it
      const attemptedInvalidPosition = { x: 150, z: 125 } // Center of room

      // This position violates wall-snap constraint
      const wouldBeValid = !groupConstraints.snapToWall ||
        isPositionNearWall(attemptedInvalidPosition, ROOM_WIDTH, ROOM_HEIGHT)

      expect(wouldBeValid).toBe(false) // Position should be rejected
    })

    it('should keep both items on wall when group moves along wall', () => {
      const groupConstraints = calculateGroupConstraints([bath, toilet])

      // Moving from one wall position to another wall position should be allowed
      const fromPosition = { x: 10, z: 50 }   // West wall
      const toPosition = { x: 10, z: 150 }    // Still west wall, different Y

      const fromValid = isPositionNearWall(fromPosition, ROOM_WIDTH, ROOM_HEIGHT)
      const toValid = isPositionNearWall(toPosition, ROOM_WIDTH, ROOM_HEIGHT)

      expect(fromValid).toBe(true)
      expect(toValid).toBe(true)
      expect(groupConstraints.snapToWall).toBe(true)
    })
  })

  describe('Visual/Physics Feedback (No Error Toasts)', () => {
    it('should use position validation instead of error messages', () => {
      const toilet = createMockToilet()

      // Invalid center position
      const centerPosition = { x: 150, z: 125 }
      const isValidWallPosition = isPositionNearWall(centerPosition, ROOM_WIDTH, ROOM_HEIGHT)

      // Should return false (triggers magnetic resistance) not throw
      expect(isValidWallPosition).toBe(false)
    })

    it('should identify valid wall positions for cyan ghost', () => {
      const wallPosition = { x: 10, z: 100 } // Near west wall
      const isValid = isPositionNearWall(wallPosition, ROOM_WIDTH, ROOM_HEIGHT)
      expect(isValid).toBe(true)
    })

    it('should identify invalid positions for red ghost', () => {
      const centerPosition = { x: 150, z: 125 }
      const isValid = isPositionNearWall(centerPosition, ROOM_WIDTH, ROOM_HEIGHT)
      expect(isValid).toBe(false)
    })
  })

  describe('Constraint Hierarchy (Most Restrictive Wins)', () => {
    it('should combine wall-snap: one true + one false = true', () => {
      const toilet = createMockToilet() // snapToWall: true
      const bath = createMockBath() // snapToWall: false

      const constraints = calculateGroupConstraints([toilet, bath])
      expect(constraints.snapToWall).toBe(true)
    })

    it('should combine corner-only: one true + one false = true', () => {
      const shower = createMockShower() // cornerInstallOnly: true
      const sink = createMockSink() // cornerInstallOnly: false

      const constraints = calculateGroupConstraints([shower, sink])
      expect(constraints.cornerInstallOnly).toBe(true)
    })

    it('should combine free-rotation: one true + one false = false', () => {
      const bath = createMockBath() // allowFreeRotation: true
      const toilet = createMockToilet() // allowFreeRotation: false

      const constraints = calculateGroupConstraints([bath, toilet])
      expect(constraints.allowFreeRotation).toBe(false)
    })

    it('should combine vertical-movement: one true + one false = false', () => {
      const mirror = createMockMirror() // allowVerticalMovement: true
      const toilet = createMockToilet() // allowVerticalMovement: false

      const constraints = calculateGroupConstraints([mirror, toilet])
      expect(constraints.allowVerticalMovement).toBe(false)
    })

    it('should calculate height range as intersection', () => {
      const mirror = createMockMirror() // 0-150
      const customItem = createMockMirror({ id: 30 })
      customItem.model!.movement = {
        snapToWall: true,
        allowVerticalMovement: true,
        minHeight: 50,
        maxHeight: 120
      }

      const constraints = calculateGroupConstraints([mirror, customItem])
      // Intersection: max(0, 50) to min(150, 120) = 50-120
      expect(constraints.minHeight).toBe(50)
      expect(constraints.maxHeight).toBe(120)
    })
  })

  describe('L-Shaped Room Support', () => {
    const NOTCH_WIDTH = 100
    const NOTCH_HEIGHT = 80

    it('should get corners for L-shaped room (excludes northwest corner)', () => {
      const corners = getRoomCorners(ROOM_WIDTH, ROOM_HEIGHT, NOTCH_WIDTH, NOTCH_HEIGHT)

      // L-shaped room should not have north-west corner (it is in the notch)
      const cornerTypes = corners.map(c => c.type)
      expect(cornerTypes).not.toContain('north-west')
      expect(cornerTypes).toContain('north-east')
      expect(cornerTypes).toContain('south-east')
      expect(cornerTypes).toContain('south-west')
    })

    it('should include notch corners for L-shaped room', () => {
      const corners = getRoomCorners(ROOM_WIDTH, ROOM_HEIGHT, NOTCH_WIDTH, NOTCH_HEIGHT)

      const cornerTypes = corners.map(c => c.type)
      expect(cornerTypes).toContain('notch-interior')
      expect(cornerTypes).toContain('notch-east-north')
    })

    it('should find nearest corner in L-shaped room', () => {
      // Position near the interior notch corner
      const position = { x: NOTCH_WIDTH + 10, y: 0, z: NOTCH_HEIGHT + 10 }
      const nearestCorner = getNearestCorner(position, ROOM_WIDTH, ROOM_HEIGHT, NOTCH_WIDTH, NOTCH_HEIGHT)

      expect(nearestCorner).toBeDefined()
    })
  })

  describe('Individual Movement Config Functions', () => {
    it('getMovementConfig should return correct config for toilet', () => {
      const toilet = createMockToilet()
      const config = getMovementConfig(toilet.type, toilet)

      expect(config.snapToWall).toBe(true)
      expect(config.allowVerticalMovement).toBe(false)
      expect(config.allowFreeRotation).toBe(false)
    })

    it('getMovementConfig should return correct config for bath', () => {
      const bath = createMockBath()
      const config = getMovementConfig(bath.type, bath)

      expect(config.snapToWall).toBe(false)
      expect(config.allowFreeRotation).toBe(true)
    })

    it('getMovementConfig should return correct config for shower', () => {
      const shower = createMockShower()
      const config = getMovementConfig(shower.type, shower)

      expect(config.snapToWall).toBe(true)
      expect(config.cornerInstallOnly).toBeDefined()
      if (config.cornerInstallOnly && typeof config.cornerInstallOnly === 'object') {
        expect(config.cornerInstallOnly.enabled).toBe(true)
      }
    })

    it('getMovementConfig should return correct config for mirror', () => {
      const mirror = createMockMirror()
      const config = getMovementConfig(mirror.type, mirror)

      expect(config.snapToWall).toBe(true)
      expect(config.allowVerticalMovement).toBe(true)
      expect(config.minHeight).toBe(0)
      expect(config.maxHeight).toBe(150)
    })
  })
})

describe('Rotation Snapping Utility', () => {
  it('should snap to 0 degrees', () => {
    expect(snapRotationTo90Degrees(0)).toBeCloseTo(0)
    expect(snapRotationTo90Degrees(Math.PI / 8)).toBeCloseTo(0) // 22.5 deg
    expect(snapRotationTo90Degrees(-Math.PI / 8)).toBeCloseTo(0)
  })

  it('should snap to 90 degrees', () => {
    expect(snapRotationTo90Degrees(Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(snapRotationTo90Degrees(Math.PI / 4)).toBeCloseTo(Math.PI / 2) // 45 deg
    expect(snapRotationTo90Degrees(Math.PI * 3 / 8)).toBeCloseTo(Math.PI / 2) // 67.5 deg
  })

  it('should snap to 180 degrees', () => {
    expect(snapRotationTo90Degrees(Math.PI)).toBeCloseTo(Math.PI)
    expect(snapRotationTo90Degrees(Math.PI * 5 / 8)).toBeCloseTo(Math.PI / 2) // 112.5 deg
    expect(snapRotationTo90Degrees(Math.PI * 7 / 8)).toBeCloseTo(Math.PI) // 157.5 deg
  })

  it('should handle negative rotations', () => {
    expect(snapRotationTo90Degrees(-Math.PI / 4)).toBeCloseTo(0) // -45 deg
    expect(snapRotationTo90Degrees(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2) // -90 deg
    expect(snapRotationTo90Degrees(-Math.PI * 3 / 4)).toBeCloseTo(-Math.PI / 2) // -135 deg
  })
})

describe('Position Validation Utilities', () => {
  const ROOM_WIDTH = 300
  const ROOM_HEIGHT = 250
  const TOLERANCE = 20

  describe('isPositionNearWall', () => {
    it('should detect position near north wall', () => {
      expect(isPositionNearWall({ x: 150, z: 10 }, ROOM_WIDTH, ROOM_HEIGHT, TOLERANCE)).toBe(true)
    })

    it('should detect position near south wall', () => {
      expect(isPositionNearWall({ x: 150, z: 240 }, ROOM_WIDTH, ROOM_HEIGHT, TOLERANCE)).toBe(true)
    })

    it('should detect position near east wall', () => {
      expect(isPositionNearWall({ x: 290, z: 125 }, ROOM_WIDTH, ROOM_HEIGHT, TOLERANCE)).toBe(true)
    })

    it('should detect position near west wall', () => {
      expect(isPositionNearWall({ x: 10, z: 125 }, ROOM_WIDTH, ROOM_HEIGHT, TOLERANCE)).toBe(true)
    })

    it('should detect position in center as NOT near wall', () => {
      expect(isPositionNearWall({ x: 150, z: 125 }, ROOM_WIDTH, ROOM_HEIGHT, TOLERANCE)).toBe(false)
    })

    it('should detect corner as near wall', () => {
      expect(isPositionNearWall({ x: 10, z: 10 }, ROOM_WIDTH, ROOM_HEIGHT, TOLERANCE)).toBe(true)
    })
  })
})