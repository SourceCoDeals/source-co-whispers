-- Add PE firm website column to buyers table
ALTER TABLE public.buyers
ADD COLUMN pe_firm_website text;