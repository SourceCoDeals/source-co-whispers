-- Create deal_transcripts table (similar to buyer_transcripts)
CREATE TABLE public.deal_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL,
  title TEXT NOT NULL,
  transcript_type TEXT NOT NULL DEFAULT 'link',
  url TEXT,
  notes TEXT,
  call_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  extracted_data JSONB DEFAULT '{}'::jsonb,
  extraction_evidence JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  CONSTRAINT deal_transcripts_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.deal_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS policies matching the pattern from buyer_transcripts
CREATE POLICY "Users can view transcripts in their trackers"
ON public.deal_transcripts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM deals
  JOIN industry_trackers ON industry_trackers.id = deals.tracker_id
  WHERE deals.id = deal_transcripts.deal_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can create transcripts in their trackers"
ON public.deal_transcripts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM deals
  JOIN industry_trackers ON industry_trackers.id = deals.tracker_id
  WHERE deals.id = deal_transcripts.deal_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can update transcripts in their trackers"
ON public.deal_transcripts FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM deals
  JOIN industry_trackers ON industry_trackers.id = deals.tracker_id
  WHERE deals.id = deal_transcripts.deal_id
  AND industry_trackers.user_id = auth.uid()
));

CREATE POLICY "Users can delete transcripts in their trackers"
ON public.deal_transcripts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM deals
  JOIN industry_trackers ON industry_trackers.id = deals.tracker_id
  WHERE deals.id = deal_transcripts.deal_id
  AND industry_trackers.user_id = auth.uid()
));

-- Create storage bucket for deal transcripts
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-transcripts', 'deal-transcripts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for deal transcripts
CREATE POLICY "Users can upload deal transcripts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deal-transcripts' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view deal transcripts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deal-transcripts'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete deal transcripts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'deal-transcripts'
  AND auth.uid() IS NOT NULL
);