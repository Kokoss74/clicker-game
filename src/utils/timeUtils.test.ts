import { describe, it, expect } from 'vitest';
import { formatTime, calculateDifference, formatMilliseconds } from './timeUtils';

describe('timeUtils', () => {
  describe('formatTime', () => {
    it('should format date correctly', () => {
      const date = new Date(2024, 3, 10, 14, 35, 58, 123); // Note: Month is 0-indexed (3 = April)
      expect(formatTime(date)).toBe('14:35:58:123');
    });

    it('should pad single digit hours, minutes, seconds, and milliseconds', () => {
      const date = new Date(2024, 0, 5, 7, 8, 9, 5); // 5 Jan 2024, 07:08:09:005
      expect(formatTime(date)).toBe('07:08:09:005');
    });

    it('should handle midnight correctly', () => {
      const date = new Date(2024, 11, 31, 0, 0, 0, 0); // 31 Dec 2024, 00:00:00:000
      expect(formatTime(date)).toBe('00:00:00:000');
    });
  });

  describe('calculateDifference', () => {
    it('should return 0 for 0 milliseconds', () => {
      expect(calculateDifference(0)).toBe(0);
    });

    it('should return the milliseconds if less than 500', () => {
      expect(calculateDifference(1)).toBe(1);
      expect(calculateDifference(250)).toBe(250);
      expect(calculateDifference(499)).toBe(499);
    });

    it('should return 1000 - milliseconds if greater than or equal to 500', () => {
      expect(calculateDifference(500)).toBe(500); // 1000 - 500
      expect(calculateDifference(750)).toBe(250); // 1000 - 750
      expect(calculateDifference(999)).toBe(1);   // 1000 - 999
    });
  });

  describe('formatMilliseconds', () => {
    it('should pad single digit milliseconds', () => {
      expect(formatMilliseconds(5)).toBe('005');
    });

    it('should pad double digit milliseconds', () => {
      expect(formatMilliseconds(45)).toBe('045');
    });

    it('should not pad triple digit milliseconds', () => {
      expect(formatMilliseconds(123)).toBe('123');
    });

    it('should handle 0 milliseconds', () => {
      expect(formatMilliseconds(0)).toBe('000');
    });
  });
});