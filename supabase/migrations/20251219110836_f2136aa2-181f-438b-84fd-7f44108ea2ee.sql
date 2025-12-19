-- Add separate fit criteria columns for size, service, and geography
ALTER TABLE public.industry_trackers 
ADD COLUMN IF NOT EXISTS fit_criteria_size TEXT,
ADD COLUMN IF NOT EXISTS fit_criteria_service TEXT,
ADD COLUMN IF NOT EXISTS fit_criteria_geography TEXT;