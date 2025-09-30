ALTER TABLE semantic_frames
    ADD COLUMN roles jsonb NOT NULL DEFAULT '[]'::jsonb;
