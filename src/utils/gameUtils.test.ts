import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSmiles,
  formatRemainingCooldown,
  generateSmileEmojis,
} from './gameUtils';
import { SmileRange } from '../lib/database.types'; // Assuming this type is correctly defined

// Mock SmileRange type for testing if needed, or rely on the imported one
// type MockSmileRange = { min: number; max: number | null; smiles: number };

describe('gameUtils', () => {
  describe('calculateSmiles', () => {
    // Default ranges defined inside the function for fallback
    const defaultRanges: SmileRange[] = [
      { min: 0, max: 0, smiles: 33 },
      { min: 1, max: 10, smiles: 15 },
      { min: 11, max: 50, smiles: 10 },
      { min: 51, max: 100, smiles: 5 },
      { min: 101, max: null, smiles: 3 },
    ];

    it('should use default ranges if ranges are null', () => {
      expect(calculateSmiles(0, null)).toBe(33);
      expect(calculateSmiles(5, null)).toBe(15);
      expect(calculateSmiles(50, null)).toBe(10);
      expect(calculateSmiles(100, null)).toBe(5);
      expect(calculateSmiles(101, null)).toBe(3);
      expect(calculateSmiles(500, null)).toBe(3);
    });

    it('should use default ranges if ranges are undefined', () => {
      expect(calculateSmiles(0, undefined)).toBe(33);
      expect(calculateSmiles(10, undefined)).toBe(15);
    });

    it('should use default ranges if ranges array is empty', () => {
      expect(calculateSmiles(0, [])).toBe(33);
      expect(calculateSmiles(20, [])).toBe(10);
    });

    it('should use provided ranges correctly', () => {
      const customRanges: SmileRange[] = [
        { min: 0, max: 5, smiles: 50 },
        { min: 6, max: 20, smiles: 25 },
        { min: 21, max: null, smiles: 5 },
      ];
      expect(calculateSmiles(3, customRanges)).toBe(50);
      expect(calculateSmiles(6, customRanges)).toBe(25);
      expect(calculateSmiles(20, customRanges)).toBe(25);
      expect(calculateSmiles(21, customRanges)).toBe(5);
      expect(calculateSmiles(1000, customRanges)).toBe(5);
    });

    it('should handle edge cases of ranges', () => {
       const customRanges: SmileRange[] = [
        { min: 0, max: 0, smiles: 100 },
        { min: 1, max: 10, smiles: 50 },
        { min: 11, max: null, smiles: 10 },
      ];
      expect(calculateSmiles(0, customRanges)).toBe(100);
      expect(calculateSmiles(1, customRanges)).toBe(50);
      expect(calculateSmiles(10, customRanges)).toBe(50);
      expect(calculateSmiles(11, customRanges)).toBe(10);
    });

     it('should return 0 if no range matches (and no default)', () => {
       // This scenario is unlikely with the default fallback, but tests the core logic.
       // We test a value that falls below the minimum of the default ranges.
       // A better approach might be to refactor calculateSmiles to accept defaults as a parameter
       // to explicitly test the "no match" scenario without relying on the internal default.
       // Let's test with the default ranges logic instead.
       expect(calculateSmiles(-1, defaultRanges)).toBe(0); // Test value below the minimum default range
     });

     it('should handle unsorted ranges', () => {
        const unsortedRanges: SmileRange[] = [
            { min: 51, max: 100, smiles: 5 },
            { min: 0, max: 0, smiles: 33 },
            { min: 101, max: null, smiles: 3 },
            { min: 1, max: 10, smiles: 15 },
            { min: 11, max: 50, smiles: 10 },
        ];
        expect(calculateSmiles(5, unsortedRanges)).toBe(15);
        expect(calculateSmiles(75, unsortedRanges)).toBe(5);
     });
  });

  describe('formatRemainingCooldown', () => {
    beforeEach(() => {
      // Freeze time before each test in this describe block
      vi.useFakeTimers();
    });

    afterEach(() => {
      // Restore real timers after each test
      vi.useRealTimers();
    });

    it('should return "available now" if timestamp is in the past', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatRemainingCooldown(now - 10000)).toBe('available now');
    });

    it('should return "available now" if timestamp is now', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatRemainingCooldown(now)).toBe('available now');
    });

    it('should return "in less than a minute" for times <= 1 minute away', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatRemainingCooldown(now + 30 * 1000)).toBe('in less than a minute'); // 30 seconds
      expect(formatRemainingCooldown(now + 60 * 1000)).toBe('in less than a minute'); // exactly 1 minute
    });

    it('should return "in X minutes" for times > 1 minute away', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      expect(formatRemainingCooldown(now + 60 * 1000 + 1)).toBe('in 2 minutes'); // 1 min 1 ms -> ceil to 2
      expect(formatRemainingCooldown(now + 5 * 60 * 1000)).toBe('in 5 minutes'); // 5 minutes
      expect(formatRemainingCooldown(now + 10 * 60 * 1000 - 1000)).toBe('in 10 minutes'); // 9 min 59 sec -> ceil to 10
    });
  });

  describe('generateSmileEmojis', () => {
    it('should return an empty string for 0 count', () => {
      expect(generateSmileEmojis(0)).toBe('');
    });

    it('should return an empty string for negative count', () => {
      expect(generateSmileEmojis(-5)).toBe('');
    });

    it('should return the correct number of emojis', () => {
      expect(generateSmileEmojis(1)).toBe('😊');
      expect(generateSmileEmojis(3)).toBe('😊😊😊');
    });

    // Optional: Test the internal limit if it's important
    // it('should cap the number of emojis at the limit', () => {
    //   // Assuming the internal limit is 50
    //   expect(generateSmileEmojis(50)).toBe('😊'.repeat(50));
    //   expect(generateSmileEmojis(51)).toBe('😊'.repeat(50));
    //   expect(generateSmileEmojis(100)).toBe('😊'.repeat(50));
    // });
  });
});