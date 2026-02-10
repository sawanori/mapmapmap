ALTER TABLE spots ADD COLUMN google_place_id TEXT;
ALTER TABLE spots ADD COLUMN rating REAL;
ALTER TABLE spots ADD COLUMN address TEXT;
ALTER TABLE spots ADD COLUMN opening_hours TEXT;
ALTER TABLE spots ADD COLUMN source TEXT DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_place_id ON spots(google_place_id);
