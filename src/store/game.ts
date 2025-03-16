import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type GameSettings = Database['public']['Tables']['game_settings']['Row'];
type Attempt = Database['public']['Tables']['attempts']['Row'];

interface GameState {
  settings: GameSettings | null;
  attempts: Attempt[];
  loading: boolean;
  error: string | null;
  lastClickTime: number | null;
  isButtonDisabled: boolean;
  
  loadSettings: () => Promise<void>;
  recordAttempt: (userId: string, difference: number) => Promise<void>;
  setButtonDisabled: (disabled: boolean) => void;
  setLastClickTime: (time: number | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  settings: null,
  attempts: [],
  loading: false,
  error: null,
  lastClickTime: null,
  isButtonDisabled: false,

  loadSettings: async () => {
    try {
      set({ loading: true, error: null });
      
      const { data: settings, error } = await supabase
        .from('game_settings')
        .select()
        .eq('id', 1)
        .single();

      if (error) throw error;

      set({ settings, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  recordAttempt: async (userId: string, difference: number) => {
    try {
      set({ loading: true, error: null });

      const { data: attempt, error } = await supabase
        .from('attempts')
        .insert([{ user_id: userId, difference }])
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        attempts: [...state.attempts, attempt],
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  setButtonDisabled: (disabled: boolean) => {
    set({ isButtonDisabled: disabled });
  },

  setLastClickTime: (time: number | null) => {
    set({ lastClickTime: time });
  },
}));