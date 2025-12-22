-- Add documents_analyzed_at column to track when documents were last analyzed
ALTER TABLE public.industry_trackers 
ADD COLUMN IF NOT EXISTS documents_analyzed_at TIMESTAMP WITH TIME ZONE;