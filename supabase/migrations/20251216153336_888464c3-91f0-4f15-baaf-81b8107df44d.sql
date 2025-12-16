-- Add scoring weight columns to industry_trackers for buyer score calibration
ALTER TABLE public.industry_trackers
ADD COLUMN service_mix_weight integer NOT NULL DEFAULT 25,
ADD COLUMN geography_weight integer NOT NULL DEFAULT 25,
ADD COLUMN size_weight integer NOT NULL DEFAULT 25,
ADD COLUMN owner_goals_weight integer NOT NULL DEFAULT 25;