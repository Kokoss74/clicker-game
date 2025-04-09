import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import AttemptsTable from './AttemptsTable';
import { Database, SmileRange } from '../lib/database.types';

// Type definitions
type Attempt = Database["public"]["Tables"]["attempts"]["Row"];

// Mock Data
const mockSmileRanges: SmileRange[] = [
  { min: 0, max: 10, smiles: 15 },
  { min: 11, max: 50, smiles: 10 },
  { min: 51, max: 100, smiles: 5 },
  { min: 101, max: null, smiles: 3 },
];

const mockAttempts: Attempt[] = [
  // Newest attempt first in data (will be last row in table)
  { id: 'att-3', user_id: 'user-1', difference: 15, created_at: '2024-04-10T12:03:00Z' },
  { id: 'att-2', user_id: 'user-1', difference: 5, created_at: '2024-04-10T12:02:00Z' },
  { id: 'att-1', user_id: 'user-1', difference: 100, created_at: '2024-04-10T12:01:00Z' },
];

// Helper function to render with props
const renderComponent = (props: React.ComponentProps<typeof AttemptsTable>) => {
  render(<AttemptsTable {...props} />);
};

describe('AttemptsTable Component', () => {
  it('should render table headers correctly', () => {
    renderComponent({ attempts: [], smileRanges: mockSmileRanges, bestResultIndex: null, attemptsLeft: 10 });
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /difference \(ms\)/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /smiles 😊/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /date & time/i })).toBeInTheDocument();
  });

  it('should display "No attempts yet" message when attempts array is empty', () => {
    renderComponent({ attempts: [], smileRanges: mockSmileRanges, bestResultIndex: null, attemptsLeft: 10 });
    expect(screen.getByText(/no attempts yet for this session/i)).toBeInTheDocument();
  });

  it('should render attempts in reverse order (oldest first in table)', () => {
    renderComponent({ attempts: mockAttempts, smileRanges: mockSmileRanges, bestResultIndex: null, attemptsLeft: 7 });

    const rows = screen.getAllByRole('row');
    // Header row + 3 data rows
    expect(rows).toHaveLength(4);

    // Check data in the first data row (should correspond to mockAttempts[2] - oldest)
    const firstDataRow = rows[1];
    expect(within(firstDataRow).getByText('1')).toBeInTheDocument(); // Row number
    expect(within(firstDataRow).getByText('100')).toBeInTheDocument(); // Difference
    expect(within(firstDataRow).getByText('5')).toBeInTheDocument(); // Smiles for 100ms
    expect(within(firstDataRow).getByText(/10\/04\/2024/)).toBeInTheDocument();
    expect(within(firstDataRow).getByText(/12:01/)).toBeInTheDocument();


    // Check data in the last data row (should correspond to mockAttempts[0] - newest)
    const lastDataRow = rows[3];
    expect(within(lastDataRow).getByText('3')).toBeInTheDocument(); // Row number
    expect(within(lastDataRow).getByText('15')).toBeInTheDocument(); // Difference
    expect(within(lastDataRow).getByText('10')).toBeInTheDocument(); // Smiles for 15ms
    expect(within(lastDataRow).getByText(/10\/04\/2024/)).toBeInTheDocument();
    expect(within(lastDataRow).getByText(/12:03/)).toBeInTheDocument();
  });

  it('should calculate and display smiles correctly based on ranges', () => {
     renderComponent({ attempts: mockAttempts, smileRanges: mockSmileRanges, bestResultIndex: null, attemptsLeft: 7 });
     const rows = screen.getAllByRole('row');

     // Row 1 (diff 100ms) -> 5 smiles
     expect(within(rows[1]).getByRole('cell', { name: '5' })).toBeInTheDocument();
     // Row 2 (diff 5ms) -> 15 smiles
     expect(within(rows[2]).getByRole('cell', { name: '15' })).toBeInTheDocument();
     // Row 3 (diff 15ms) -> 10 smiles
     expect(within(rows[3]).getByRole('cell', { name: '10' })).toBeInTheDocument();
  });

   it('should highlight the best result row when attemptsLeft is 0 and bestResultIndex is provided', () => {
     // Best attempt is mockAttempts[1] (difference: 5), which has index 1 in the original array.
     const bestIndexOriginal = 1;
     renderComponent({ attempts: mockAttempts, smileRanges: mockSmileRanges, bestResultIndex: bestIndexOriginal, attemptsLeft: 0 });

     const rows = screen.getAllByRole('row');
     // The best attempt (original index 1) will be the second data row (table index 2) after reversing.
     const bestRowInTable = rows[2]; // Header is index 0, first data row is 1, second is 2

     // Check if the correct row has the highlight class (adjust class name if needed)
     expect(bestRowInTable).toHaveClass('bg-green-200'); // Or dark:bg-green-700 depending on theme, test one

     // Check other rows are not highlighted
     expect(rows[1]).not.toHaveClass('bg-green-200');
     expect(rows[3]).not.toHaveClass('bg-green-200');
   });

   it('should NOT highlight any row if attemptsLeft > 0', () => {
      const bestIndexOriginal = 1;
      renderComponent({ attempts: mockAttempts, smileRanges: mockSmileRanges, bestResultIndex: bestIndexOriginal, attemptsLeft: 1 }); // attemptsLeft > 0

      const rows = screen.getAllByRole('row');
      rows.slice(1).forEach(row => { // Check only data rows
          expect(row).not.toHaveClass('bg-green-200');
          expect(row).not.toHaveClass('dark:bg-green-700');
      });
   });

    it('should NOT highlight any row if bestResultIndex is null', () => {
       renderComponent({ attempts: mockAttempts, smileRanges: mockSmileRanges, bestResultIndex: null, attemptsLeft: 0 }); // bestResultIndex is null

       const rows = screen.getAllByRole('row');
       rows.slice(1).forEach(row => {
           expect(row).not.toHaveClass('bg-green-200');
           expect(row).not.toHaveClass('dark:bg-green-700');
       });
    });

});