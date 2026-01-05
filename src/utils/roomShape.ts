// src/utils/roomShape.ts - Room shape selection utilities

/**
 * Type for L-shape room selection with corner position
 */
export interface LShapeSelection {
  shape: 'l-shape'
  corner?: string
}

/**
 * Type for room shape selection - either a simple shape string or L-shape object
 */
export type RoomShapeSelection = string | LShapeSelection

/**
 * Sets the selected room shape in localStorage.
 * Handles both simple shape strings (e.g., 'rectangle', 'square')
 * and L-shape objects with corner position.
 *
 * @param selection - Either a shape string or an L-shape object with corner
 */
export const setSelectedRoomShape = (selection: RoomShapeSelection): void => {
  // Guard against null/undefined - typeof null === 'object' in JavaScript
  if (selection && typeof selection === 'object' && selection.shape === 'l-shape') {
    localStorage.setItem('selected-room-shape', 'l-shape')
    if (selection.corner) {
      localStorage.setItem('l-shape-corner', selection.corner)
    } else {
      localStorage.removeItem('l-shape-corner')
    }
  } else {
    localStorage.setItem('selected-room-shape', selection as string)
    localStorage.removeItem('l-shape-corner') // Clear any previous corner selection
  }
}
