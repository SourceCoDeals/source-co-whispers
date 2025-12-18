-- Add archived field to industry_trackers
ALTER TABLE public.industry_trackers 
ADD COLUMN archived boolean NOT NULL DEFAULT false;