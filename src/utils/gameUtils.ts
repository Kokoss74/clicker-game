import { SmileRange } from "../lib/database.types";

    /**
     * Calculates the number of smiles based on the time difference and configured ranges.
     * @param difference Time difference in milliseconds.
     * @param ranges Array of SmileRange objects from game settings.
     * @returns Number of smiles earned based on the provided ranges.
     */
    export const calculateSmiles = (difference: number, ranges: SmileRange[] | null | undefined): number => {
      // Use default ranges if none provided or invalid
      const effectiveRanges = (Array.isArray(ranges) && ranges.length > 0)
        ? ranges
        : [ // Default fallback ranges (same as previous hardcoded logic)
            { min: 0, max: 0, smiles: 33 },
            { min: 1, max: 10, smiles: 15 },
            { min: 11, max: 50, smiles: 10 },
            { min: 51, max: 100, smiles: 5 },
            { min: 101, max: null, smiles: 3 },
          ];

      // Find the matching range
      // Ensure ranges are sorted by min value for potentially overlapping ranges,
      // although the logic assumes distinct non-overlapping ranges based on typical use case.
      // If ranges can overlap, the first match will be taken.
      const sortedRanges = [...effectiveRanges].sort((a, b) => a.min - b.min);

      const matchingRange = sortedRanges.find(range =>
        difference >= range.min &&
        (range.max === null || difference <= range.max)
      );

      // Return smiles from the matching range, or 0 if no range matches (shouldn't happen with default)
      return matchingRange ? matchingRange.smiles : 0;
    };


    /**
     * Formats the remaining cooldown time into a human-readable string.
     * @param cooldownEndTimestamp The timestamp when the cooldown ends.
     * @returns A string like "X minutes" or "less than a minute".
     */
    export const formatRemainingCooldown = (cooldownEndTimestamp: number): string => {
      const now = Date.now();
      const remainingMilliseconds = cooldownEndTimestamp - now;

      if (remainingMilliseconds <= 0) {
        return "available now"; // Should not happen if logic is correct, but good fallback
      }

      const remainingMinutes = Math.ceil(remainingMilliseconds / (1000 * 60));

      if (remainingMinutes <= 1) {
        return "in less than a minute";
      } else {
        return `in ${remainingMinutes} minutes`;
      }
    };

    /**
     * Generates a string of smile emojis based on the count.
     * @param count Number of smiles.
     * @returns A string of smile emojis (😊).
     */
    export const generateSmileEmojis = (count: number): string => {
      if (count <= 0) return "";
      // Limit the number of emojis for performance/display reasons if needed
      const displayCount = Math.min(count, 50); // Example limit
      return '😊'.repeat(displayCount);
    };