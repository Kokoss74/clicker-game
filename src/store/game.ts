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

const defaultCooldownMinutes = 60;

interface GameState {
  settings: GameSettings | null;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  getSmileRanges: () => SmileRange[]; 
  getCooldownMinutes: () => number; 
}

export const useGameStore = create<GameState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    console.log("GameStore: loadSettings started."); 
    try {
      set({ loading: true, error: null });

      const { data: settings, error } = await supabase
        .from("game_settings")
        .select()
        .eq("id", 1) 
        .maybeSingle(); 

      if (error) {
        console.error("GameStore: Error fetching settings from Supabase:", error); 
        throw error;
      }
      // Ensure smile_ranges is an array and cooldown_minutes is a number, providing defaults if null/invalid
      const loadedSettings = settings
        ? {
            ...settings,
            smile_ranges:
              Array.isArray(settings.smile_ranges) &&
              settings.smile_ranges.length > 0
                ? settings.smile_ranges
                : defaultSmileRanges,
            cooldown_minutes:
              typeof settings.cooldown_minutes === "number" &&
              settings.cooldown_minutes > 0
                ? settings.cooldown_minutes
                : defaultCooldownMinutes,
          }
        : null; 

      console.log("GameStore: Final loaded settings:", loadedSettings); 
      set({ settings: loadedSettings, loading: false });
    } catch (error) {
      console.error("Error loading game settings:", error);
      set({ error: (error as Error).message, loading: false });
      // Set settings to null in case of error, helpers will provide defaults
      set({ settings: null });
    }
  },

  getSmileRanges: (): SmileRange[] => {
    const settings = get().settings;
    if (
      settings &&
      Array.isArray(settings.smile_ranges) &&
      settings.smile_ranges.length > 0
    ) {
      return settings.smile_ranges;
    }
    return defaultSmileRanges; 
  },

  getCooldownMinutes: (): number => {
    const settings = get().settings;
    if (
      settings &&
      typeof settings.cooldown_minutes === "number" &&
      settings.cooldown_minutes > 0
    ) {
      return settings.cooldown_minutes;
    }
    return defaultCooldownMinutes; 
  },
}));
