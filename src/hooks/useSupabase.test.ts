import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { useSupabase } from './useSupabase';
import { supabase } from '../lib/supabase'; // Import to mock
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useGameStore } from '../store/game'; // Import needed for mocking and typing
import { Database } from '../lib/database.types';

// Type definitions
type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];
type GameSettings = Database["public"]["Tables"]["game_settings"]["Row"];
// Default mock data needed for mocks defined below
const mockSettings: GameSettings = {
  id: 1,
  attempts_number: 10,
  smile_ranges: [],
  cooldown_minutes: 60,
};

// --- Mocks ---
vi.mock('../lib/supabase'); // Mock the entire supabase client module
// Mock useGameStore to return settings
// Mock useGameStore directly within the factory to avoid hoisting issues
vi.mock('../store/game', () => ({
  useGameStore: vi.fn(), // Define the mock function inline
}));
vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock implementations
const mockSupabaseRpc = vi.fn();
// Remove incorrect cast for useGameStore
const mockToastError = toast.error as ReturnType<typeof vi.fn>;

// --- New Supabase Client Mock Setup ---
// Mock implementations ONLY for terminal query builder methods that return results
const mockSupabaseLimit = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseDelete = vi.fn();

// Mock Query Builder object that handles chaining
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(), // Returns itself for chaining
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  // Terminal methods delegate to specific mocks defined above
  limit: mockSupabaseLimit,
  single: mockSupabaseSingle,
  // update/delete return an object with 'eq' method which then calls the final mock
  update: vi.fn().mockImplementation(() => ({ eq: mockSupabaseUpdate })),
  delete: vi.fn().mockImplementation(() => ({ eq: mockSupabaseDelete })),
};

// Get the properly typed mocked client
const mockedSupabase = vi.mocked(supabase);

// Assign mock for the top-level rpc method
mockedSupabase.rpc = mockSupabaseRpc;

// Configure supabase.from to always return the mock query builder
// Use 'as any' for the mock object to satisfy TypeScript if necessary
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mockedSupabase.from.mockReturnValue(mockQueryBuilder as any);


// Default mock data
const mockUserId = 'user-test-id';
const mockUser: User = {
  id: mockUserId,
  name: 'Test User',
  phone: '1234567890',
  attempts_left: 10,
  best_result: null,
  total_smiles: 0,
  last_attempt_at: null,
  created_at: new Date().toISOString(),
};
const mockAttempts: Attempt[] = [
  { id: 'att-1', user_id: mockUserId, difference: 50, created_at: new Date().toISOString() },
  { id: 'att-2', user_id: mockUserId, difference: 60, created_at: new Date().toISOString() },
];


