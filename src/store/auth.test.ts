import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './auth';
import { auth, normalizePhone } from '../lib/auth'; // Import auth to mock, normalizePhone to use
import { supabase } from '../lib/supabase'; // Import supabase to mock
import { Database } from '../lib/database.types'; // Import Database type

type User = Database["public"]["Tables"]["users"]["Row"];

// Mock the auth module
vi.mock('../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/auth')>();
  return {
    ...actual, // Keep actual normalizePhone
    auth: {
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  };
});

// Mock the supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  },
}));

// Helper to get the mocked supabase maybeSingle function
const mockSupabaseMaybeSingle = supabase.from('users').select().eq('', '').maybeSingle as ReturnType<typeof vi.fn>;
// Helper to get mocked auth functions
const mockAuthSignUp = auth.signUp as ReturnType<typeof vi.fn>;
const mockAuthSignIn = auth.signIn as ReturnType<typeof vi.fn>;
const mockAuthSignOut = auth.signOut as ReturnType<typeof vi.fn>;
const mockAuthGetSession = auth.getSession as ReturnType<typeof vi.fn>;


// Define initial state structure for resetting
const initialState = useAuthStore.getState();

// Mock User Data
const mockUser: User = {
  id: 'mock-user-id', // Use string for ID
  phone: '1234567890', // Normalized phone
  name: 'Test User',
  created_at: new Date().toISOString(),
  attempts_left: 10, 
  best_result: null,
  total_smiles: 0, 
  last_attempt_at: null,
};

