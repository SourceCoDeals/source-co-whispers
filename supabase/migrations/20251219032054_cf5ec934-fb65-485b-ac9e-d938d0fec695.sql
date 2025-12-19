-- Add financial metadata columns to deals table for M&A extraction framework
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS revenue_confidence text CHECK (revenue_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS ebitda_confidence text CHECK (ebitda_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS revenue_is_inferred boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ebitda_is_inferred boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS revenue_source_quote text,
ADD COLUMN IF NOT EXISTS ebitda_source_quote text,
ADD COLUMN IF NOT EXISTS ebitda_amount numeric,
ADD COLUMN IF NOT EXISTS financial_notes text,
ADD COLUMN IF NOT EXISTS financial_followup_questions text[];

-- Add comments for documentation
COMMENT ON COLUMN public.deals.revenue_confidence IS 'Confidence level of extracted revenue: high, medium, or low';
COMMENT ON COLUMN public.deals.ebitda_confidence IS 'Confidence level of extracted EBITDA: high, medium, or low';
COMMENT ON COLUMN public.deals.revenue_is_inferred IS 'Whether revenue was inferred from other data vs explicitly stated';
COMMENT ON COLUMN public.deals.ebitda_is_inferred IS 'Whether EBITDA was inferred from margins/profit vs explicitly stated';
COMMENT ON COLUMN public.deals.revenue_source_quote IS 'Exact quote from owner supporting the revenue figure';
COMMENT ON COLUMN public.deals.ebitda_source_quote IS 'Exact quote from owner supporting the EBITDA figure';
COMMENT ON COLUMN public.deals.ebitda_amount IS 'Actual EBITDA amount in millions (calculated from revenue * margin if inferred)';
COMMENT ON COLUMN public.deals.financial_notes IS 'Extraction notes and assumptions made during financial analysis';
COMMENT ON COLUMN public.deals.financial_followup_questions IS 'Recommended clarification questions for follow-up calls';