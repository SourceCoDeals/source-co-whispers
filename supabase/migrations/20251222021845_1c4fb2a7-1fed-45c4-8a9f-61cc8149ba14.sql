-- Add pass tracking columns to buyer_deal_scores
ALTER TABLE public.buyer_deal_scores ADD COLUMN passed_on_deal boolean DEFAULT false;
ALTER TABLE public.buyer_deal_scores ADD COLUMN pass_reason text;
ALTER TABLE public.buyer_deal_scores ADD COLUMN pass_category text;
ALTER TABLE public.buyer_deal_scores ADD COLUMN passed_at timestamp with time zone;
ALTER TABLE public.buyer_deal_scores ADD COLUMN pass_notes text;