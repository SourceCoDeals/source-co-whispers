-- Add contact tracking columns to buyer_contacts table
ALTER TABLE public.buyer_contacts 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS is_deal_team BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS role_category TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.buyer_contacts.source IS 'Source of contact: website, enrichment, manual';
COMMENT ON COLUMN public.buyer_contacts.source_url IS 'URL where contact was found';
COMMENT ON COLUMN public.buyer_contacts.is_deal_team IS 'Whether this contact is specifically on the deal team for the portfolio company';
COMMENT ON COLUMN public.buyer_contacts.role_category IS 'Category: deal_team, business_dev, junior_investment, corp_dev, executive';