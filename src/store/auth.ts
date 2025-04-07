import { create } from 'zustand';
import { auth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { SignUpData, SignInData } from '../lib/auth';
import { Database } from '../lib/database.types';
import { normalizePhone } from '../lib/auth';

type User = Database['public']['Tables']['users']['Row'];

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (data: SignInData) => Promise<void>;
  signOut: () => Promise<void>;
  checkUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signUp: async (data: SignUpData) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await auth.signUp(data);
      if (error) throw error;

      // Wait a bit for the trigger to create the user record
      await new Promise(resolve => setTimeout(resolve, 1500));

      const normalizedPhone = normalizePhone(data.phone);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) throw new Error('Error creating user');

      set({ user: userData, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  signIn: async (data: SignInData) => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await auth.signIn(data);
      if (error) throw error;
      
      const normalizedPhone = normalizePhone(data.phone);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) throw new Error('User not found');

      set({ user: userData, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });
      
      const { error } = await auth.signOut();
      if (error) throw error;

      set({ user: null, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  checkUser: async () => {
    try {
      set({ loading: true });
      
      const { session } = await auth.getSession();
      if (!session) {
        set({ user: null, loading: false });
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .maybeSingle();

      if (userError) throw userError;

      set({ user: userData || null, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));