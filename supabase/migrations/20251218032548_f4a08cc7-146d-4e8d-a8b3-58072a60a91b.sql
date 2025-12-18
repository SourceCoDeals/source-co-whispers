-- Add contact LinkedIn field to deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS contact_linkedin text;