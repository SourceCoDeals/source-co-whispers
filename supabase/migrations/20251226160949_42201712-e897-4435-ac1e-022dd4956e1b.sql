-- Phase 2: Add Industry KPI Configuration Support
-- This enables industry-adaptive scoring by allowing each tracker to define custom KPIs

-- Add kpi_scoring_config to industry_trackers for defining industry-specific KPIs
ALTER TABLE public.industry_trackers ADD COLUMN IF NOT EXISTS kpi_scoring_config JSONB DEFAULT NULL;

-- Add industry_kpis to deals for storing industry-specific deal data
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS industry_kpis JSONB DEFAULT NULL;

-- Add industry templates column for pre-built industry configs
ALTER TABLE public.industry_trackers ADD COLUMN IF NOT EXISTS industry_template TEXT DEFAULT NULL;

-- Add primary_focus to service_criteria for dynamic primary service detection
-- (This will be stored as part of service_criteria JSONB: { primary_focus: [...], excluded_services: [...] })

COMMENT ON COLUMN public.industry_trackers.kpi_scoring_config IS 'Industry-specific KPI scoring rules. Structure: { kpis: [{ field_name, display_name, weight, scoring_rules: { ideal_range?, bonus_per_item?, penalty_below?, penalty_above? } }] }';
COMMENT ON COLUMN public.deals.industry_kpis IS 'Industry-specific deal data captured for KPI scoring. Structure: { field_name: value, ... }';
COMMENT ON COLUMN public.industry_trackers.industry_template IS 'Pre-built industry template name (e.g., "roofing", "collision_repair", "hvac")';
