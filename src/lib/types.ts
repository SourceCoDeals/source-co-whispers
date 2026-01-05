// SourceCo Domain Types
// Comprehensive TypeScript types for the entire platform

// ============================================================
// CORE ENTITY TYPES
// ============================================================

export interface IndustryTracker {
  id: string;
  user_id: string;
  industry_name: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  // Criteria fields
  fit_criteria: string | null;
  fit_criteria_size: string | null;
  fit_criteria_service: string | null;
  fit_criteria_geography: string | null;
  fit_criteria_buyer_types: string | null;
  // Structured criteria (JSONB)
  size_criteria: SizeCriteria | null;
  service_criteria: ServiceCriteria | null;
  geography_criteria: GeographyCriteria | null;
  buyer_types_criteria: BuyerTypesCriteria | null;
  // Weights
  service_mix_weight: number;
  geography_weight: number;
  size_weight: number;
  owner_goals_weight: number;
  // Scoring behavior
  scoring_behavior: ScoringBehavior | null;
  kpi_scoring_config: Record<string, unknown> | null;
  // M&A Guide
  ma_guide_content: string | null;
  ma_guide_generated_at: string | null;
  ma_guide_qa_context: Record<string, unknown> | null;
  // Documents
  documents: TrackerDocument[] | null;
  documents_analyzed_at: string | null;
  industry_template: string | null;
  // Computed fields (not in DB)
  buyer_count?: number;
  deal_count?: number;
  intelligent_count?: number;
}

export interface SizeCriteria {
  min_revenue?: string | number;
  max_revenue?: string | number;
  ideal_revenue?: string | number;
  min_ebitda?: string | number;
  max_ebitda?: string | number;
  ideal_ebitda?: string | number;
  min_locations?: string | number;
  max_locations?: string | number;
  notes?: string;
}

export interface ServiceCriteria {
  primary_focus?: string[];
  secondary_services?: string[];
  excluded_services?: string[];
  service_mix_notes?: string;
  notes?: string;
}

export interface GeographyCriteria {
  target_regions?: string[];
  target_states?: string[];
  excluded_regions?: string[];
  excluded_states?: string[];
  geographic_strategy?: string;
  notes?: string;
}

export interface BuyerTypesCriteria {
  preferred_types?: BuyerTypeConfig[];
  excluded_types?: string[];
  notes?: string;
}

export interface BuyerTypeConfig {
  type: string;
  min_locations?: number;
  min_revenue?: number;
  min_ebitda?: number;
  description?: string;
}

export interface ScoringBehavior {
  size?: {
    strictness: 'strict' | 'moderate' | 'lenient';
    below_minimum_behavior: 'disqualify' | 'penalize';
    single_location_penalty: boolean;
  };
  services?: {
    matching_mode: 'exact' | 'semantic';
    require_primary_focus_match: boolean;
    excluded_services_are_dealbreakers: boolean;
  };
  geography?: {
    strictness: 'strict' | 'moderate' | 'lenient';
    proximity_miles: number;
    multi_location_rule: 'national' | 'regional' | 'local';
    single_location_rule: 'same_state' | 'adjacent_states' | 'same_region';
    allow_national_for_attractive_deals: boolean;
  };
  engagement?: {
    weight_multiplier: number;
    override_geography: boolean;
    override_size: boolean;
  };
}

export interface TrackerDocument {
  name: string;
  url: string;
  type: string;
  uploadedAt: string;
}

// ============================================================
// BUYER TYPES
// ============================================================

