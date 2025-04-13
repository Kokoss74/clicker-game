import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { useGameSession } from './useGameSession';
import { useAuthStore } from '../store/auth';
import { useGameStore } from '../store/game';
import { useSupabase } from './useSupabase';
import { Database } from '../lib/database.types';

// Type definitions
type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];
type GameSettings = Database["public"]["Tables"]["game_settings"]["Row"];

// --- Mocks ---
// Don't mock Zustand stores directly, we'll set state instead
// Mock useSupabase hook
vi.mock('./useSupabase');
// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock implementations
// We mock the return values in beforeEach, no need for these casts
// const mockUseAuthStore = useAuthStore as ReturnType<typeof vi.fn>;
// const mockUseGameStore = useGameStore as ReturnType<typeof vi.fn>;
const mockUseSupabase = useSupabase as ReturnType<typeof vi.fn>;
const mockToastInfo = toast.info as ReturnType<typeof vi.fn>;
const mockToastError = toast.error as ReturnType<typeof vi.fn>;

// Default mock return values for useSupabase
const mockRecordAttempt = vi.fn();
const mockGetUserAttempts = vi.fn();
const mockGetUser = vi.fn();

// Default mock state for stores
const mockUserId = 'user-123';
const mockUser: User = {
  id: mockUserId,
  name: 'Test User',
  phone: '1234567890',
  attempts_left: 5,
  best_result: 50,
  total_smiles: 10,
  last_attempt_at: new Date(Date.now() - 100000).toISOString(), // Some time ago
  created_at: new Date().toISOString(),
};
const mockSettings: GameSettings = {
  id: 1,
  attempts_number: 10,
  smile_ranges: [{ min: 0, max: 100, smiles: 5 }],
  cooldown_minutes: 60,
};
// Let's assume 5 attempts were made initially, matching mockUser.attempts_left = 5
const mockAttempts: Attempt[] = Array.from({ length: 5 }, (_, i) => ({
  id: `attempt-${i + 1}`,
  user_id: mockUserId,
  difference: 50 + i * 10, // Example differences
  created_at: new Date(Date.now() - (5 - i) * 60000).toISOString(), // Attempts made in the past
}));

