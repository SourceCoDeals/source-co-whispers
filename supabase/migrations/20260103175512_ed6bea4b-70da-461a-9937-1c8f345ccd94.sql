-- Add validation function for criteria JSONB fields
-- This provides warnings (not blocking) when criteria are incomplete

CREATE OR REPLACE FUNCTION public.validate_tracker_criteria()
RETURNS TRIGGER AS $$
DECLARE
  has_primary_focus boolean := false;
  has_size_criteria boolean := false;
  service_criteria jsonb;
  size_criteria jsonb;
BEGIN
  -- Check service_criteria for primary_focus
  service_criteria := NEW.service_criteria;
  IF service_criteria IS NOT NULL AND service_criteria ? 'primary_focus' THEN
    IF jsonb_typeof(service_criteria->'primary_focus') = 'array' AND 
       jsonb_array_length(service_criteria->'primary_focus') > 0 THEN
      has_primary_focus := true;
    END IF;
  END IF;
  
  -- Check size_criteria for at least one threshold
  size_criteria := NEW.size_criteria;
  IF size_criteria IS NOT NULL THEN
    IF (size_criteria->>'min_revenue' IS NOT NULL AND size_criteria->>'min_revenue' != '') OR
       (size_criteria->>'min_ebitda' IS NOT NULL AND size_criteria->>'min_ebitda' != '') OR
       (size_criteria->>'min_locations' IS NOT NULL AND size_criteria->>'min_locations' != '') THEN
      has_size_criteria := true;
    END IF;
  END IF;
  
  -- Log warnings (non-blocking)
  IF NOT has_primary_focus THEN
    RAISE WARNING 'Tracker % missing primary_focus in service_criteria - scoring accuracy may be reduced', NEW.id;
  END IF;
  
  IF NOT has_size_criteria THEN
    RAISE WARNING 'Tracker % missing size thresholds in size_criteria - cannot filter by size', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for criteria validation
DROP TRIGGER IF EXISTS validate_tracker_criteria_trigger ON industry_trackers;
CREATE TRIGGER validate_tracker_criteria_trigger
  BEFORE INSERT OR UPDATE ON industry_trackers
  FOR EACH ROW EXECUTE FUNCTION validate_tracker_criteria();

-- Add indexes for common JSONB queries on criteria
CREATE INDEX IF NOT EXISTS idx_trackers_service_primary_focus 
  ON industry_trackers USING GIN ((service_criteria->'primary_focus'));

CREATE INDEX IF NOT EXISTS idx_trackers_buyer_types 
  ON industry_trackers USING GIN ((buyer_types_criteria->'buyer_types'));

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_tracker_criteria() IS 
  'Validates tracker criteria on insert/update. Issues warnings for incomplete criteria that may affect scoring accuracy.';
