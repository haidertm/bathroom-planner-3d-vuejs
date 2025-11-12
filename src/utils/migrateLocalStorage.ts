import { designService } from '../services/designService'
import { supabase } from '../lib/supabase'

interface LocalStorageDesign {
  id: number | string
  name: string
  timestamp: number
  items: any[]
  roomWidth: number
  roomHeight: number
  currentFloorTexture?: number
  currentWallTexture?: number
  preview?: string | null
}

/**
 * Migrate designs from localStorage to Supabase
 * Call this function after user logs in for the first time
 */
export async function migrateLocalStorageDesigns(): Promise<{
  success: boolean
  migratedCount: number
  errors: string[]
}> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        migratedCount: 0,
        errors: ['User not authenticated']
      }
    }

    // Get designs from localStorage
    const savedDesigns = localStorage.getItem('saved-designs')
    if (!savedDesigns) {
      return {
        success: true,
        migratedCount: 0,
        errors: []
      }
    }

    const localDesigns: LocalStorageDesign[] = JSON.parse(savedDesigns)
    if (!Array.isArray(localDesigns) || localDesigns.length === 0) {
      return {
        success: true,
        migratedCount: 0,
        errors: []
      }
    }

    // Migrate each design
    let migratedCount = 0
    const errors: string[] = []

    for (const design of localDesigns) {
      try {
        // Convert localStorage format to Supabase format
        const designData = {
          name: design.name || 'Untitled Design',
          items: design.items || [],
          room_width: design.roomWidth || 300,
          room_height: design.roomHeight || 250,
          current_floor_texture: design.currentFloorTexture || 0,
          current_wall_texture: design.currentWallTexture || 0,
        }

        const { error } = await designService.createDesign(designData)

        if (error) {
          errors.push(`Failed to migrate "${design.name}": ${error}`)
        } else {
          migratedCount++
        }
      } catch (error: any) {
        errors.push(`Error migrating "${design.name}": ${error.message}`)
      }
    }

    // If all designs were migrated successfully, clear localStorage
    if (migratedCount === localDesigns.length) {
      localStorage.removeItem('saved-designs')
      console.log(`✅ Migrated ${migratedCount} designs from localStorage to Supabase`)
    }

    return {
      success: errors.length === 0,
      migratedCount,
      errors
    }
  } catch (error: any) {
    return {
      success: false,
      migratedCount: 0,
      errors: [error.message]
    }
  }
}

/**
 * Check if there are designs in localStorage that need migration
 */
export function hasLocalStorageDesigns(): boolean {
  const savedDesigns = localStorage.getItem('saved-designs')
  if (!savedDesigns) return false

  try {
    const designs = JSON.parse(savedDesigns)
    return Array.isArray(designs) && designs.length > 0
  } catch {
    return false
  }
}
