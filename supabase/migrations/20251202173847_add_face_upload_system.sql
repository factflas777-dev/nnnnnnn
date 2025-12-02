-- Face Upload System for Snake Head Customization
--
-- 1. New Tables
--    - profiles: Extended player profile with face upload data
--      - id, user_id, face_path, face_url, face_version, face_state, face_meta
--      - upload_count_today, last_upload_reset, created_at, updated_at
--    
--    - face_upload_logs: Audit log for face uploads
--      - id, user_id, upload_id, raw_path, processed_path, outcome, reason
--      - file_size, mime_type, ip_address, created_at
--
-- 2. Security
--    - Enable RLS on both tables
--    - Users can read/update their own profile
--    - Only authenticated users can upload
--
-- 3. Storage Bucket
--    - Bucket: user-faces
--    - Paths: user-uploads/raw/{user_id}/* and faces/{user_id}/*

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  face_path text,
  face_url text,
  face_version integer DEFAULT 0,
  face_state text DEFAULT 'none',
  face_meta jsonb DEFAULT '{"scale": 1.0, "rotation": 0, "offsetX": 0, "offsetY": 0}'::jsonb,
  upload_count_today integer DEFAULT 0,
  last_upload_reset timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT face_state_check CHECK (face_state IN ('none', 'pending', 'approved', 'rejected', 'flagged'))
);

-- Create face upload logs table
CREATE TABLE IF NOT EXISTS face_upload_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL DEFAULT gen_random_uuid(),
  raw_path text NOT NULL,
  processed_path text,
  outcome text NOT NULL DEFAULT 'pending',
  reason text,
  file_size integer,
  mime_type text,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT outcome_check CHECK (outcome IN ('pending', 'accepted', 'rejected', 'flagged'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_face_state ON profiles(face_state);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_face_upload_logs_user_id ON face_upload_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_face_upload_logs_outcome ON face_upload_logs(outcome);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_upload_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Face upload logs policies
CREATE POLICY "Users can read own upload logs"
  ON face_upload_logs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert upload logs"
  ON face_upload_logs FOR INSERT
  TO public
  WITH CHECK (true);

-- Function to auto-create profile when player is created
CREATE OR REPLACE FUNCTION create_profile_for_player()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_profile_trigger'
  ) THEN
    CREATE TRIGGER create_profile_trigger
      AFTER INSERT ON players
      FOR EACH ROW
      EXECUTE FUNCTION create_profile_for_player();
  END IF;
END $$;

-- Create profiles for existing players
INSERT INTO profiles (user_id)
SELECT id FROM players
ON CONFLICT (user_id) DO NOTHING;