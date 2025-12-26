-- Add M&A guide columns to industry_trackers table
ALTER TABLE public.industry_trackers
ADD COLUMN IF NOT EXISTS ma_guide_content TEXT,
ADD COLUMN IF NOT EXISTS ma_guide_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ma_guide_qa_context JSONB;