import { useState } from 'react'
import { supabase } from '../lib/supabase'
// import { useGameStore } from '../store/game' // Removed unused store
import { Database } from '../lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type Attempt = Database['public']['Tables']['attempts']['Row']

interface UseSupabaseReturn {
  loading: boolean
  error: string | null
  recordAttempt: (userId: string, difference: number) => Promise<boolean>
  getUserAttempts: (userId: string) => Promise<Attempt[]>
  getUser: (userId: string) => Promise<User | null>
  // calculateDiscount removed
  resetUserAttempts: (userId: string) => Promise<boolean>
}

export const useSupabase = (): UseSupabaseReturn => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  // const gameStore = useGameStore() // Removed unused store

  /**
   * Records a new user attempt.
   * TODO: Backend needs update to accept smiles, update total_smiles and last_attempt_at.
   * @param userId The user's ID.
   * @param difference The time difference for the attempt.
   * @param smilesEarned The number of smiles earned for this attempt (currently unused, pending backend update).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const recordAttempt = async (userId: string, difference: number, _smilesEarned?: number): Promise<boolean> => { // Prefix with _ or add eslint ignore
    // Note: smilesEarned is currently unused until backend is updated.
    try {
      setLoading(true)
      setError(null)

      // Check if the user has attempts left
      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('attempts_left')
        .eq('id', userId)
        .single()

      if (userCheckError) throw userCheckError
      if (!userData || userData.attempts_left <= 0) {
        setError('No attempts left or user not found.')
        return false
      }

      // Record the attempt
      const { error: attemptError } = await supabase
        .from('attempts')
        .insert([{ user_id: userId, difference }])

      if (attemptError) throw attemptError

      // Update user's attempts left and potentially last_attempt_at (placeholder)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          attempts_left: userData.attempts_left - 1,
          // TODO: Backend should handle updating total_smiles and last_attempt_at.
          // The following is a placeholder assuming backend handles it via triggers or functions.
          last_attempt_at: new Date().toISOString(), // Placeholder: Update last attempt time
        })
        .eq('id', userId)
      // Removed .select().single() as updatedUser data is not used here anymore

      if (updateError) throw updateError

      return true
    } catch (error) {
      setError((error as Error).message)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Removed calculateBestResult and calculateDiscount functions as they are no longer needed.
  // Smile calculation is done in the frontend (gameUtils.ts).
  // Best result is now just informational and stored directly in the user table if needed.

  /**
   * Gets all attempts for a user.
   */
  const getUserAttempts = async (userId: string): Promise<Attempt[]> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      setError((error as Error).message)
      return []
    } finally {
      setLoading(false)
    }
  }

  /**
   * Gets user data by ID.
   */
  const getUser = async (userId: string): Promise<User | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      setError((error as Error).message)
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * Resets user attempts and related stats.
   * TODO: Backend needs update to handle resetting based on last_attempt_at + 1 hour cooldown.
   * This function might become obsolete if backend handles reset automatically.
   */
  const resetUserAttempts = async (userId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Reset user attempts
      const { error: updateError } = await supabase
        .from('users')
        .update({
          // TODO: Fetch attempts_number from game_settings if needed, or use a constant. Using 10 for now.
          attempts_left: 10,
          best_result: null,
          // discount: 0, // Removed discount
          total_smiles: 0 // Placeholder: Reset total smiles
        })
        .eq('id', userId)

      if (updateError) throw updateError

      // Delete all user attempts (optional, depends on whether history should be kept)
      const { error: deleteError } = await supabase
        .from('attempts')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      return true
    } catch (error) {
      setError((error as Error).message)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    recordAttempt,
    getUserAttempts,
    getUser,
    // calculateDiscount removed
    resetUserAttempts
  }
}