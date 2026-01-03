-- Add custom scoring instructions columns to deal_scoring_adjustments
ALTER TABLE public.deal_scoring_adjustments 
ADD COLUMN IF NOT EXISTS custom_instructions TEXT,
ADD COLUMN IF NOT EXISTS parsed_instructions JSONB;