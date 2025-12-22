-- Add interested tracking to buyer_deal_scores
ALTER TABLE public.buyer_deal_scores ADD COLUMN interested boolean DEFAULT null;
ALTER TABLE public.buyer_deal_scores ADD COLUMN interested_at timestamp with time zone;