const signUpData = { phone: '+1 (234) 567-890', password: 'password123', name: 'Test User' };
const signInData = { phone: '+1 (234) 567-890', password: 'password123' };
// const normalizedPhone = '1234567890'; // Remove hardcoded value, use normalizePhone directly

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({ ...initialState, loading: false }, true); // Start with loading false for most tests
    // Reset mocks
    vi.clearAllMocks();
    mockSupabaseMaybeSingle.mockReset();
    mockAuthSignUp.mockReset();
    mockAuthSignIn.mockReset();
    mockAuthSignOut.mockReset();
    mockAuthGetSession.mockReset();
    // Use fake timers for tests involving setTimeout
    vi.useFakeTimers();
  });

   afterEach(() => {
     // Restore real timers after each test
     vi.useRealTimers();
   });

  it('should have correct initial state', () => {
    // Reset specifically for this test, including loading: true
    useAuthStore.setState(initialState, true);
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(true); // Initial loading should be true before checkUser runs
    expect(state.error).toBeNull();
  });

  describe('signUp action', () => {
    it('should sign up successfully, fetch user, and update state', async () => {
      mockAuthSignUp.mockResolvedValueOnce({ error: null });
      mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: mockUser, error: null });

      const { signUp } = useAuthStore.getState();
      const promise = signUp(signUpData);

      // Check loading state immediately
      expect(useAuthStore.getState().loading).toBe(true);
      expect(useAuthStore.getState().error).toBeNull();

      // Advance timers to bypass setTimeout
      vi.advanceTimersByTime(1500);

      await promise; // Wait for completion

      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.user).toEqual(mockUser);
      expect(mockAuthSignUp).toHaveBeenCalledWith(signUpData);
      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(supabase.from('users').select).toHaveBeenCalledWith('*');
      expect(supabase.from('users').select('*').eq).toHaveBeenCalledWith('phone', normalizePhone(signUpData.phone));
      expect(mockSupabaseMaybeSingle).toHaveBeenCalled();
    });

    it('should handle auth.signUp error', async () => {
      const errorMessage = 'Auth sign up failed';
      mockAuthSignUp.mockResolvedValueOnce({ error: new Error(errorMessage) });

      const { signUp } = useAuthStore.getState();
      await signUp(signUpData);

      const state = useAuthStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.user).toBeNull();
      expect(mockSupabaseMaybeSingle).not.toHaveBeenCalled(); // Should not try to fetch user
    });

     it('should handle user fetch error after signUp', async () => {
       const errorMessage = 'User fetch failed';
       mockAuthSignUp.mockResolvedValueOnce({ error: null });
       mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: null, error: new Error(errorMessage) });

       const { signUp } = useAuthStore.getState();
       const promise = signUp(signUpData);
       vi.advanceTimersByTime(1500); // Advance timer
       await promise;

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBe(errorMessage);
       expect(state.user).toBeNull();
     });

     it('should handle user not found after signUp (trigger failed?)', async () => {
       mockAuthSignUp.mockResolvedValueOnce({ error: null });
       mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // User not found

       const { signUp } = useAuthStore.getState();
       const promise = signUp(signUpData);
       vi.advanceTimersByTime(1500); // Advance timer
       await promise;

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBe('Error creating user');
       expect(state.user).toBeNull();
     });
  });

  describe('signIn action', () => {
     it('should sign in successfully, fetch user, and update state', async () => {
       mockAuthSignIn.mockResolvedValueOnce({ error: null });
       mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: mockUser, error: null });

       const { signIn } = useAuthStore.getState();
       await signIn(signInData);

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBeNull();
       expect(state.user).toEqual(mockUser);
       expect(mockAuthSignIn).toHaveBeenCalledWith(signInData);
       expect(supabase.from).toHaveBeenCalledWith('users');
       expect(supabase.from('users').select).toHaveBeenCalledWith('*');
       expect(supabase.from('users').select('*').eq).toHaveBeenCalledWith('phone', normalizePhone(signInData.phone));
       expect(mockSupabaseMaybeSingle).toHaveBeenCalled();
     });

     it('should handle auth.signIn error', async () => {
       const errorMessage = 'Auth sign in failed';
       mockAuthSignIn.mockResolvedValueOnce({ error: new Error(errorMessage) });

       const { signIn } = useAuthStore.getState();
       await signIn(signInData);

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBe(errorMessage);
       expect(state.user).toBeNull();
       expect(mockSupabaseMaybeSingle).not.toHaveBeenCalled();
     });

      it('should handle user fetch error after signIn', async () => {
        const errorMessage = 'User fetch failed';
        mockAuthSignIn.mockResolvedValueOnce({ error: null });
        mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: null, error: new Error(errorMessage) });

        const { signIn } = useAuthStore.getState();
        await signIn(signInData);

        const state = useAuthStore.getState();
        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
        expect(state.user).toBeNull();
      });

      it('should handle user not found after signIn', async () => {
        mockAuthSignIn.mockResolvedValueOnce({ error: null });
        mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // User not found

        const { signIn } = useAuthStore.getState();
        await signIn(signInData);

        const state = useAuthStore.getState();
        expect(state.loading).toBe(false);
        expect(state.error).toBe('User not found');
        expect(state.user).toBeNull();
      });
  });

  describe('signOut action', () => {
     it('should sign out successfully and clear user state', async () => {
       // Set initial user state
       useAuthStore.setState({ user: mockUser, loading: false, error: null });
       mockAuthSignOut.mockResolvedValueOnce({ error: null });

       const { signOut } = useAuthStore.getState();
       await signOut();

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBeNull();
       expect(state.user).toBeNull();
       expect(mockAuthSignOut).toHaveBeenCalled();
     });

     it('should handle auth.signOut error', async () => {
       const errorMessage = 'Auth sign out failed';
       // Set initial user state
       useAuthStore.setState({ user: mockUser, loading: false, error: null });
       mockAuthSignOut.mockResolvedValueOnce({ error: new Error(errorMessage) });

       const { signOut } = useAuthStore.getState();
       await signOut();

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBe(errorMessage);
       expect(state.user).toEqual(mockUser); // User state should remain on error
     });
  });

  describe('checkUser action', () => {
     it('should find session, fetch user, and update state', async () => {
       const mockSession = { user: { id: 'mock-auth-id' } };
       mockAuthGetSession.mockResolvedValueOnce({ session: mockSession });
       mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: mockUser, error: null });

       const { checkUser } = useAuthStore.getState();
       await checkUser();

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBeNull();
       expect(state.user).toEqual(mockUser);
       expect(mockAuthGetSession).toHaveBeenCalled();
       expect(supabase.from).toHaveBeenCalledWith('users');
       expect(supabase.from('users').select).toHaveBeenCalledWith('*');
       expect(supabase.from('users').select('*').eq).toHaveBeenCalledWith('auth_id', mockSession.user.id);
       expect(mockSupabaseMaybeSingle).toHaveBeenCalled();
     });

     it('should handle no session found', async () => {
       mockAuthGetSession.mockResolvedValueOnce({ session: null });

       const { checkUser } = useAuthStore.getState();
       await checkUser();

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBeNull();
       expect(state.user).toBeNull();
       expect(mockAuthGetSession).toHaveBeenCalled();
       expect(mockSupabaseMaybeSingle).not.toHaveBeenCalled();
     });

     it('should handle session found but user fetch error', async () => {
       const errorMessage = 'User fetch failed';
       const mockSession = { user: { id: 'mock-auth-id' } };
       mockAuthGetSession.mockResolvedValueOnce({ session: mockSession });
       mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: null, error: new Error(errorMessage) });

       const { checkUser } = useAuthStore.getState();
       await checkUser();

       const state = useAuthStore.getState();
       expect(state.loading).toBe(false);
       expect(state.error).toBe(errorMessage);
       expect(state.user).toBeNull(); // User should be null on error
     });

      it('should handle session found but user not found in DB', async () => {
        const mockSession = { user: { id: 'mock-auth-id' } };
        mockAuthGetSession.mockResolvedValueOnce({ session: mockSession });
        mockSupabaseMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // User not found

        const { checkUser } = useAuthStore.getState();
        await checkUser();

        const state = useAuthStore.getState();
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull(); // No error, just no user
        expect(state.user).toBeNull();
      });

      it('should handle getSession error', async () => {
        const errorMessage = 'Get session failed';
        mockAuthGetSession.mockRejectedValueOnce(new Error(errorMessage)); // Simulate rejection

        const { checkUser } = useAuthStore.getState();
        await checkUser();

        const state = useAuthStore.getState();
        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
        expect(state.user).toBeNull();
      });

      it('should set loading state correctly during checkUser', async () => {
        mockAuthGetSession.mockResolvedValueOnce({ session: null });

        const { checkUser } = useAuthStore.getState();
        const promise = checkUser(); // Don't await yet

        // Check loading state immediately
        expect(useAuthStore.getState().loading).toBe(true);

        await promise; // Wait for completion
        expect(useAuthStore.getState().loading).toBe(false);
      });
  });

   describe('clearError action', () => {
     it('should clear the error state', () => {
       // Set an error first
       useAuthStore.setState({ error: 'Some error' });
       expect(useAuthStore.getState().error).toBe('Some error');

       const { clearError } = useAuthStore.getState();
       clearError();

       expect(useAuthStore.getState().error).toBeNull();
     });
   });
});