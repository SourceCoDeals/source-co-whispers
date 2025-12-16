// SourceCo Domain Types

export interface IndustryTracker {
  id: string;
  user_id: string;
  industry_name: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  buyer_count?: number;
  deal_count?: number;
  intelligence_coverage?: number;
}

export interface Buyer {
  id: string;
  tracker_id: string;
  pe_firm_name: string;
  platform_company_name: string | null;
  platform_website: string | null;
  // Public data
  num_platforms: number | null;
  geographic_footprint: string[] | null;
  recent_acquisitions: { company: string; date: string }[] | null;
  portfolio_companies: string[] | null;
  services_offered: string | null;
  business_model: string | null;
  // Thesis/Intelligence data
  thesis_summary: string | null;
  geo_preferences: { preferred: string[]; avoided: string[] } | null;
  min_revenue: number | null;
  max_revenue: number | null;
  preferred_ebitda: number | null;
  service_mix_prefs: string | null;
  business_model_prefs: string | null;
  deal_breakers: string[] | null;
  addon_only: boolean;
  platform_only: boolean;
  thesis_confidence: 'High' | 'Medium' | 'Low' | null;
  last_call_date: string | null;
  call_history: { url: string; date: string }[] | null;
  key_quotes: string[] | null;
  created_at: string;
  data_last_updated: string;
  // Relations
  contacts?: BuyerContact[];
}

export interface BuyerContact {
  id: string;
  buyer_id: string;
  name: string;
  title: string | null;
  company_type: 'platform' | 'pe_firm' | null;
  priority_level: number | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  email_confidence: 'Verified' | 'Likely' | 'Guessed' | null;
  salesforce_id: string | null;
  last_contacted_date: string | null;
  fee_agreement_status: 'Active' | 'Expired' | 'None';
  created_at: string;
}

export interface Deal {
  id: string;
  tracker_id: string;
  deal_name: string;
  industry_type: string | null;
  geography: string[] | null;
  revenue: number | null;
  ebitda_percentage: number | null;
  service_mix: string | null;
  business_model: string | null;
  special_requirements: string | null;
  status: 'Active' | 'Closed' | 'Dead';
  created_at: string;
  updated_at: string;
}

export interface BuyerDealScore {
  id: string;
  buyer_id: string;
  deal_id: string;
  scored_at: string;
  geography_score: number | null;
  service_score: number | null;
  acquisition_score: number | null;
  portfolio_score: number | null;
  business_model_score: number | null;
  thesis_bonus: number;
  composite_score: number | null;
  fit_reasoning: string | null;
  data_completeness: 'High' | 'Medium' | 'Low' | null;
  selected_for_outreach: boolean;
  human_override_score: number | null;
  // Relations
  buyer?: Buyer;
}

export interface OutreachRecord {
  id: string;
  buyer_id: string;
  deal_id: string;
  contact_id: string | null;
  outreach_date: string | null;
  outreach_channel: 'LinkedIn' | 'Email' | 'Both' | null;
  custom_message: string | null;
  response_received: boolean;
  response_date: string | null;
  response_sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Auto-reply' | null;
  meeting_scheduled: boolean;
  meeting_date: string | null;
  deal_stage: 'Not Started' | 'Initial Contact' | 'Connected' | 'NDA Sent' | 'NDA Signed' | 'IOI' | 'LOI' | 'Due Diligence' | 'Closed' | 'Dead';
  pass_reason: string | null;
  outcome: 'Won' | 'Lost' | 'Passed' | 'Pending';
  notes: string | null;
  last_activity_date: string | null;
  created_at: string;
  // Relations
  buyer?: Buyer;
  contact?: BuyerContact;
}

// UI Helper Types
export type MatchQuality = 'high' | 'medium' | 'low';
export type IntelligenceCoverage = 'high' | 'medium' | 'low';

export function getMatchQuality(score: number): MatchQuality {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

export function getIntelligenceCoverage(buyer: Buyer): IntelligenceCoverage {
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

export function calculateIntelligencePercentage(buyer: Buyer): number {
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
