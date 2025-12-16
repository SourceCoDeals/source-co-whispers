-- Add new fields to deals table
ALTER TABLE public.deals
ADD COLUMN company_website text,
ADD COLUMN owner_goals text,
ADD COLUMN additional_info text,
ADD COLUMN transcript_link text;