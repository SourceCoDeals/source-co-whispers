-- Add headquarters and fee agreement fields to buyers
ALTER TABLE public.buyers 
ADD COLUMN IF NOT EXISTS hq_city text,
ADD COLUMN IF NOT EXISTS hq_state text,
ADD COLUMN IF NOT EXISTS service_regions text[],
ADD COLUMN IF NOT EXISTS fee_agreement_status text DEFAULT 'None';