import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { Database, SmileRange } from "../lib/database.types";

// Ensure GameSettings includes the new field from Database types
type GameSettings = Database["public"]["Tables"]["game_settings"]["Row"];

// Define default smile ranges as a fallback
const defaultSmileRanges: SmileRange[] = [
  { min: 0, max: 0, smiles: 33 },
  { min: 1, max: 10, smiles: 15 },
  { min: 11, max: 50, smiles: 10 },
  { min: 51, max: 100, smiles: 5 },
  { min: 101, max: null, smiles: 3 }, // max: null represents infinity
];

// Define default cooldown
const defaultCooldownMinutes = 60;

interface GameState {
  settings: GameSettings | null;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  getSmileRanges: () => SmileRange[]; // Helper to get ranges or default
  getCooldownMinutes: () => number; // Helper to get cooldown or default
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

      // Ensure smile_ranges is an array and cooldown_minutes is a number, providing defaults if null/invalid
      const loadedSettings = settings
        ? {
            ...settings,
            // Ensure smile_ranges is valid or use default
            smile_ranges:
              Array.isArray(settings.smile_ranges) &&
              settings.smile_ranges.length > 0
                ? settings.smile_ranges
                : defaultSmileRanges,
            // Ensure cooldown_minutes is valid or use default
            cooldown_minutes:
              typeof settings.cooldown_minutes === "number" &&
              settings.cooldown_minutes > 0
                ? settings.cooldown_minutes
                : defaultCooldownMinutes,
          }
        : null; // If settings are null from DB, keep it null

      set({ settings: loadedSettings, loading: false });
    } catch (error) {
      console.error("Error loading game settings:", error);
      set({ error: (error as Error).message, loading: false });
      // Set settings to null in case of error, helpers will provide defaults
      set({ settings: null });
    }
  },

  // Helper function to safely get smile ranges, providing defaults if needed
  getSmileRanges: (): SmileRange[] => {
    const settings = get().settings;
    // Check if settings exist and smile_ranges is a non-empty array
    if (
      settings &&
      Array.isArray(settings.smile_ranges) &&
      settings.smile_ranges.length > 0
    ) {
      return settings.smile_ranges;
    }
    return defaultSmileRanges; // Return default otherwise
  },

  // Helper function to safely get cooldown minutes, providing default if needed
  getCooldownMinutes: (): number => {
    const settings = get().settings;
    // Check if settings exist and cooldown_minutes is a positive number
    if (
      settings &&
      typeof settings.cooldown_minutes === "number" &&
      settings.cooldown_minutes > 0
    ) {
      return settings.cooldown_minutes;
    }
    return defaultCooldownMinutes; // Return default otherwise
  },
}));
