-- Drop the check constraint on company_type to allow storing actual company names
ALTER TABLE public.buyer_contacts DROP CONSTRAINT IF EXISTS buyer_contacts_company_type_check;