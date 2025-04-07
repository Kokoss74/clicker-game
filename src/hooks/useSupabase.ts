import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useGameStore } from "../store/game"; // Restored game store import
import { Database } from "../lib/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

interface UseSupabaseReturn {
  loading: boolean;
  error: string | null;
  recordAttempt: (
    userId: string,
    difference: number,
    smilesEarned: number
  ) => Promise<boolean>; // Added smilesEarned param
  getUserAttempts: (userId: string) => Promise<Attempt[]>;
  getUser: (userId: string) => Promise<User | null>;
  // calculateDiscount removed
  resetUserAttempts: (userId: string) => Promise<boolean>;
}

export const useSupabase = (): UseSupabaseReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const gameStore = useGameStore(); // Restored game store usage

  /**
   * Records a new user attempt by calling the backend function `record_attempt`.
   * @param userId The user's ID.
   * @param difference The time difference for the attempt.
   * @param smilesEarned The number of smiles earned for this attempt (will be passed to backend function).
   */
  const recordAttempt = async (
    userId: string,
    difference: number,
    smilesEarned: number
  ): Promise<boolean> => {
    // Note: This function now expects the backend function `record_attempt` to handle
    // decrementing attempts_left, updating total_smiles, last_attempt_at, best_result, and cooldown logic.
    // The frontend only needs to call the function with the difference and smiles.
    try {
      setLoading(true);
      setError(null);

      // Call the database function directly
      const { data, error: rpcError } = await supabase.rpc("record_attempt", {
        difference_value: difference,
        smiles_earned: smilesEarned,
      });

      if (rpcError) throw rpcError;

      // The function returns true on success, false or throws error on failure
      if (data === false) {
        // Handle specific cases if the function returns false instead of throwing
        setError(
          "Attempt could not be recorded (cooldown active or no attempts left)."
        );
        return false;
      }

      return true; // Assume success if no error and data is not explicitly false
    } catch (error) {
      // Log the error for debugging
      console.error("Error recording attempt:", error);
      // Set a user-friendly error message
      if ((error as Error).message.includes("Cooldown active")) {
        setError("Cooldown active. Try again later.");
      } else if ((error as Error).message.includes("No attempts left")) {
        setError("No attempts left.");
      } else {
        setError(`Failed to record attempt: ${(error as Error).message}`);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Removed calculateBestResult and calculateDiscount functions

  /**
   * Gets all attempts for a user.
   */
  const getUserAttempts = async (userId: string): Promise<Attempt[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("attempts")
        .select("*")
        .eq("user_id", userId) // Assuming RLS allows this or it's called where user_id is known securely
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      setError((error as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gets user data by ID.
   */
  const getUser = async (userId: string): Promise<User | null> => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user data using the user's auth ID (assuming RLS allows this)
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId) // Fetching by internal ID, ensure RLS allows if needed
        .single();

      if (error) {
        // Handle cases like user not found gracefully if needed
        if (error.code === "PGRST116") {
          // PostgREST code for "Resource Not Found"
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
  };

  /**
   * Resets user attempts and related stats.
   * NOTE: This function might be used for manual admin resets or if the automatic
   * cooldown reset logic on the backend needs a manual trigger in some cases.
   */
  const resetUserAttempts = async (userId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Reset user stats
      const { error: updateError } = await supabase
        .from("users")
        .update({
          attempts_left: gameStore.settings?.attempts_number ?? 10, // Use settings from store instance
          best_result: null,
          total_smiles: 0, // Reset total smiles
          last_attempt_at: null, // Clear last attempt time
        })
        .eq("id", userId); // Assuming RLS allows this update

      if (updateError) throw updateError;

      // Optionally delete old attempts (consider if history is needed)
      const { error: deleteError } = await supabase
        .from("attempts")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        // Log warning but don't necessarily fail the whole reset
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
  };

  return {
    loading,
    error,
    recordAttempt,
    getUserAttempts,
    getUser,
    // calculateDiscount removed
    resetUserAttempts,
  };
};
