-- Add extraction tracking columns to buyer_transcripts
ALTER TABLE public.buyer_transcripts 
  ADD COLUMN IF NOT EXISTS extracted_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS extraction_evidence jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Add extraction evidence and sources to buyers table for audit trail
ALTER TABLE public.buyers 
  ADD COLUMN IF NOT EXISTS extraction_evidence jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS extraction_sources jsonb DEFAULT '[]'::jsonb;