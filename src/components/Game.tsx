import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useTimer } from "../hooks/useTimer";
import { useSupabase } from "../hooks/useSupabase";
import { useAuthStore } from "../store/auth";
import { useGameStore } from "../store/game"; // Import game store and helpers
import ModalRules from "./ModalRules";
import { Database } from "../lib/database.types";
// Removed formatDiscount, will use gameUtils instead
import {
  calculateSmiles, // Keep this for displaying smiles per attempt in table
  formatRemainingCooldown, // Restore this import
  generateSmileEmojis,
} from "../utils/gameUtils";

// Type User now reflects DB structure (total_smiles exists but holds smiles for best result)
type User = Database["public"]["Tables"]["users"]["Row"] & {
  last_attempt_at?: string | null;
  // total_smiles field exists in DB, but represents smiles for best_result
};
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

const Game: React.FC = () => {
  const { user, signOut } = useAuthStore(); // Destructure signOut
  const { settings } = useGameStore(); // Get settings
  const { time, milliseconds, startTimer, stopTimer, resetTimer } = useTimer();
  const {
    recordAttempt,
    getUserAttempts,
    getUser,
    error: supabaseError,
  } = useSupabase(); // Get error state from hook

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [bestResultIndex, setBestResultIndex] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  // Restore state for cooldown end time to display message
  const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);

  // Start the timer when the component loads
  useEffect(() => {
    if (!user) return;

    startTimer();

    // Load initial user data and potentially attempts from the current session
    const loadInitialData = async () => {
      // Get user data first
      const loadedUser = (await getUser(user.id)) as User | null;
      if (!loadedUser) return; // Exit if user data couldn't be loaded
      setCurrentUser(loadedUser);

      // Get the number of attempts per session
      const attemptsLimit = settings?.attempts_number ?? 10;

      let userAttempts: Attempt[] = [];
      if (loadedUser.attempts_left > 0) {
        // Session is active, load attempts made in this session
        const attemptsMadeThisSession =
          attemptsLimit - loadedUser.attempts_left;
        if (attemptsMadeThisSession > 0) {
          userAttempts = await getUserAttempts(
            user.id,
            attemptsMadeThisSession
          );
        }
        // If attempts_left === attemptsLimit (start of session), userAttempts remains []
      } else {
        // Session is finished (or cooldown active), load last session's attempts
        userAttempts = await getUserAttempts(user.id, attemptsLimit);
      }
      setAttempts(userAttempts); // Set attempts based on session state
    };

    loadInitialData();

    // Clear the interval when the component unmounts
    return () => {
      stopTimer();
    };
  }, [user?.id, settings?.attempts_number]); // Depend on user ID and number of attempts setting

  // Find the index of the best result within the *original* attempts list (before reversing for display)
  const findBestResult = (attemptsData: Attempt[]) => {
    if (attemptsData.length === 0) {
      setBestResultIndex(null);
      return;
    }

    let minDiff = Number.MAX_VALUE;
    let originalIndex = -1; // Index in the original (non-reversed) attempts array

    attemptsData.forEach((attempt, index) => {
      if (attempt.difference < minDiff) {
        minDiff = attempt.difference;
        originalIndex = index;
      }
    });

    if (originalIndex !== -1) {
      // Store the index from the original array order
      setBestResultIndex(originalIndex);
    } else {
      setBestResultIndex(null); // Reset if no minimum found (shouldn't happen if list not empty)
    }
  };

  // displayedAttempts now directly uses the 'attempts' state.
  // The logic to clear/populate 'attempts' based on session state is handled
  // during loadInitialData and handleAttempt.
  const displayedAttempts = useMemo(() => {
    // Ensure it's always an array for mapping
    return Array.isArray(attempts) ? attempts : [];
  }, [attempts]); // Depends only on the attempts state

  // Re-calculate best result index whenever displayed attempts change
  useEffect(() => {
    // Only calculate if attempts are finished to highlight the best of the session
    if (currentUser && currentUser.attempts_left <= 0) {
      findBestResult(attempts); // Pass the limited attempts list
    } else {
      setBestResultIndex(null); // Clear highlight during active play
    }
  }, [attempts, currentUser?.attempts_left]); // Recalculate when attempts list or attempts_left changes

  // Effect to calculate cooldown end time based on user data for display purposes
  useEffect(() => {
    if (
      currentUser &&
      currentUser.attempts_left <= 0 &&
      currentUser.last_attempt_at
    ) {
      const lastAttemptTime = new Date(currentUser.last_attempt_at).getTime();
      // Use getCooldownMinutes from store, provide default if store/settings not loaded
      const cooldownMinutes = settings?.cooldown_minutes ?? 60;
      const cooldownMilliseconds = cooldownMinutes * 60 * 1000;
      const endTime = lastAttemptTime + cooldownMilliseconds;
      // Only set if the cooldown should still be active
      if (Date.now() < endTime) {
        setCooldownEndTime(endTime);
      } else {
        setCooldownEndTime(null); // Cooldown has passed
      }
    } else {
      setCooldownEndTime(null); // No cooldown active
    }
  }, [currentUser, settings]); // Recalculate if user data or settings change

  const handleAttempt = async () => {
    if (!user || !currentUser) return;

    // REMOVED: Frontend check for attempts_left <= 0.
    // Backend function 'record_attempt' will now handle this check and cooldown logic.

    // Check if button is manually disabled (e.g., during the 2-second wait)

    if (isButtonDisabled) {
      toast.warning("Please wait before the next attempt");
      return;
    }

    setIsButtonDisabled(true);
    setTimeout(() => setIsButtonDisabled(false), 2000); // Disable button for 2 seconds to prevent autoclickers

    stopTimer();

    // Calculate the difference from a whole second
    const diff: number =
      milliseconds < 500 ? milliseconds : 1000 - milliseconds;
    // const smilesEarned = calculateSmiles(diff, settings?.smile_ranges); // Removed: Smiles are calculated and stored by backend now
    // Backend function 'record_attempt' is expected to handle attempt recording,
    // stats updates (smiles, attempts_left, last_attempt_at, best_result), and cooldown logic.
    const success: boolean = await recordAttempt(user.id, diff); // Call backend function with difference only

    if (success) {
      // Notify the user about the result (difference only)
      toast.success(`Difference: ${diff} ms.`);

      // Determine if it was the start of a new session
      const previousAttemptsLeft = currentUser?.attempts_left ?? 0; // Store attempts before the successful call

      // Refresh user data from DB *after* successful attempt
      const updatedUser = (await getUser(user.id)) as User | null;
      if (updatedUser) {
        setCurrentUser(updatedUser); // Update user state first

        const attemptsLimit = settings?.attempts_number ?? 10;
        const latestUserAttempts = await getUserAttempts(
          user.id,
          attemptsLimit
        ); // Fetch latest attempts

        // Check if a new session just started (attempts went from 0 to > 0)
        const isNewSessionStart =
          previousAttemptsLeft <= 0 && updatedUser.attempts_left > 0;

        if (isNewSessionStart) {
          // If new session, show only the very last attempt (the first of this session)
          // Since attempts are ordered DESC, the first element is the latest one.
          setAttempts(
            latestUserAttempts.length > 0 ? [latestUserAttempts[0]] : []
          );
        } else {
          // If session continues, show the latest N attempts fetched.
          // Calculate how many attempts have been made in this session
          const attemptsMadeThisSession =
            attemptsLimit - updatedUser.attempts_left;
          // Show only the attempts corresponding to this session
          setAttempts(latestUserAttempts.slice(0, attemptsMadeThisSession));
        }

        // Check if the user has run out of attempts AFTER this attempt
        if (updatedUser.attempts_left <= 0) {
          // Show smiles corresponding to the best result of the session
          const bestResultSmiles = updatedUser.total_smiles ?? 0; // total_smiles now stores smiles for best result
          toast.info(
            `Game finished! Your best result (${
              updatedUser.best_result
            } ms) earned you ${bestResultSmiles} smiles! ${generateSmileEmojis(
              bestResultSmiles
            )}`
          );
          // No need to call findBestResult here, useEffect handles it based on updated attempts/attempts_left
        }
      }
    } else if (supabaseError && supabaseError.includes("Cooldown active")) {
      // If recordAttempt failed specifically due to cooldown
      if (cooldownEndTime) {
        // Show the formatted remaining time
        toast.warning(
          `Next game will be available ${formatRemainingCooldown(
            cooldownEndTime
          )}.`
        );
      } else {
        // Fallback message if cooldownEndTime couldn't be calculated
        toast.warning("Cooldown active. Try again later.");
      }
    }
    // Other errors (like "No attempts left") are handled by toast in useSupabase hook

    resetTimer();
    startTimer();
  };

  const handleSignOut = async () => {
    await signOut();
    // No need to redirect here, App.tsx handles rendering AuthForm when user is null
    toast.info("You have been logged out.");
  };

  if (!user || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Clicker Game</h1>

      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="timer text-4xl font-mono mb-6 text-center">{time}</div>

        <button
          onClick={handleAttempt}
          className={`w-full py-4 rounded-lg text-xl font-bold transition-colors ${
            isButtonDisabled ||
            // cooldownActive || // Removed frontend cooldown check from condition
            (currentUser && currentUser.attempts_left <= 0)
              ? "bg-gray-600 cursor-not-allowed" // Disabled if waiting, cooldown active, or no attempts left
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          Click Me!
        </button>

        <div className="mt-6">
          <p className="mb-2">Attempts left: {currentUser.attempts_left}</p>
          {currentUser.best_result !== null && (
            <p className="mb-2">Best Result: {currentUser.best_result} ms</p>
          )}
          {/* Display smiles for best result if available and attempts are finished */}
          {currentUser.attempts_left <= 0 &&
            currentUser.total_smiles !== undefined && // Check if total_smiles exists
            currentUser.best_result !== null && ( // Only show if there's a best result
              <p className="mt-2">
                Smiles for Best Result: {currentUser.total_smiles}{" "}
                {generateSmileEmojis(currentUser.total_smiles)}
              </p>
            )}

          <table className="w-full mt-4 border-collapse">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Difference (ms)</th>
                <th className="p-2 text-left">Smiles 😊</th>
                <th className="p-2 text-left">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {[...displayedAttempts].reverse().map((attempt, index) => (
                <tr
                  key={attempt.id} // Use attempt ID as key
                  className={
                    // Highlight the best result row *after* attempts are finished
                    // Note: 'index' here is from the *reversed* array (0 = oldest shown)
                    // 'bestResultIndex' is the index in the *original* 'attempts' array (0 = newest)
                    // Convert bestResultIndex to the reversed index for comparison
                    currentUser.attempts_left <= 0 &&
                    bestResultIndex !== null &&
                    index === displayedAttempts.length - 1 - bestResultIndex
                      ? "bg-green-700" // Highlight row if indices match after conversion
                      : index % 2 === 0
                      ? "bg-gray-800"
                      : "bg-gray-700"
                  }
                >
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">{attempt.difference}</td>
                  <td className="p-2 text-center">
                    {/* Calculate smiles for display based on current ranges */}
                    {calculateSmiles(
                      attempt.difference,
                      settings?.smile_ranges
                    )}
                  </td>{" "}
                  {/* Pass ranges */}
                  <td className="p-2">
                    {/* Using en-GB for DD/MM/YYYY format, adjust if needed */}
                    {new Date(attempt.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}{" "}
                    {new Date(attempt.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </td>
                </tr>
              ))}

              {displayedAttempts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-2 text-center">
                    No attempts yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => setShowRules(true)}
          className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          Game Rules
        </button>

        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          className="mt-4 w-full py-2 bg-red-600 hover:bg-red-700 rounded transition-colors text-white"
        >
          Logout
        </button>
      </div>

      <ModalRules
        isOpen={showRules}
        onRequestClose={() => setShowRules(false)}
      />
    </div>
  );
};

export default Game;
