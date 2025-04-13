import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameStats from './GameStats';
import { Database, SmileRange } from '../lib/database.types';

// Type definitions
type User = Database["public"]["Tables"]["users"]["Row"];
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

// Mock Data
const mockSmileRanges: SmileRange[] = [
  { min: 0, max: 10, smiles: 15 },
  { min: 11, max: 50, smiles: 10 },
  { min: 51, max: 100, smiles: 5 },
];

const mockUserBase: User = {
  id: 'user-1',
  name: 'Test User',
  phone: '1234567890',
  attempts_left: 5,
  best_result: 15, // Example best result
  total_smiles: 10, // Example total smiles (might not be used directly by component)
  last_attempt_at: null,
  created_at: new Date().toISOString(),
};

const mockAttempts: Attempt[] = [
  { id: 'att-1', user_id: 'user-1', difference: 50, created_at: '2024-04-10T12:01:00Z' },
  { id: 'att-2', user_id: 'user-1', difference: 15, created_at: '2024-04-10T12:02:00Z' }, // Corresponds to best_result
  { id: 'att-3', user_id: 'user-1', difference: 5, created_at: '2024-04-10T12:03:00Z' },
];

// Helper function to render with props
const renderComponent = (props: React.ComponentProps<typeof GameStats>) => {
  return render(<GameStats {...props} />);
};

describe('GameStats Component', () => {
  it('should return null if currentUser is null', () => {
    const { container } = renderComponent({
      currentUser: null,
      attempts: [],
      bestResultIndex: null,
      smileRanges: mockSmileRanges,
    });
    expect(container.firstChild).toBeNull();
  });

  it('should display attempts left and best result when attempts > 0', () => {
    const currentUser = { ...mockUserBase, attempts_left: 3, best_result: 8 };
    renderComponent({
      currentUser: currentUser,
      attempts: mockAttempts,
      bestResultIndex: null, // No best index highlighted yet
      smileRanges: mockSmileRanges,
    });

    expect(screen.getByText(/attempts left: 3/i)).toBeInTheDocument();
    expect(screen.getByText(/best result: 8 ms/i)).toBeInTheDocument();
    expect(screen.queryByText(/game over/i)).not.toBeInTheDocument();
  });

   it('should not display best result if currentUser.best_result is null', () => {
     const currentUser = { ...mockUserBase, attempts_left: 5, best_result: null };
     renderComponent({
       currentUser: currentUser,
       attempts: [],
       bestResultIndex: null,
       smileRanges: mockSmileRanges,
     });
     expect(screen.getByText(/attempts left: 5/i)).toBeInTheDocument();
     expect(screen.queryByText(/best result:/i)).not.toBeInTheDocument();
     expect(screen.queryByText(/game over/i)).not.toBeInTheDocument();
   });

  it('should display "Game Over" message and smiles when attempts_left is 0 and bestResultIndex is valid', () => {
    const currentUser = { ...mockUserBase, attempts_left: 0, best_result: 5 }; // best_result in user might differ from attempt diff
    const bestIndex = 2; // Corresponds to mockAttempts[2] with difference 5
    const expectedSmiles = 15; // Smiles for difference 5 based on mockSmileRanges

    renderComponent({
      currentUser: currentUser,
      attempts: mockAttempts,
      bestResultIndex: bestIndex,
      smileRanges: mockSmileRanges,
    });

    expect(screen.getByText(/game over/i)).toBeInTheDocument();
    expect(screen.getByText(`Smiles for Best Result: ${expectedSmiles}`)).toBeInTheDocument();
    // Check for the correct number of emoji characters
    const emojiContainer = screen.getByText("😊".repeat(expectedSmiles));
    expect(emojiContainer).toBeInTheDocument();

    // Regular stats should still be visible
    expect(screen.getByText(/attempts left: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/best result: 5 ms/i)).toBeInTheDocument(); // Displays user.best_result
  });

  it('should NOT display "Game Over" message if attempts_left is 0 but bestResultIndex is null', () => {
    const currentUser = { ...mockUserBase, attempts_left: 0 };
    renderComponent({
      currentUser: currentUser,
      attempts: mockAttempts,
      bestResultIndex: null, // bestResultIndex is null
      smileRanges: mockSmileRanges,
    });

    expect(screen.queryByText(/game over/i)).not.toBeInTheDocument();
    expect(screen.getByText(/attempts left: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/best result: 15 ms/i)).toBeInTheDocument(); // From mockUserBase
  });

   it('should NOT display "Game Over" message if attempts_left is 0 but attempts array is empty or index is out of bounds', () => {
     const currentUser = { ...mockUserBase, attempts_left: 0 };
     // Test with empty attempts
     const { rerender } = renderComponent({
       currentUser: currentUser,
       attempts: [],
       bestResultIndex: 0, // Index exists but array is empty
       smileRanges: mockSmileRanges,
     });
     expect(screen.queryByText(/game over/i)).not.toBeInTheDocument();

     // Test with out-of-bounds index
     rerender(<GameStats
         currentUser={currentUser}
         attempts={mockAttempts}
         bestResultIndex={5} // Index out of bounds
         smileRanges={mockSmileRanges}
       />);
     expect(screen.queryByText(/game over/i)).not.toBeInTheDocument();
   });

});