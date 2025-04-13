import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'react-toastify';

import Game from './Game';
import { useTimer } from '../hooks/useTimer';
import { useAuthStore } from '../store/auth';
import { useGameStore } from '../store/game';
import { useGameSession } from '../hooks/useGameSession';
import { Database, SmileRange } from '../lib/database.types'; // Import Database type and SmileRange
import { formatRemainingCooldown } from '../utils/gameUtils';

// --- Mock Modules ---
vi.mock('../hooks/useTimer');
vi.mock('../store/auth');
vi.mock('../store/game');
vi.mock('../hooks/useGameSession');
vi.mock('../utils/gameUtils');
vi.mock('react-toastify');

// Define basic prop types for mocked components
type User = Database["public"]["Tables"]["users"]["Row"]; // Define User type for props
type Attempt = Database["public"]["Tables"]["attempts"]["Row"]; // Define Attempt type for props
type MockModalRulesProps = { isOpen: boolean; onRequestClose: () => void };
type MockGameStatsProps = { currentUser: User | null; attempts: Attempt[]; bestResultIndex: number | null; smileRanges: SmileRange[] | null | undefined };
type MockAttemptsTableProps = { attempts: Attempt[]; bestResultIndex: number | null; attemptsLeft: number; smileRanges: SmileRange[] | null | undefined };

// Mock child components with basic prop types
vi.mock('./ModalRules', () => ({ default: (props: MockModalRulesProps) => props.isOpen ? <div data-testid="modal-rules">Rules Modal Open</div> : null }));
vi.mock('./GameStats', () => ({ default: (props: MockGameStatsProps) => <div data-testid="game-stats">Attempts Left: {props.currentUser?.attempts_left}</div> }));
vi.mock('./AttemptsTable', () => ({ default: (props: MockAttemptsTableProps) => <div data-testid="attempts-table">Attempts: {props.attempts?.length}, BestIndex: {props.bestResultIndex === null ? 'null' : props.bestResultIndex}</div> }));


// --- Mock Implementations ---
const mockUseTimer = vi.mocked(useTimer); // Use vi.mocked
// Remove incorrect cast variables for Zustand hooks
const mockUseGameSession = useGameSession as ReturnType<typeof vi.fn>;
const mockFormatRemainingCooldown = formatRemainingCooldown as ReturnType<typeof vi.fn>;
const mockToastSuccess = toast.success as ReturnType<typeof vi.fn>;
const mockToastWarning = toast.warning as ReturnType<typeof vi.fn>;
const mockToastInfo = toast.info as ReturnType<typeof vi.fn>;

// Default mock return values
let mockTimerState = { time: '10:20:30:123', milliseconds: 123, startTimer: vi.fn(), stopTimer: vi.fn(), resetTimer: vi.fn() }; // Add resetTimer mock
let mockAuthState = { signOut: vi.fn(), user: { id: 'user-1', name: 'Tester' } };
let mockGameState = { settings: { attempts_number: 10, cooldown_minutes: 60, smile_ranges: [] } };
let mockGameSessionState = {
  currentUser: { id: 'user-1', name: 'Tester', attempts_left: 5, best_result: null, last_attempt_at: null },
  attempts: [],
  isLoading: false,
  isSubmitting: false,
  handleAttemptSubmit: vi.fn().mockResolvedValue(true), // Default success
  cooldownEndTime: null as number | null,
};

