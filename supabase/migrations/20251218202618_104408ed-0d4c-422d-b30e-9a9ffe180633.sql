-- Add natural language fit criteria column to industry_trackers
ALTER TABLE public.industry_trackers 
ADD COLUMN fit_criteria text;