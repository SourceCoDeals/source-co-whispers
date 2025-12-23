-- Add deal_score column to deals table for composite deal scoring (1-100)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deal_score integer;