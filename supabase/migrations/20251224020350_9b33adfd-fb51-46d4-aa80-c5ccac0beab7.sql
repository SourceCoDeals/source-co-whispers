-- Add hidden_from_deal column to buyer_deal_scores table
ALTER TABLE public.buyer_deal_scores 
ADD COLUMN hidden_from_deal boolean DEFAULT false;