export interface Buyer {
  id: string;
  tracker_id: string;
  pe_firm_name: string;
  pe_firm_website: string | null;
  pe_firm_linkedin: string | null;
  platform_company_name: string | null;
  platform_website: string | null;
  buyer_linkedin: string | null;
  // HQ Location
  hq_city: string | null;
  hq_state: string | null;
  hq_country: string | null;
  hq_region: string | null;
  other_office_locations: string[] | null;
  // Business Profile
  business_summary: string | null;
  industry_vertical: string | null;
  business_type: string | null;
  services_offered: string | null;
  business_model: string | null;
  revenue_model: string | null;
  go_to_market_strategy: string | null;
  specialized_focus: string | null;
  // Size & Acquisitions
  num_platforms: number | null;
  total_acquisitions: number | null;
  last_acquisition_date: string | null;
  acquisition_frequency: string | null;
  acquisition_appetite: string | null;
  acquisition_timeline: string | null;
  recent_acquisitions: AcquisitionRecord[] | null;
  portfolio_companies: string[] | null;
  // Target Criteria
  min_revenue: number | null;
  max_revenue: number | null;
  revenue_sweet_spot: number | null;
  min_ebitda: number | null;
  max_ebitda: number | null;
  ebitda_sweet_spot: number | null;
  preferred_ebitda: number | null;
  target_geographies: string[] | null;
  geographic_footprint: string[] | null;
  geographic_exclusions: string[] | null;
  acquisition_geography: string[] | null;
  service_regions: string[] | null;
  target_services: string[] | null;
  target_industries: string[] | null;
  industry_exclusions: string[] | null;
  required_capabilities: string[] | null;
  target_business_model: string | null;
  business_model_exclusions: string[] | null;
  // Customer Profile
  primary_customer_size: string | null;
  customer_industries: string[] | null;
  customer_geographic_reach: string | null;
  target_customer_profile: string | null;
  target_customer_size: string | null;
  target_customer_industries: string[] | null;
  target_customer_geography: string | null;
  // Thesis & Intelligence
  thesis_summary: string | null;
  thesis_confidence: 'High' | 'Medium' | 'Low' | null;
  strategic_priorities: string | null;
  service_mix_prefs: string | null;
  business_model_prefs: string | null;
  deal_breakers: string[] | null;
  key_quotes: string[] | null;
  geo_preferences: GeoPreferences | null;
  operating_locations: OperatingLocation[] | null;
  extraction_evidence: Record<string, unknown> | null;
  extraction_sources: Record<string, FieldSource> | null;
  // Owner Requirements
  owner_roll_requirement: string | null;
  owner_transition_goals: string | null;
  employee_owner: string | null;
  addon_only: boolean | null;
  platform_only: boolean | null;
  // Fee Agreement
  has_fee_agreement: boolean | null;
  fee_agreement_status: 'Active' | 'Expired' | 'None' | null;
  // Call History
  last_call_date: string | null;
  call_history: CallRecord[] | null;
  // Timestamps
  created_at: string;
  data_last_updated: string;
  // Relations (computed)
  contacts?: BuyerContact[];
}

export interface AcquisitionRecord {
  company: string;
  date?: string;
  location?: string;
  description?: string;
}

export interface GeoPreferences {
  preferred?: string[];
  avoided?: string[];
  notes?: string;
}

export interface OperatingLocation {
  state?: string;
  city?: string;
  region?: string;
}

