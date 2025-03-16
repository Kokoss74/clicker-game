import { supabase } from './supabase';

export interface SignUpData {
  phone: string;
  name: string;
}

export interface SignInData {
  phone: string;
}

export const auth = {
  signUp: async ({ phone, name }: SignUpData) => {
    try {
      // Проверяем формат телефона
      if (!phone.match(/^(?:(?:\+972|0)(?:-)?(?:5|7|8|9))(\d{7,8})$/)) {
        throw new Error('Неверный формат телефона');
      }

      // Проверяем существование пользователя
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('phone', phone);

      if (count && count > 0) {
        throw new Error('Пользователь с таким телефоном уже существует');
      }

      const { data, error } = await supabase.auth.signUp({
        email: `${phone}@user.local`,
        password: `${phone}#Pwd123`,
        options: {
          data: {
            phone,
            name,
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  signIn: async ({ phone }: SignInData) => {
    try {
      // Проверяем формат телефона
      if (!phone.match(/^(?:(?:\+972|0)(?:-)?(?:5|7|8|9))(\d{7,8})$/)) {
        throw new Error('Неверный формат телефона');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${phone}@user.local`,
        password: `${phone}#Pwd123`,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  getSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session, error: null };
    } catch (error) {
      return { session: null, error };
    }
  },
};