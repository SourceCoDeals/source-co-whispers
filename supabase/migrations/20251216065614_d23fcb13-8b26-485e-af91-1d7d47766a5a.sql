-- Create storage bucket for call transcripts
INSERT INTO storage.buckets (id, name, public)
VALUES ('call-transcripts', 'call-transcripts', false);

-- Allow authenticated users to upload transcripts
CREATE POLICY "Anyone can upload transcripts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'call-transcripts');

-- Allow anyone to view transcripts
CREATE POLICY "Anyone can view transcripts"
ON storage.objects FOR SELECT
USING (bucket_id = 'call-transcripts');

-- Allow anyone to delete transcripts
CREATE POLICY "Anyone can delete transcripts"
ON storage.objects FOR DELETE
USING (bucket_id = 'call-transcripts');

-- Create a table to track transcript entries
CREATE TABLE public.buyer_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  transcript_type TEXT NOT NULL DEFAULT 'link', -- 'link' or 'file'
  url TEXT, -- external link or storage path
  notes TEXT,
  call_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_transcripts ENABLE ROW LEVEL SECURITY;

-- Allow public access (since app doesn't require auth currently)
CREATE POLICY "Public read access" ON public.buyer_transcripts FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.buyer_transcripts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.buyer_transcripts FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.buyer_transcripts FOR DELETE USING (true);