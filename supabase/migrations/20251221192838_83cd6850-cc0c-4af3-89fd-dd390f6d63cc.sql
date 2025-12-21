-- Add buyer types columns to industry_trackers
ALTER TABLE public.industry_trackers 
ADD COLUMN fit_criteria_buyer_types TEXT,
ADD COLUMN buyer_types_criteria JSONB;