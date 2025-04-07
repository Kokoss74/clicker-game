/**
 * Calculates the number of smiles based on the time difference.
 * Rules from README_game.md:
 * - 0 ms: 33 smiles
 * - 1-10 ms: 15 smiles
 * - 11-50 ms: 10 smiles
 * - 51-100 ms: 5 smiles
 * - >100 ms: 3 smiles
 * @param difference Time difference in milliseconds.
 * @returns Number of smiles earned.
 */
export const calculateSmiles = (difference: number): number => {
  if (difference === 0) {
    return 33;
  } else if (difference >= 1 && difference <= 10) {
    return 15;
  } else if (difference >= 11 && difference <= 50) {
    return 10;
  } else if (difference >= 51 && difference <= 100) {
    return 5;
  } else {
    return 3;
  }
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