export interface FieldSource {
  source: 'transcript' | 'notes' | 'website' | 'csv' | 'manual';
  updated_at: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface CallRecord {
  url?: string;
  date?: string;
  notes?: string;
}

// ============================================================
// CONTACT TYPES
// ============================================================

export interface BuyerContact {
  id: string;
  buyer_id: string;
  name: string;
  title: string | null;
  company_type: string | null;
  role_category: string | null;
  priority_level: number | null;
  is_primary_contact: boolean | null;
  is_deal_team: boolean | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  email_confidence: 'Verified' | 'Likely' | 'Guessed' | null;
  salesforce_id: string | null;
  last_contacted_date: string | null;
  fee_agreement_status: 'Active' | 'Expired' | 'None' | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

export interface PEFirmContact {
  id: string;
  pe_firm_id: string;
  name: string;
  title: string | null;
  role_category: string | null;
  priority_level: number | null;
  is_primary_contact: boolean | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  email_confidence: string | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

export interface PlatformContact {
  id: string;
  platform_id: string;
  name: string;
  title: string | null;
  role_category: string | null;
  priority_level: number | null;
  is_primary_contact: boolean | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  email_confidence: string | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

// ============================================================
// DEAL TYPES
// ============================================================

export interface Deal {
  id: string;
  tracker_id: string;
  company_id: string | null;
  deal_name: string;
  status: string | null;
  deal_score: number | null;
  // Company Info
  company_website: string | null;
  company_overview: string | null;
  company_address: string | null;
  headquarters: string | null;
  industry_type: string | null;
  founded_year: number | null;
  employee_count: number | null;
  location_count: number | null;
  ownership_structure: string | null;
  // Financials
  revenue: number | null;
  revenue_confidence: string | null;
  revenue_is_inferred: boolean | null;
  revenue_source_quote: string | null;
  ebitda_amount: number | null;
  ebitda_percentage: number | null;
  ebitda_confidence: string | null;
  ebitda_is_inferred: boolean | null;
  ebitda_source_quote: string | null;
  financial_notes: string | null;
  financial_followup_questions: string[] | null;
  // Services & Geography
  geography: string[] | null;
  service_mix: string | null;
  business_model: string | null;
  // Customers
  end_market_customers: string | null;
  customer_concentration: string | null;
  customer_geography: string | null;
  // Owner & Requirements
  owner_goals: string | null;
  special_requirements: string | null;
  // Contact
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_linkedin: string | null;
  // Additional Info
  additional_info: string | null;
  transcript_link: string | null;
  key_risks: string[] | null;
  competitive_position: string | null;
  technology_systems: string | null;
  real_estate: string | null;
  growth_trajectory: string | null;
  // Industry KPIs (JSONB)
  industry_kpis: Record<string, unknown> | null;
  // Extraction
  extraction_sources: Record<string, FieldSource> | null;
  last_enriched_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================
// SCORING TYPES
// ============================================================

export interface BuyerDealScore {
  id: string;
  buyer_id: string;
  deal_id: string;
  scored_at: string;
  // Category Scores
  geography_score: number | null;
  service_score: number | null;
  acquisition_score: number | null;
  portfolio_score: number | null;
  business_model_score: number | null;
  thesis_bonus: number | null;
  composite_score: number | null;
  // Metadata
  fit_reasoning: string | null;
  data_completeness: 'High' | 'Medium' | 'Low' | null;
  // Actions
  selected_for_outreach: boolean | null;
  human_override_score: number | null;
  // Pass/Reject
  passed_on_deal: boolean | null;
  passed_at: string | null;
  pass_category: string | null;
  pass_reason: string | null;
  pass_notes: string | null;
  // Interest
  interested: boolean | null;
  interested_at: string | null;
  // Hidden
  hidden_from_deal: boolean | null;
  // Rejection (from RemoveReasonDialog)
  rejected_at: string | null;
  rejection_category: string | null;
  rejection_reason: string | null;
  rejection_notes: string | null;
}

export interface CategoryScore {
  score: number;
  reasoning: string;
  isDisqualified: boolean;
  disqualificationReason: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface AIBuyerScore {
  buyerId: string;
  buyerName: string;
  compositeScore: number;
  sizeScore: CategoryScore;
  geographyScore: CategoryScore;
  servicesScore: CategoryScore;
  ownerGoalsScore: CategoryScore;
  thesisBonus: number;
  overallReasoning: string;
  isDisqualified: boolean;
  disqualificationReasons: string[];
  dataCompleteness: 'High' | 'Medium' | 'Low';
  dataCompletenessPercent?: number;
  missingFields?: string[];
  criticalMissing?: string[];
  needsReview?: boolean;
  reviewReason?: string | null;
  dealAttractiveness: number;
}

// ============================================================
// PE FIRM & PLATFORM HIERARCHY TYPES
// ============================================================

export interface PEFirm {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  website: string | null;
  linkedin: string | null;
  hq_city: string | null;
  hq_state: string | null;
  hq_country: string | null;
  hq_region: string | null;
  num_platforms: number | null;
  portfolio_companies: string[] | null;
  has_fee_agreement: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Platform {
  id: string;
  pe_firm_id: string;
  name: string;
  domain: string;
  website: string | null;
  linkedin: string | null;
  // All fields from Buyer that apply to platforms
  hq_city: string | null;
  hq_state: string | null;
  hq_country: string | null;
  business_summary: string | null;
  services_offered: string | null;
  thesis_summary: string | null;
  thesis_confidence: string | null;
  target_geographies: string[] | null;
  geographic_footprint: string[] | null;
  min_revenue: number | null;
  max_revenue: number | null;
  min_ebitda: number | null;
  max_ebitda: number | null;
  has_fee_agreement: boolean | null;
  created_at: string;
  updated_at: string;
  data_last_updated: string;
}

export interface TrackerBuyer {
  id: string;
  tracker_id: string;
  pe_firm_id: string;
  platform_id: string | null;
  fee_agreement_status: string | null;
  added_at: string;
}

// ============================================================
// OUTREACH TYPES
// ============================================================

export interface OutreachRecord {
  id: string;
  buyer_id: string;
  deal_id: string;
  contact_id: string | null;
  outreach_date: string | null;
  outreach_channel: 'LinkedIn' | 'Email' | 'Both' | null;
  custom_message: string | null;
  response_received: boolean | null;
  response_date: string | null;
  response_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Auto-reply' | null;
  meeting_scheduled: boolean | null;
  meeting_date: string | null;
  deal_stage: string | null;
  pass_reason: string | null;
  outcome: 'Won' | 'Lost' | 'Passed' | 'Pending' | null;
  notes: string | null;
  last_activity_date: string | null;
  created_at: string;
}

// ============================================================
// TRANSCRIPT & INTELLIGENCE TYPES
// ============================================================

export interface DealTranscript {
  id: string;
  deal_id: string;
  title: string;
  transcript_type: 'link' | 'upload' | 'notes';
  url: string | null;
  notes: string | null;
  call_date: string | null;
  extracted_data: Record<string, unknown> | null;
  extraction_evidence: Record<string, unknown> | null;
  processed_at: string | null;
  created_at: string;
}

export interface BuyerTranscript {
  id: string;
  buyer_id: string;
  title: string;
  transcript_type: string;
  url: string | null;
  notes: string | null;
  call_date: string | null;
  extracted_data: Record<string, unknown> | null;
  extraction_evidence: Record<string, unknown> | null;
  processed_at: string | null;
  created_at: string;
}

// ============================================================
// UI HELPER TYPES & FUNCTIONS
// ============================================================

export type MatchQuality = 'high' | 'medium' | 'low';
export type IntelligenceCoverage = 'high' | 'medium' | 'low';
export type ViewMode = 'all' | 'pe_firms' | 'platforms';

export function getMatchQuality(score: number): MatchQuality {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

export function getIntelligenceCoverage(buyer: Partial<Buyer>): IntelligenceCoverage {
  const fields = [
    buyer.thesis_summary,
    buyer.geo_preferences,
    buyer.min_revenue,
    buyer.max_revenue,
    buyer.preferred_ebitda,
    buyer.service_mix_prefs,
    buyer.business_model_prefs,
    buyer.deal_breakers,
  ];
  
  const filledFields = fields.filter(f => f !== null && f !== undefined && (Array.isArray(f) ? f.length > 0 : true)).length;
  const coverage = filledFields / fields.length;
  
  if (coverage >= 0.7) return 'high';
  if (coverage >= 0.4) return 'medium';
  return 'low';
}

export function calculateIntelligencePercentage(buyer: Partial<Buyer>): number {
  const fields = [
    buyer.thesis_summary,
    buyer.geo_preferences,
    buyer.min_revenue,
    buyer.max_revenue,
    buyer.preferred_ebitda,
    buyer.service_mix_prefs,
    buyer.business_model_prefs,
    buyer.deal_breakers,
  ];
  
  const filledFields = fields.filter(f => f !== null && f !== undefined && (Array.isArray(f) ? f.length > 0 : true)).length;
  return Math.round((filledFields / fields.length) * 100);
}

// ============================================================
// ENRICHMENT PROGRESS TYPES
// ============================================================

export interface EnrichmentProgress {
  processedIds: string[];
  startedAt: string;
  lastUpdatedAt: string;
}

export interface BulkOperationProgress {
  current: number;
  total: number;
  status?: 'running' | 'paused' | 'complete' | 'error';
  message?: string;
}

// ============================================================
// DEDUPLICATION TYPES
// ============================================================

export interface DedupeGroup {
  key: string;
  matchType: 'domain' | 'name';
  count: number;
  platformNames: string[];
  peFirmNames: string[];
  mergedPeFirmName: string;
  keeperName: string;
}

export interface DedupePreview {
  duplicateGroups: DedupeGroup[];
  stats: {
    groupsFound: number;
    totalDuplicates: number;
  };
}
