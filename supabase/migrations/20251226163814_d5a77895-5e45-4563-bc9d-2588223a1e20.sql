-- Add scoring_behavior JSONB field to industry_trackers
-- This allows industry-specific configuration of how scoring factors behave
-- e.g., geography strictness varies: auto repair needs proximity, software doesn't

ALTER TABLE public.industry_trackers 
ADD COLUMN IF NOT EXISTS scoring_behavior JSONB DEFAULT '{
  "geography": {
    "strictness": "moderate",
    "single_location_rule": "adjacent_states",
    "multi_location_rule": "regional",
    "proximity_miles": 100,
    "allow_national_for_attractive_deals": true
  },
  "size": {
    "strictness": "strict",
    "below_minimum_behavior": "penalize",
    "single_location_penalty": true
  },
  "services": {
    "matching_mode": "semantic",
    "require_primary_focus_match": true,
    "excluded_services_are_dealbreakers": true
  },
  "engagement": {
    "override_geography": true,
    "override_size": false,
    "weight_multiplier": 1.0
  }
}'::jsonb;

-- Add comment explaining the field
COMMENT ON COLUMN public.industry_trackers.scoring_behavior IS 'Industry-specific scoring configuration: geography strictness (strict/moderate/relaxed), size rules, service matching behavior, engagement overrides';