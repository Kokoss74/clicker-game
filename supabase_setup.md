# Supabase Setup Instructions for Clicker Game

This document provides the necessary steps and SQL scripts to set up the Supabase backend for the Clicker Game project.

## 1. Create Supabase Project

1.  Go to [supabase.com](https://supabase.com/) and create a new project.
2.  Note down your **Project URL** and **anon key**. You will need these for the frontend's `.env` file (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

## 2. Configure Authentication

1.  In your Supabase project dashboard, navigate to **Authentication** -> **Providers**.
2.  Ensure the **Email** provider is enabled. You can disable other providers if not needed.
3.  Navigate to **Authentication** -> **Settings**.
4.  **Disable** the toggle for **"Enable email confirmations"**. This is crucial because the frontend uses generated emails based on phone numbers.
5.  (Optional) Configure other authentication settings as desired.

## 3. Database Setup (SQL Editor)

Navigate to the **SQL Editor** in your Supabase dashboard and run the following SQL scripts in order.

### Script 1: Create Tables and Initial Settings

```sql
-- 1. Game Settings Table
CREATE TABLE public.game_settings (
  id integer PRIMARY KEY,
  attempts_number integer NOT NULL DEFAULT 10,
  smile_ranges jsonb NULL, -- Store smile calculation ranges
  cooldown_minutes integer NULL -- Store cooldown duration in minutes
);

-- Insert initial settings (customize values as needed)
INSERT INTO public.game_settings (id, attempts_number, smile_ranges, cooldown_minutes) VALUES (
  1,
  10, -- Default attempts per session
  '[
    { "min": 0, "max": 0, "smiles": 33 },
    { "min": 1, "max": 10, "smiles": 15 },
    { "min": 11, "max": 50, "smiles": 10 },
    { "min": 51, "max": 100, "smiles": 5 },
    { "min": 101, "max": null, "smiles": 3 }
  ]'::jsonb, -- Default smile ranges
  60 -- Default cooldown in minutes
);

-- 2. Users Table
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to Supabase Auth user
  name text NOT NULL,
  phone text UNIQUE NOT NULL, -- Normalized phone number
  attempts_left integer NOT NULL DEFAULT 10,
  best_result integer NULL, -- Best difference (ms) in the current/last session
  total_smiles integer NOT NULL DEFAULT 0, -- Smiles corresponding to the best_result
  last_attempt_at timestamp with time zone NULL, -- Timestamp of the last attempt for cooldown
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for faster lookups by auth_id
CREATE INDEX idx_users_auth_id ON public.users (auth_id);

-- 3. Attempts Table
CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, -- Link to internal user ID
  difference integer NOT NULL, -- Difference from whole second (ms)
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for faster lookups of user attempts
CREATE INDEX idx_attempts_user_id ON public.attempts (user_id);

```

### Script 2: Enable Row Level Security (RLS) and Create Policies

```sql
-- Enable RLS for all relevant tables
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Policies for game_settings
CREATE POLICY "Allow authenticated read access"
ON public.game_settings FOR SELECT
USING (auth.role() = 'authenticated');

-- Policies for users
CREATE POLICY "Allow individual user read access"
ON public.users FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Allow individual user update access for name"
ON public.users FOR UPDATE USING (auth.uid() = auth_id)
WITH CHECK (auth.uid() = auth_id AND id IS NOT NULL);

-- Policies for attempts
CREATE POLICY "Allow individual user read access"
ON public.attempts FOR SELECT
USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
-- INSERTs are handled by the record_attempt function

```

### Script 3: Create Helper Function for Smile Calculation

```sql
-- Helper function to calculate smiles based on difference and settings
CREATE OR REPLACE FUNCTION public.calculate_smiles_from_ranges(difference_value int)
RETURNS int AS $$
DECLARE
  smile_ranges jsonb;
  range_record jsonb;
  smiles_result int := 0; -- Default smiles if no range matches or settings are missing
BEGIN
  -- Get smile ranges from settings
  SELECT gs.smile_ranges INTO smile_ranges FROM public.game_settings gs WHERE gs.id = 1;

  -- Use default ranges if NULL or empty in DB
  IF smile_ranges IS NULL OR jsonb_array_length(smile_ranges) = 0 THEN
    smile_ranges := '[
      { "min": 0, "max": 0, "smiles": 33 },
      { "min": 1, "max": 10, "smiles": 15 },
      { "min": 11, "max": 50, "smiles": 10 },
      { "min": 51, "max": 100, "smiles": 5 },
      { "min": 101, "max": null, "smiles": 3 }
    ]'::jsonb;
  END IF;

  -- Iterate through ranges to find a match
  FOR range_record IN SELECT * FROM jsonb_array_elements(smile_ranges)
  LOOP
    -- Check if difference falls within the range [min, max]
    -- Handle null max as infinity
    IF difference_value >= (range_record->>'min')::int AND
       ((range_record->>'max') IS NULL OR difference_value <= (range_record->>'max')::int)
    THEN
      smiles_result := (range_record->>'smiles')::int;
      EXIT; -- Exit loop once a match is found
    END IF;
  END LOOP;

  RETURN smiles_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.calculate_smiles_from_ranges(int) TO authenticated;
```

### Script 4: Create Trigger Function for New Users

```sql
-- Function to handle new user creation from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  phone_number text;
  user_name text;
  attempts_setting int;
BEGIN
  -- Extract phone and name from metadata provided during signup
  phone_number := NEW.raw_user_meta_data->>'phone';
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User'); -- Default name if not provided

  -- Basic validation (should match frontend normalization/validation)
  IF phone_number IS NULL THEN RAISE EXCEPTION 'Phone number is missing in user metadata'; END IF;
  IF NOT (phone_number ~ '^972[5789]\d{8}$') THEN RAISE EXCEPTION 'Invalid normalized phone number format provided: %', phone_number; END IF;

  -- Get default attempts number from settings
  SELECT attempts_number INTO attempts_setting FROM public.game_settings WHERE id = 1;
  IF attempts_setting IS NULL THEN attempts_setting := 10; END IF; -- Fallback default

  -- Insert into public.users, linking to the auth.users entry
  INSERT INTO public.users (auth_id, phone, name, attempts_left, total_smiles, best_result, last_attempt_at)
  VALUES (NEW.id, phone_number, user_name, attempts_setting, 0, NULL, NULL)
  ON CONFLICT (auth_id) DO UPDATE -- Handle potential re-verification or edge cases
  SET phone = EXCLUDED.phone, name = EXCLUDED.name; -- Only update non-gameplay fields on conflict

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER needed to insert into public.users

-- Trigger to call the function after a new user signs up in Supabase Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Script 5: Create Main Game Logic Function (`record_attempt`)

```sql
-- Main function to record an attempt, update stats, and handle cooldowns
CREATE OR REPLACE FUNCTION public.record_attempt(difference_value int)
RETURNS boolean AS $$
DECLARE
  requesting_user_id uuid := auth.uid();
  internal_user_id uuid;
  current_attempts_left int;
  current_last_attempt_at timestamp with time zone;
  current_best_result int;
  attempts_to_reset int;
  cooldown_setting_minutes int;
  new_best_result int;
  smiles_for_best_result int;
  current_time_check timestamp with time zone := now();
  cooldown_interval interval;
  time_comparison_result boolean;
BEGIN
  -- 1. Find user by auth_id
  SELECT id, attempts_left, last_attempt_at, best_result
  INTO internal_user_id, current_attempts_left, current_last_attempt_at, current_best_result
  FROM public.users WHERE auth_id = requesting_user_id;

  IF internal_user_id IS NULL THEN RETURN false; END IF; -- User not found

  -- 3. Check/Reset Cooldown and Stats if attempts were 0
  IF current_attempts_left <= 0 THEN
    SELECT cooldown_minutes INTO cooldown_setting_minutes FROM public.game_settings WHERE id = 1;
    IF cooldown_setting_minutes IS NULL OR cooldown_setting_minutes <= 0 THEN cooldown_setting_minutes := 60; END IF;
    cooldown_interval := cooldown_setting_minutes * interval '1 minute';

    IF current_last_attempt_at IS NOT NULL AND current_last_attempt_at < (current_time_check - cooldown_interval) THEN
      -- Cooldown passed, reset attempts and stats for new session
      SELECT attempts_number INTO attempts_to_reset FROM public.game_settings WHERE id = 1;
      IF attempts_to_reset IS NULL THEN attempts_to_reset := 10; END IF;

      UPDATE public.users
      SET
        attempts_left = attempts_to_reset,
        last_attempt_at = NULL,
        total_smiles = 0,       -- Reset smiles field
        best_result = NULL      -- Reset best result
      WHERE id = internal_user_id;

      -- Update local variables for the current attempt
      current_attempts_left := attempts_to_reset;
      current_best_result := NULL;
    ELSE
      -- Cooldown active
      RAISE EXCEPTION 'Cooldown active. Try again later.';
    END IF;
  END IF;

  -- 4. Check Attempts (after potential reset)
  IF current_attempts_left <= 0 THEN RAISE EXCEPTION 'No attempts left.'; END IF;

  -- 5. Record the current attempt
  INSERT INTO public.attempts (user_id, difference) VALUES (internal_user_id, difference_value);

  -- 6. Update User Stats
  -- Calculate the new best result for the session
  new_best_result := LEAST(COALESCE(current_best_result, difference_value), difference_value);
  -- Calculate the smiles corresponding to this new best result
  smiles_for_best_result := public.calculate_smiles_from_ranges(new_best_result);

  -- Update the user record
  UPDATE public.users
  SET
    attempts_left = current_attempts_left - 1,
    last_attempt_at = current_time_check,
    total_smiles = smiles_for_best_result, -- Store smiles for the current best result
    best_result = new_best_result         -- Store the new best result
  WHERE id = internal_user_id;

  RETURN true; -- Success

END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER needed to access tables with RLS

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_attempt(int) TO authenticated;

```

## 4. Frontend Configuration

Ensure your frontend application's `.env` file contains the correct Supabase URL and Anon Key obtained in Step 1.

```dotenv
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

After completing these steps, your Supabase backend should be correctly configured for the Clicker Game.