import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/game'
import { Database } from '../lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type Attempt = Database['public']['Tables']['attempts']['Row']

interface UseSupabaseReturn {
  loading: boolean
  error: string | null
  recordAttempt: (userId: string, difference: number) => Promise<boolean>
  getUserAttempts: (userId: string) => Promise<Attempt[]>
  getUser: (userId: string) => Promise<User | null>
  calculateDiscount: (difference: number) => number
  resetUserAttempts: (userId: string) => Promise<boolean>
}

export const useSupabase = (): UseSupabaseReturn => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const gameStore = useGameStore()

  /**
   * Записывает новую попытку пользователя
   */
  const recordAttempt = async (userId: string, difference: number): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Проверяем, остались ли у пользователя попытки
      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('attempts_left')
        .eq('id', userId)
        .single()

      if (userCheckError) throw userCheckError
      if (userData.attempts_left <= 0) {
        setError('У вас не осталось попыток')
        return false
      }

      // Записываем попытку
      const { error: attemptError } = await supabase
        .from('attempts')
        .insert([{ user_id: userId, difference }])

      if (attemptError) throw attemptError

      // Обновляем количество попыток пользователя
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          attempts_left: userData.attempts_left - 1,
          // Если это последняя попытка, обновляем лучший результат и скидку
          ...(userData.attempts_left === 1 ? await calculateBestResult(userId) : {})
        })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      return true
    } catch (error) {
      setError((error as Error).message)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * Вычисляет лучший результат и скидку пользователя
   */
  const calculateBestResult = async (userId: string) => {
    const { data: attempts, error } = await supabase
      .from('attempts')
      .select('difference')
      .eq('user_id', userId)
      .order('difference', { ascending: true })
      .limit(1)

    if (error) throw error
    if (!attempts || attempts.length === 0) return {}

    const bestResult = attempts[0].difference
    const discount = calculateDiscount(bestResult)

    return {
      best_result: bestResult,
      discount
    }
  }

  /**
   * Вычисляет скидку на основе отклонения, используя настройки из gameStore
   */
  const calculateDiscount = (difference: number): number => {
    // Получаем настройки скидок из gameStore
    const discountRanges = gameStore.settings?.discount_ranges
    
    // Если настройки не загружены, используем значения по умолчанию
    if (!discountRanges || !Array.isArray(discountRanges) || discountRanges.length === 0) {
      if (difference === 0) return 25
      if (difference <= 10) return 15
      if (difference <= 50) return 10
      if (difference <= 100) return 5
      return 3
    }
    
    // Находим подходящий диапазон для текущего difference
    const matchingRange = discountRanges.find(range =>
      difference >= range.min &&
      (range.max === null || difference <= range.max)
    )
    
    // Возвращаем найденную скидку или минимальную скидку по умолчанию
    return matchingRange ? matchingRange.discount : 3
  }

  /**
   * Получает все попытки пользователя
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
   * Получает данные пользователя
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
   * Сбрасывает попытки пользователя
   */
  const resetUserAttempts = async (userId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      // Сбрасываем попытки пользователя
      const { error: updateError } = await supabase
        .from('users')
        .update({
          attempts_left: gameStore.settings?.attempts_number || 10,
          best_result: null,
          discount: 0
        })
        .eq('id', userId)

      if (updateError) throw updateError

      // Удаляем все попытки пользователя
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
    calculateDiscount,
    resetUserAttempts
  }
}