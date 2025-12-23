-- Add company_address field to deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS company_address text NULL;