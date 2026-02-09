// src/utils/roomDimensions.ts
import { ROOM_DEFAULTS } from '../constants/dimensions'

// Type definitions
export interface RoomDimensionsInput {
  width: number
  height: number
}

export interface RoomDimensionsStored extends RoomDimensionsInput {
  timestamp?: number
  source?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface SaveResult {
  success: boolean
  error?: string
}

export interface LoadResult {
  success: boolean
  dimensions: RoomDimensionsStored | null
  error?: string
}

export interface RoomDimensionsInfo {
  exists: boolean
  data: RoomDimensionsStored | null
  age?: number | null
  ageFormatted?: string
  error?: string
}

/**
 * Validates room dimensions
 * @param dimensions - Object with width and height properties in meters
 * @returns Validation result with isValid boolean and errors array
 */
export const validateRoomDimensions = (
  dimensions: unknown
): ValidationResult => {
  const errors: string[] = []

  if (!dimensions || typeof dimensions !== 'object') {
    errors.push('Dimensions object is required')
    return { isValid: false, errors }
  }

  const { width, height } = dimensions as RoomDimensionsInput

  // Check if values exist and are numbers
  if (typeof width !== 'number' || isNaN(width)) {
    errors.push('Width must be a valid number')
  } else if (width < ROOM_DEFAULTS.MIN_SIZE) {
    errors.push(`Width must be at least ${ROOM_DEFAULTS.MIN_SIZE}m`)
  } else if (width > ROOM_DEFAULTS.MAX_SIZE) {
    errors.push(`Width must be no more than ${ROOM_DEFAULTS.MAX_SIZE}m`)
  }

  if (typeof height !== 'number' || isNaN(height)) {
    errors.push('Height must be a valid number')
  } else if (height < ROOM_DEFAULTS.MIN_SIZE) {
    errors.push(`Height must be at least ${ROOM_DEFAULTS.MIN_SIZE}m`)
  } else if (height > ROOM_DEFAULTS.MAX_SIZE) {
    errors.push(`Height must be no more than ${ROOM_DEFAULTS.MAX_SIZE}m`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Saves room dimensions to localStorage with validation
 * @param dimensions - Dimensions in centimeters {width, height}
 * @returns Result with success boolean and any error message
 */
export const saveRoomDimensions = (
  dimensions: RoomDimensionsInput
): SaveResult => {
  try {
    // Convert cm to meters
    const dimensionsInMeters: RoomDimensionsStored = {
      width: dimensions.width / 100,
      height: dimensions.height / 100,
      timestamp: Date.now(),
      source: 'room-dimensions-page'
    }

    // Validate before saving
    const validation = validateRoomDimensions(dimensionsInMeters)
    if (!validation.isValid) {
      return {
        success: false,
        error: `Invalid dimensions: ${validation.errors.join(', ')}`
      }
    }

    localStorage.setItem('room-dimensions', JSON.stringify(dimensionsInMeters))

    return { success: true }

  } catch (error) {
    console.error('Failed to save room dimensions:', error)
    return {
      success: false,
      error: `Storage error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Loads room dimensions from localStorage with validation
 * @returns Result with dimensions or null if not found/invalid
 */
export const loadRoomDimensions = (): LoadResult => {
  try {
    const savedData = localStorage.getItem('room-dimensions')
    if (!savedData) {
      return { success: false, dimensions: null }
    }

    const dimensions = JSON.parse(savedData) as RoomDimensionsStored

    // Validate loaded dimensions
    const validation = validateRoomDimensions(dimensions)
    if (!validation.isValid) {
      console.warn('Invalid saved dimensions:', validation.errors)
      // Clean up invalid data
      localStorage.removeItem('room-dimensions')
      return { success: false, dimensions: null, error: 'Invalid saved dimensions' }
    }

    return { success: true, dimensions }

  } catch (error) {
    console.error('Failed to load room dimensions:', error)
    // Clean up corrupted data
    localStorage.removeItem('room-dimensions')
    return {
      success: false,
      dimensions: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Clears saved room dimensions
 */
export const clearRoomDimensions = (): void => {
  localStorage.removeItem('room-dimensions')
}

/**
 * Gets current room dimensions info for debugging
 */
export const getRoomDimensionsInfo = (): RoomDimensionsInfo => {
  const savedData = localStorage.getItem('room-dimensions')
  if (!savedData) {
    return { exists: false, data: null }
  }

  try {
    const data = JSON.parse(savedData) as RoomDimensionsStored
    return {
      exists: true,
      data,
      age: data.timestamp ? Date.now() - data.timestamp : null,
      ageFormatted: data.timestamp ? `${Math.round((Date.now() - data.timestamp) / 1000)}s ago` : 'unknown'
    }
  } catch (error) {
    return {
      exists: true,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
