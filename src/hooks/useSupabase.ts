import { useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify"; // Import toast
import { useGameStore } from "../store/game"; // Restored game store import
import { Database } from "../lib/database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

interface UseSupabaseReturn {
  loading: boolean;
  error: string | null;
  recordAttempt: (
    userId: string,
    difference: number
    // smilesEarned: number // Removed smilesEarned parameter
  ) => Promise<boolean>;
  getUserAttempts: (userId: string, limit: number) => Promise<Attempt[]>; // Added limit parameter
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
   * The backend function now calculates smiles based on the best result.
   * @param userId The user's ID.
   * @param difference The time difference for the attempt.
   */
  const recordAttempt = async (
    userId: string,
    difference: number
    // smilesEarned: number // Removed smilesEarned parameter
  ): Promise<boolean> => {
    // Note: This function now expects the backend function `record_attempt` to handle
    // decrementing attempts_left, updating total_smiles (based on best result),
    // last_attempt_at, best_result, and cooldown logic.
    // The frontend only needs to call the function with the difference.
    try {
      setLoading(true);
      setError(null);

      // Call the database function directly
      const { data, error: rpcError } = await supabase.rpc("record_attempt", {
        difference_value: difference,
        // smiles_earned: smilesEarned, // Removed smilesEarned parameter
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
      // Get the error message
      const errorMessage = (error as Error).message;

      // Set error state based on the message
      // Do not show toast for "Cooldown active" here, let the component handle it
      if (errorMessage.includes("Cooldown active")) {
        setError("Cooldown active. Try again later.");
      } else if (errorMessage.includes("No attempts left")) {
        toast.error("No attempts left."); // Show toast for no attempts
        setError("No attempts left.");
      } else {
        // Generic error toast for other unexpected issues
        toast.error(`Failed to record attempt: ${errorMessage}`);
        setError(`Failed to record attempt: ${errorMessage}`);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Removed calculateBestResult and calculateDiscount functions

  /**
   * Gets the last N attempts for a user.
   * @param userId The user's ID.
   * @param limit The maximum number of attempts to retrieve.
   */
  const getUserAttempts = async (
    userId: string,
    limit: number
  ): Promise<Attempt[]> => {
    // Added limit parameter
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("attempts")
        .select("*")
        .eq("user_id", userId) // Assuming RLS allows this or it's called where user_id is known securely
        .order("created_at", { ascending: false })
        .limit(limit); // Added limit to the query

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
          total_smiles: 0, // Reset total smiles (now represents smiles for best result)
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
