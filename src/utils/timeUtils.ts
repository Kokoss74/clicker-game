/**
 * Форматирует время в формат HH:MM:SS:mmm
 */
export const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${hours}:${minutes}:${seconds}:${ms}`;
};

/**
 * Вычисляет отклонение от целой секунды в миллисекундах
 */
export const calculateDifference = (ms: number): number => {
  // Если миллисекунды равны 0, то отклонение 0
  if (ms === 0) return 0;

  // Если миллисекунды меньше 500, то отклонение - это сами миллисекунды
  if (ms < 500) return ms;

  // Если миллисекунды больше или равны 500, то отклонение - это 1000 - миллисекунды
  return 1000 - ms;
};

/**
 * Форматирует миллисекунды для отображения
 */
export const formatMilliseconds = (ms: number): string => {
  return ms.toString().padStart(3, "0");
};