describe('useSupabase hook', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    mockSupabaseRpc.mockReset();
    // Reset terminal method mocks (which hold results/errors)
    mockSupabaseLimit.mockReset();
    mockSupabaseSingle.mockReset();
    mockSupabaseUpdate.mockReset();
    mockSupabaseDelete.mockReset();
    // Clear chainable method mocks (just clear call history)
    mockQueryBuilder.select.mockClear();
    mockQueryBuilder.eq.mockClear();
    mockQueryBuilder.order.mockClear();
    mockQueryBuilder.update.mockClear(); // Clear update/delete call history
    mockQueryBuilder.delete.mockClear();
    // Ensure 'from' is reset and still returns the builder for the next test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedSupabase.from.mockClear().mockReturnValue(mockQueryBuilder as any);


    // Set the return value for useGameStore for this test run
    // Set the return value for the mocked useGameStore for this test run
    vi.mocked(useGameStore).mockReturnValue({ settings: mockSettings });
  });

  it('should initialize with loading false and error null', () => {
    const { result } = renderHook(() => useSupabase());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // --- recordAttempt ---
  describe('recordAttempt', () => {
    it('should call rpc("record_attempt") and return true on success', async () => {
      mockSupabaseRpc.mockResolvedValueOnce({ data: true, error: null });
      const { result } = renderHook(() => useSupabase());
      const difference = 100;

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.recordAttempt(difference);
      });

      expect(success).toBe(true);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('record_attempt', { difference_value: difference });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return false if rpc returns false (cooldown/no attempts)', async () => {
       mockSupabaseRpc.mockResolvedValueOnce({ data: false, error: null });
       const { result } = renderHook(() => useSupabase());

       let success: boolean | undefined;
       await act(async () => {
         success = await result.current.recordAttempt(50);
       });

       expect(success).toBe(false);
       expect(result.current.error).toContain('cooldown active or no attempts left');
       expect(result.current.loading).toBe(false);
    });

    it('should return false and set error on rpc error', async () => {
       const errorMsg = 'RPC failed';
       mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: new Error(errorMsg) });
       const { result } = renderHook(() => useSupabase());

       let success: boolean | undefined;
       await act(async () => {
         success = await result.current.recordAttempt(50);
       });

       expect(success).toBe(false);
       expect(result.current.error).toContain(errorMsg);
       expect(mockToastError).toHaveBeenCalledWith(expect.stringContaining(errorMsg));
       expect(result.current.loading).toBe(false);
    });

     it('should return false and set specific error for "Cooldown active"', async () => {
       const errorMsg = 'Cooldown active';
       mockSupabaseRpc.mockRejectedValueOnce(new Error(errorMsg)); // Simulate rejection
       const { result } = renderHook(() => useSupabase());

       let success: boolean | undefined;
       await act(async () => {
         success = await result.current.recordAttempt(50);
       });

       expect(success).toBe(false);
       expect(result.current.error).toBe('Cooldown active. Try again later.');
       expect(mockToastError).not.toHaveBeenCalled(); // No toast for cooldown
       expect(result.current.loading).toBe(false);
     });

      it('should return false and set specific error for "No attempts left"', async () => {
        const errorMsg = 'No attempts left';
        mockSupabaseRpc.mockRejectedValueOnce(new Error(errorMsg));
        const { result } = renderHook(() => useSupabase());

        let success: boolean | undefined;
        await act(async () => {
          success = await result.current.recordAttempt(50);
        });

        expect(success).toBe(false);
        expect(result.current.error).toBe('No attempts left.');
        expect(mockToastError).toHaveBeenCalledWith('No attempts left.');
        expect(result.current.loading).toBe(false);
      });

      it('should set loading state during execution', async () => {
        // Add a slight delay to the mock to allow loading state detection
        mockSupabaseRpc.mockImplementationOnce(async () => {
          await new Promise(res => setTimeout(res, 100)); // Increased delay
          return { data: true, error: null };
        });
        const { result } = renderHook(() => useSupabase());

        const promise = result.current.recordAttempt(10);
        // Check loading state immediately after call (might require waitFor)
        await waitFor(() => expect(result.current.loading).toBe(true));
        await act(async () => { await promise; }); // Wait for completion
        expect(result.current.loading).toBe(false);
      });
  });

  // --- getUserAttempts ---
  describe('getUserAttempts', () => {
     it('should fetch attempts successfully', async () => {
       mockSupabaseLimit.mockResolvedValueOnce({ data: mockAttempts, error: null });
       const { result } = renderHook(() => useSupabase());
       const limit = 5;

       let attempts: Attempt[] = [];
       await act(async () => {
         attempts = await result.current.getUserAttempts(mockUserId, limit);
       });

       expect(attempts).toEqual(mockAttempts);
       expect(mockedSupabase.from).toHaveBeenCalledWith('attempts');
       expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
       expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUserId);
       expect(mockQueryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
       expect(mockSupabaseLimit).toHaveBeenCalledWith(limit); // Terminal mock remains the same
       expect(result.current.loading).toBe(false);
       expect(result.current.error).toBeNull();
     });

     it('should return empty array on fetch error', async () => {
        const errorMsg = 'Failed to fetch attempts';
        mockSupabaseLimit.mockResolvedValueOnce({ data: null, error: new Error(errorMsg) });
        const { result } = renderHook(() => useSupabase());

        let attempts: Attempt[] = [];
        await act(async () => {
          attempts = await result.current.getUserAttempts(mockUserId, 5);
        });

        expect(attempts).toEqual([]);
        expect(result.current.error).toBe(errorMsg);
        expect(result.current.loading).toBe(false);
     });
  });

  // --- getUser ---
  describe('getUser', () => {
      it('should fetch user successfully', async () => {
        mockSupabaseSingle.mockResolvedValueOnce({ data: mockUser, error: null });
        const { result } = renderHook(() => useSupabase());

        let user: User | null = null;
        await act(async () => {
          user = await result.current.getUser(mockUserId);
        });

        expect(user).toEqual(mockUser);
        expect(mockedSupabase.from).toHaveBeenCalledWith('users');
        expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
        expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', mockUserId);
        expect(mockSupabaseSingle).toHaveBeenCalled(); // Terminal mock remains the same
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      it('should return null if user not found (PGRST116)', async () => {
         mockSupabaseSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'User not found' } });
         const { result } = renderHook(() => useSupabase());

         let user: User | null = null;
         await act(async () => {
           user = await result.current.getUser(mockUserId);
         });

         expect(user).toBeNull();
         expect(result.current.error).toBeNull(); // Specific handling for not found
         expect(result.current.loading).toBe(false);
      });

      it('should return null and set error on other fetch error', async () => {
         const errorMsg = 'DB connection failed';
         mockSupabaseSingle.mockResolvedValueOnce({ data: null, error: new Error(errorMsg) });
         const { result } = renderHook(() => useSupabase());

         let user: User | null = null;
         await act(async () => {
           user = await result.current.getUser(mockUserId);
         });

         expect(user).toBeNull();
         expect(result.current.error).toBe(errorMsg);
         expect(result.current.loading).toBe(false);
      });
  });

  // --- resetUserAttempts ---
  describe('resetUserAttempts', () => {
       it('should update user and delete attempts successfully', async () => {
         mockSupabaseUpdate.mockResolvedValueOnce({ error: null });
         mockSupabaseDelete.mockResolvedValueOnce({ error: null });
         const { result } = renderHook(() => useSupabase());

         let success: boolean | undefined;
         await act(async () => {
           success = await result.current.resetUserAttempts(mockUserId);
         });

         expect(success).toBe(true);
         // Check user update call
         expect(mockedSupabase.from).toHaveBeenCalledWith('users');
         // Check that .update() was called with the correct data
         expect(mockQueryBuilder.update).toHaveBeenCalledWith({
           attempts_left: mockSettings.attempts_number,
           best_result: null,
           total_smiles: 0,
           last_attempt_at: null,
         });
         // Check that the subsequent .eq() was called with the correct ID
         expect(mockSupabaseUpdate).toHaveBeenCalledWith('id', mockUserId);

         // Check attempts delete call
         expect(mockedSupabase.from).toHaveBeenCalledWith('attempts');
         // Check that .delete() was called
         expect(mockQueryBuilder.delete).toHaveBeenCalled();
         // Check that the subsequent .eq() was called with the correct ID
         expect(mockSupabaseDelete).toHaveBeenCalledWith('user_id', mockUserId);

         expect(result.current.loading).toBe(false);
         expect(result.current.error).toBeNull();
       });

       it('should return false on user update error', async () => {
          const errorMsg = 'Failed to update user';
          mockSupabaseUpdate.mockResolvedValueOnce({ error: new Error(errorMsg) });
          const { result } = renderHook(() => useSupabase());

          let success: boolean | undefined;
          await act(async () => {
            success = await result.current.resetUserAttempts(mockUserId);
          });

          expect(success).toBe(false);
          expect(result.current.error).toBe(errorMsg);
          expect(mockSupabaseDelete).not.toHaveBeenCalled(); // Delete should not be called
          expect(result.current.loading).toBe(false);
       });

       it('should return true even if deleting attempts fails (warns)', async () => {
          const deleteErrorMsg = 'Failed to delete attempts';
          mockSupabaseUpdate.mockResolvedValueOnce({ error: null }); // Update succeeds
          mockSupabaseDelete.mockResolvedValueOnce({ error: new Error(deleteErrorMsg) }); // Delete fails
          const consoleWarnSpy = vi.spyOn(console, 'warn'); // Spy on console.warn

          const { result } = renderHook(() => useSupabase());

          let success: boolean | undefined;
          await act(async () => {
            success = await result.current.resetUserAttempts(mockUserId);
          });

          expect(success).toBe(true); // Should still return true
          expect(result.current.error).toBeNull(); // No error set for delete failure
          // Check only the first argument of console.warn for the expected message
          expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not delete old attempts'), expect.anything()); // Check first arg contains text, ignore second arg
          expect(result.current.loading).toBe(false);
          consoleWarnSpy.mockRestore();
       });
  });

});