import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './game'; // Don't import GameState
import { supabase } from '../lib/supabase'; // Import to mock
import { Database, SmileRange } from '../lib/database.types'; // Import Database type

// Mock the supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  },
}));

// Define default values from the store for comparison
const defaultSmileRanges: SmileRange[] = [
  { min: 0, max: 0, smiles: 33 },
  { min: 1, max: 10, smiles: 15 },
  { min: 11, max: 50, smiles: 10 },
  { min: 51, max: 100, smiles: 5 },
  { min: 101, max: null, smiles: 3 },
];
const defaultCooldownMinutes = 60;

// Define GameSettings type locally based on Database type
type GameSettings = Database["public"]["Tables"]["game_settings"]["Row"];
// PartialGameSettings is no longer needed as we mock the full structure for setState


// Helper to get the mocked maybeSingle function
const mockMaybeSingle = supabase.from('game_settings').select().eq('id', 1).maybeSingle as ReturnType<typeof vi.fn>;

// Define initial state structure for resetting
const initialState = useGameStore.getState();

describe('useGameStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.setState(initialState, true);
    // Reset mocks
    vi.clearAllMocks();
    // Reset maybeSingle mock specifically if needed
    mockMaybeSingle.mockReset();
  });

  it('should have correct initial state', () => {
    const state = useGameStore.getState();
    expect(state.settings).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('loadSettings action', () => {
    it('should load settings successfully and update state', async () => {
      const mockSettings: GameSettings = {
        id: 1,
        attempts_number: 10, // Correct field name
        cooldown_minutes: 30,
        smile_ranges: [
          { min: 0, max: 10, smiles: 20 },
          { min: 11, max: null, smiles: 5 },
        ],
      };
      mockMaybeSingle.mockResolvedValueOnce({ data: mockSettings, error: null });

      const { loadSettings } = useGameStore.getState();
      await loadSettings();

      const state = useGameStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.settings).toEqual(mockSettings); // Should match exactly
      expect(supabase.from).toHaveBeenCalledWith('game_settings');
      expect(supabase.from('game_settings').select).toHaveBeenCalled();
      expect(supabase.from('game_settings').select().eq).toHaveBeenCalledWith('id', 1);
      expect(mockMaybeSingle).toHaveBeenCalled();
    });

    it('should handle null settings from database', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const { loadSettings } = useGameStore.getState();
      await loadSettings();

      const state = useGameStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.settings).toBeNull(); // Settings should remain null
    });

     it('should use default smile_ranges if fetched ranges are invalid (null)', async () => {
       const mockSettings: Partial<GameSettings> = { // Use Partial for easier mocking
         id: 1,
         attempts_number: 10, // Correct field name
         cooldown_minutes: 30,
         smile_ranges: null, // Simulate invalid data (null)
       };
       // Cast to GameSettings here as we are mocking the DB response structure
       mockMaybeSingle.mockResolvedValueOnce({ data: mockSettings as GameSettings, error: null });

       await useGameStore.getState().loadSettings();
       const state = useGameStore.getState();
       expect(state.settings?.smile_ranges).toEqual(defaultSmileRanges);
       expect(state.settings?.cooldown_minutes).toEqual(30); // Cooldown should be correct
     });

     it('should use default smile_ranges if fetched ranges are invalid (empty array)', async () => {
       const mockSettings: GameSettings = {
         id: 1,
         attempts_number: 10, // Correct field name
         cooldown_minutes: 30,
         smile_ranges: [], // Empty array
       };
       mockMaybeSingle.mockResolvedValueOnce({ data: mockSettings, error: null });

       await useGameStore.getState().loadSettings();
       const state = useGameStore.getState();
       expect(state.settings?.smile_ranges).toEqual(defaultSmileRanges);
     });

     it('should use default cooldown_minutes if fetched cooldown is invalid (null)', async () => {
       const mockSettings: Partial<GameSettings> = {
         id: 1,
         attempts_number: 10, // Correct field name
         cooldown_minutes: null, // Simulate invalid data (null)
         smile_ranges: [{ min: 0, max: 10, smiles: 20 }],
       };
       // Cast to GameSettings here as we are mocking the DB response structure
       mockMaybeSingle.mockResolvedValueOnce({ data: mockSettings as GameSettings, error: null });

       await useGameStore.getState().loadSettings();
       const state = useGameStore.getState();
       expect(state.settings?.cooldown_minutes).toEqual(defaultCooldownMinutes);
       expect(state.settings?.smile_ranges).toEqual([{ min: 0, max: 10, smiles: 20 }]); // Ranges should be correct
     });

     it('should use default cooldown_minutes if fetched cooldown is invalid (zero)', async () => {
       const mockSettings: GameSettings = {
         id: 1,
         attempts_number: 10, // Correct field name
         cooldown_minutes: 0, // Zero cooldown
         smile_ranges: [{ min: 0, max: 10, smiles: 20 }],
       };
       mockMaybeSingle.mockResolvedValueOnce({ data: mockSettings, error: null });

       await useGameStore.getState().loadSettings();
       const state = useGameStore.getState();
       expect(state.settings?.cooldown_minutes).toEqual(defaultCooldownMinutes);
     });


    it('should handle errors during fetch', async () => {
      const errorMessage = 'Failed to fetch';
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: new Error(errorMessage) });

      const { loadSettings } = useGameStore.getState();
      await loadSettings();

      const state = useGameStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.settings).toBeNull(); // Settings should be null on error
    });

     it('should set loading state correctly', async () => {
       mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

       const { loadSettings } = useGameStore.getState();
       const promise = loadSettings(); // Don't await yet

       // Check loading state immediately after calling
       expect(useGameStore.getState().loading).toBe(true);
       expect(useGameStore.getState().error).toBeNull(); // Error should be reset

       await promise; // Now wait for completion

       expect(useGameStore.getState().loading).toBe(false);
     });
  });

  describe('getSmileRanges selector', () => {
    it('should return default ranges when settings are null', () => {
      useGameStore.setState({ settings: null });
      expect(useGameStore.getState().getSmileRanges()).toEqual(defaultSmileRanges);
    });

    it('should return default ranges when smile_ranges are invalid', () => {
      // Provide necessary fields for GameSettings when mocking state
      useGameStore.setState({
        settings: { id: 1, attempts_number: 10, smile_ranges: [], cooldown_minutes: 30 } as GameSettings,
      });
      expect(useGameStore.getState().getSmileRanges()).toEqual(defaultSmileRanges);

       useGameStore.setState({
         settings: { id: 1, attempts_number: 10, smile_ranges: null, cooldown_minutes: 30 } as GameSettings,
       });
       expect(useGameStore.getState().getSmileRanges()).toEqual(defaultSmileRanges);
    });

    it('should return ranges from settings when valid', () => {
      const customRanges = [{ min: 0, max: 100, smiles: 1 }];
      useGameStore.setState({
        settings: { id: 1, attempts_number: 10, smile_ranges: customRanges, cooldown_minutes: 30 } as GameSettings,
      });
      expect(useGameStore.getState().getSmileRanges()).toEqual(customRanges);
    });
  });

  describe('getCooldownMinutes selector', () => {
     it('should return default cooldown when settings are null', () => {
       useGameStore.setState({ settings: null });
       expect(useGameStore.getState().getCooldownMinutes()).toEqual(defaultCooldownMinutes);
     });

     it('should return default cooldown when cooldown_minutes is invalid', () => {
       useGameStore.setState({
         settings: { id: 1, attempts_number: 10, smile_ranges: defaultSmileRanges, cooldown_minutes: null } as GameSettings,
       });
       expect(useGameStore.getState().getCooldownMinutes()).toEqual(defaultCooldownMinutes);

       useGameStore.setState({
         settings: { id: 1, attempts_number: 10, smile_ranges: defaultSmileRanges, cooldown_minutes: 0 } as GameSettings,
       });
       expect(useGameStore.getState().getCooldownMinutes()).toEqual(defaultCooldownMinutes);

        useGameStore.setState({
          settings: { id: 1, attempts_number: 10, smile_ranges: defaultSmileRanges, cooldown_minutes: -10 } as GameSettings,
        });
        expect(useGameStore.getState().getCooldownMinutes()).toEqual(defaultCooldownMinutes);
     });

     it('should return cooldown from settings when valid', () => {
       const customCooldown = 15;
       useGameStore.setState({
         settings: { id: 1, attempts_number: 10, smile_ranges: defaultSmileRanges, cooldown_minutes: customCooldown } as GameSettings,
       });
       expect(useGameStore.getState().getCooldownMinutes()).toEqual(customCooldown);
     });
  });
});