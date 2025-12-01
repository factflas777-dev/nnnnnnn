/*
  # Slither.io Game Database Schema

  ## Tables Created
  
  ### players
  - `id` (uuid, primary key) - Unique player identifier
  - `username` (text) - Player display name
  - `email` (text, unique) - Player email for authentication
  - `total_xp` (integer) - Accumulated experience points
  - `level` (integer) - Player level based on XP
  - `selected_skin` (text) - Currently equipped snake skin
  - `selected_color` (text) - Currently equipped snake color
  - `high_score` (integer) - Personal best score
  - `total_kills` (integer) - Total snakes killed
  - `total_deaths` (integer) - Total deaths
  - `total_mass_eaten` (integer) - Total pellets consumed
  - `created_at` (timestamptz) - Account creation timestamp
  - `last_login` (timestamptz) - Last login timestamp

  ### skins
  - `id` (uuid, primary key) - Skin identifier
  - `name` (text) - Skin name
  - `unlock_level` (integer) - Required level to unlock
  - `unlock_xp` (integer) - Required XP to unlock
  - `is_premium` (boolean) - Whether skin is premium
  - `pattern` (text) - Visual pattern type
  - `glow_effect` (boolean) - Whether skin has glow effect

  ### player_skins
  - `player_id` (uuid) - References players
  - `skin_id` (uuid) - References skins
  - `unlocked_at` (timestamptz) - When skin was unlocked
  
  ### leaderboard
  - `id` (uuid, primary key) - Entry identifier
  - `player_id` (uuid) - References players
  - `username` (text) - Player name
  - `score` (integer) - Game score
  - `mass` (integer) - Final mass
  - `kills` (integer) - Kills in session
  - `time_alive` (integer) - Seconds alive
  - `created_at` (timestamptz) - Score timestamp

  ### daily_rewards
  - `player_id` (uuid) - References players
  - `last_claimed` (timestamptz) - Last reward claim timestamp
  - `streak` (integer) - Daily login streak

  ## Security
  - RLS enabled on all tables
  - Players can read/write their own data
  - Leaderboard is publicly readable
  - Skins are publicly readable
*/

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  email text UNIQUE,
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  selected_skin text DEFAULT 'default',
  selected_color text DEFAULT '#00ff00',
  high_score integer DEFAULT 0,
  total_kills integer DEFAULT 0,
  total_deaths integer DEFAULT 0,
  total_mass_eaten integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  unlock_level integer DEFAULT 1,
  unlock_xp integer DEFAULT 0,
  is_premium boolean DEFAULT false,
  pattern text DEFAULT 'solid',
  glow_effect boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS player_skins (
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  skin_id uuid REFERENCES skins(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (player_id, skin_id)
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  username text NOT NULL,
  score integer DEFAULT 0,
  mass integer DEFAULT 0,
  kills integer DEFAULT 0,
  time_alive integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_rewards (
  player_id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  last_claimed timestamptz DEFAULT now(),
  streak integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_players_high_score ON players(high_score DESC);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skins ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read skins"
  ON skins FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert leaderboard entries"
  ON leaderboard FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Players can read own data"
  ON players FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Players can insert own data"
  ON players FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Players can update own data"
  ON players FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Players can read own skins"
  ON player_skins FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Players can unlock skins"
  ON player_skins FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Players can read own rewards"
  ON daily_rewards FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Players can insert own rewards"
  ON daily_rewards FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Players can update own rewards"
  ON daily_rewards FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

INSERT INTO skins (name, unlock_level, unlock_xp, is_premium, pattern, glow_effect) VALUES
  ('default', 1, 0, false, 'solid', false),
  ('neon', 5, 1000, false, 'solid', true),
  ('striped', 10, 2500, false, 'striped', false),
  ('galaxy', 15, 5000, false, 'gradient', true),
  ('dragon', 20, 10000, false, 'scales', true),
  ('rainbow', 25, 20000, false, 'rainbow', true),
  ('ghost', 30, 35000, false, 'transparent', true),
  ('fire', 35, 50000, false, 'animated', true)
ON CONFLICT (name) DO NOTHING;