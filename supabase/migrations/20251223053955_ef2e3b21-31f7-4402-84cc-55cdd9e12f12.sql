-- Add End Market / Customers fields
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS end_market_customers text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS customer_concentration text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS customer_geography text;

-- Add Additional Information structured fields
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS key_risks text[];
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS competitive_position text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS technology_systems text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS real_estate text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS growth_trajectory text;