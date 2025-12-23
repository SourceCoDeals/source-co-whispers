-- Add last_enriched_at column to deals table for enrichment caching
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;