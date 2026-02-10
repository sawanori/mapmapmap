CREATE TABLE IF NOT EXISTS vibe_places_cache (
  place_id TEXT NOT NULL,
  mood TEXT NOT NULL,
  vibe_json TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (place_id, mood)
);

CREATE INDEX idx_vibe_cache_mood_expires ON vibe_places_cache(mood, expires_at);
