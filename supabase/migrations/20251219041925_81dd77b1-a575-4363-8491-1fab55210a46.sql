-- Add location_count to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS location_count INTEGER DEFAULT 1;

-- Add operating_locations to buyers for future 100-mile rule
ALTER TABLE public.buyers 
ADD COLUMN IF NOT EXISTS operating_locations JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.deals.location_count IS 'Number of physical locations. Single location deals require buyer within 100 miles.';
COMMENT ON COLUMN public.buyers.operating_locations IS 'Array of locations: [{city, state, lat, lng}] for precise distance calculations';