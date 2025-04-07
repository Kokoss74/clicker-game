import React, { useState, useEffect, useMemo } from "react";
    import { toast } from "react-toastify";
    import { useTimer } from "../hooks/useTimer";
    import { useSupabase } from "../hooks/useSupabase";
    import { useAuthStore } from "../store/auth";
    import { useGameStore } from "../store/game"; // Import game store
    import ModalRules from "./ModalRules";
    import { Database } from "../lib/database.types";
    // Removed formatDiscount, will use gameUtils instead
    import { calculateSmiles, formatRemainingCooldown, generateSmileEmojis } from "../utils/gameUtils";

    // Assume backend will add these fields. TODO: Update when DB schema changes.
    type User = Database["public"]["Tables"]["users"]["Row"] & {
      last_attempt_at?: string | null; // Timestamp of the last attempt
      total_smiles?: number; // Total smiles collected
    };
    type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

    const Game: React.FC = () => {
      const { user } = useAuthStore();
      const { settings } = useGameStore(); // Get settings from game store
      const { time, milliseconds, startTimer, stopTimer, resetTimer } = useTimer();
      // Removed calculateDiscount. recordAttempt needs backend update.
      const { recordAttempt, getUserAttempts, getUser } = useSupabase();

      const [attempts, setAttempts] = useState<Attempt[]>([]);
      const [showRules, setShowRules] = useState(false);
      const [bestResultIndex, setBestResultIndex] = useState<number | null>(null);
      const [currentUser, setCurrentUser] = useState<User | null>(user);
      const [isButtonDisabled, setIsButtonDisabled] = useState(false);
      const [cooldownActive, setCooldownActive] = useState(false);
      const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null);

      // Start the timer when the component loads
      useEffect(() => {
        if (!user) return;

        startTimer();

        // Load user attempts when the component mounts
        const loadAttempts = async () => {
          const userAttempts = await getUserAttempts(user.id);
          setAttempts(userAttempts);

          // Update user data
          const updatedUser = await getUser(user.id) as User | null; // Cast to include potential new fields
          if (updatedUser) {
            setCurrentUser(updatedUser);
            // checkCooldown(updatedUser); // Check cooldown status on load - Definition added below

            // If the user has run out of attempts, find the best result
            if (updatedUser.attempts_left <= 0) {
              findBestResult(userAttempts);
            }
          }
        };

        loadAttempts();

        // Clear the interval when the component unmounts
        return () => {
          stopTimer();
        };
      }, [user?.id]); // Added getUserAttempts, getUser to dependencies? No, they are stable refs from hook.

      // Find the index of the best result (minimum difference)
      const findBestResult = (attemptsData: Attempt[]) => {
        if (attemptsData.length === 0) return;

        let minDiff = Number.MAX_VALUE;
        let minIndex = -1;

        // Find the index of the best result in the displayed attempts
        const displayedAttempts = attemptsData.slice(-10);
        displayedAttempts.forEach((attempt, index) => {
          if (attempt.difference < minDiff) {
            minDiff = attempt.difference;
            minIndex = index;
          }
        });

        if (minIndex !== -1) {
          setBestResultIndex(minIndex);
        }
      };

      // Limit the display of attempts to the last 10
      const displayedAttempts = useMemo(() => {
        return attempts.slice(-10);
      }, [attempts]);

      // Function to check and set cooldown state
      const checkCooldown = (userData: User | null) => {
        if (userData && userData.attempts_left <= 0 && userData.last_attempt_at) {
          const lastAttemptTime = new Date(userData.last_attempt_at).getTime();
          const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
          const cooldownEnds = lastAttemptTime + oneHour;

          if (Date.now() < cooldownEnds) {
            setCooldownActive(true);
            setCooldownEndTime(cooldownEnds);
          } else {
            // Cooldown finished, backend should reset. Refresh user data.
            setCooldownActive(false);
            setCooldownEndTime(null);
            // TODO: Trigger user data refresh here if backend doesn't push updates.
            // Example: getUser(user.id).then(updated => setCurrentUser(updated as User));
            // For now, assume getUser called later will fetch the reset state if backend handled it.
          }
        } else {
          setCooldownActive(false);
          setCooldownEndTime(null);
        }
      };

      // Check cooldown whenever relevant user data might change, and on initial load
       useEffect(() => {
         checkCooldown(currentUser);
       }, [currentUser]); // Check whenever currentUser object changes

      const handleAttempt = async () => {
        if (!user || !currentUser) return;

        // Check cooldown first if attempts are zero
        if (currentUser.attempts_left <= 0) {
          // Re-check cooldown state just before showing message
          checkCooldown(currentUser);
          if (cooldownActive && cooldownEndTime) {
            toast.warning(`Next game will be available ${formatRemainingCooldown(cooldownEndTime)}.`);
          } else {
             // This case implies cooldown finished but backend hasn't reset yet, or no last_attempt_at field
             toast.info("Attempts finished. Waiting for reset or backend update.");
             // Optionally trigger a manual refresh of user data here
             // getUser(user.id).then(updated => setCurrentUser(updated as User));
          }
          return; // Stop attempt if no attempts left
        }

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
        const smilesEarned = calculateSmiles(diff, settings?.smile_ranges); // Pass ranges
        // TODO: Backend update needed for recordAttempt to accept smiles and update last_attempt_at/total_smiles.
        // The hook currently expects 2 args. This will cause a TS error until the hook is updated.
        // Passing smilesEarned as the third argument optimistically.
        const success: boolean = await recordAttempt(user.id, diff, smilesEarned); // Pass smilesEarned to the updated hook

        if (success) {
          // Notify the user about the result
          toast.success(`Difference: ${diff} ms. You earned ${smilesEarned} smiles!`);

          const userAttempts = await getUserAttempts(user.id);
          setAttempts(userAttempts);

          // Update user data (cast to include potential new fields)
          const updatedUser = await getUser(user.id) as User | null;
          if (updatedUser) {
            setCurrentUser(updatedUser);
            checkCooldown(updatedUser); // Re-check cooldown after attempt updates user data

            // Check if the user has run out of attempts AFTER this attempt
            if (updatedUser.attempts_left <= 0) {
              const totalSmiles = updatedUser.total_smiles ?? 0; // Use 0 if undefined from DB
              toast.info(
                `Thank you for playing! You collected ${totalSmiles} smiles! ${generateSmileEmojis(totalSmiles)}`
              );
              findBestResult(userAttempts); // Highlight best result now
            }
          }
        }

        resetTimer();
        startTimer();
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
                isButtonDisabled || cooldownActive || (currentUser && currentUser.attempts_left <= 0)
                  ? "bg-gray-600 cursor-not-allowed" // Disabled if waiting, cooldown active, or no attempts left
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Click Me!
            </button>

            <div className="mt-6">
              <p className="mb-2">Attempts left: {currentUser.attempts_left}</p>
              {currentUser.best_result !== null && (
                <p className="mb-2">
                  Best Result: {currentUser.best_result} ms
                </p>
                )}
                {/* Display total smiles if available and attempts are finished */}
                {currentUser.attempts_left <= 0 && currentUser.total_smiles !== undefined && (
                  <p className="mt-2">Total Smiles Collected: {currentUser.total_smiles} {generateSmileEmojis(currentUser.total_smiles)}</p>
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
                      key={index}
                      className={
                        currentUser.attempts_left <= 0 &&
                        displayedAttempts.length - 1 - index === bestResultIndex
                          ? "bg-green-700"
                          : index % 2 === 0
                          ? "bg-gray-800"
                          : "bg-gray-700"
                      }
                    >
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2">{attempt.difference}</td>
                      <td className="p-2 text-center">{calculateSmiles(attempt.difference, settings?.smile_ranges)}</td> {/* Pass ranges */}
                      <td className="p-2">
                        {/* Using en-GB for DD/MM/YYYY format, adjust if needed */}
                        {new Date(attempt.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })} {new Date(attempt.created_at).toLocaleTimeString("en-GB", {
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
          </div>

          <ModalRules
            isOpen={showRules}
            onRequestClose={() => setShowRules(false)}
          />
        </div>
      );
    };

    export default Game;
