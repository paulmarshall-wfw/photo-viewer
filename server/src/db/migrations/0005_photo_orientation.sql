ALTER TABLE photos ADD COLUMN orientation_degrees INTEGER NOT NULL DEFAULT 0 CHECK (orientation_degrees IN (0, 90, 180, 270));