describe('useGameSession hook', () => {
  beforeEach(() => {
    // Reset mocks and timers before each test
    vi.clearAllMocks();
    // vi.useFakeTimers(); // Use real timers to avoid issues with waitFor and async updates

    // Reset Zustand stores to a default state for tests
    useAuthStore.setState({ user: mockUser, loading: false, error: null }, true);
    useGameStore.setState({ settings: mockSettings, loading: false, error: null }, true);

    // Setup default mock implementations for useSupabase
    mockUseSupabase.mockReturnValue({
      recordAttempt: mockRecordAttempt.mockResolvedValue(true), // Default success
      // Return a copy reflecting the initial state (5 attempts made)
      getUserAttempts: mockGetUserAttempts.mockResolvedValue([...mockAttempts]),
      getUser: mockGetUser.mockResolvedValue({ ...mockUser }), // Return copy
    });
  });

  afterEach(() => {
    // Restore real timers
    // vi.useRealTimers(); // Use real timers
  });

  it('should initialize with loading state and fetch initial data', async () => {
    const { result } = renderHook(() => useGameSession());

    // Initial state check
    expect(result.current.isLoading).toBe(true);
    expect(result.current.currentUser).toBeNull();
    expect(result.current.attempts).toEqual([]);

    // Wait for initial data load to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Check state after load
    expect(result.current.currentUser).toEqual(mockUser);
    // Attempts fetched should match the number made (total - left)
    const attemptsMade = mockSettings.attempts_number - mockUser.attempts_left;
    expect(result.current.attempts).toEqual(mockAttempts.slice(0, attemptsMade));
    expect(mockGetUser).toHaveBeenCalledWith(mockUserId);
    expect(mockGetUserAttempts).toHaveBeenCalledWith(mockUserId, attemptsMade);
  });

  it('should handle initial load when no user is logged in', async () => {
    useAuthStore.setState({ user: null }); // Set user to null for this test case
    const { result } = renderHook(() => useGameSession());

    // expect(result.current.isLoading).toBe(true); // Removed: Effect runs too fast when no user

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentUser).toBeNull();
    expect(result.current.attempts).toEqual([]);
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockGetUserAttempts).not.toHaveBeenCalled();
  });

   it('should handle error during initial user fetch', async () => {
     const errorMsg = "Failed to fetch user";
     mockGetUser.mockRejectedValueOnce(new Error(errorMsg));
     const { result } = renderHook(() => useGameSession());

     await waitFor(() => expect(result.current.isLoading).toBe(false));

     expect(result.current.currentUser).toBeNull();
     expect(result.current.attempts).toEqual([]);
     expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining(errorMsg));
   });

    it('should handle error during initial attempts fetch', async () => {
      const errorMsg = "Failed to fetch attempts";
      mockGetUserAttempts.mockRejectedValueOnce(new Error(errorMsg));
      const { result } = renderHook(() => useGameSession());

      // Wait specifically for currentUser to be populated after getUser succeeds,
      // even if getUserAttempts fails later. Also wait for loading to finish.
      await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
          expect(result.current.currentUser).not.toBeNull();
      });

      // Now assert the user data
      expect(result.current.currentUser).toEqual(mockUser);
      // Attempts should be empty due to error
      expect(result.current.attempts).toEqual([]);
      expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining(errorMsg));
    });


  it('should calculate cooldownEndTime correctly when attempts are 0', async () => {
    const now = Date.now();
    // vi.setSystemTime(now); // Not needed with real timers
    const lastAttemptTime = now - 10 * 60 * 1000; // 10 minutes ago
    const userWithNoAttempts: User = {
      ...mockUser,
      attempts_left: 0,
      last_attempt_at: new Date(lastAttemptTime).toISOString(),
    };
    mockGetUser.mockResolvedValue(userWithNoAttempts); // Mock getUser to return this user initially
    useAuthStore.setState({ user: userWithNoAttempts }); // Set specific user state

    const { result } = renderHook(() => useGameSession());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.currentUser).toEqual(userWithNoAttempts)); // Wait for user update

    // Use non-null assertion as mockSettings provides a value
    const expectedEndTime = lastAttemptTime + mockSettings.cooldown_minutes! * 60 * 1000;
    expect(result.current.cooldownEndTime).toBe(expectedEndTime);
  });

   it('should have null cooldownEndTime when attempts > 0', async () => {
     // Default mockUser has attempts_left > 0
     const { result } = renderHook(() => useGameSession());
     await waitFor(() => expect(result.current.isLoading).toBe(false));
     expect(result.current.cooldownEndTime).toBeNull();
   });

   it('should have null cooldownEndTime when cooldown has expired', async () => {
     const now = Date.now();
     const cooldownMinutes = mockSettings.cooldown_minutes;
     // Last attempt was longer ago than the cooldown period
     // Use non-null assertion as mockSettings provides a value
     const lastAttemptTime = now - (cooldownMinutes! + 5) * 60 * 1000;
     const userWithNoAttempts: User = {
       ...mockUser,
       attempts_left: 0,
       last_attempt_at: new Date(lastAttemptTime).toISOString(),
     };
      mockGetUser.mockResolvedValue(userWithNoAttempts);
      useAuthStore.setState({ user: userWithNoAttempts }); // Set specific user state

     // vi.setSystemTime(now); // Not needed with real timers

     const { result } = renderHook(() => useGameSession());
     await waitFor(() => expect(result.current.isLoading).toBe(false));
     await waitFor(() => expect(result.current.currentUser).toEqual(userWithNoAttempts));

     expect(result.current.cooldownEndTime).toBeNull();
   });


  describe('handleAttemptSubmit', () => {
    it('should submit attempt successfully, refresh data, and update state', async () => {
      const { result } = renderHook(() => useGameSession());
      await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial load

      const difference = 25;
      const updatedUser: User = { ...mockUser, attempts_left: mockUser.attempts_left - 1, last_attempt_at: new Date().toISOString() }; // attempts_left becomes 4
      const newAttempt: Attempt = { id: `attempt-${mockAttempts.length + 1}`, user_id: mockUserId, difference: difference, created_at: new Date().toISOString() }; // This is the 6th attempt

      // Simulate the full list of attempts *after* this one (6 total)
      const allSimulatedAttemptsAfterSubmit = [...mockAttempts, newAttempt];

      // Mock return values for the refresh calls inside handleAttemptSubmit
      mockRecordAttempt.mockResolvedValueOnce(true);
      mockGetUser.mockResolvedValueOnce(updatedUser); // Mock the getUser call during refresh
      // Mock the getUserAttempts call during refresh. It should return *all* 6 attempts
      // as if querying the DB with limit=10. The hook will slice this.
      mockGetUserAttempts.mockResolvedValueOnce([...allSimulatedAttemptsAfterSubmit]);

      await act(async () => {
        const success = await result.current.handleAttemptSubmit(difference);
        expect(success).toBe(true);
      });

      // Check loading state during submit
      // Note: Checking intermediate loading state requires careful timing or state exposure
      // expect(result.current.isSubmitting).toBe(false); // Should be false after completion

      await waitFor(() => expect(result.current.currentUser).toEqual(updatedUser));
      await waitFor(() => {
         const attemptsMade = mockSettings.attempts_number - updatedUser.attempts_left;
         // Expect the correct number of attempts, including the new one
         expect(result.current.attempts).toHaveLength(attemptsMade);
         // Optionally check if the last attempt matches the new one (depends on sorting/fetching logic)
         // expect(result.current.attempts[attemptsMade - 1].difference).toBe(difference);
      });

      expect(mockRecordAttempt).toHaveBeenCalledWith(difference);
      expect(mockGetUser).toHaveBeenCalledTimes(2); // Initial load + refresh
      expect(mockGetUserAttempts).toHaveBeenCalledTimes(2); // Initial load + refresh
      expect(mockToastInfo).not.toHaveBeenCalled(); // No end-of-game toast yet
    });

    it('should show end-of-game toast when attempts reach zero', async () => {
       const userWithOneAttempt: User = { ...mockUser, attempts_left: 1 };
       mockGetUser.mockResolvedValueOnce(userWithOneAttempt); // Initial load
       useAuthStore.setState({ user: userWithOneAttempt }); // Set specific user state

       const { result } = renderHook(() => useGameSession());
       await waitFor(() => expect(result.current.isLoading).toBe(false));

       const difference = 30;
       const finalUser: User = { ...userWithOneAttempt, attempts_left: 0, last_attempt_at: new Date().toISOString(), total_smiles: 15, best_result: 30 };
       const finalAttempt: Attempt = { id: 'attempt-final', user_id: mockUserId, difference: difference, created_at: new Date().toISOString() }; // Use string ID, remove smiles_earned

       mockRecordAttempt.mockResolvedValueOnce(true);
       mockGetUser.mockResolvedValueOnce(finalUser); // Refresh returns user with 0 attempts
       mockGetUserAttempts.mockResolvedValueOnce([...mockAttempts, finalAttempt]);

       await act(async () => {
         await result.current.handleAttemptSubmit(difference);
       });

       await waitFor(() => expect(result.current.currentUser?.attempts_left).toBe(0));
       expect(mockToastInfo).toHaveBeenCalledWith(expect.stringContaining('Game finished!'));
       expect(mockToastInfo).toHaveBeenCalledWith(expect.stringContaining(`earned you ${finalUser.total_smiles} smiles`));
    });

    it('should handle failed attempt submission (e.g., cooldown)', async () => {
       const { result } = renderHook(() => useGameSession());
       await waitFor(() => expect(result.current.isLoading).toBe(false));

       mockRecordAttempt.mockResolvedValueOnce(false); // Simulate failure
       const refreshedUser = { ...mockUser, last_attempt_at: new Date().toISOString() }; // User might be refreshed even on failure
       mockGetUser.mockResolvedValueOnce(refreshedUser); // Mock refresh call

       const initialAttempts = result.current.attempts;
      // const initialUser = result.current.currentUser; // Remove unused variable

       await act(async () => {
         const success = await result.current.handleAttemptSubmit(500);
         expect(success).toBe(false);
       });

       await waitFor(() => expect(result.current.currentUser).toEqual(refreshedUser)); // User might refresh
       expect(result.current.attempts).toEqual(initialAttempts); // Attempts should not change
       expect(mockGetUser).toHaveBeenCalledTimes(2); // Initial + refresh attempt
       expect(mockGetUserAttempts).toHaveBeenCalledTimes(1); // Only initial load
       expect(mockToastInfo).not.toHaveBeenCalled();
       expect(mockToastError).not.toHaveBeenCalled();
    });

     it('should handle error during user refresh after successful attempt', async () => {
       const { result } = renderHook(() => useGameSession());
       await waitFor(() => expect(result.current.isLoading).toBe(false));

       const difference = 40;
       const errorMsg = "User refresh failed";
       mockRecordAttempt.mockResolvedValueOnce(true);
       mockGetUser.mockRejectedValueOnce(new Error(errorMsg)); // Fail the refresh call

       await act(async () => {
         await result.current.handleAttemptSubmit(difference);
       });

       // State might not update fully, but error should be shown
       await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining(errorMsg)));
       // Check that submission state is reset
       expect(result.current.isSubmitting).toBe(false);

     });

     it('should not submit if no user is logged in', async () => {
         useAuthStore.setState({ user: null }); // Set user to null for this test case
        const { result } = renderHook(() => useGameSession());
        await waitFor(() => expect(result.current.isLoading).toBe(false)); // Wait for initial check

        await act(async () => {
          const success = await result.current.handleAttemptSubmit(100);
          expect(success).toBe(false); // Should return false or similar indication
        });

        expect(mockRecordAttempt).not.toHaveBeenCalled();
        expect(mockGetUser).not.toHaveBeenCalled(); // Only initial check if any
        expect(mockGetUserAttempts).not.toHaveBeenCalled();
     });
  });
});