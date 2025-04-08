import { supabase } from "./supabase";
const regexPhone = /^(?:\+972|0)-?(?:[5789]\d)-?\d{3}-?\d{4}$/;

export interface SignUpData {
  phone: string;
  name: string;
}

export interface SignInData {
  phone: string;
}

/**
 * Normalizes phone number to 972XXXXXXXX format
 * Accepts formats like: +972-50-1234567, 050-1234567, 0501234567, etc.
 */
export const normalizePhone = (phone: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, "");

  // If starts with 0, replace with 972
  if (digitsOnly.startsWith("0")) {
    return "972" + digitsOnly.substring(1);
  }

  // If already starts with 972, return as is
  if (digitsOnly.startsWith("972")) {
    return digitsOnly;
  }

  // Otherwise assume it's a local number without prefix
  return "972" + digitsOnly;
};

export const auth = {
  signUp: async ({ phone, name }: SignUpData) => {
    try {
      // Validate phone format
      if (!phone.match(regexPhone)) {
        throw new Error("Invalid phone format");
      }

      // Нормализуем телефон
      const normalizedPhone = normalizePhone(phone);

      // Check if user exists
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("phone", normalizedPhone);

      if (count && count > 0) {
        throw new Error("User with this phone already exists");
      }

      const { data, error } = await supabase.auth.signUp({
        email: `${normalizedPhone}@user.com`,
        password: `${normalizedPhone}#Pwd123`,
        options: {
          data: {
            phone: normalizedPhone,
            name,
          },
        },
      });

      if (error) throw error;
      console.log("Sign up successful. Data:", data); // Logging success with data object
      return { data, error: null };
    } catch (error) {
      console.error("Sign up failed:", error); // Logging error
      return { data: null, error };
    }
  },

  signIn: async ({ phone }: SignInData) => {
    try {
      // Validate phone format
      if (!phone.match(regexPhone)) {
        throw new Error("Invalid phone format");
      }

      // Нормализуем телефон
      const normalizedPhone = normalizePhone(phone);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${normalizedPhone}@user.com`,
        password: `${normalizedPhone}#Pwd123`,
      });

      if (error) throw error;
      console.log("Sign in successful. Data:", data); // Logging success with data object
      return { data, error: null };
    } catch (error) {
      console.error("Sign in failed:", error); // Logging error
      return { data: null, error };
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log("Sign out successful"); // Logging success
      return { error: null };
    } catch (error) {
      console.error("Sign out failed:", error); // Logging error
      return { error };
    }
  },

  getSession: async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      console.log("Get session successful. Session:", session); // Logging success with session object
      return { session, error: null };
    } catch (error) {
      console.error("Get session failed:", error); // Logging error
      return { session: null, error };
    }
  },
};
