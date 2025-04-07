import React from "react";
import { Database } from "../lib/database.types";
import { generateSmileEmojis } from "../utils/gameUtils";

// Re-define User type locally or import if shared
type User = Database["public"]["Tables"]["users"]["Row"] & {
  last_attempt_at?: string | null;
  // total_smiles field exists in DB, but represents smiles for best_result
};

interface GameStatsProps {
  currentUser: User | null;
}

const GameStats: React.FC<GameStatsProps> = ({ currentUser }) => {
  if (!currentUser) {
    return null; // Or a loading/placeholder state
  }

  return (
    <div className="mt-6 text-gray-300">
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
    </div>
  );
};

export default GameStats;
