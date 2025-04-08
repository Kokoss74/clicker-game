import React from "react";
import { Database, SmileRange } from "../lib/database.types";
import { calculateSmiles } from "../utils/gameUtils";
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

// Re-define User type locally or import if shared
type User = Database["public"]["Tables"]["users"]["Row"] & {
  last_attempt_at?: string | null;
  // total_smiles field exists in DB, but represents smiles for best_result
};

interface GameStatsProps {
  currentUser: User | null;
  attempts: Attempt[];
  bestResultIndex: number | null;
  smileRanges: SmileRange[] | null | undefined;
}

const GameStats: React.FC<GameStatsProps> = ({
  currentUser,
  attempts,
  bestResultIndex,
  smileRanges,
}) => {
  if (!currentUser) {
    return null; // Or a loading/placeholder state
  }

  return (
    <div className="mt-6 text-gray-300">
      {/* Game Over Message & Best Result */}
      {currentUser.attempts_left <= 0 &&
        bestResultIndex !== null &&
        attempts[bestResultIndex] && (
          <div className="bg-green-700 text-white p-3 rounded mb-4 text-center font-semibold shadow-md">
            {" "}
            <p className="text-lg mb-1">Game Over!</p>
            <p>
              {/* Calculate smiles based on difference and defined ranges */}
              Smiles for Best Result:{" "}
              {calculateSmiles(
                attempts[bestResultIndex].difference,
                smileRanges
              )}
            </p>
            {/* Display the actual emojis on a new line */}
            <p className="text-2xl mt-1">
              {"😊".repeat(
                calculateSmiles(
                  attempts[bestResultIndex].difference,
                  smileRanges
                )
              )}
            </p>
          </div>
        )}

      {/* Regular Stats */}
      <div className="text-gray-600 dark:text-gray-300">
      <p className="mb-2">Attempts left: {currentUser.attempts_left}</p>
      {currentUser.best_result !== null && (
        <p className="mb-2">Best Result: {currentUser.best_result} ms</p>
      )}
      </div>
    </div>
  );
};

export default GameStats;
