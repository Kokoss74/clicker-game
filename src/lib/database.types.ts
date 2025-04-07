export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface SmileRange {
  min: number; // Minimum difference (inclusive)
  max: number | null; // Maximum difference (inclusive), null for infinity
  smiles: number; // Smiles awarded for this range
}

// Removed unused DiscountRange interface

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          phone: string;
          attempts_left: number;
          best_result: number | null;
          // discount: number // Removed discount field
          total_smiles: number; // Added total smiles field
          last_attempt_at: string | null; // Added timestamp for last attempt
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          attempts_left?: number;
          best_result?: number | null;
          // discount?: number // Removed discount field
          total_smiles?: number;
          last_attempt_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          attempts_left?: number;
          best_result?: number | null;
          // discount?: number // Removed discount field
          total_smiles?: number;
          last_attempt_at?: string | null;
          created_at?: string;
        };
      };
      attempts: {
        Row: {
          id: string;
          user_id: string;
          difference: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          difference: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          difference?: number;
          created_at?: string;
        };
      };
      game_settings: {
        Row: {
          id: number;
          attempts_number: number;
          smile_ranges: SmileRange[] | null; // Added smile ranges field, allow null if not set
          cooldown_minutes: number | null; // Added cooldown duration in minutes
          // discount_ranges: DiscountRange[] // Removed discount ranges
        };
        Insert: {
          id?: number;
          attempts_number?: number;
          smile_ranges?: SmileRange[] | null;
          cooldown_minutes?: number | null;
          // discount_ranges?: DiscountRange[] // Removed discount ranges
        };
        Update: {
          id?: number;
          attempts_number?: number;
          smile_ranges?: SmileRange[] | null;
          cooldown_minutes?: number | null;
          // discount_ranges?: DiscountRange[] // Removed discount ranges
        };
      };
      admins: {
        Row: {
          id: string;
          password_hash: string;
          failed_attempts: number;
          locked_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          password_hash: string;
          failed_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          password_hash?: string;
          failed_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
        };
      };
      admin_logs: {
        Row: {
          id: string;
          action: string;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          action?: string;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
