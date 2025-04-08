import { useState, useCallback } from "react"; 
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { useGameStore } from "../store/game";
import { Database } from "../lib/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

interface UseSupabaseReturn {
  loading: boolean;
  error: string | null;
  recordAttempt: (difference: number) => Promise<boolean>;
  getUserAttempts: (userId: string, limit: number) => Promise<Attempt[]>;
  getUser: (userId: string) => Promise<User | null>;
  resetUserAttempts: (userId: string) => Promise<boolean>;
}

export const useSupabase = (): UseSupabaseReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const gameStore = useGameStore(); 

  const recordAttempt = useCallback(
    async (difference: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: rpcError } = await supabase.rpc("record_attempt", {
          difference_value: difference,
        });

        if (rpcError) {
          console.error("recordAttempt: RPC error:", rpcError); // Logging RPC error
          throw rpcError;
        }
        if (data === false) {
          console.warn("recordAttempt: Attempt rejected by RPC (cooldown or no attempts)."); // Logging rejection
          setError(
            "Attempt could not be recorded (cooldown active or no attempts left)."
          );
          return false;
        }
        return true;
      } catch (error) {
        console.error("recordAttempt: Error caught:", error); // Logging caught error
        const errorMessage = (error as Error).message;
        if (errorMessage.includes("Cooldown active")) {
          setError("Cooldown active. Try again later.");
        } else if (errorMessage.includes("No attempts left")) {
          toast.error("No attempts left.");
          setError("No attempts left.");
        } else {
          toast.error(`Failed to record attempt: ${errorMessage}`);
          setError(`Failed to record attempt: ${errorMessage}`);
        }
        return false;
      } finally {
        setLoading(false);
      }
      // Dependencies: supabase is stable, setLoading/setError are stable setters
    },
    []
  ); // Empty dependency array as it doesn't depend on changing props/state from this hook scope

  const getUserAttempts = useCallback(
    async (userId: string, limit: number): Promise<Attempt[]> => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("attempts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) {
          console.error("getUserAttempts: Error fetching attempts:", error); // Logging fetch error
          throw error;
        }
        console.log(`getUserAttempts: Fetched attempts for user ${userId}:`, data); // Log fetched attempts data
        return data || [];
      } catch (error) {
        console.error("getUserAttempts: Error caught:", error); // Logging caught error
        setError((error as Error).message);
        return [];
      } finally {
        setLoading(false);
      }
      // Dependencies: supabase, setLoading, setError
    },
    []
  ); // Empty dependency array

  const getUser = useCallback(async (userId: string): Promise<User | null> => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.warn(`getUser: User with id ${userId} not found (PGRST116).`); // Logging not found
          return null;
        }
        console.error("getUser: Error fetching user:", error); // Logging fetch error
        throw error;
      }
      console.log(`getUser: Fetched user data for ID ${userId}:`, data); // Log fetched user data
      return data;
    } catch (error) {
      console.error("getUser: Error caught:", error); // Logging caught error
      setError((error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
    // Dependencies: supabase, setLoading, setError
  }, []); // Empty dependency array

  const resetUserAttempts = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        console.log(`resetUserAttempts: Updating user ${userId} attempts_left to ${gameStore.settings?.attempts_number ?? 10}`); // Logging update details
        const { error: updateError } = await supabase
          .from("users")
          .update({
            attempts_left: gameStore.settings?.attempts_number ?? 10, // Use settings from store instance
            best_result: null,
            total_smiles: 0,
            last_attempt_at: null,
          })
          .eq("id", userId);

        if (updateError) {
          console.error(`resetUserAttempts: Error updating user ${userId}:`, updateError); // Logging update error
          throw updateError;
        }
        const { error: deleteError } = await supabase
          .from("attempts")
          .delete()
          .eq("user_id", userId);

        if (deleteError) {
          console.warn( // Keep as warn, as reset might partially succeed
            `resetUserAttempts: Could not delete old attempts for user ${userId} during reset:`,
            deleteError
          );
          // Don't throw here, the user update might have succeeded
        }
        return true;
      } catch (error) {
        console.error(`resetUserAttempts: Error caught during reset for user ${userId}:`, error); // Logging caught error
        setError((error as Error).message);
        return false;
      } finally {
        setLoading(false);
      }
      // Dependencies: supabase, setLoading, setError, gameStore.settings (might change)
    },
    [gameStore.settings]
  ); // Add gameStore.settings as dependency

  return {
    loading,
    error,
    recordAttempt,
    getUserAttempts,
    getUser,
    resetUserAttempts,
  };
};
