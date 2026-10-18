-- =============================================================================
-- Horizons AI Travel Planner - database security & integrity migration
-- =============================================================================
-- Fixes:
--   1. `trips` and `profiles` had NO effective Row Level Security: any client
--      holding the public anon key could read every user's trips.
--   2. Missing owner-scoped CRUD policies for authenticated users.
--   3. Missing trips.user_id -> profiles.id foreign key (the backend relies on it).
--   4. Missing index for the "list my trips" query (user_id + created_at).
--
-- Safe to run multiple times. Non-destructive: it never drops tables or rows.
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- =============================================================================

-- 1. Make sure new trips always get a creation timestamp ----------------------
ALTER TABLE public.trips  ALTER COLUMN created_at SET DEFAULT now();

-- 2. Enable Row Level Security (idempotent) -----------------------------------
ALTER TABLE public.trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Remove any existing policies on these tables (they are either missing or
--    too permissive, e.g. "USING (true)"). Postgres policies are permissive
--    and OR-ed together, so obsolete open policies must be dropped.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('trips', 'profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 4. Trips: a user may only touch rows that belong to them --------------------
CREATE POLICY "trips_select_own"
  ON public.trips FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "trips_insert_own"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_update_own"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_delete_own"
  ON public.trips FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. Profiles: a user may only read/create/update their own profile -----------
--    (No DELETE policy on purpose: profiles are referenced by trips.)
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 6. Foreign key trips.user_id -> profiles.id ---------------------------------
--    NOT VALID so pre-existing rows (including the legacy row with
--    user_id = NULL) do not block creation; all NEW rows are still checked.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.trips'::regclass
      AND contype = 'f'
      AND conname = 'trips_user_id_fkey'
  ) THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT trips_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles (id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- 7. Index for the per-user trip list (ordered by newest first) ---------------
CREATE INDEX IF NOT EXISTS trips_user_id_created_at_idx
  ON public.trips (user_id, created_at DESC);

-- 8. Sanity check: both tables should report rowsecurity = true --------------
-- SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('trips', 'profiles');
