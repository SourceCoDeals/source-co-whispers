-- Create deal_scoring_adjustments table to store learned weights from decisions
CREATE TABLE public.deal_scoring_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE UNIQUE,
  
  -- Learned weight adjustments (multipliers, 1.0 = no change)
  geography_weight_mult NUMERIC DEFAULT 1.0,
  size_weight_mult NUMERIC DEFAULT 1.0,
  services_weight_mult NUMERIC DEFAULT 1.0,
  
  -- Stats for transparency
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  passed_geography INTEGER DEFAULT 0,
  passed_size INTEGER DEFAULT 0,
  passed_services INTEGER DEFAULT 0,
  
  -- When weights were last recalculated
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.deal_scoring_adjustments ENABLE ROW LEVEL SECURITY;

-- Create policies - users can manage adjustments for deals they have access to
CREATE POLICY "Users can view deal scoring adjustments"
ON public.deal_scoring_adjustments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.industry_trackers t ON d.tracker_id = t.id
    WHERE d.id = deal_scoring_adjustments.deal_id
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert deal scoring adjustments"
ON public.deal_scoring_adjustments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.industry_trackers t ON d.tracker_id = t.id
    WHERE d.id = deal_scoring_adjustments.deal_id
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update deal scoring adjustments"
ON public.deal_scoring_adjustments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.industry_trackers t ON d.tracker_id = t.id
    WHERE d.id = deal_scoring_adjustments.deal_id
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete deal scoring adjustments"
ON public.deal_scoring_adjustments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.industry_trackers t ON d.tracker_id = t.id
    WHERE d.id = deal_scoring_adjustments.deal_id
    AND t.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_deal_scoring_adjustments_updated_at
BEFORE UPDATE ON public.deal_scoring_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();