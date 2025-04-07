import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useAuthStore } from "../store/auth";
import { useGameStore } from "../store/game";
import { useSupabase } from "./useSupabase";
import { Database } from "../lib/database.types";
import { generateSmileEmojis } from "../utils/gameUtils";

type User = Database["public"]["Tables"]["users"]["Row"] & {
  last_attempt_at?: string | null;
};
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

export const useGameSession = () => {
  const { user } = useAuthStore();
  const { settings } = useGameStore();
  // supabaseLoading is not directly used here anymore, but hook manages its own loading states
  const { recordAttempt, getUserAttempts, getUser } = useSupabase();

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Separate initial loading from update loading
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For attempt submission loading
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);

  // --- Data Loading ---
  const loadInitialData = useCallback(async () => {
    if (!user?.id) {
      setCurrentUser(null);
      setAttempts([]);
      setIsInitialLoading(false); // Finish initial loading even if no user
      return;
    }
    setIsInitialLoading(true); // Start initial loading
    try {
      const loadedUser = (await getUser(user.id)) as User | null;
      if (!loadedUser) {
        toast.error("Failed to load user data.");
        setCurrentUser(null);
        setAttempts([]);
        setIsInitialLoading(false);
        return;
      }
      setCurrentUser(loadedUser);

      const attemptsLimit = settings?.attempts_number ?? 10;
      let userAttempts: Attempt[] = [];

      if (loadedUser.attempts_left > 0) {
        const attemptsMadeThisSession =
          attemptsLimit - loadedUser.attempts_left;
        if (attemptsMadeThisSession > 0) {
          userAttempts = await getUserAttempts(
            user.id,
            attemptsMadeThisSession
          );
        }
      } else {
        userAttempts = await getUserAttempts(user.id, attemptsLimit);
      }
      setAttempts(userAttempts);
    } catch (error) {
      toast.error(`Error loading initial data: ${(error as Error).message}`);
      setCurrentUser(null);
      setAttempts([]);
    } finally {
      setIsInitialLoading(false); // Finish initial loading
    }
  }, [user?.id, getUser, getUserAttempts, settings?.attempts_number]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // --- Cooldown Calculation ---
  useEffect(() => {
    if (
      currentUser &&
      currentUser.attempts_left <= 0 &&
      currentUser.last_attempt_at
    ) {
      const lastAttemptTime = new Date(currentUser.last_attempt_at).getTime();
      const cooldownMinutes = settings?.cooldown_minutes ?? 60;
      const cooldownMilliseconds = cooldownMinutes * 60 * 1000;
      const endTime = lastAttemptTime + cooldownMilliseconds;
      if (Date.now() < endTime) {
        setCooldownEndTime(endTime);
      } else {
        setCooldownEndTime(null);
      }
    } else {
      setCooldownEndTime(null);
    }
  }, [currentUser, settings?.cooldown_minutes]);

  // --- Attempt Handling ---
  const handleAttemptSubmit = useCallback(
    async (difference: number) => {
      if (!user?.id || !currentUser) return false;

      setIsSubmitting(true); // Indicate submission is in progress
      const previousAttemptsLeft = currentUser.attempts_left;

      const success = await recordAttempt(user.id, difference);

      // Refresh data regardless of success/failure to get latest state,
      // but do it within try/finally to ensure isSubmitting is reset.
      try {
        if (success) {
          // Refresh user data first to get the latest state after the attempt
          const updatedUser = (await getUser(user.id)) as User | null;
          if (updatedUser) {
            setCurrentUser(updatedUser); // Update user state

            // Fetch latest attempts based on new user state
            const attemptsLimit = settings?.attempts_number ?? 10;
            const latestUserAttempts = await getUserAttempts(
              user.id,
              attemptsLimit
            );

            // Determine if a new session started
            const isNewSessionStart =
              previousAttemptsLeft <= 0 && updatedUser.attempts_left > 0;

            if (isNewSessionStart) {
              setAttempts(
                latestUserAttempts.length > 0 ? [latestUserAttempts[0]] : []
              );
            } else {
              const attemptsMadeThisSession =
                attemptsLimit - updatedUser.attempts_left;
              setAttempts(latestUserAttempts.slice(0, attemptsMadeThisSession));
            }

            // Show end-of-game toast if attempts are now zero
            if (updatedUser.attempts_left <= 0) {
              const bestResultSmiles = updatedUser.total_smiles ?? 0;
              toast.info(
                `Game finished! Your best result (${
                  updatedUser.best_result
                } ms) earned you ${bestResultSmiles} smiles! ${generateSmileEmojis(
                  bestResultSmiles
                )}`
              );
            }
          } else {
            toast.error("Could not refresh user data after attempt.");
          }
        } else {
          // If recordAttempt failed (e.g., cooldown), still try to refresh user data
          // to potentially update cooldownEndTime based on latest last_attempt_at
          const refreshedUser = (await getUser(user.id)) as User | null;
          if (refreshedUser) setCurrentUser(refreshedUser);
        }
      } catch (refreshError) {
        toast.error(
          `Error refreshing data after attempt: ${
            (refreshError as Error).message
          }`
        );
      } finally {
        setIsSubmitting(false); // Finish submission indicator
      }

      return success; // Return the original success status of recordAttempt
    },
    [
      user?.id,
      currentUser,
      recordAttempt,
      getUser,
      getUserAttempts,
      settings?.attempts_number,
    ]
  );

  return {
    currentUser,
    attempts,
    // Return only initial loading state for the main loading screen
    isLoading: isInitialLoading,
    // Optionally return isSubmitting if needed for button states etc.
    isSubmitting, // e.g., to disable button during submit
    cooldownEndTime,
    handleAttemptSubmit,
  };
};
