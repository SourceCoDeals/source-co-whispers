-- Create buyer_learning_history table
CREATE TABLE public.buyer_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'not_a_fit',
  rejection_categories TEXT[],
  rejection_reason TEXT,
  rejection_notes TEXT,
  deal_context JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.buyer_learning_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view learning history in their trackers"
ON public.buyer_learning_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_learning_history.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create learning history in their trackers"
ON public.buyer_learning_history FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_learning_history.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete learning history in their trackers"
ON public.buyer_learning_history FOR DELETE
USING (EXISTS (
  SELECT 1 FROM buyers
  JOIN industry_trackers ON industry_trackers.id = buyers.tracker_id
  WHERE buyers.id = buyer_learning_history.buyer_id
  AND industry_trackers.user_id = auth.uid()
));

-- Add rejection columns to buyer_deal_scores
ALTER TABLE public.buyer_deal_scores 
ADD COLUMN IF NOT EXISTS rejection_category TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_notes TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;