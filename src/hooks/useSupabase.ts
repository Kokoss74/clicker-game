import { useState, useCallback } from "react"; // Import useCallback
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { useGameStore } from "../store/game";
import { Database } from "../lib/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

interface UseSupabaseReturn {
  loading: boolean;
  error: string | null;
  recordAttempt: (userId: string, difference: number) => Promise<boolean>;
  getUserAttempts: (userId: string, limit: number) => Promise<Attempt[]>;
  getUser: (userId: string) => Promise<User | null>;
  resetUserAttempts: (userId: string) => Promise<boolean>;
}

export const useSupabase = (): UseSupabaseReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const gameStore = useGameStore(); // Settings might be needed for reset

  const recordAttempt = useCallback(
    async (userId: string, difference: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: rpcError } = await supabase.rpc("record_attempt", {
          difference_value: difference,
        });

        if (rpcError) throw rpcError;
        if (data === false) {
          setError(
            "Attempt could not be recorded (cooldown active or no attempts left)."
          );
          return false;
        }
        return true;
      } catch (error) {
        console.error("Error recording attempt:", error);
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

        if (error) throw error;
        return data || [];
      } catch (error) {
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
          console.warn(`User with id ${userId} not found.`);
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
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
        const { error: updateError } = await supabase
          .from("users")
          .update({
            attempts_left: gameStore.settings?.attempts_number ?? 10, // Use settings from store instance
            best_result: null,
            total_smiles: 0,
            last_attempt_at: null,
          })
          .eq("id", userId);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from("attempts")
          .delete()
          .eq("user_id", userId);

        if (deleteError) {
          console.warn(
            "Could not delete old attempts during reset:",
            deleteError
          );
        }
        return true;
      } catch (error) {
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
