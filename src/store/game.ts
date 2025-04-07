import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { Database, SmileRange } from "../lib/database.types";

type GameSettings = Database["public"]["Tables"]["game_settings"]["Row"];

// Define default smile ranges as a fallback
const defaultSmileRanges: SmileRange[] = [
  { min: 0, max: 0, smiles: 33 },
  { min: 1, max: 10, smiles: 15 },
  { min: 11, max: 50, smiles: 10 },
  { min: 51, max: 100, smiles: 5 },
  { min: 101, max: null, smiles: 3 }, // max: null represents infinity
];

interface GameState {
  settings: GameSettings | null;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  getSmileRanges: () => SmileRange[]; // Helper to get ranges or default
}

export const useGameStore = create<GameState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    try {
      set({ loading: true, error: null });

      const { data: settings, error } = await supabase
        .from("game_settings")
        .select()
        .eq("id", 1) // Assuming settings are stored with id=1
        .maybeSingle(); // Use maybeSingle to handle null case gracefully

      if (error) throw error;

      // Ensure smile_ranges is an array, even if null in DB
      const loadedSettings = settings
        ? {
            ...settings,
            smile_ranges: Array.isArray(settings.smile_ranges)
              ? settings.smile_ranges
              : defaultSmileRanges,
          }
        : null;

      set({ settings: loadedSettings, loading: false });
    } catch (error) {
      console.error("Error loading game settings:", error);
      set({ error: (error as Error).message, loading: false });
      // Keep default settings in case of error? Or set settings to null?
      // Setting to null for now, getSmileRanges will provide defaults.
      set({ settings: null });
    }
  },

  // Helper function to safely get smile ranges, providing defaults if needed
  getSmileRanges: (): SmileRange[] => {
    const settings = get().settings;
    if (
      settings &&
      Array.isArray(settings.smile_ranges) &&
      settings.smile_ranges.length > 0
    ) {
      return settings.smile_ranges;
    }
    return defaultSmileRanges; // Return default if settings are null or ranges are invalid/empty
  },
}));
