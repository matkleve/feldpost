-- =============================================================================
-- Add address fields to media_items to complete the migration from images.
--
-- These fields were previously only available on the legacy images table.
-- Allows full address persistence without referencing legacy images rows.
-- =============================================================================

ALTER TABLE public.media_items
ADD COLUMN address_label text,
ADD COLUMN street text,
ADD COLUMN city text,
ADD COLUMN district text,
ADD COLUMN country text;

-- Backfill address data from legacy images table where available
UPDATE public.media_items m
SET
  address_label = i.address_label,
  street = i.street,
  city = i.city,
  district = i.district,
  country = i.country
FROM public.images i
WHERE m.source_image_id = i.id
  AND (i.address_label IS NOT NULL
    OR i.street IS NOT NULL
    OR i.city IS NOT NULL
    OR i.district IS NOT NULL
    OR i.country IS NOT NULL);

-- Create index for address searches (optional, but useful for bulk operations)
CREATE INDEX IF NOT EXISTS idx_media_items_address_label
  ON public.media_items (address_label)
  WHERE address_label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_items_city
  ON public.media_items (city)
  WHERE city IS NOT NULL;