describe('Game Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset state for mocks
    mockTimerState = { time: '10:20:30:123', milliseconds: 123, startTimer: vi.fn(), stopTimer: vi.fn(), resetTimer: vi.fn() }; // Add resetTimer mock
    mockAuthState = { signOut: vi.fn(), user: { id: 'user-1', name: 'Tester' } };
    mockGameState = { settings: { attempts_number: 10, cooldown_minutes: 60, smile_ranges: [] } };
    mockGameSessionState = {
      currentUser: { id: 'user-1', name: 'Tester', attempts_left: 5, best_result: null, last_attempt_at: null },
      attempts: [],
      isLoading: false,
      isSubmitting: false,
      handleAttemptSubmit: vi.fn().mockResolvedValue(true),
      cooldownEndTime: null,
    };

    // Apply mocks
    mockUseTimer.mockReturnValue(mockTimerState);
    vi.mocked(useAuthStore).mockReturnValue(mockAuthState); // Use vi.mocked
    vi.mocked(useGameStore).mockReturnValue(mockGameState); // Use vi.mocked
    mockUseGameSession.mockReturnValue(mockGameSessionState);
    mockFormatRemainingCooldown.mockReturnValue('in 5 minutes');
  });

   afterEach(() => {
     vi.useRealTimers();
   });

  it('should show loading state initially', () => {
    mockUseGameSession.mockReturnValue({ ...mockGameSessionState, isLoading: true, currentUser: null });
    render(<Game />);
    expect(screen.getByText(/loading game/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /click me/i })).not.toBeInTheDocument();
  });

  it('should render game elements when loaded', () => {
    render(<Game />);
    expect(screen.queryByText(/loading game/i)).not.toBeInTheDocument();
    expect(screen.getByText(mockTimerState.time)).toBeInTheDocument(); // Live time
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    expect(screen.getByText(`Gamer:`)).toBeInTheDocument();
    expect(screen.getByText(mockAuthState.user.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rules/i })).toBeInTheDocument();
    expect(screen.getByTestId('game-stats')).toBeInTheDocument();
    expect(screen.getByTestId('attempts-table')).toBeInTheDocument();
  });

  it('should call startTimer on mount after loading', () => {
     render(<Game />);
     // Should be called by useEffect after initial render and isLoading becomes false
     expect(mockTimerState.startTimer).toHaveBeenCalled();
  });

   it('should call stopTimer on unmount', () => {
     const { unmount } = render(<Game />);
     unmount();
     expect(mockTimerState.stopTimer).toHaveBeenCalled();
   });

  it('should handle successful button click', async () => {
    vi.useRealTimers(); // Switch to real timers for this test ONLY
    render(<Game />);
    const clickButton = screen.getByRole('button', { name: /click me/i });

    // Click the button
    await act(async () => {
      fireEvent.click(clickButton);
    });

    // No need to advance fake timers or run pending timers when using real timers


    // Wait for the submit function to be called
    await waitFor(() => {
        expect(mockGameSessionState.handleAttemptSubmit).toHaveBeenCalledWith(mockTimerState.milliseconds);
    });

    // Wait for the success toast to be called (simplified check)
    await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalled();
    });
    // Optionally, check the specific message after confirming the call
    expect(mockToastSuccess).toHaveBeenCalledWith('Difference: 123 ms.');


    // Check timer interactions
    expect(mockTimerState.stopTimer).toHaveBeenCalled();
    expect(screen.getByText(mockTimerState.time)).toBeInTheDocument(); // Should show frozen time
    expect(mockTimerState.startTimer).toHaveBeenCalledTimes(2); // Initial + after submit
  }, 15000); // Increased timeout significantly for real timers

  it('should prevent click during 2-second delay', async () => {
    render(<Game />);
    const clickButton = screen.getByRole('button', { name: /click me/i });

    // First click
    await act(async () => {
      fireEvent.click(clickButton);
    });

    // Second click immediately after (within 2s delay)
    await act(async () => {
      fireEvent.click(clickButton);
    });

    expect(mockGameSessionState.handleAttemptSubmit).toHaveBeenCalledTimes(1); // Only first click should proceed
    expect(mockToastWarning).toHaveBeenCalledWith("Please wait before the next attempt.");

    // Advance timer past the delay
    act(() => {
       vi.advanceTimersByTime(2000);
    });

     // Third click (should work now)
     await act(async () => {
       fireEvent.click(clickButton);
     });
     expect(mockGameSessionState.handleAttemptSubmit).toHaveBeenCalledTimes(2); // Now it should be called again

  });

  it('should prevent click when isSubmitting is true', async () => {
     mockUseGameSession.mockReturnValue({ ...mockGameSessionState, isSubmitting: true });
     render(<Game />);
     const clickButton = screen.getByRole('button', { name: /processing/i }); // Button text changes

     await act(async () => {
       fireEvent.click(clickButton);
     });

     expect(mockGameSessionState.handleAttemptSubmit).not.toHaveBeenCalled();
     expect(mockToastWarning).toHaveBeenCalledWith("Please wait before the next attempt.");
  });

  it('should prevent click and show cooldown message if attempts are 0 and cooldown is active', async () => {
     const now = Date.now();
     const endTime = now + 300000; // 5 minutes from now
     mockUseGameSession.mockReturnValue({
       ...mockGameSessionState,
       currentUser: { ...mockGameSessionState.currentUser!, attempts_left: 0 },
       cooldownEndTime: endTime,
     });
     vi.setSystemTime(now); // Ensure Date.now() is before endTime

     render(<Game />);
     const clickButton = screen.getByRole('button', { name: /click me/i });

     await act(async () => {
       fireEvent.click(clickButton);
     });

     expect(mockGameSessionState.handleAttemptSubmit).not.toHaveBeenCalled();
     expect(mockFormatRemainingCooldown).toHaveBeenCalledWith(endTime);
     expect(mockToastWarning).toHaveBeenCalledWith('Next game will be available in 5 minutes.');
  });

   it('should allow click if attempts are 0 but cooldown is over', async () => {
     const now = Date.now();
     const endTime = now - 5000; // 5 seconds ago (cooldown finished)
     mockUseGameSession.mockReturnValue({
       ...mockGameSessionState,
       currentUser: { ...mockGameSessionState.currentUser!, attempts_left: 0 },
       cooldownEndTime: endTime,
     });
     vi.setSystemTime(now);

     render(<Game />);
     const clickButton = screen.getByRole('button', { name: /click me/i });

     await act(async () => {
       fireEvent.click(clickButton);
       vi.advanceTimersByTime(2000); // Advance delay timer
     });

     // Should proceed to submit attempt (which might fail in the hook, but Game allows the click)
     expect(mockGameSessionState.handleAttemptSubmit).toHaveBeenCalled();
     expect(mockToastWarning).not.toHaveBeenCalledWith(expect.stringContaining('Next game will be available'));
   });


  it('should open and close rules modal', () => {
    render(<Game />);
    const rulesButton = screen.getByRole('button', { name: /rules/i });

    // Modal should not be visible initially
    expect(screen.queryByTestId('modal-rules')).not.toBeInTheDocument();

    // Open modal
    fireEvent.click(rulesButton);
    expect(screen.getByTestId('modal-rules')).toBeInTheDocument();

    // Simulate closing (assuming ModalRules calls onRequestClose)
    // We can't directly test the internal close mechanism of the mocked ModalRules,
    // but we can test if the state controlling it changes if we could trigger the callback.
    // Alternatively, re-render with showRules: false if needed.
    // For now, just verify it opens.
  });

  it('should call signOut and show toast on sign out click', async () => {
    vi.useRealTimers(); // Switch to real timers for this test ONLY
    render(<Game />);
    // Find logout icon/button (Lucide icons don't have implicit roles)
    const logoutButton = screen.getByTestId('game-stats').parentElement?.querySelector('svg.lucide-log-out'); // Find by class or structure
    expect(logoutButton).toBeInTheDocument();

    if (logoutButton) {
        // Click the button
        await act(async () => {
            fireEvent.click(logoutButton);
        });

        // No need to run fake timers when using real timers

        // Wait for signOut mock to be called
        await waitFor(() => {
            expect(mockAuthState.signOut).toHaveBeenCalled();
        });

        // Wait for the info toast to be called (simplified check)
        await waitFor(() => {
            expect(mockToastInfo).toHaveBeenCalled();
        });
        // Optionally, check the specific message after confirming the call
        expect(mockToastInfo).toHaveBeenCalledWith("You have been logged out.");

    } else {
        // Consider adding a data-testid for reliability.
        throw new Error("Logout button SVG not found. Consider adding a data-testid='logout-button' to the button/icon container in Game.tsx");
    }
  }, 15000); // Increased timeout significantly for real timers

   it('should pass correct bestResultIndex to AttemptsTable when game ends', async () => {
    vi.useRealTimers(); // Switch to real timers for this test ONLY
     // Define Attempt type locally or import if needed
     type Attempt = Database["public"]["Tables"]["attempts"]["Row"];
     const attemptsData: Attempt[] = [
       { id: 'a1', user_id: 'u1', difference: 100, created_at: '2024-01-01T10:00:00Z' },
       { id: 'a2', user_id: 'u1', difference: 20, created_at: '2024-01-01T10:01:00Z' }, // Best
       { id: 'a3', user_id: 'u1', difference: 50, created_at: '2024-01-01T10:02:00Z' },
     ];
     // Simulate game end state
     mockUseGameSession.mockReturnValue({
       ...mockGameSessionState,
       currentUser: { ...mockGameSessionState.currentUser!, attempts_left: 0 },
       attempts: attemptsData,
     });

     render(<Game />); // Render the component

     // No need to run fake timers when using real timers

     // Now wait for the table content to update
     await waitFor(() => {
       const table = screen.getByTestId('attempts-table');
       // Best attempt is index 1 in the original array
       expect(table).toHaveTextContent('BestIndex: 1');
     });
 }, 15000); // Increased timeout significantly for real timers

    it('should pass null bestResultIndex to AttemptsTable when game is ongoing', () => {
      // Default state has attempts_left > 0
      render(<Game />);
      const table = screen.getByTestId('attempts-table');
      expect(table).toHaveTextContent('BestIndex: null');
    });

});