/**
 * Formats time in HH:MM:SS:mmm format
 */
export const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${hours}:${minutes}:${seconds}:${ms}`;
};

/**
 * Calculates the deviation from a whole second in milliseconds
 */
export const calculateDifference = (ms: number): number => {
  // If milliseconds are 0, then the deviation is 0
  if (ms === 0) return 0;

  // If milliseconds are less than 500, then the deviation is the milliseconds themselves
  if (ms < 500) return ms;

  // If milliseconds are greater than or equal to 500, then the deviation is 1000 - milliseconds
  return 1000 - ms;
};

/**
 * Formats milliseconds for display
 */
export const formatMilliseconds = (ms: number): string => {
  return ms.toString().padStart(3, "0");
};
