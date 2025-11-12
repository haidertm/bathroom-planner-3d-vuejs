import { supabase } from '../lib/supabase'
import type { Design } from '../lib/supabase'

export interface CreateDesignData {
  name: string
  description?: string
  items: any[]
  room_width: number
  room_height: number
  current_floor_texture?: number
  current_wall_texture?: number
  preview_url?: string
}

export interface UpdateDesignData {
  name?: string
  description?: string
  items?: any[]
  room_width?: number
  room_height?: number
  current_floor_texture?: number
  current_wall_texture?: number
  preview_url?: string
  is_public?: boolean
}

class DesignService {
  // Get all designs for the current user
  async getUserDesigns(): Promise<{ data: Design[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { data: null, error: 'Not authenticated' }
      }

      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      return { data, error }
    } catch (error) {
      console.error('Error getting designs:', error)
      return { data: null, error }
    }
  }

  // Get a single design by ID
  async getDesign(id: string): Promise<{ data: Design | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', id)
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error getting design:', error)
      return { data: null, error }
    }
  }

  // Get a design by share token (public or owned)
  async getDesignByShareToken(token: string): Promise<{ data: Design | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('share_token', token)
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error getting shared design:', error)
      return { data: null, error }
    }
  }

  // Create a new design
  async createDesign(designData: CreateDesignData): Promise<{ data: Design | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { data: null, error: 'Not authenticated' }
      }

      const { data, error } = await supabase
        .from('designs')
        .insert({
          user_id: user.id,
          ...designData,
        })
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error creating design:', error)
      return { data: null, error }
    }
  }

  // Update a design
  async updateDesign(id: string, updates: UpdateDesignData): Promise<{ data: Design | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('designs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error updating design:', error)
      return { data: null, error }
    }
  }

  // Delete a design
  async deleteDesign(id: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('designs')
        .delete()
        .eq('id', id)

      return { success: !error, error }
    } catch (error) {
      console.error('Error deleting design:', error)
      return { success: false, error }
    }
  }

  // Generate share token for a design
  async generateShareToken(id: string): Promise<{ token: string | null; error: any }> {
    try {
      // Call the database function to generate a unique token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token')

      if (tokenError) throw tokenError

      // Update the design with the new share token and make it public
      const { data, error } = await supabase
        .from('designs')
        .update({
          share_token: tokenData,
          is_public: true,
        })
        .eq('id', id)
        .select('share_token')
        .single()

      if (error) throw error

      return { token: data.share_token, error: null }
    } catch (error) {
      console.error('Error generating share token:', error)
      return { token: null, error }
    }
  }

  // Remove share token (make design private)
  async removeShareToken(id: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('designs')
        .update({
          share_token: null,
          is_public: false,
        })
        .eq('id', id)

      return { success: !error, error }
    } catch (error) {
      console.error('Error removing share token:', error)
      return { success: false, error }
    }
  }

  // Duplicate a design
  async duplicateDesign(id: string, newName?: string): Promise<{ data: Design | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { data: null, error: 'Not authenticated' }
      }

      // Get the original design
      const { data: original, error: fetchError } = await this.getDesign(id)

      if (fetchError || !original) {
        return { data: null, error: fetchError || 'Design not found' }
      }

      // Create a new design with the same data
      const { data, error } = await supabase
        .from('designs')
        .insert({
          user_id: user.id,
          name: newName || `${original.name} (Copy)`,
          description: original.description,
          items: original.items,
          room_width: original.room_width,
          room_height: original.room_height,
          current_floor_texture: original.current_floor_texture,
          current_wall_texture: original.current_wall_texture,
          preview_url: original.preview_url,
          is_public: false, // Duplicates are private by default
          share_token: null,
        })
        .select()
        .single()

      return { data, error }
    } catch (error) {
      console.error('Error duplicating design:', error)
      return { data: null, error }
    }
  }

  // Get share URL for a design
  getShareUrl(token: string): string {
    return `${window.location.origin}/shared/${token}`
  }
}

export const designService = new DesignService()
