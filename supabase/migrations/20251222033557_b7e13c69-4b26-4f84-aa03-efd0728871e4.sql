-- Create storage bucket for tracker documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tracker-documents', 'tracker-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for tracker documents
CREATE POLICY "Users can upload tracker documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tracker-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view tracker documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tracker-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their tracker documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'tracker-documents' AND auth.uid() IS NOT NULL);

-- Add documents column to industry_trackers
ALTER TABLE public.industry_trackers 
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;