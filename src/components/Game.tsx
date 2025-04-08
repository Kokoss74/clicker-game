import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useTimer } from "../hooks/useTimer";
import { useAuthStore } from "../store/auth";
import { useGameStore } from "../store/game";
import { useGameSession } from "../hooks/useGameSession";
import ModalRules from "./ModalRules";
import GameStats from "./GameStats";
import AttemptsTable from "./AttemptsTable";
import { formatRemainingCooldown } from "../utils/gameUtils";
import {
  Clock,
  MousePointerClick,
  Loader,
  BookOpen,
  LogOut,
  Gamepad2,
} from "lucide-react"; 

const Game: React.FC = () => {
  const { signOut } = useAuthStore();
  const { settings } = useGameStore();
  const { time, milliseconds, startTimer, stopTimer } = useTimer();
  const {
    currentUser,
    attempts,
    isLoading, // Initial loading state
    isSubmitting, // Attempt submission loading state
    handleAttemptSubmit,
    cooldownEndTime,
  } = useGameSession();

  const [showRules, setShowRules] = useState(false);
  // Local state only for the 2-second visual delay after a click
  const [isClickDelayed, setIsClickDelayed] = useState(false);
  // State to hold the displayed time during submission "freeze"
  const [frozenTime, setFrozenTime] = useState<string | null>(null);

  const handleButtonClick = async () => {
    console.log("Game: handleButtonClick triggered."); // Logging button click
    // 1. Check if attempts are left *first*
    if (currentUser && currentUser.attempts_left <= 0) {
      console.log("Game: Checking attempts left - user has 0 attempts.");
      if (cooldownEndTime && Date.now() < cooldownEndTime) {
        console.log("Game: Cooldown is active."); // Logging cooldown active
        toast.warning(
          `Next game will be available ${formatRemainingCooldown(
            cooldownEndTime
          )}.`
        );
        return; // Only return if we are SURE cooldown is active
      } else {
        console.log("Game: Cooldown seems to be over, allowing attempt submission check.");
        // Allow click to proceed if cooldown might be over
      }
      // If cooldown seems over, let the handleAttemptSubmit call proceed below
    }

    // 2. Check 2-second visual delay OR if a submission is already in progress
    if (isClickDelayed || isSubmitting) {
      console.log(`Game: Click rejected. isClickDelayed=${isClickDelayed}, isSubmitting=${isSubmitting}`); 
      toast.warning("Please wait before the next attempt.");
      return;
    }

    // --- Proceed with attempt logic ---
    // Apply visual delay
    setIsClickDelayed(true);
    setTimeout(() => {
      setIsClickDelayed(false);
    }, 2000);

    // Stop timer and capture the current time for freezing
    stopTimer();
    setFrozenTime(time); // << CAPTURE TIME HERE
    const diff: number =
      milliseconds < 500 ? milliseconds : 1000 - milliseconds;
    console.log(`Game: Calculated difference: ${diff}ms (raw milliseconds: ${milliseconds})`);

    // Call the actual attempt logic from the hook
    const success = await handleAttemptSubmit(diff);
    console.log(`Game: handleAttemptSubmit returned: ${success}`);

    // Only show success toast here if needed
    if (success) {
      toast.success(`Difference: ${diff} ms.`);
    }
    // Error toasts are handled within useSupabase/useGameSession hooks

    // Unfreeze the display and restart the timer AFTER the attempt logic is fully processed
    setFrozenTime(null); // << UNFREEZE TIME HERE
    startTimer();
  };

  // --- Best Result Highlighting Logic ---
  const [bestResultIndex, setBestResultIndex] = useState<number | null>(null);

  const findBestResult = (attemptsData: typeof attempts) => {
    if (attemptsData.length === 0) {
      setBestResultIndex(null);
      return;
    }
    let minDiff = Number.MAX_VALUE;
    let originalIndex = -1;
    attemptsData.forEach((attempt, index) => {
      if (attempt.difference < minDiff) {
        minDiff = attempt.difference;
        originalIndex = index;
      }
    });
    setBestResultIndex(originalIndex !== -1 ? originalIndex : null);
  };

  useEffect(() => {
    if (currentUser && currentUser.attempts_left <= 0) {
      findBestResult(attempts);
    } else {
      setBestResultIndex(null);
    }
  }, [attempts, currentUser?.attempts_left]);
  // --- End Best Result Highlighting ---

  // Effect to start the timer when the component mounts and user is loaded
  useEffect(() => {
    if (currentUser && !isLoading) {
      startTimer();
    }
    // Cleanup function to stop timer on unmount
    return () => {
      stopTimer();
    };
  }, [currentUser, isLoading, startTimer, stopTimer]); // Add isLoading dependency

  const handleSignOut = async () => {
    await signOut();
    toast.info("You have been logged out.");
  };

  // Use initial loading state from the hook for the main loading screen
  if (isLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
        <div className="text-xl flex items-center gap-2">
          Loading Game...
          <Loader size={24} className="animate-spin" />
        </div>
      </div>
    );
  }

  // Determine if the button should visually appear disabled
  const showButtonAsDisabled =
    isClickDelayed ||
    isSubmitting ||
    (currentUser.attempts_left <= 0 &&
      cooldownEndTime &&
      Date.now() < cooldownEndTime);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col">
      <div className="flex-grow">
        <h1 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">
          Clicker Game
          <Gamepad2 size={30} />
        </h1>

        <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Timer Display: Show frozen time if available, otherwise live time */}
          <div className="timer text-4xl font-mono mb-6 text-center flex items-center justify-center gap-2">
            <Clock size={36} />
            {frozenTime ?? time}
          </div>

          {/* Click Button */}
          <button
            onClick={handleButtonClick} // Use the handler that checks attempts first
            className={`w-full py-4 rounded-lg text-xl font-bold transition-colors flex items-center justify-center gap-2 ${
              // Apply disabled styles based on game state, but keep clickable
              showButtonAsDisabled
                ? "bg-gray-600 cursor-not-allowed" // Style as disabled
                : "bg-blue-600 hover:bg-blue-700" // Style as active
            }`}
          >
            {isSubmitting ? (
              <>
                Processing... <Loader size={20} className="animate-spin" />
              </> 
            ) : (
              <>
                Click Me! <MousePointerClick size={20} />
              </> 
            )}
          </button>

          {/* Game Stats Component */}
          <GameStats
            currentUser={currentUser}
            attempts={attempts} 
            bestResultIndex={bestResultIndex} 
            smileRanges={settings?.smile_ranges} 
          />

          {/* Attempts Table Component */}
          <AttemptsTable
            attempts={attempts}
            smileRanges={settings?.smile_ranges}
            bestResultIndex={bestResultIndex}
            attemptsLeft={currentUser.attempts_left}
          />

          {/* Rules Button */}
          <button
            onClick={() => {
              console.log("Game: Opening rules modal."); 
              setShowRules(true);
            }}
            className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors flex items-center justify-center gap-2" // Added flex, gap
          >
            Game Rules
            <BookOpen size={18} /> 
          </button>

          {/* Logout Button */}
          <button
            onClick={handleSignOut}
            className="mt-4 w-full py-2 bg-red-600 hover:bg-red-700 rounded transition-colors text-white flex items-center justify-center gap-2" // Added flex, gap
          >
            Logout
            <LogOut size={18} /> 
          </button>
        </div>

        {/* Rules Modal */}
        <ModalRules
          isOpen={showRules}
          onRequestClose={() => {
            console.log("Game: Closing rules modal."); 
            setShowRules(false);
          }}
        />
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm mt-10 pb-4">
        Created by Pasha Feldman - Skilled Software Engineer
      </footer>
    </div>
  );
};

export default Game;
