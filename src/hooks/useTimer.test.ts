import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

describe('useTimer hook', () => {
  beforeEach(() => {
    // Use fake timers before each test
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.time).toBe('00:00:00:000');
    expect(result.current.milliseconds).toBe(0);
  });

  it('should start the timer and update time/milliseconds', () => {
    const initialTime = new Date(2024, 3, 10, 10, 20, 30, 100);
    vi.setSystemTime(initialTime);

    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.startTimer();
    });

    // Check initial state after start (should still be default until interval fires)
    expect(result.current.time).toBe('00:00:00:000');
    expect(result.current.milliseconds).toBe(0);

    // Advance time by slightly more than the interval (e.g., 15ms)
    act(() => {
      vi.advanceTimersByTime(15);
    });

    // Time should update based on the *new* Date() call inside the interval
    const expectedTime = new Date(2024, 3, 10, 10, 20, 30, 115); // initial + 15ms
    const expectedHours = String(expectedTime.getHours()).padStart(2, '0');
    const expectedMinutes = String(expectedTime.getMinutes()).padStart(2, '0');
    const expectedSeconds = String(expectedTime.getSeconds()).padStart(2, '0');
    const expectedMs = String(expectedTime.getMilliseconds()).padStart(3, '0');

    expect(result.current.time).toBe(`${expectedHours}:${expectedMinutes}:${expectedSeconds}:${expectedMs}`); // 10:20:30:115
    expect(result.current.milliseconds).toBe(expectedTime.getMilliseconds()); // 115

    // Advance time again
    act(() => {
       vi.advanceTimersByTime(50); // Advance by 50ms
    });

    const secondExpectedTime = new Date(2024, 3, 10, 10, 20, 30, 165); // initial + 15ms + 50ms
    const secondExpectedHours = String(secondExpectedTime.getHours()).padStart(2, '0');
    const secondExpectedMinutes = String(secondExpectedTime.getMinutes()).padStart(2, '0');
    const secondExpectedSeconds = String(secondExpectedTime.getSeconds()).padStart(2, '0');
    const secondExpectedMs = String(secondExpectedTime.getMilliseconds()).padStart(3, '0');

    expect(result.current.time).toBe(`${secondExpectedHours}:${secondExpectedMinutes}:${secondExpectedSeconds}:${secondExpectedMs}`); // 10:20:30:165
    expect(result.current.milliseconds).toBe(secondExpectedTime.getMilliseconds()); // 165
  });

  it('should stop the timer', () => {
    const initialTime = new Date(2024, 3, 10, 11, 0, 0, 0);
    vi.setSystemTime(initialTime);
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      vi.advanceTimersByTime(100); // Let it run for 100ms
    });

    const timeAfterRunning = result.current.time;
    const msAfterRunning = result.current.milliseconds;

    act(() => {
      result.current.stopTimer();
    });

    // Advance time again after stopping
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Time should not have changed after stopping
    expect(result.current.time).toBe(timeAfterRunning);
    expect(result.current.milliseconds).toBe(msAfterRunning);
  });

  it('should reset the timer', () => {
    const initialTime = new Date(2024, 3, 10, 12, 0, 0, 500);
    vi.setSystemTime(initialTime);
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.startTimer();
    });

    act(() => {
      vi.advanceTimersByTime(50); // Let it run
    });

    // Check that time updated
    expect(result.current.time).not.toBe('00:00:00:000');
    expect(result.current.milliseconds).not.toBe(0);

    act(() => {
      result.current.resetTimer();
    });

    // Check that time is reset
    expect(result.current.time).toBe('00:00:00:000');
    expect(result.current.milliseconds).toBe(0);

    // Check that timer is still running if it was running before reset (optional, depends on desired behavior)
    // Let's assume reset doesn't stop the timer if it was running.
    // Advance time again
     act(() => {
       vi.advanceTimersByTime(20);
     });
     // If it was running, it should update from the reset state based on the *new* current time
     const timeAfterResetRun = new Date(2024, 3, 10, 12, 0, 0, 570); // 500 + 50 + 20
     const expectedHours = String(timeAfterResetRun.getHours()).padStart(2, '0');
     const expectedMinutes = String(timeAfterResetRun.getMinutes()).padStart(2, '0');
     const expectedSeconds = String(timeAfterResetRun.getSeconds()).padStart(2, '0');
     const expectedMs = String(timeAfterResetRun.getMilliseconds()).padStart(3, '0');

     // This check depends on whether resetTimer should implicitly stop the timer or not.
     // Based on the code, resetTimer *only* resets state, it doesn't change isRunning.
     // So, if the timer was running, it continues to run after reset.
     expect(result.current.time).toBe(`${expectedHours}:${expectedMinutes}:${expectedSeconds}:${expectedMs}`);
     expect(result.current.milliseconds).toBe(timeAfterResetRun.getMilliseconds());

     // Test reset when timer is stopped
     act(() => {
        result.current.stopTimer();
        result.current.resetTimer(); // Reset while stopped
     });
     expect(result.current.time).toBe('00:00:00:000');
     expect(result.current.milliseconds).toBe(0);
     // Advance time, should not update
     const timeBeforeAdvance = result.current.time;
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current.time).toBe(timeBeforeAdvance);


  });

  it('should clear interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const { result, unmount } = renderHook(() => useTimer());

    act(() => {
      result.current.startTimer();
    });

    // Ensure interval was set up
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    unmount();

    // Check if clearInterval was called during cleanup
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore(); // Clean up spy
  });

   it('should clear interval when stopping the timer', () => {
     const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
     const { result } = renderHook(() => useTimer());

     act(() => {
       result.current.startTimer();
     });

     // Interval should be active now

     act(() => {
       result.current.stopTimer();
     });

     // Check if clearInterval was called when stopping
     expect(clearIntervalSpy).toHaveBeenCalled();
     clearIntervalSpy.mockRestore(); // Clean up spy
   });
});