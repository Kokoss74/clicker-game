import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { useSupabase } from './useSupabase';
import { supabase } from '../lib/supabase'; // Import to mock
import { useGameStore } from '../store/game'; // Import to mock
import { Database } from '../lib/database.types';

// Type definitions
type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];
type GameSettings = Database["public"]["Tables"]["game_settings"]["Row"];

// --- Mocks ---
vi.mock('../lib/supabase'); // Mock the entire supabase client module
vi.mock('../store/game');
vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock implementations
const mockSupabaseRpc = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseOrder = vi.fn();
const mockSupabaseLimit = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseDelete = vi.fn();

// Remove incorrect cast for useGameStore
const mockToastError = toast.error as ReturnType<typeof vi.fn>;

// Mock chaining for supabase client
mockSupabaseFrom.mockReturnThis();
mockSupabaseSelect.mockReturnThis();
mockSupabaseEq.mockReturnThis();
mockSupabaseOrder.mockReturnThis();
mockSupabaseLimit.mockReturnThis();
mockSupabaseUpdate.mockReturnThis();
mockSupabaseDelete.mockReturnThis();

// Get the properly typed mocked client
const mockedSupabase = vi.mocked(supabase);

// Assign mock for the top-level rpc method
mockedSupabase.rpc = mockSupabaseRpc;

// Mock the return value of 'from' to be an object containing the chained mocks
const mockFromReturnValue = {
  select: mockSupabaseSelect,
  eq: mockSupabaseEq,
  order: mockSupabaseOrder,
  limit: mockSupabaseLimit,
  single: mockSupabaseSingle,
  update: mockSupabaseUpdate,
  delete: mockSupabaseDelete,
};
mockedSupabase.from = mockSupabaseFrom.mockReturnValue(mockFromReturnValue);


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
const mockSettings: GameSettings = {
  id: 1,
  attempts_number: 10,
  smile_ranges: [],
  cooldown_minutes: 60,
};


describe('useSupabase hook', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    mockSupabaseRpc.mockReset();
    mockSupabaseFrom.mockClear(); // Use clear instead of reset for chained mocks
    mockSupabaseSelect.mockClear();
    mockSupabaseEq.mockClear();
    mockSupabaseOrder.mockClear();
    mockSupabaseLimit.mockClear();
    mockSupabaseSingle.mockReset();
    mockSupabaseUpdate.mockClear();
    mockSupabaseDelete.mockClear();

    // Reset chained mock return values
    mockSupabaseFrom.mockReturnThis();
    mockSupabaseSelect.mockReturnThis();
    mockSupabaseEq.mockReturnThis();
    mockSupabaseOrder.mockReturnThis();
    mockSupabaseLimit.mockReturnThis();
    mockSupabaseUpdate.mockReturnThis();
    mockSupabaseDelete.mockReturnThis();


    // Set game store state directly
    useGameStore.setState({ settings: mockSettings, loading: false, error: null }, true);
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
        mockSupabaseRpc.mockResolvedValueOnce({ data: true, error: null });
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
       expect(mockSupabaseFrom).toHaveBeenCalledWith('attempts');
       expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
       expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', mockUserId);
       expect(mockSupabaseOrder).toHaveBeenCalledWith('created_at', { ascending: false });
       expect(mockSupabaseLimit).toHaveBeenCalledWith(limit);
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
        expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
        expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
        expect(mockSupabaseEq).toHaveBeenCalledWith('id', mockUserId);
        expect(mockSupabaseSingle).toHaveBeenCalled();
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
         expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
         expect(mockSupabaseUpdate).toHaveBeenCalledWith({
           attempts_left: mockSettings.attempts_number, // Check if correct value is used
           best_result: null,
           total_smiles: 0,
           last_attempt_at: null,
         });
         expect(mockSupabaseEq).toHaveBeenCalledWith('id', mockUserId); // Eq called after update

         // Check attempts delete call
         expect(mockSupabaseFrom).toHaveBeenCalledWith('attempts');
         expect(mockSupabaseDelete).toHaveBeenCalled();
         expect(mockSupabaseEq).toHaveBeenCalledWith('user_id', mockUserId); // Eq called after delete

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
          expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining(deleteErrorMsg));
          expect(result.current.loading).toBe(false);
          consoleWarnSpy.mockRestore();
       });
  });

});