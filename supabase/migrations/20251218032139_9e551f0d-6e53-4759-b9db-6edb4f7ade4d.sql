-- Add new fields to deals table for memo-style information
ALTER TABLE public.deals
ADD COLUMN headquarters text,
ADD COLUMN founded_year integer,
ADD COLUMN employee_count integer,
ADD COLUMN ownership_structure text,
ADD COLUMN contact_name text,
ADD COLUMN contact_email text,
ADD COLUMN contact_phone text,
ADD COLUMN company_overview text;