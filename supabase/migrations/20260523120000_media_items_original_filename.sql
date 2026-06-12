-- Rename media_items.file_name to original_filename (client upload name).
-- Backfill is implicit via RENAME; chk_media_items_file_contract is recreated for the new column name.

ALTER TABLE public.media_items
  RENAME COLUMN file_name TO original_filename;

ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS chk_media_items_file_contract;

ALTER TABLE public.media_items
  ADD CONSTRAINT chk_media_items_file_contract
  CHECK (
    (
      storage_path IS NULL
      AND mime_type IS NULL
      AND original_filename IS NULL
      AND file_size_bytes IS NULL
    )
    OR
    (
      storage_path IS NOT NULL
      AND mime_type IS NOT NULL
      AND original_filename IS NOT NULL
      AND file_size_bytes IS NOT NULL
      AND file_size_bytes > 0
    )
  );
