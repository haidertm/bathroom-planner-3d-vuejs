import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)

  // Initialize auth state
  onMounted(async () => {
    // Get initial session
    const { data: { session: initialSession } } = await supabase.auth.getSession()
    session.value = initialSession
    user.value = initialSession?.user ?? null
    loading.value = false

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
      loading.value = false
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  })

  // Sign in with magic link
  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/planner`,
        },
      })

      if (error) throw error

      return { success: true, message: 'Check your email for the magic link!' }
    } catch (error: any) {
      console.error('Error signing in:', error)
      return { success: false, message: error.message || 'Failed to send magic link' }
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      user.value = null
      session.value = null
      return { success: true }
    } catch (error: any) {
      console.error('Error signing out:', error)
      return { success: false, message: error.message || 'Failed to sign out' }
    }
  }

  // Get user profile
  const getUserProfile = async () => {
    if (!user.value) return null

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('Error getting user profile:', error)
      return null
    }
  }

  // Update user profile
  const updateProfile = async (updates: {
    full_name?: string
    avatar_url?: string
  }) => {
    if (!user.value) return { success: false, message: 'Not authenticated' }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.value.id)

      if (error) throw error
      return { success: true }
    } catch (error: any) {
      console.error('Error updating profile:', error)
      return { success: false, message: error.message || 'Failed to update profile' }
    }
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    signInWithMagicLink,
    signOut,
    getUserProfile,
    updateProfile,
  }
}
