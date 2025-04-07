import React from "react";
import { Database, SmileRange } from "../lib/database.types";
import { calculateSmiles } from "../utils/gameUtils"; // Keep calculateSmiles for display

type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

interface AttemptsTableProps {
  attempts: Attempt[];
  smileRanges: SmileRange[] | null | undefined;
  bestResultIndex: number | null; // Index in the original (non-reversed) attempts array
  attemptsLeft: number;
}

const AttemptsTable: React.FC<AttemptsTableProps> = ({
  attempts,
  smileRanges,
  bestResultIndex,
  attemptsLeft,
}) => {
  // Reverse attempts for display (newest first in data, oldest first in table)
  const displayedAttempts = [...attempts].reverse();

  return (
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
        {displayedAttempts.map((attempt, index) => {
          // Determine if this row should be highlighted
          const isBest =
            attemptsLeft <= 0 &&
            bestResultIndex !== null &&
            // Convert original bestResultIndex to the reversed index for comparison
            index === attempts.length - 1 - bestResultIndex;

          return (
            <tr
              key={attempt.id} // Use attempt ID as key
              className={
                isBest
                  ? "bg-green-700" // Highlight row if it's the best
                  : index % 2 === 0
                  ? "bg-gray-800"
                  : "bg-gray-700"
              }
            >
              <td className="p-2">{index + 1}</td>
              <td className="p-2">{attempt.difference}</td>
              <td className="p-2 text-center">
                {/* Calculate smiles for display based on current ranges */}
                {calculateSmiles(attempt.difference, smileRanges)}
              </td>{" "}
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
          );
        })}

        {displayedAttempts.length === 0 && (
          <tr>
            <td colSpan={4} className="p-2 text-center">
              No attempts yet for this session.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default AttemptsTable;
