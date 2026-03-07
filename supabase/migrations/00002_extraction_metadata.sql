-- Migration: 00002_extraction_metadata
-- Add pitch deck classification and website fields to extracted_data

ALTER TABLE extracted_data
  ADD COLUMN website_url text,
  ADD COLUMN is_pitch_deck boolean,
  ADD COLUMN pitch_deck_confidence numeric(3,2),
  ADD COLUMN sections_found text[];
