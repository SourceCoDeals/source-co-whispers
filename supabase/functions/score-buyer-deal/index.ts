import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// State adjacency map for US states
const stateAdjacency: Record<string, string[]> = {
  AL: ["FL", "GA", "MS", "TN"],
  AK: [],
  AZ: ["CA", "CO", "NM", "NV", "UT"],
  AR: ["LA", "MO", "MS", "OK", "TN", "TX"],
  CA: ["AZ", "NV", "OR"],
  CO: ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"],
  CT: ["MA", "NY", "RI"],
  DE: ["MD", "NJ", "PA"],
  FL: ["AL", "GA"],
  GA: ["AL", "FL", "NC", "SC", "TN"],
  HI: [],
  ID: ["MT", "NV", "OR", "UT", "WA", "WY"],
  IL: ["IA", "IN", "KY", "MO", "WI"],
  IN: ["IL", "KY", "MI", "OH"],
  IA: ["IL", "MN", "MO", "NE", "SD", "WI"],
  KS: ["CO", "MO", "NE", "OK"],
  KY: ["IL", "IN", "MO", "OH", "TN", "VA", "WV"],
  LA: ["AR", "MS", "TX"],
  ME: ["NH"],
  MD: ["DE", "PA", "VA", "WV"],
  MA: ["CT", "NH", "NY", "RI", "VT"],
  MI: ["IN", "OH", "WI"],
  MN: ["IA", "ND", "SD", "WI"],
  MS: ["AL", "AR", "LA", "TN"],
  MO: ["AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN"],
  MT: ["ID", "ND", "SD", "WY"],
  NE: ["CO", "IA", "KS", "MO", "SD", "WY"],
  NV: ["AZ", "CA", "ID", "OR", "UT"],
  NH: ["MA", "ME", "VT"],
  NJ: ["DE", "NY", "PA"],
  NM: ["AZ", "CO", "OK", "TX", "UT"],
  NY: ["CT", "MA", "NJ", "PA", "VT"],
  NC: ["GA", "SC", "TN", "VA"],
  ND: ["MN", "MT", "SD"],
  OH: ["IN", "KY", "MI", "PA", "WV"],
  OK: ["AR", "CO", "KS", "MO", "NM", "TX"],
  OR: ["CA", "ID", "NV", "WA"],
  PA: ["DE", "MD", "NJ", "NY", "OH", "WV"],
  RI: ["CT", "MA"],
  SC: ["GA", "NC"],
  SD: ["IA", "MN", "MT", "ND", "NE", "WY"],
  TN: ["AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA"],
  TX: ["AR", "LA", "NM", "OK"],
  UT: ["AZ", "CO", "ID", "NM", "NV", "WY"],
  VT: ["MA", "NH", "NY"],
  VA: ["KY", "MD", "NC", "TN", "WV"],
  WA: ["ID", "OR"],
  WV: ["KY", "MD", "OH", "PA", "VA"],
  WI: ["IA", "IL", "MI", "MN"],
  WY: ["CO", "ID", "MT", "NE", "SD", "UT"],
};

// Regional definitions for broader geographic matching
const stateRegions: Record<string, string[]> = {
  SOUTHWEST: ["AZ", "NM", "TX", "OK", "CO", "NV", "UT"],
  SOUTHEAST: ["FL", "GA", "AL", "SC", "NC", "TN", "MS", "LA", "AR", "KY", "VA", "WV"],
  NORTHEAST: ["NY", "NJ", "PA", "CT", "MA", "RI", "VT", "NH", "ME", "MD", "DE"],
  MIDWEST: ["IL", "IN", "OH", "MI", "WI", "MN", "IA", "MO", "KS", "NE", "SD", "ND"],
  PACIFIC: ["CA", "OR", "WA", "AK", "HI"],
  MOUNTAIN: ["MT", "ID", "WY", "CO", "UT", "NV"],
  PACIFIC_NORTHWEST: ["WA", "OR", "ID"],
  TEXAS: ["TX"],
  FLORIDA: ["FL"],
  CALIFORNIA: ["CA"],
};

// Map regional keywords in thesis text to region names and states
const thesisRegionPatterns: Array<{ pattern: RegExp; region: string; states: string[] }> = [
  { pattern: /pacific\s+northwest/i, region: 'PACIFIC_NORTHWEST', states: ['WA', 'OR', 'ID'] },
  { pattern: /pnw/i, region: 'PACIFIC_NORTHWEST', states: ['WA', 'OR', 'ID'] },
  { pattern: /southeast\b/i, region: 'SOUTHEAST', states: ['FL', 'GA', 'AL', 'SC', 'NC', 'TN', 'MS', 'LA', 'AR', 'KY', 'VA', 'WV'] },
  { pattern: /northeast\b/i, region: 'NORTHEAST', states: ['NY', 'NJ', 'PA', 'CT', 'MA', 'RI', 'VT', 'NH', 'ME', 'MD', 'DE'] },
  { pattern: /midwest\b/i, region: 'MIDWEST', states: ['IL', 'IN', 'OH', 'MI', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'SD', 'ND'] },
  { pattern: /southwest\b/i, region: 'SOUTHWEST', states: ['AZ', 'NM', 'TX', 'OK', 'CO', 'NV', 'UT'] },
  { pattern: /mountain\s+west/i, region: 'MOUNTAIN', states: ['MT', 'ID', 'WY', 'CO', 'UT', 'NV'] },
  { pattern: /\btexas\b/i, region: 'TEXAS', states: ['TX'] },
  { pattern: /\bflorida\b/i, region: 'FLORIDA', states: ['FL'] },
  { pattern: /\bcalifornia\b/i, region: 'CALIFORNIA', states: ['CA'] },
  { pattern: /sun\s*belt/i, region: 'SUNBELT', states: ['FL', 'GA', 'TX', 'AZ', 'NV', 'CA'] },
  { pattern: /rust\s*belt/i, region: 'RUSTBELT', states: ['PA', 'OH', 'MI', 'IN', 'IL', 'WI'] },
  { pattern: /new\s+england/i, region: 'NEW_ENGLAND', states: ['MA', 'CT', 'RI', 'VT', 'NH', 'ME'] },
  { pattern: /mid[- ]?atlantic/i, region: 'MID_ATLANTIC', states: ['NY', 'NJ', 'PA', 'MD', 'DE', 'VA'] },
  { pattern: /great\s+lakes/i, region: 'GREAT_LAKES', states: ['MI', 'WI', 'MN', 'IL', 'IN', 'OH'] },
];

// Phrases that indicate HARD geographic constraints (buyer won't consider deals outside)
const hardConstraintPhrases = [
  'focused on', 'only in', 'exclusively', 'limited to', 'regional platform',
  'building in', 'consolidating in', 'based in', 'targeting'
];

// Phrases that indicate SOFT constraints (preference but flexible)
const softConstraintPhrases = [
  'primarily', 'mainly', 'prefer', 'preference for', 'looking at', 'interested in'
];

// Extract explicit geographic focus from buyer's thesis
function extractThesisGeographicConstraints(thesis: string | null, keyQuotes: string[] | null): {
  hasExplicitRegionalFocus: boolean;
  focusedRegions: string[];
  focusedStates: string[];
  constraintStrength: 'hard' | 'soft' | 'none';
  evidence: string | null;
} {
  const result = {
    hasExplicitRegionalFocus: false,
    focusedRegions: [] as string[],
    focusedStates: [] as string[],
    constraintStrength: 'none' as 'hard' | 'soft' | 'none',
    evidence: null as string | null,
  };

  if (!thesis && (!keyQuotes || keyQuotes.length === 0)) return result;

  const allText = `${thesis || ''} ${(keyQuotes || []).join(' ')}`;
  const lower = allText.toLowerCase();

  // Check for regional patterns
  for (const { pattern, region, states } of thesisRegionPatterns) {
    if (pattern.test(allText)) {
      result.hasExplicitRegionalFocus = true;
      if (!result.focusedRegions.includes(region)) {
        result.focusedRegions.push(region);
      }
      for (const state of states) {
        if (!result.focusedStates.includes(state)) {
          result.focusedStates.push(state);
        }
      }
      // Capture evidence
      const match = allText.match(pattern);
      if (match) {
        result.evidence = match[0];
      }
    }
  }

  // Also extract explicit state mentions from thesis
  for (const [stateName, abbrev] of Object.entries(stateNameToAbbrev)) {
    if (lower.includes(stateName) && !result.focusedStates.includes(abbrev)) {
      result.focusedStates.push(abbrev);
      result.hasExplicitRegionalFocus = true;
    }
  }

  // Determine constraint strength
  if (result.hasExplicitRegionalFocus) {
    const hasHardConstraint = hardConstraintPhrases.some(phrase => lower.includes(phrase));
    const hasSoftConstraint = softConstraintPhrases.some(phrase => lower.includes(phrase));

    if (hasHardConstraint) {
      result.constraintStrength = 'hard';
    } else if (hasSoftConstraint) {
      result.constraintStrength = 'soft';
    } else {
      // Default to hard if they explicitly mention a region by name (e.g., "Pacific Northwest platform")
      result.constraintStrength = 'hard';
    }
  }

  return result;
}

// Get region for a state
function getStateRegion(state: string): string | null {
  for (const [region, states] of Object.entries(stateRegions)) {
    if (states.includes(state)) return region;
  }
  return null;
}

// Check if two states are in the same region
function areStatesInSameRegion(state1: string, state2: string): boolean {
  const region1 = getStateRegion(state1);
  const region2 = getStateRegion(state2);
  return region1 !== null && region1 === region2;
}

const stateNameToAbbrev: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
  "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
  "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
  "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
  "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
  "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
  "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
};

const allUSStates = Object.keys(stateAdjacency);

function normalizeState(state: string): string {
  if (!state) return "";
  const cleaned = state.trim().toUpperCase();
  if (cleaned.length === 2 && allUSStates.includes(cleaned)) return cleaned;
  const abbrev = stateNameToAbbrev[state.toLowerCase().trim()];
  return abbrev || "";
}

function extractStatesFromText(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const lower = text.toLowerCase();
  
  for (const [stateName, abbrev] of Object.entries(stateNameToAbbrev)) {
    if (lower.includes(stateName) && !found.includes(abbrev)) {
      found.push(abbrev);
    }
  }
  
  for (const abbrev of allUSStates) {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'i');
    if (regex.test(text) && !found.includes(abbrev)) {
      found.push(abbrev);
    }
  }
  
  return found;
}

function extractStatesFromGeography(geography: string[] | null): string[] {
  if (!geography) return [];
  const states: string[] = [];
  for (const geo of geography) {
    const extracted = extractStatesFromText(geo);
    if (extracted.length > 0) {
      states.push(...extracted);
    } else {
      const normalized = normalizeState(geo);
      if (normalized) states.push(normalized);
    }
  }
  return [...new Set(states)];
}

function getAdjacentStates(state: string): string[] {
  return stateAdjacency[state] || [];
}

interface Deal {
  id: string;
  deal_name: string;
  revenue: number | null;
  ebitda_amount: number | null;
  ebitda_percentage: number | null;
  location_count: number | null;
  geography: string[] | null;
  headquarters: string | null;
  service_mix: string | null;
  business_model: string | null;
  owner_goals: string | null;
  industry_type: string | null;
}

interface Buyer {
  id: string;
  pe_firm_name: string;
  platform_company_name: string | null;
  hq_state: string | null;
  hq_city: string | null;
  target_geographies: string[] | null;
  geographic_footprint: string[] | null;
  geographic_exclusions: string[] | null;
  service_regions: string[] | null;
  services_offered: string | null;
  target_services: string[] | null;
  service_mix_prefs: string | null;
  industry_exclusions: string[] | null;
  min_revenue: number | null;
  max_revenue: number | null;
  min_ebitda: number | null;
  max_ebitda: number | null;
  revenue_sweet_spot: number | null;
  ebitda_sweet_spot: number | null;
  owner_transition_goals: string | null;
  owner_roll_requirement: string | null;
  thesis_summary: string | null;
  acquisition_appetite: string | null;
  acquisition_frequency: string | null;
  total_acquisitions: number | null;
  last_acquisition_date: string | null;
  deal_breakers: string[] | null;
  key_quotes: string[] | null;
  business_model_prefs: string | null;
  business_model_exclusions: string[] | null;
  target_business_model: string | null;
}

interface ScoringBehavior {
  geography: {
    strictness: 'strict' | 'moderate' | 'relaxed';
    single_location_rule: 'same_state' | 'adjacent_states' | 'regional' | 'national';
    multi_location_rule: 'adjacent_states' | 'regional' | 'national';
    proximity_miles: number;
    allow_national_for_attractive_deals: boolean;
  };
  size: {
    strictness: 'strict' | 'moderate' | 'relaxed';
    below_minimum_behavior: 'disqualify' | 'penalize' | 'ignore';
    single_location_penalty: boolean;
  };
  services: {
    matching_mode: 'semantic' | 'keyword' | 'hybrid';
    require_primary_focus_match: boolean;
    excluded_services_are_dealbreakers: boolean;
  };
  engagement: {
    override_geography: boolean;
    override_size: boolean;
    weight_multiplier: number;
  };
}

const DEFAULT_SCORING_BEHAVIOR: ScoringBehavior = {
  geography: {
    strictness: 'moderate',
    single_location_rule: 'adjacent_states',
    multi_location_rule: 'regional',
    proximity_miles: 100,
    allow_national_for_attractive_deals: true,
  },
  size: {
    strictness: 'strict',
    below_minimum_behavior: 'penalize',
    single_location_penalty: true,
  },
  services: {
    matching_mode: 'semantic',
    require_primary_focus_match: true,
    excluded_services_are_dealbreakers: true,
  },
  engagement: {
    override_geography: true,
    override_size: false,
    weight_multiplier: 1.0,
  },
};

interface Tracker {
  id: string;
  industry_name: string;
  fit_criteria: string | null;
  geography_weight: number;
  service_mix_weight: number;
  size_weight: number;
  owner_goals_weight: number;
  service_criteria: {
    primary_focus?: string[];
    excluded_services?: string[];
    required_services?: string[];
    preferred_services?: string[];
  } | null;
  size_criteria: {
    min_revenue?: number;
    max_revenue?: number;
    min_ebitda?: number;
    max_ebitda?: number;
  } | null;
  geography_criteria: {
    required_regions?: string[];
    preferred_regions?: string[];
    excluded_regions?: string[];
  } | null;
  kpi_scoring_config: {
    kpis?: Array<{
      field_name: string;
      display_name: string;
      weight: number;
      scoring_rules: {
        ideal_range?: [number, number];
        penalty_below?: number;
        penalty_above?: number;
        bonus_per_item?: number;
        max_bonus?: number;
        boolean_bonus?: number;
      };
    }>;
  } | null;
  buyer_types_criteria: {
    buyer_types?: Array<{
      type_name: string;
      priority_order: number;
      description?: string;
      ownership_profile?: string;
      min_locations?: string;
      max_locations?: string;
      min_revenue_per_location?: string;
      min_ebitda?: string;
      max_ebitda?: string;
      ebitda_multiple_min?: string;
      ebitda_multiple_max?: string;
      min_sqft_per_location?: string;
      geographic_scope?: string;
      geographic_rules?: string;
      deal_requirements?: string;
      acquisition_style?: string;
      exclusions?: string;
      fit_notes?: string;
    }>;
  } | null;
  scoring_behavior: ScoringBehavior | null;
}

interface CategoryScore {
  score: number;
  reasoning: string;
  isDisqualified: boolean;
  disqualificationReason: string | null;
  confidence: 'high' | 'medium' | 'low';
}

interface EngagementSignals {
  hasCalls: boolean;
  siteVisitRequested: boolean;
  financialsRequested: boolean;
  ceoInvolved: boolean;
  personalConnection: boolean;
  expressedInterest: boolean;
  engagementScore: number;
  signals: string[];
}

interface BuyerScore {
  buyerId: string;
  buyerName: string;
  compositeScore: number;
  sizeScore: CategoryScore;
  geographyScore: CategoryScore;
  servicesScore: CategoryScore;
  ownerGoalsScore: CategoryScore;
  thesisBonus: number;
  engagementBonus: number;
  customBonus: number;
  learningPenalty: number;
  overallReasoning: string;
  isDisqualified: boolean;
  disqualificationReasons: string[];
  needsReview: boolean;
  reviewReason: string | null;
  dataCompleteness: 'High' | 'Medium' | 'Low';
  dealAttractiveness: number;
  engagementSignals: EngagementSignals;
}

interface ParsedRule {
  type: 'service_adjustment' | 'geography_adjustment' | 'size_adjustment' | 'owner_goals_adjustment' | 'disqualify' | 'bonus';
  condition: string;
  target: string;
  action: 'bonus' | 'penalty' | 'disqualify';
  points: number;
  reasoning: string;
}

interface ParsedInstructions {
  rules: ParsedRule[];
  summary: string;
  keywords: string[];
}

// Apply custom scoring instructions from user
function applyCustomInstructions(
  buyer: Buyer, 
  deal: Deal, 
  parsedInstructions: ParsedInstructions | null
): { bonus: number; reasoning: string[]; disqualify: boolean; disqualifyReason: string | null } {
  const result = { bonus: 0, reasoning: [] as string[], disqualify: false, disqualifyReason: null as string | null };
  
  if (!parsedInstructions?.rules || parsedInstructions.rules.length === 0) {
    return result;
  }

  const buyerText = `${buyer.thesis_summary || ''} ${buyer.services_offered || ''} ${buyer.service_mix_prefs || ''} ${(buyer.target_services || []).join(' ')} ${(buyer.key_quotes || []).join(' ')}`.toLowerCase();
  
  for (const rule of parsedInstructions.rules) {
    const target = rule.target.toLowerCase();
    const keywords = parsedInstructions.keywords || [];
    
    // Check if buyer matches the rule condition
    let matches = false;
    
    // Simple keyword matching for now
    if (rule.condition.includes('buyer_comfortable_without') || rule.condition.includes('buyer_lacks_preference')) {
      // Buyer is comfortable WITHOUT the target (e.g., DRP)
      // Check if buyer doesn't strongly prefer the target
      const mentionsTarget = buyerText.includes(target) || keywords.some(k => buyerText.includes(k.toLowerCase()));
      const requiresTarget = buyerText.includes(`require ${target}`) || 
                             buyerText.includes(`requires ${target}`) || 
                             buyerText.includes(`${target} required`) ||
                             buyerText.includes(`only ${target}`);
      matches = !requiresTarget;
    } else if (rule.condition.includes('buyer_prefers') || rule.condition.includes('buyer_requires')) {
      // Buyer prefers/requires the target
      matches = buyerText.includes(target) || keywords.some(k => buyerText.includes(k.toLowerCase()));
    } else if (rule.condition.includes('buyer_has')) {
      matches = buyerText.includes(target);
    } else {
      // Generic keyword match
      matches = keywords.some(k => buyerText.includes(k.toLowerCase())) || buyerText.includes(target);
    }
    
    if (matches) {
      if (rule.action === 'disqualify') {
        result.disqualify = true;
        result.disqualifyReason = rule.reasoning;
      } else {
        result.bonus += rule.points;
        result.reasoning.push(rule.reasoning);
      }
    }
  }
  
  return result;
}

// Calculate deal attractiveness score (0-100) based on revenue, locations, margins
function calculateDealAttractiveness(deal: Deal): number {
  let score = 50; // Baseline
  
  // Revenue contribution (0-30 points)
  if (deal.revenue) {
    if (deal.revenue >= 20) score += 30; // $20M+ is highly attractive
    else if (deal.revenue >= 10) score += 25;
    else if (deal.revenue >= 5) score += 20;
    else if (deal.revenue >= 2) score += 15;
    else score += 10;
  }
  
  // Location count contribution (0-20 points)
  const locations = deal.location_count || 1;
  if (locations >= 10) score += 20;
  else if (locations >= 5) score += 15;
  else if (locations >= 3) score += 10;
  else score += 5;
  
  // EBITDA margin contribution (0-20 points)
  if (deal.ebitda_percentage) {
    if (deal.ebitda_percentage >= 25) score += 20;
    else if (deal.ebitda_percentage >= 20) score += 15;
    else if (deal.ebitda_percentage >= 15) score += 10;
    else score += 5;
  } else if (deal.ebitda_amount && deal.revenue) {
    const margin = (deal.ebitda_amount / deal.revenue) * 100;
    if (margin >= 25) score += 20;
    else if (margin >= 20) score += 15;
    else if (margin >= 15) score += 10;
    else score += 5;
  }
  
  return Math.min(100, score);
}

// Analyze engagement signals from call intelligence data
function analyzeEngagementSignals(callIntelligence: any[] | null): EngagementSignals {
  const signals: EngagementSignals = {
    hasCalls: false,
    siteVisitRequested: false,
    financialsRequested: false,
    ceoInvolved: false,
    personalConnection: false,
    expressedInterest: false,
    engagementScore: 0,
    signals: [],
  };

  if (!callIntelligence || callIntelligence.length === 0) {
    return signals;
  }

  signals.hasCalls = true;
  signals.signals.push(`${callIntelligence.length} call(s) on record`);
  signals.engagementScore += 10;

  // Analyze each call record
  for (const call of callIntelligence) {
    const summary = (call.call_summary || "").toLowerCase();
    const takeaways = (call.key_takeaways || []).join(" ").toLowerCase();
    const extractedData = call.extracted_data || {};
    const allText = `${summary} ${takeaways} ${JSON.stringify(extractedData)}`.toLowerCase();

    // Site visit signals
    const siteVisitPatterns = [
      'site visit', 'come see', 'visit the', 'tour', 'see the facilities',
      'walk through', 'come out', 'fly out', "love to come", "want to come",
      "see your shop", "see the shop", "visit your"
    ];
    if (siteVisitPatterns.some(p => allText.includes(p))) {
      signals.siteVisitRequested = true;
      if (!signals.signals.includes("Site visit requested")) {
        signals.signals.push("Site visit requested");
        signals.engagementScore += 25;
      }
    }

    // Financials requested signals
    const financialPatterns = [
      'financial', 'financials', 'updated numbers', 'p&l', 'profit and loss',
      'ebitda', 'revenue', 'send me the', 'get me the', 'updated information',
      'cim', 'confidential information', 'teaser', 'deck', 'materials'
    ];
    if (financialPatterns.some(p => allText.includes(p))) {
      signals.financialsRequested = true;
      if (!signals.signals.includes("Financials/materials requested")) {
        signals.signals.push("Financials/materials requested");
        signals.engagementScore += 20;
      }
    }

    // CEO/Partner involvement signals
    const ceoPatterns = [
      'ceo', 'partner', 'managing director', 'founder', 'owner', 'principal',
      'decision maker', 'managing partner', 'senior partner', 'investment committee',
      'ic', 'deal team lead'
    ];
    if (ceoPatterns.some(p => allText.includes(p))) {
      signals.ceoInvolved = true;
      if (!signals.signals.includes("Senior leadership involved")) {
        signals.signals.push("Senior leadership involved");
        signals.engagementScore += 15;
      }
    }

    // Personal connection signals
    const personalPatterns = [
      'wife', 'husband', 'family', 'grew up', 'from there', 'know the area',
      'personal connection', 'familiar with', 'spent time', 'used to live',
      'my dad', 'my mom', 'my brother', 'my sister', 'in-laws', 'hometown'
    ];
    if (personalPatterns.some(p => allText.includes(p))) {
      signals.personalConnection = true;
      if (!signals.signals.includes("Personal connection to area")) {
        signals.signals.push("Personal connection to area");
        signals.engagementScore += 15;
      }
    }

    // Express interest signals
    const interestPatterns = [
      'very interested', 'love this', 'perfect fit', 'exactly what',
      'been looking for', 'great opportunity', 'move quickly', 'priority',
      'top of our list', 'excited about', 'definitely interested',
      'want to pursue', 'strong interest'
    ];
    if (interestPatterns.some(p => allText.includes(p))) {
      signals.expressedInterest = true;
      if (!signals.signals.includes("Strong interest expressed")) {
        signals.signals.push("Strong interest expressed");
        signals.engagementScore += 20;
      }
    }
  }

  signals.engagementScore = Math.min(100, signals.engagementScore);
  return signals;
}

// Buyer type constraints extracted from tracker's buyer_types_criteria
interface BuyerTypeConstraints {
  minLocations: number | null;
  maxLocations: number | null;
  minRevenue: number | null;
  minEbitda: number | null;
  maxEbitda: number | null;
  geographicScope: string | null;
}

// Assign best-fit buyer type based on tracker's buyer_types_criteria
// Returns the most suitable buyer type with match details AND the type's constraints
function assignBuyerType(buyer: Buyer, tracker: Tracker): { 
  buyerType: string | null; 
  isNational: boolean; 
  matchScore: number;
  matchDetails: string;
  constraints: BuyerTypeConstraints;
} {
  const buyerTypes = tracker.buyer_types_criteria?.buyer_types || [];
  
  const emptyConstraints: BuyerTypeConstraints = {
    minLocations: null,
    maxLocations: null,
    minRevenue: null,
    minEbitda: null,
    maxEbitda: null,
    geographicScope: null
  };
  
  if (buyerTypes.length === 0) {
    // Fallback to heuristic-based detection when no buyer types defined
    const heuristic = determineBuyerScaleHeuristic(buyer);
    return { ...heuristic, constraints: emptyConstraints };
  }
  
  let bestMatch: { type: any; score: number; details: string } | null = null;
  
  for (const buyerType of buyerTypes) {
    let matchScore = 0;
    const matchDetails: string[] = [];
    
    // 1. Geographic scope matching (0-30 points)
    const scope = buyerType.geographic_scope?.toLowerCase() || '';
    const buyerGeoCount = (buyer.target_geographies?.length || 0) + (buyer.geographic_footprint?.length || 0);
    
    if (scope.includes('national') || scope.includes('nationwide')) {
      if (buyerGeoCount > 5 || (buyer.total_acquisitions && buyer.total_acquisitions > 5)) {
        matchScore += 30;
        matchDetails.push('national scope match');
      } else if (buyerGeoCount > 3) {
        matchScore += 15;
        matchDetails.push('expanding regional');
      }
    } else if (scope.includes('regional')) {
      if (buyerGeoCount >= 2 && buyerGeoCount <= 8) {
        matchScore += 30;
        matchDetails.push('regional scope match');
      }
    } else if (scope.includes('local') || scope.includes('single')) {
      if (buyerGeoCount <= 2) {
        matchScore += 30;
        matchDetails.push('local scope match');
      }
    }
    
    // 2. Size criteria matching (0-30 points)
    const minEbitda = parseFloat(buyerType.min_ebitda || '0');
    const maxEbitda = parseFloat(buyerType.max_ebitda || '999');
    const buyerMinEbitda = buyer.min_ebitda || 0;
    const buyerMaxEbitda = buyer.max_ebitda || 999;
    
    // Check overlap between buyer's EBITDA range and buyer type's range
    if (buyerMinEbitda <= maxEbitda && buyerMaxEbitda >= minEbitda) {
      matchScore += 25;
      matchDetails.push('EBITDA range overlap');
    }
    
    // 3. Location count matching (0-20 points)
    const minLocs = parseInt(buyerType.min_locations || '0');
    const maxLocs = parseInt(buyerType.max_locations || '999');
    // Infer buyer's preferred location count from acquisition history
    const buyerAcquisitions = buyer.total_acquisitions || 0;
    const inferredScale = buyerAcquisitions > 10 ? 5 : buyerAcquisitions > 5 ? 3 : 1;
    
    if (inferredScale >= minLocs && inferredScale <= maxLocs) {
      matchScore += 20;
      matchDetails.push('location scale match');
    }
    
    // 4. Acquisition style matching (0-20 points)
    const style = buyerType.acquisition_style?.toLowerCase() || '';
    const buyerAppetite = buyer.acquisition_appetite?.toLowerCase() || '';
    const buyerFrequency = buyer.acquisition_frequency?.toLowerCase() || '';
    
    if (style.includes('active') && (buyerAppetite.includes('active') || buyerFrequency.includes('multiple'))) {
      matchScore += 20;
      matchDetails.push('active acquirer');
    } else if (style.includes('opportunistic') && (buyerAppetite.includes('opportunistic') || buyerAppetite.includes('selective'))) {
      matchScore += 15;
      matchDetails.push('opportunistic match');
    }
    
    if (!bestMatch || matchScore > bestMatch.score) {
      bestMatch = { type: buyerType, score: matchScore, details: matchDetails.join(', ') };
    }
  }
  
  if (bestMatch && bestMatch.score >= 30) {
    const isNational = bestMatch.type.geographic_scope?.toLowerCase().includes('national') || false;
    
    // Extract constraints from the matched buyer type
    const constraints: BuyerTypeConstraints = {
      minLocations: bestMatch.type.min_locations ? parseInt(bestMatch.type.min_locations) : null,
      maxLocations: bestMatch.type.max_locations ? parseInt(bestMatch.type.max_locations) : null,
      minRevenue: bestMatch.type.min_revenue_per_location ? parseFloat(bestMatch.type.min_revenue_per_location) : null,
      minEbitda: bestMatch.type.min_ebitda ? parseFloat(bestMatch.type.min_ebitda) : null,
      maxEbitda: bestMatch.type.max_ebitda ? parseFloat(bestMatch.type.max_ebitda) : null,
      geographicScope: bestMatch.type.geographic_scope || null
    };
    
    console.log(`[BuyerType] Matched "${buyer.pe_firm_name}" to type "${bestMatch.type.type_name}" (score: ${bestMatch.score}). Constraints: minLocs=${constraints.minLocations}, minEbitda=${constraints.minEbitda}`);
    
    return {
      buyerType: bestMatch.type.type_name,
      isNational,
      matchScore: bestMatch.score,
      matchDetails: bestMatch.details,
      constraints
    };
  }
  
  // Fallback if no good match
  const heuristic = determineBuyerScaleHeuristic(buyer);
  return { ...heuristic, constraints: emptyConstraints };
}

// Fallback heuristic-based buyer type detection
function determineBuyerScaleHeuristic(buyer: Buyer): {
  buyerType: string | null;
  isNational: boolean;
  matchScore: number;
  matchDetails: string;
} {
  const hasNationalPresence = 
    (buyer.target_geographies && buyer.target_geographies.length > 3) ||
    (buyer.geographic_footprint && buyer.geographic_footprint.length > 3);
  
  const isActiveAcquirer = buyer.total_acquisitions && buyer.total_acquisitions > 5;
  
  const mentionsNational = [
    buyer.thesis_summary,
    buyer.acquisition_appetite,
    buyer.services_offered
  ].some(text => text?.toLowerCase().includes('national') || text?.toLowerCase().includes('nationwide'));
  
  const isNational = hasNationalPresence || isActiveAcquirer || mentionsNational;
  
  return {
    buyerType: null,
    isNational,
    matchScore: 0,
    matchDetails: isNational ? 'heuristic: national indicators' : 'heuristic: regional/local indicators'
  };
}

// Legacy wrapper for backward compatibility - now also returns constraints
function determineBuyerScale(buyer: Buyer, tracker: Tracker): { 
  isNational: boolean; 
  buyerType: string | null;
  constraints: BuyerTypeConstraints;
} {
  const result = assignBuyerType(buyer, tracker);
  return { isNational: result.isNational, buyerType: result.buyerType, constraints: result.constraints };
}

// Get scoring behavior from tracker or use defaults
function getScoringBehavior(tracker: Tracker): ScoringBehavior {
  const behavior = tracker.scoring_behavior || DEFAULT_SCORING_BEHAVIOR;
  return {
    geography: { ...DEFAULT_SCORING_BEHAVIOR.geography, ...behavior.geography },
    size: { ...DEFAULT_SCORING_BEHAVIOR.size, ...behavior.size },
    services: { ...DEFAULT_SCORING_BEHAVIOR.services, ...behavior.services },
    engagement: { ...DEFAULT_SCORING_BEHAVIOR.engagement, ...behavior.engagement },
  };
}

// Score SIZE category - SIZE IS A GATING FACTOR
// When deal is too small for buyer, it should significantly limit the overall score
// Even if geography and services are perfect, a too-small deal is rarely a fit
// Now uses tracker's scoring_behavior for industry-specific rules
// NEW: Also enforces buyer_types_criteria constraints (minLocations, minEbitda, etc.)
function scoreSizeCategory(deal: Deal, buyer: Buyer, tracker: Tracker): CategoryScore & { sizeMultiplier: number } {
  const dealRevenue = deal.revenue || 0;
  const dealLocations = deal.location_count || 1;
  const behavior = getScoringBehavior(tracker);
  
  // Calculate a "size multiplier" that will be applied to the final composite score
  // This enforces the rule that size matters more than other factors when it's wrong
  let sizeMultiplier = 1.0;
  
  // Apply strictness based on tracker config
  const strictnessMultiplier = 
    behavior.size.strictness === 'strict' ? 1.0 :
    behavior.size.strictness === 'moderate' ? 0.7 :
    0.4; // relaxed
  
  // ========== NEW: GET BUYER TYPE CONSTRAINTS ==========
  // Get the matched buyer type AND its constraints from the tracker's buyer_types_criteria
  const { isNational: buyerIsNationalPlatform, buyerType, constraints } = determineBuyerScale(buyer, tracker);
  
  // Log what we found for debugging
  console.log(`[SizeScore] Buyer "${buyer.pe_firm_name}" matched to type "${buyerType || 'unknown'}". Constraints: minLocs=${constraints.minLocations}, minEbitda=${constraints.minEbitda}`);
  
  // ========== BUYER TYPE LOCATION CONSTRAINT - HARD DISQUALIFICATION ==========
  // If the matched buyer type requires a minimum number of locations and the deal doesn't meet it, DISQUALIFY
  if (constraints.minLocations && constraints.minLocations > 1 && dealLocations < constraints.minLocations) {
    console.log(`[SizeScore] DISQUALIFYING: ${buyerType} requires ${constraints.minLocations}+ locations, deal has ${dealLocations}`);
    return {
      score: 0,
      reasoning: `${buyerType || 'Buyer type'} requires ${constraints.minLocations}+ locations. Deal has only ${dealLocations} location(s).`,
      isDisqualified: true,
      disqualificationReason: `${buyerType || 'Buyer type'} requires ${constraints.minLocations}+ locations, deal has ${dealLocations}`,
      confidence: 'high',
      sizeMultiplier: 0
    };
  }
  
  // ========== BUYER TYPE EBITDA CONSTRAINT - HARD DISQUALIFICATION ==========
  // If the matched buyer type requires minimum EBITDA and deal doesn't meet it
  const dealEbitda = deal.ebitda_amount || (deal.revenue && deal.ebitda_percentage 
    ? (deal.revenue * deal.ebitda_percentage / 100) 
    : null);
  
  if (constraints.minEbitda && dealEbitda !== null && dealEbitda < constraints.minEbitda * 0.5) {
    console.log(`[SizeScore] DISQUALIFYING: ${buyerType} requires $${constraints.minEbitda}M+ EBITDA, deal has $${dealEbitda}M`);
    return {
      score: 0,
      reasoning: `${buyerType || 'Buyer type'} requires $${constraints.minEbitda}M+ EBITDA. Deal has only $${dealEbitda?.toFixed(1)}M EBITDA.`,
      isDisqualified: true,
      disqualificationReason: `${buyerType || 'Buyer type'} requires $${constraints.minEbitda}M+ EBITDA, deal has $${dealEbitda?.toFixed(1)}M`,
      confidence: 'high',
      sizeMultiplier: 0
    };
  }
  
  // ========== EXISTING LOGIC: BUYER'S INDIVIDUAL CRITERIA ==========
  // STRICT: Hard disqualify if deal revenue is significantly below buyer's minimum (more than 30% below)
  if (buyer.min_revenue && dealRevenue < buyer.min_revenue * 0.7) {
    const percentBelow = ((buyer.min_revenue - dealRevenue) / buyer.min_revenue * 100).toFixed(0);
    
    // Check behavior - should we disqualify or just penalize?
    if (behavior.size.below_minimum_behavior === 'disqualify') {
      return {
        score: 0,
        reasoning: `Deal revenue ($${dealRevenue}M) is ${percentBelow}% below buyer minimum ($${buyer.min_revenue}M) - too small`,
        isDisqualified: true,
        disqualificationReason: `Revenue ($${dealRevenue}M) significantly below minimum ($${buyer.min_revenue}M)`,
        confidence: 'high',
        sizeMultiplier: 0
      };
    } else if (behavior.size.below_minimum_behavior === 'penalize') {
      return {
        score: 15,
        reasoning: `Deal revenue ($${dealRevenue}M) is ${percentBelow}% below buyer minimum ($${buyer.min_revenue}M) - significant size mismatch`,
        isDisqualified: false,
        disqualificationReason: null,
        confidence: 'high',
        sizeMultiplier: 0.3 * strictnessMultiplier
      };
    }
    // 'ignore' - continue scoring without penalty
  }
  
  // Soft disqualification: Below minimum but within 30% - apply heavy penalty multiplier
  if (buyer.min_revenue && dealRevenue < buyer.min_revenue) {
    const percentBelow = ((buyer.min_revenue - dealRevenue) / buyer.min_revenue * 100);
    
    if (behavior.size.below_minimum_behavior !== 'ignore') {
      // If 20% below, multiplier = 0.5; if 10% below, multiplier = 0.65; etc.
      sizeMultiplier = 0.35 + (1 - percentBelow / 30) * 0.35; // Range from 0.35 to 0.70
      sizeMultiplier *= strictnessMultiplier + (1 - strictnessMultiplier); // Adjust by strictness
      
      return {
        score: Math.round(25 + (30 - percentBelow)), // Score between 25-55
        reasoning: `Deal revenue ($${dealRevenue}M) is ${percentBelow.toFixed(0)}% below buyer minimum ($${buyer.min_revenue}M) - challenging fit`,
        isDisqualified: false,
        disqualificationReason: null,
        confidence: 'high',
        sizeMultiplier
      };
    }
  }
  
  if (buyer.max_revenue && dealRevenue > buyer.max_revenue * 1.5) {
    return {
      score: 0,
      reasoning: `Deal revenue ($${dealRevenue}M) significantly exceeds buyer maximum ($${buyer.max_revenue}M)`,
      isDisqualified: true,
      disqualificationReason: `Revenue ($${dealRevenue}M) exceeds maximum threshold ($${buyer.max_revenue}M)`,
      confidence: 'high',
      sizeMultiplier: 0
    };
  }
  
  // ========== BUYER TYPE CONSTRAINT PENALTIES (NOT DISQUALIFICATION) ==========
  // If deal is below buyer type's EBITDA minimum but not by much, apply penalty
  if (constraints.minEbitda && dealEbitda !== null && dealEbitda < constraints.minEbitda) {
    const percentBelow = ((constraints.minEbitda - dealEbitda) / constraints.minEbitda * 100);
    sizeMultiplier = Math.min(sizeMultiplier, 0.5);
    return {
      score: 25,
      reasoning: `Deal EBITDA ($${dealEbitda?.toFixed(1)}M) is ${percentBelow.toFixed(0)}% below ${buyerType || 'buyer type'} minimum ($${constraints.minEbitda}M)`,
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'high',
      sizeMultiplier
    };
  }
    
  // Single-location deals are penalized for national platforms (if penalty enabled)
  if (dealLocations === 1 && buyerIsNationalPlatform && behavior.size.single_location_penalty) {
    // If they're also below the sweet spot, it's a double penalty
    if (buyer.revenue_sweet_spot && dealRevenue < buyer.revenue_sweet_spot * 0.6) {
      sizeMultiplier = Math.min(sizeMultiplier, 0.45);
      return {
        score: 20,
        reasoning: `Single-location deal ($${dealRevenue}M) significantly below ${buyerType || 'platform'}'s sweet spot ($${buyer.revenue_sweet_spot}M)`,
        isDisqualified: behavior.size.strictness === 'strict',
        disqualificationReason: behavior.size.strictness === 'strict' ? `Single location + small revenue unlikely to attract platform buyer` : null,
        confidence: 'high',
        sizeMultiplier
      };
    }
    // Just single location but revenue OK - mild penalty
    sizeMultiplier = Math.min(sizeMultiplier, 0.80);
  }
  
  let score = 50; // Baseline
  let reasons: string[] = [];
  let hasData = false;
  
  // Revenue scoring with penalties for being near but not at minimum
  if (buyer.min_revenue || buyer.max_revenue || buyer.revenue_sweet_spot) {
    hasData = true;
    const min = buyer.min_revenue || 0;
    const max = buyer.max_revenue || 1000;
    const sweet = buyer.revenue_sweet_spot || (min + max) / 2;
    
    if (dealRevenue >= min && dealRevenue <= max) {
      // Within range - check proximity to sweet spot
      if (sweet && dealRevenue >= sweet * 0.8 && dealRevenue <= sweet * 1.2) {
        score = 95;
        sizeMultiplier = Math.min(sizeMultiplier, 1.05); // Slight boost
        reasons.push(`Revenue ($${dealRevenue}M) near sweet spot ($${sweet}M) ✓`);
      } else if (dealRevenue >= min && dealRevenue < min * 1.3) {
        // Within range but on the low end - still penalize slightly
        score = 65;
        sizeMultiplier = Math.min(sizeMultiplier, 0.85);
        reasons.push(`Revenue ($${dealRevenue}M) within range but on low end (min $${min}M)`);
      } else {
        const distanceFromSweet = Math.abs(dealRevenue - sweet);
        const rangeSize = max - min;
        const fitPercent = rangeSize > 0 ? 1 - (distanceFromSweet / rangeSize) : 1;
        score = 70 + (fitPercent * 25);
        reasons.push(`Revenue ($${dealRevenue}M) within target range ($${min}-${max}M)`);
      }
    } else if (dealRevenue > max) {
      const gap = (dealRevenue - max) / max;
      score = Math.max(20, 60 - (gap * 60));
      sizeMultiplier = Math.min(sizeMultiplier, 0.75);
      reasons.push(`Revenue ($${dealRevenue}M) above target ($${max}M max)`);
    }
  }
  
  // EBITDA scoring
  if (buyer.min_ebitda || buyer.max_ebitda || buyer.ebitda_sweet_spot) {
    hasData = true;
    const currentDealEbitda = deal.ebitda_amount || (deal.revenue && deal.ebitda_percentage 
      ? (deal.revenue * deal.ebitda_percentage / 100) 
      : null);
    
    if (currentDealEbitda) {
      const min = buyer.min_ebitda || 0;
      const max = buyer.max_ebitda || 100;
      
      if (currentDealEbitda >= min && currentDealEbitda <= max) {
        score = Math.min(100, score + 10);
        reasons.push(`EBITDA ($${currentDealEbitda.toFixed(1)}M) within range`);
      } else if (currentDealEbitda < min) {
        score = Math.max(score - 15, 10);
        sizeMultiplier = Math.min(sizeMultiplier, 0.75);
        reasons.push(`EBITDA ($${currentDealEbitda.toFixed(1)}M) below minimum ($${min}M)`);
      }
    }
  }
  
  // Location count consideration - significant penalty for single location with national buyers
  if (dealLocations === 1 && buyerIsNationalPlatform) {
    score = Math.max(10, score - 15);
    reasons.push(`Single-location deal facing national platform`);
  } else if (dealLocations === 1) {
    score = Math.max(10, score - 5);
    reasons.push(`Single location - limited scale`);
  } else if (dealLocations >= 3) {
    score = Math.min(100, score + 5);
    reasons.push(`Multi-location (${dealLocations} locations) provides infrastructure`);
  }
  
  // Add buyer type context to reasoning if we have constraints
  if (buyerType && (constraints.minLocations || constraints.minEbitda)) {
    hasData = true;
    if (constraints.minLocations && dealLocations >= constraints.minLocations) {
      reasons.push(`Meets ${buyerType} location requirement (${dealLocations}/${constraints.minLocations}+)`);
    }
  }
  
  return {
    score: Math.round(score),
    reasoning: reasons.length > 0 ? reasons.join(". ") : "Limited size criteria data available",
    isDisqualified: false,
    disqualificationReason: null,
    confidence: hasData ? 'high' : 'low',
    sizeMultiplier
  };
}

// Score GEOGRAPHY category with weighted geography fields and deal attractiveness adjustment
function scoreGeographyCategory(
  deal: Deal, 
  buyer: Buyer, 
  dealAttractiveness: number,
  engagementSignals: EngagementSignals
): CategoryScore {
  const dealStates = extractStatesFromGeography(deal.geography);
  
  // Also extract from headquarters
  if (deal.headquarters) {
    const hqStates = extractStatesFromText(deal.headquarters);
    hqStates.forEach(s => { if (!dealStates.includes(s)) dealStates.push(s); });
  }
  
  const dealLocations = deal.location_count || 1;

  // ============ THESIS GEOGRAPHIC CONSTRAINT CHECK ============
  // If buyer's thesis explicitly states a regional focus (e.g., "Pacific Northwest"),
  // and the deal is outside that region, DISQUALIFY the buyer
  const thesisGeo = extractThesisGeographicConstraints(buyer.thesis_summary, buyer.key_quotes);
  
  if (thesisGeo.hasExplicitRegionalFocus && thesisGeo.constraintStrength === 'hard') {
    // Check if deal is within the thesis-stated geography
    const dealMatchesThesisRegion = dealStates.some(ds => thesisGeo.focusedStates.includes(ds));
    
    if (!dealMatchesThesisRegion && dealStates.length > 0) {
      const regionNames = thesisGeo.focusedRegions.join(', ') || thesisGeo.focusedStates.join(', ');
      console.log(`[Geography] Thesis disqualification: Buyer "${buyer.pe_firm_name}" thesis focuses on ${regionNames}, deal in ${dealStates.join(', ')}`);
      
      return {
        score: 0,
        reasoning: `Thesis explicitly focuses on ${regionNames}. Deal in ${dealStates.join(', ')} is outside stated geographic focus.`,
        isDisqualified: true,
        disqualificationReason: `Buyer thesis states "${thesisGeo.evidence || regionNames}" focus - deal location (${dealStates.join(', ')}) is excluded`,
        confidence: 'high'
      };
    }
  } else if (thesisGeo.hasExplicitRegionalFocus && thesisGeo.constraintStrength === 'soft') {
    // Soft constraint - heavy penalty but not disqualification
    const dealMatchesThesisRegion = dealStates.some(ds => thesisGeo.focusedStates.includes(ds));
    
    if (!dealMatchesThesisRegion && dealStates.length > 0) {
      const regionNames = thesisGeo.focusedRegions.join(', ') || thesisGeo.focusedStates.join(', ');
      console.log(`[Geography] Thesis soft penalty: Buyer "${buyer.pe_firm_name}" thesis prefers ${regionNames}, deal in ${dealStates.join(', ')}`);
      
      // Continue with normal scoring but cap the maximum score
      // We'll apply this penalty at the end of geography scoring
    }
  }
  // ============ END THESIS CHECK ============
  
  // Collect buyer geographic data with DIFFERENT WEIGHTS for each field:
  // - target_geographies: Full weight (1.0) - where they WANT to acquire
  // - geographic_footprint: 0.7 weight - they have presence, might expand
  // - service_regions: 0.5 weight - they serve there but may not acquire
  // - hq_state: 0.3 weight - just HQ, weakest signal
  interface WeightedState { state: string; weight: number; source: string }
  const weightedStates: WeightedState[] = [];
  
  // Target geographies - highest weight (1.0)
  extractStatesFromGeography(buyer.target_geographies).forEach(s => {
    weightedStates.push({ state: s, weight: 1.0, source: 'target_geographies' });
  });
  
  // Geographic footprint - medium-high weight (0.7)
  extractStatesFromGeography(buyer.geographic_footprint).forEach(s => {
    if (!weightedStates.some(ws => ws.state === s && ws.weight > 0.7)) {
      weightedStates.push({ state: s, weight: 0.7, source: 'geographic_footprint' });
    }
  });
  
  // Service regions - medium weight (0.5)
  extractStatesFromGeography(buyer.service_regions).forEach(s => {
    if (!weightedStates.some(ws => ws.state === s && ws.weight > 0.5)) {
      weightedStates.push({ state: s, weight: 0.5, source: 'service_regions' });
    }
  });
  
  // HQ state/city - lowest weight (0.3)
  if (buyer.hq_state) {
    const hqState = normalizeState(buyer.hq_state);
    if (hqState && !weightedStates.some(ws => ws.state === hqState && ws.weight > 0.3)) {
      weightedStates.push({ state: hqState, weight: 0.3, source: 'hq_state' });
    }
  }
  if (buyer.hq_city) {
    extractStatesFromText(buyer.hq_city).forEach(s => {
      if (!weightedStates.some(ws => ws.state === s && ws.weight > 0.3)) {
        weightedStates.push({ state: s, weight: 0.3, source: 'hq_city' });
      }
    });
  }
  
  // Legacy: flat list for compatibility with existing logic
  const buyerStates = new Set<string>(weightedStates.map(ws => ws.state));
  const buyerStateArray = Array.from(buyerStates).filter(Boolean);
  
  // Helper to get max weight for a state
  const getStateWeight = (state: string): number => {
    const matching = weightedStates.filter(ws => ws.state === state);
    return matching.length > 0 ? Math.max(...matching.map(ws => ws.weight)) : 0;
  };
  
  // Check for geographic exclusions (hard disqualifier)
  const exclusions = extractStatesFromGeography(buyer.geographic_exclusions);
  const excludedMatch = dealStates.filter(ds => exclusions.includes(ds));
  if (excludedMatch.length > 0) {
    return {
      score: 0,
      reasoning: `Deal location (${excludedMatch.join(", ")}) is in buyer's exclusion list`,
      isDisqualified: true,
      disqualificationReason: `Geographic exclusion: ${excludedMatch.join(", ")} explicitly excluded by buyer`,
      confidence: 'high'
    };
  }
  
  // Check for exact state matches with weights
  const exactMatches = dealStates.filter(ds => buyerStateArray.includes(ds));
  const exactMatchMaxWeight = exactMatches.length > 0 
    ? Math.max(...exactMatches.map(ds => getStateWeight(ds))) 
    : 0;
  
  // Check for target_geographies matches specifically (highest priority)
  const targetGeoMatches = dealStates.filter(ds => 
    weightedStates.some(ws => ws.state === ds && ws.source === 'target_geographies')
  );
  const hasTargetGeoMatch = targetGeoMatches.length > 0;
  
  // Check for adjacent state matches
  const adjacentMatches: string[] = [];
  dealStates.forEach(ds => {
    const adjacent = getAdjacentStates(ds);
    adjacent.forEach(adj => {
      if (buyerStateArray.includes(adj) && !adjacentMatches.includes(adj)) {
        adjacentMatches.push(adj);
      }
    });
  });

  // Check for regional matches (same region but not adjacent)
  const regionalMatches: string[] = [];
  dealStates.forEach(ds => {
    buyerStateArray.forEach(bs => {
      if (!exactMatches.includes(bs) && !adjacentMatches.includes(bs)) {
        if (areStatesInSameRegion(ds, bs) && !regionalMatches.includes(bs)) {
          regionalMatches.push(bs);
        }
      }
    });
  });
  
  // Attractiveness adjustment factor (1.0 to 1.3)
  const attractivenessBonus = 1 + ((dealAttractiveness - 50) / 200); // 50 attractiveness = 1.0, 100 = 1.25
  
  // Engagement override - if buyer has shown active interest, boost geography score
  const engagementOverride = engagementSignals.expressedInterest || 
    engagementSignals.siteVisitRequested || 
    engagementSignals.personalConnection;
  const engagementMultiplier = engagementOverride ? 1.2 : 1.0;
  
  // Multi-location deal adjustment (more lenient)
  const isMultiLocation = dealLocations >= 3;
  const multiLocationBonus = isMultiLocation ? 10 : 0;
  
  // Single-location deal logic
  if (!isMultiLocation) {
    if (exactMatches.length > 0) {
      // Apply weight-based scoring: target_geographies match = +15 bonus
      const targetGeoBonus = hasTargetGeoMatch ? 15 : 0;
      const weightBonus = Math.round(exactMatchMaxWeight * 10); // Up to +10 for high-weight matches
      const baseScore = Math.min(100, 85 + targetGeoBonus + weightBonus) * attractivenessBonus * engagementMultiplier;
      const reasoningPrefix = hasTargetGeoMatch 
        ? `Excellent fit: Deal in buyer's TARGET geography (${targetGeoMatches.join(", ")})`
        : `Strong fit: Buyer has presence in ${exactMatches.join(", ")}`;
      return {
        score: Math.round(Math.min(100, baseScore)),
        reasoning: `${reasoningPrefix}${engagementOverride ? '. Active buyer interest shown.' : ''}`,
        isDisqualified: false,
        disqualificationReason: null,
        confidence: 'high'
      };
    } else if (adjacentMatches.length > 0) {
      const baseScore = 70 + (dealAttractiveness > 70 ? 15 : dealAttractiveness > 50 ? 10 : 0);
      const finalScore = baseScore * attractivenessBonus * engagementMultiplier;
      return {
        score: Math.round(Math.min(100, finalScore)),
        reasoning: `Acceptable: Buyer operates in ${adjacentMatches.join(", ")} (adjacent). ${dealAttractiveness > 70 ? 'High-value deal increases buyer flexibility.' : ''}${engagementOverride ? ' Active interest shown.' : ''}`,
        isDisqualified: false,
        disqualificationReason: null,
        confidence: 'high'
      };
    } else if (regionalMatches.length > 0) {
      // NEW: Regional matching for attractive deals
      const baseScore = 50 + (dealAttractiveness > 80 ? 20 : dealAttractiveness > 60 ? 10 : 0);
      const finalScore = baseScore * attractivenessBonus * engagementMultiplier;
      const region = getStateRegion(dealStates[0]) || "same region";
      return {
        score: Math.round(Math.min(100, finalScore)),
        reasoning: `Regional fit: Buyer operates in ${region} (${regionalMatches.slice(0, 2).join(", ")}). ${dealAttractiveness > 70 ? 'Attractive deal may draw regional interest.' : ''}${engagementOverride ? ' Active interest confirmed.' : ''}`,
        isDisqualified: false,
        disqualificationReason: null,
        confidence: 'medium'
      };
    } else if (engagementOverride && dealAttractiveness >= 70) {
      // Buyer has shown interest despite distance - don't disqualify
      return {
        score: 60,
        reasoning: `Geographic distance, but buyer has shown active interest (${engagementSignals.signals.slice(0, 2).join(", ")}). High-value deal at $${deal.revenue}M revenue.`,
        isDisqualified: false,
        disqualificationReason: null,
        confidence: 'high'
      };
    } else if (buyerStateArray.length > 0 && dealAttractiveness >= 80) {
      // Highly attractive deal - buyer might stretch
      return {
        score: 50,
        reasoning: `Weak geographic fit but highly attractive deal ($${deal.revenue}M revenue) may draw buyer interest despite distance`,
        isDisqualified: false,
        disqualificationReason: null,
        confidence: 'medium'
      };
    } else if (buyerStateArray.length > 0) {
      return {
        score: 0,
        reasoning: `No presence within 100 miles. Buyer's locations: ${buyerStateArray.slice(0, 5).join(", ")}. Deal: ${dealStates.join(", ")}`,
        isDisqualified: true,
        disqualificationReason: `No presence near ${dealStates.join(", ")}. Single-location deals require buyer within 100 miles.`,
        confidence: 'high'
      };
    }
  }
  
  // Multi-location deal (3+) - more lenient, regional matching allowed
  if (exactMatches.length > 0) {
    // Apply weight-based scoring for multi-location: target_geographies match = +15 bonus
    const targetGeoBonus = hasTargetGeoMatch ? 15 : 0;
    const weightBonus = Math.round(exactMatchMaxWeight * 10);
    const baseScore = Math.min(100, 80 + targetGeoBonus + weightBonus + multiLocationBonus) * attractivenessBonus * engagementMultiplier;
    const reasoningPrefix = hasTargetGeoMatch 
      ? `Excellent fit: Deal in buyer's TARGET geography (${targetGeoMatches.join(", ")})`
      : `Strong fit: Buyer targets ${exactMatches.join(", ")}`;
    return {
      score: Math.round(Math.min(100, baseScore)),
      reasoning: `${reasoningPrefix} - direct overlap with deal geography${engagementOverride ? '. Active interest confirmed.' : ''}`,
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'high'
    };
  } else if (adjacentMatches.length > 0) {
    const baseScore = 70 + multiLocationBonus + (dealAttractiveness > 70 ? 15 : 10);
    const finalScore = baseScore * attractivenessBonus * engagementMultiplier;
    return {
      score: Math.round(Math.min(100, finalScore)),
      reasoning: `Good fit: Buyer operates in ${adjacentMatches.join(", ")} (adjacent). Multi-location deal enables expansion.${engagementOverride ? ' Active interest confirmed.' : ''}`,
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'high'
    };
  } else if (regionalMatches.length > 0) {
    // NEW: Regional matching for multi-location deals
    const baseScore = 60 + multiLocationBonus + (dealAttractiveness > 70 ? 15 : 5);
    const finalScore = baseScore * attractivenessBonus * engagementMultiplier;
    const region = getStateRegion(dealStates[0]) || "same region";
    return {
      score: Math.round(Math.min(100, finalScore)),
      reasoning: `Regional fit: Buyer operates in ${region}. Multi-location deal provides market entry opportunity.${engagementOverride ? ' Active interest confirmed.' : ''}`,
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'medium'
    };
  } else if (engagementOverride) {
    // Buyer has shown interest - give benefit of doubt for multi-location
    return {
      score: 55 + multiLocationBonus,
      reasoning: `Geographic distance, but buyer has expressed interest. Multi-location (${dealLocations}) enables market expansion.`,
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'high'
    };
  } else if (buyerStateArray.length > 0) {
    const baseScore = 35 + multiLocationBonus + (dealAttractiveness > 70 ? 20 : dealAttractiveness > 50 ? 10 : 0);
    return {
      score: baseScore,
      reasoning: `Weak fit: Buyer operates in ${buyerStateArray.slice(0, 3).join(", ")}. No overlap with ${dealStates.join(", ")}, but multi-location deal may enable market entry.`,
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'medium'
    };
  }
  
  // No geographic data
  return {
    score: 50,
    reasoning: "Buyer's geographic preferences not specified. Manual review recommended.",
    isDisqualified: false,
    disqualificationReason: null,
    confidence: 'low'
  };
}

// Call AI-powered service fit scoring with fallback to keyword matching
async function getAIServiceFitScore(
  deal: Deal, 
  buyer: Buyer, 
  tracker: Tracker
): Promise<CategoryScore> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.log('[Service Fit] Missing env vars, falling back to keyword matching');
      return scoreServicesCategory(deal, buyer, tracker);
    }
    
    const response = await fetch(`${supabaseUrl}/functions/v1/score-service-fit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deal_services: deal.service_mix,
        tracker_criteria: tracker.service_criteria,
        buyer_services: buyer.services_offered,
        buyer_target_services: buyer.target_services,
        industry: tracker.industry_name,
        deal_industry_type: deal.industry_type
      })
    });
    
    if (!response.ok) {
      console.log(`[Service Fit] AI call failed with status ${response.status}, falling back to keywords`);
      return scoreServicesCategory(deal, buyer, tracker);
    }
    
    const result = await response.json();
    
    if (result.error || !result.score) {
      console.log('[Service Fit] AI response invalid, falling back to keywords');
      return scoreServicesCategory(deal, buyer, tracker);
    }
    
    // Map AI response to CategoryScore
    return {
      score: Math.round(result.score),
      reasoning: result.reasoning || "AI-powered service matching",
      isDisqualified: result.is_disqualified || false,
      disqualificationReason: result.disqualification_reason || null,
      confidence: result.confidence || 'medium'
    };
    
  } catch (error) {
    console.log('[Service Fit] AI call error, falling back to keywords:', error);
    return scoreServicesCategory(deal, buyer, tracker);
  }
}

// Score SERVICES category using tracker-based criteria (industry-agnostic) - FALLBACK
function scoreServicesCategory(deal: Deal, buyer: Buyer, tracker: Tracker): CategoryScore {
  const dealServices = deal.service_mix?.toLowerCase() || "";
  const buyerServices = (buyer.services_offered || "").toLowerCase();
  const targetServices = (buyer.target_services || []).map(s => s.toLowerCase());
  const servicePrefs = (buyer.service_mix_prefs || "").toLowerCase();
  
  // Get tracker-defined service criteria (industry-agnostic)
  const trackerCriteria = tracker.service_criteria || {};
  const primaryFocus = (trackerCriteria.primary_focus || []).map(s => s.toLowerCase());
  const excludedServices = (trackerCriteria.excluded_services || []).map(s => s.toLowerCase());
  
  // Check for industry/service exclusions from both buyer AND tracker
  const buyerExclusions = (buyer.industry_exclusions || []).map(e => e.toLowerCase());
  const dealIndustry = (deal.industry_type || "").toLowerCase();
  
  // Check buyer exclusions
  if (buyerExclusions.some(ex => dealIndustry.includes(ex) || dealServices.includes(ex))) {
    return {
      score: 0,
      reasoning: `Deal industry/services match buyer's exclusion criteria`,
      isDisqualified: true,
      disqualificationReason: `Industry exclusion match found`,
      confidence: 'high'
    };
  }
  
  // NEW: Cross-validate buyer's target_services against tracker's excluded_services
  // If buyer is targeting services that the tracker has excluded, apply penalty
  if (excludedServices.length > 0 && targetServices.length > 0) {
    const buyerTargetsExcluded = targetServices.filter(ts => 
      excludedServices.some(ex => ts.includes(ex) || ex.includes(ts))
    );
    if (buyerTargetsExcluded.length > 0 && targetServices.length > 0) {
      const excludedRatio = buyerTargetsExcluded.length / targetServices.length;
      if (excludedRatio > 0.5) {
        // Buyer primarily targets excluded services - poor fit
        return {
          score: 20,
          reasoning: `Buyer primarily targets services that are OFF-FOCUS for this tracker: ${buyerTargetsExcluded.join(", ")}. Weak service alignment.`,
          isDisqualified: false,
          disqualificationReason: null,
          confidence: 'high'
        };
      } else if (excludedRatio > 0) {
        // Buyer partially targets excluded services - mild penalty later
        console.log(`[Services] Buyer targets some excluded services: ${buyerTargetsExcluded.join(", ")}`);
      }
    }
  }
  
  // NEW: Validate buyer's target_services align with tracker's primary_focus
  // Give bonus if buyer explicitly targets primary focus services
  let buyerPrimaryFocusMatch = 0;
  if (primaryFocus.length > 0 && targetServices.length > 0) {
    const matchingTargets = targetServices.filter(ts =>
      primaryFocus.some(pf => ts.includes(pf) || pf.includes(ts))
    );
    buyerPrimaryFocusMatch = matchingTargets.length;
  }
  
  // Check tracker-level excluded services (off-focus penalty)
  const matchesExcludedService = excludedServices.some(ex => dealServices.includes(ex));
  
  // Detect primary service using tracker's primary_focus keywords
  let isPrimaryServiceOffFocus = false;
  let detectedPrimaryService = "";
  
  if (primaryFocus.length > 0 && dealServices) {
    // Check if any primary focus keyword appears in deal services
    const hasPrimaryFocus = primaryFocus.some(focus => dealServices.includes(focus));
    
    // If deal mentions excluded services more prominently than primary focus, it's off-focus
    if (matchesExcludedService && !hasPrimaryFocus) {
      isPrimaryServiceOffFocus = true;
      const matchedExclusion = excludedServices.find(ex => dealServices.includes(ex));
      detectedPrimaryService = matchedExclusion || "off-focus service";
    }
  }
  
  // Apply off-focus penalty (similar to old towing penalty but now industry-agnostic)
  if (isPrimaryServiceOffFocus) {
    return {
      score: 30,
      reasoning: `Primary service appears to be ${detectedPrimaryService} (off-focus for this tracker). -20pt penalty applied.`,
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'high'
    };
  }
  
  // Extract service keywords from deal
  const dealKeywords = extractServiceKeywords(dealServices);
  const buyerKeywords = new Set([
    ...extractServiceKeywords(buyerServices),
    ...targetServices.flatMap(extractServiceKeywords),
    ...extractServiceKeywords(servicePrefs)
  ]);
  
  if (dealKeywords.length === 0) {
    return {
      score: 50,
      reasoning: "Deal service mix not specified. Manual review recommended.",
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'low'
    };
  }
  
  if (buyerKeywords.size === 0) {
    return {
      score: 50,
      reasoning: "Buyer service preferences not specified. Manual review recommended.",
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'low'
    };
  }
  
  // Calculate overlap
  const matches = dealKeywords.filter(dk => buyerKeywords.has(dk));
  const overlapPercent = (matches.length / dealKeywords.length) * 100;
  
  // Bonus for matching tracker's primary focus
  let primaryFocusBonus = 0;
  if (primaryFocus.length > 0) {
    const hasPrimaryFocusMatch = primaryFocus.some(focus => dealServices.includes(focus));
    if (hasPrimaryFocusMatch) {
      primaryFocusBonus = 10;
    }
  }
  
  // NEW: Bonus for buyer explicitly targeting tracker's primary focus services
  let buyerAlignmentBonus = 0;
  if (buyerPrimaryFocusMatch > 0) {
    buyerAlignmentBonus = Math.min(10, buyerPrimaryFocusMatch * 3);
  }
  
  let score = 50;
  let reasoning = "";
  
  if (overlapPercent >= 70) {
    score = 90 + (overlapPercent - 70) / 3 + primaryFocusBonus + buyerAlignmentBonus;
    reasoning = `Strong service alignment (${Math.round(overlapPercent)}% overlap): ${matches.slice(0, 4).join(", ")}`;
  } else if (overlapPercent >= 40) {
    score = 70 + (overlapPercent - 40) + primaryFocusBonus + buyerAlignmentBonus;
    reasoning = `Good service alignment (${Math.round(overlapPercent)}% overlap): ${matches.slice(0, 3).join(", ")}`;
  } else if (overlapPercent >= 20) {
    score = 50 + overlapPercent + primaryFocusBonus + buyerAlignmentBonus;
    reasoning = `Partial service overlap (${Math.round(overlapPercent)}%): ${matches.join(", ")}. May be complementary.`;
  } else if (matches.length > 0) {
    score = 40 + primaryFocusBonus + buyerAlignmentBonus;
    reasoning = `Limited service overlap: ${matches.join(", ")}. Consider as add-on opportunity.`;
  } else {
    score = 25;
    reasoning = `No direct service overlap. Deal: ${dealKeywords.slice(0, 3).join(", ")}. Buyer focuses on: ${Array.from(buyerKeywords).slice(0, 3).join(", ")}`;
  }
  
  if (primaryFocusBonus > 0) {
    reasoning += ` +${primaryFocusBonus}pt primary focus bonus.`;
  }
  if (buyerAlignmentBonus > 0) {
    reasoning += ` +${buyerAlignmentBonus}pt buyer alignment bonus.`;
  }
  
  return {
    score: Math.round(Math.min(100, score)),
    reasoning,
    isDisqualified: false,
    disqualificationReason: null,
    confidence: overlapPercent > 0 ? 'high' : 'medium'
  };
}

// Calculate KPI bonus points based on tracker's kpi_scoring_config
function calculateKPIBonus(deal: any, tracker: Tracker): { bonus: number; breakdown: string[] } {
  const kpiConfig = tracker.kpi_scoring_config;
  const dealKPIs = deal.industry_kpis || {};
  
  if (!kpiConfig?.kpis || kpiConfig.kpis.length === 0) {
    return { bonus: 0, breakdown: [] };
  }
  
  let totalBonus = 0;
  const breakdown: string[] = [];
  
  for (const kpi of kpiConfig.kpis) {
    const value = dealKPIs[kpi.field_name];
    
    // Skip if no data for this KPI (no penalty for missing data)
    if (value === undefined || value === null) {
      continue;
    }
    
    const rules = kpi.scoring_rules || {};
    let kpiBonus = 0;
    
    // Handle range-based scoring
    if (rules.ideal_range && typeof value === 'number') {
      const [min, max] = rules.ideal_range;
      if (value >= min && value <= max) {
        kpiBonus = kpi.weight;
        breakdown.push(`${kpi.display_name}: +${kpiBonus}pt (${value} in ideal range)`);
      } else if (value < min && rules.penalty_below !== undefined) {
        // Below ideal range
        const penaltyPercent = Math.min(1, (min - value) / min);
        kpiBonus = Math.max(0, kpi.weight * (1 - penaltyPercent));
        breakdown.push(`${kpi.display_name}: +${Math.round(kpiBonus)}pt (${value} below ideal)`);
      } else if (value > max && rules.penalty_above !== undefined) {
        // Above ideal range
        kpiBonus = Math.max(0, kpi.weight * 0.5);
        breakdown.push(`${kpi.display_name}: +${Math.round(kpiBonus)}pt (${value} above ideal)`);
      }
    }
    
    // Handle per-item bonus (for arrays like certifications)
    if (rules.bonus_per_item && Array.isArray(value)) {
      const maxBonus = rules.max_bonus || kpi.weight;
      kpiBonus = Math.min(maxBonus, value.length * rules.bonus_per_item);
      if (kpiBonus > 0) {
        breakdown.push(`${kpi.display_name}: +${Math.round(kpiBonus)}pt (${value.length} items)`);
      }
    }
    
    // Handle boolean bonus
    if (rules.boolean_bonus && value === true) {
      kpiBonus = rules.boolean_bonus;
      breakdown.push(`${kpi.display_name}: +${kpiBonus}pt`);
    }
    
    totalBonus += kpiBonus;
  }
  
  return { bonus: Math.round(totalBonus), breakdown };
}

// Extract service keywords for matching
function extractServiceKeywords(text: string): string[] {
  if (!text) return [];
  
  // Common service terms to look for
  const serviceTerms = [
    'hvac', 'heating', 'cooling', 'air conditioning', 'plumbing', 'electrical',
    'roofing', 'landscaping', 'lawn care', 'pest control', 'cleaning', 'janitorial',
    'restoration', 'remediation', 'water damage', 'fire damage', 'mold',
    'construction', 'remodeling', 'renovation', 'painting', 'flooring',
    'security', 'alarm', 'surveillance', 'fire protection', 'sprinkler',
    'it services', 'managed services', 'cybersecurity', 'software', 'consulting',
    'staffing', 'recruiting', 'hr', 'payroll', 'peo',
    'accounting', 'bookkeeping', 'tax', 'audit', 'financial',
    'marketing', 'advertising', 'digital', 'seo', 'web design',
    'healthcare', 'medical', 'dental', 'veterinary', 'pharmacy',
    'auto', 'automotive', 'collision', 'body shop', 'mechanic', 'auto body',
    'insurance', 'claims', 'adjusting', 'underwriting',
    'logistics', 'trucking', 'freight', 'shipping', 'warehousing',
    'manufacturing', 'fabrication', 'machining', 'assembly',
    'food service', 'catering', 'restaurant', 'hospitality',
    'education', 'training', 'tutoring', 'childcare',
    'real estate', 'property management', 'brokerage',
    'legal', 'law firm', 'compliance', 'regulatory',
    'engineering', 'architecture', 'surveying', 'environmental',
    'residential', 'commercial', 'industrial', 'government', 'municipal',
    'installation', 'maintenance', 'repair', 'service',
    'b2b', 'b2c', 'enterprise', 'smb', 'consumer',
    // Collision-specific terms
    'ppg', 'paint', 'frame', 'adas', 'calibration', 'i-car', 'oem', 'certified',
    'dent', 'bodywork', 'refinish', 'estimating', 'appraisal'
  ];
  
  const found: string[] = [];
  const lower = text.toLowerCase();
  
  for (const term of serviceTerms) {
    if (lower.includes(term) && !found.includes(term)) {
      found.push(term);
    }
  }
  
  return found;
}

// Enhanced owner goals scoring with semantic pattern matching
function scoreOwnerGoalsCategory(deal: Deal, buyer: Buyer): CategoryScore {
  const dealGoals = (deal.owner_goals || "").toLowerCase();
  const buyerTransition = (buyer.owner_transition_goals || "").toLowerCase();
  const buyerRoll = (buyer.owner_roll_requirement || "").toLowerCase();
  const thesis = (buyer.thesis_summary || "").toLowerCase();
  const keyQuotes = (buyer.key_quotes || []).join(" ").toLowerCase();
  
  const allBuyerText = `${buyerTransition} ${buyerRoll} ${thesis} ${keyQuotes}`;
  
  if (!dealGoals) {
    return {
      score: 50,
      reasoning: "Owner goals not specified in deal. Manual review recommended.",
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'low'
    };
  }
  
  if (!allBuyerText.trim()) {
    return {
      score: 50,
      reasoning: "Buyer transition preferences not specified. Manual review recommended.",
      isDisqualified: false,
      disqualificationReason: null,
      confidence: 'low'
    };
  }
  
  let score = 50;
  let alignments: string[] = [];
  let conflicts: string[] = [];
  
  // ENHANCED: Succession planning indicators
  const successionIndicators = [
    'succession', 'trusted employee', 'right hand', 'hand off', 'groom',
    'if i sell', 'when i sell', 'gets 10%', 'gets a piece', 'been with me',
    'my guy', 'key person', 'general manager', 'gm', 'operations manager',
    'second in command', 'number two', 'years of experience'
  ];
  
  const buyerValuesSuccession = [
    'management', 'retain', 'keep management', 'existing team', 'continuity',
    'operational expertise', 'lean on', 'local leadership', 'gm stays',
    'management stays', 'keep the team'
  ];
  
  const dealHasSuccessionPlan = successionIndicators.some(i => dealGoals.includes(i));
  const buyerWantsManagement = buyerValuesSuccession.some(i => allBuyerText.includes(i));
  
  if (dealHasSuccessionPlan && buyerWantsManagement) {
    score += 20;
    alignments.push("Succession planning aligns with buyer's management retention focus");
  } else if (dealHasSuccessionPlan) {
    score += 10;
    alignments.push("Owner has succession plan in place");
  }
  
  // ENHANCED: Employee focus indicators
  const employeeFocusIndicators = [
    'my people', 'without them', 'employees', 'team', 'staff', 'family',
    'treat them well', 'take care of', 'happy employees', 'good culture',
    'not corporate', 'employee retention', 'loyalty', 'tenure'
  ];
  
  const buyerKeepsTeam = [
    'retain', 'keep', 'employees', 'team', 'culture', 'people first',
    'investment in people', 'employee focused', 'training', 'development'
  ];
  
  const dealCaresAboutTeam = employeeFocusIndicators.some(i => dealGoals.includes(i));
  const buyerFocusedOnTeam = buyerKeepsTeam.some(i => allBuyerText.includes(i));
  
  if (dealCaresAboutTeam && buyerFocusedOnTeam) {
    score += 15;
    alignments.push("Both prioritize employee retention and culture");
  } else if (dealCaresAboutTeam) {
    score += 5;
    alignments.push("Owner cares about employees");
  }
  
  // ENHANCED: Culture preservation indicators
  const culturePresentationIndicators = [
    'culture', 'autonomy', 'independent', 'not like caliber', 'not like gerber',
    'not corporate', 'keep the name', 'brand', 'reputation', 'quality',
    'way we do things', 'our approach', 'local feel', 'community'
  ];
  
  const buyerGivesAutonomy = [
    'autonomy', 'independent', 'decentralized', 'local brand', 'entrepreneur',
    'owner operator', 'not a consolidator', 'platform approach', 'support not control'
  ];
  
  const dealWantsAutonomy = culturePresentationIndicators.some(i => dealGoals.includes(i));
  const buyerAllowsAutonomy = buyerGivesAutonomy.some(i => allBuyerText.includes(i));
  
  if (dealWantsAutonomy && buyerAllowsAutonomy) {
    score += 15;
    alignments.push("Culture/autonomy preferences aligned");
  } else if (dealWantsAutonomy && !buyerAllowsAutonomy && allBuyerText.includes('integration')) {
    score -= 10;
    conflicts.push("Owner wants autonomy but buyer focuses on integration");
  }
  
  // Timeline alignment
  const dealUrgent = ['quick', 'soon', 'immediate', 'asap', 'ready to sell', 'motivated'].some(i => dealGoals.includes(i));
  const dealFlexible = ['flexible', 'no rush', 'patient', 'right fit', 'taking time'].some(i => dealGoals.includes(i));
  
  // Transition period
  const dealStayShort = ['short transition', 'quick exit', 'move on', 'retire', 'step away', 'done'].some(i => dealGoals.includes(i));
  const dealStayLong = ['stay on', 'remain', 'continue', 'long transition', 'help grow', 'advise'].some(i => dealGoals.includes(i));
  
  const buyerNeedsStay = ['stay', 'remain', 'required', 'management stays', 'need owner'].some(i => allBuyerText.includes(i));
  const buyerFlexibleStay = ['flexible', 'optional', 'negotiate', 'discuss'].some(i => allBuyerText.includes(i));
  
  // Score transition alignment
  if (dealStayLong && buyerNeedsStay) {
    score += 15;
    alignments.push("Owner willing to stay aligns with buyer preference");
  } else if (dealStayShort && buyerFlexibleStay) {
    score += 10;
    alignments.push("Buyer flexible on owner transition");
  } else if (dealStayShort && buyerNeedsStay) {
    score -= 15;
    conflicts.push("Owner wants quick exit but buyer needs management to stay");
  }
  
  // Deal structure preferences
  const dealWantsAllCash = ['all cash', 'cash out', 'full exit', 'clean break'].some(i => dealGoals.includes(i));
  const dealOpenToRollover = ['rollover', 'equity', 'partnership', 'upside', 'second bite'].some(i => dealGoals.includes(i));
  const dealOpenToEarnout = ['earnout', 'earn-out', 'performance', 'milestone'].some(i => dealGoals.includes(i));
  
  const buyerPrefersRoll = ['rollover', 'equity', 'partnership', 'alignment', 'skin in the game'].some(i => allBuyerText.includes(i));
  const buyerPrefersEarnout = ['earnout', 'earn-out', 'performance based'].some(i => allBuyerText.includes(i));
  
  if (dealOpenToRollover && buyerPrefersRoll) {
    score += 15;
    alignments.push("Equity rollover interest aligned");
  } else if (dealWantsAllCash && buyerPrefersRoll) {
    score -= 10;
    conflicts.push("Owner wants all-cash but buyer prefers rollover");
  }
  
  if (dealOpenToEarnout && buyerPrefersEarnout) {
    score += 10;
    alignments.push("Open to earnout structure");
  }
  
  score = Math.max(20, Math.min(100, score));
  
  let reasoning = "";
  if (alignments.length > 0) {
    reasoning = `Alignments: ${alignments.join("; ")}`;
  }
  if (conflicts.length > 0) {
    reasoning += (reasoning ? ". " : "") + `Conflicts: ${conflicts.join("; ")}`;
  }
  if (!reasoning) {
    reasoning = "Partial owner goals alignment. Review details for fit.";
  }
  
  return {
    score: Math.round(score),
    reasoning,
    isDisqualified: false,
    disqualificationReason: null,
    confidence: alignments.length > 0 || conflicts.length > 0 ? 'high' : 'medium'
  };
}

// Calculate thesis bonus based on intel quality
// NOW: Also checks for thesis-deal geography conflicts and awards 0 bonus if thesis conflicts
function calculateThesisBonus(buyer: Buyer, deal: Deal): number {
  // First check if thesis has a geographic focus that conflicts with the deal
  const thesisGeo = extractThesisGeographicConstraints(buyer.thesis_summary, buyer.key_quotes);
  
  if (thesisGeo.hasExplicitRegionalFocus) {
    const dealStates = extractStatesFromGeography(deal.geography);
    if (deal.headquarters) {
      const hqStates = extractStatesFromText(deal.headquarters);
      hqStates.forEach(s => { if (!dealStates.includes(s)) dealStates.push(s); });
    }
    
    // Check if deal is within thesis geography
    const dealMatchesThesis = dealStates.some(ds => thesisGeo.focusedStates.includes(ds));
    
    if (!dealMatchesThesis && dealStates.length > 0) {
      // Thesis explicitly focuses on a region that doesn't include the deal location
      // Award NO bonus for having a thesis that conflicts with the deal
      console.log(`[ThesisBonus] No bonus: thesis focuses on ${thesisGeo.focusedRegions.join(', ')}, deal in ${dealStates.join(', ')}`);
      return 0;
    }
  }
  
  // Normal thesis bonus calculation
  let bonus = 0;
  
  if (buyer.thesis_summary && buyer.thesis_summary.length > 50) bonus += 10;
  if (buyer.key_quotes && buyer.key_quotes.length > 0) bonus += 10;
  if (buyer.acquisition_appetite) bonus += 5;
  if (buyer.total_acquisitions && buyer.total_acquisitions > 3) bonus += 5;
  if (buyer.last_acquisition_date) {
    const lastAcq = new Date(buyer.last_acquisition_date);
    const monthsAgo = (Date.now() - lastAcq.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo < 12) bonus += 10; // Active acquirer
    else if (monthsAgo < 24) bonus += 5;
  }
  
  return Math.min(30, bonus); // Cap at 30
}

// Calculate data completeness - returns capitalized values to match DB constraint
function calculateDataCompleteness(buyer: Buyer, deal: Deal): 'High' | 'Medium' | 'Low' {
  let dataPoints = 0;
  let totalPoints = 0;
  
  // Buyer data
  totalPoints += 10;
  if (buyer.hq_state || buyer.geographic_footprint?.length) dataPoints += 1;
  if (buyer.target_geographies?.length) dataPoints += 1;
  if (buyer.services_offered || buyer.target_services?.length) dataPoints += 1;
  if (buyer.min_revenue || buyer.max_revenue) dataPoints += 1;
  if (buyer.thesis_summary) dataPoints += 2;
  if (buyer.owner_transition_goals) dataPoints += 1;
  if (buyer.key_quotes?.length) dataPoints += 2;
  if (buyer.acquisition_appetite) dataPoints += 1;
  
  // Deal data
  totalPoints += 5;
  if (deal.geography?.length || deal.headquarters) dataPoints += 1;
  if (deal.revenue) dataPoints += 1;
  if (deal.service_mix) dataPoints += 1;
  if (deal.owner_goals) dataPoints += 1;
  if (deal.location_count) dataPoints += 1;
  
  const percent = (dataPoints / totalPoints) * 100;
  if (percent >= 70) return 'High';
  if (percent >= 40) return 'Medium';
  return 'Low';
}

// Calculate learning penalty based on buyer's rejection history
// Analyzes patterns of past rejections to penalize similar mismatches
function calculateLearningPenalty(
  buyerHistory: any[], 
  deal: Deal
): { penalty: number; reasoning: string[]; patterns: string[] } {
  if (!buyerHistory || buyerHistory.length === 0) {
    return { penalty: 0, reasoning: [], patterns: [] };
  }

  let penalty = 0;
  const reasoning: string[] = [];
  const patterns: string[] = [];

  // Count rejection categories across all history
  const categoryCounts: Record<string, number> = {};
  buyerHistory.forEach(record => {
    (record.rejection_categories || []).forEach((cat: string) => {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
  });

  // Check for size-related patterns
  const sizeRejections = (categoryCounts['size_too_small'] || 0) + (categoryCounts['size_too_large'] || 0);
  if (sizeRejections >= 2) {
    // Check if current deal has similar size characteristics
    const smallRejections = categoryCounts['size_too_small'] || 0;
    const largeRejections = categoryCounts['size_too_large'] || 0;
    
    if (smallRejections >= 2) {
      patterns.push(`rejected_for_size_small_${smallRejections}x`);
      // If buyer has rejected small deals before and this is also small
      if (deal.revenue && deal.revenue < 5) { // Example threshold
        penalty += 10;
        reasoning.push(`Previously rejected ${smallRejections} smaller deals`);
      }
    }
    if (largeRejections >= 2) {
      patterns.push(`rejected_for_size_large_${largeRejections}x`);
    }
  }

  // Check for geography-related patterns
  const geoRejections = categoryCounts['geography'] || 0;
  if (geoRejections >= 2) {
    patterns.push(`rejected_for_geography_${geoRejections}x`);
    // Apply penalty - the deal's geography might be a consistent issue for this buyer
    penalty += 8;
    reasoning.push(`Geography mismatch in ${geoRejections} previous deals`);
  }

  // Check for service-related patterns
  const serviceRejections = categoryCounts['services'] || 0;
  if (serviceRejections >= 2) {
    patterns.push(`rejected_for_services_${serviceRejections}x`);
    penalty += 8;
    reasoning.push(`Service mismatch in ${serviceRejections} previous deals`);
  }

  // Check for timing patterns
  const timingRejections = categoryCounts['timing'] || 0;
  if (timingRejections >= 3) {
    patterns.push(`rejected_for_timing_${timingRejections}x`);
    penalty += 5;
    reasoning.push(`Buyer frequently not active (${timingRejections}x)`);
  }

  // Portfolio conflict pattern
  const portfolioRejections = categoryCounts['portfolio_conflict'] || 0;
  if (portfolioRejections >= 1) {
    patterns.push(`has_portfolio_conflicts`);
    // Minor penalty as this is deal-specific
    penalty += 3;
    reasoning.push(`Has portfolio conflicts in similar deals`);
  }

  return { 
    penalty: Math.min(penalty, 25), // Cap at 25 points
    reasoning, 
    patterns 
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { dealId, buyerIds } = await req.json();
    
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    
    // Create user client to verify ownership via RLS
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user has access to this deal via RLS
    const { data: userDeal, error: accessError } = await userClient
      .from("deals")
      .select("id, tracker_id")
      .eq("id", dealId)
      .single();

    if (accessError || !userDeal) {
      console.error("Access denied for deal:", dealId, accessError?.message);
      return new Response(JSON.stringify({ error: "Deal not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Now safe to use SERVICE_ROLE_KEY for efficient querying
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Scoring deal ${dealId}...`);

    // Fetch deal with tracker (including service_criteria, kpi_scoring_config, buyer_types_criteria, geography_criteria, and scoring_behavior)
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*, industry_trackers!inner(id, industry_name, fit_criteria, geography_weight, service_mix_weight, size_weight, owner_goals_weight, service_criteria, size_criteria, geography_criteria, kpi_scoring_config, buyer_types_criteria, scoring_behavior)")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      console.error("Deal fetch error:", dealError);
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tracker: Tracker = deal.industry_trackers;
    console.log(`Deal: ${deal.deal_name}, Industry: ${tracker.industry_name}`);

    // Fetch buyers
    let buyerQuery = supabase
      .from("buyers")
      .select("*")
      .eq("tracker_id", deal.tracker_id);
    
    if (buyerIds?.length > 0) {
      buyerQuery = buyerQuery.in("id", buyerIds);
    }

    const { data: buyers, error: buyersError } = await buyerQuery;

    if (buyersError) {
      console.error("Buyers fetch error:", buyersError);
      return new Response(JSON.stringify({ error: "Failed to fetch buyers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Scoring ${buyers?.length || 0} buyers...`);

    // Fetch call intelligence for all buyers in this deal
    const buyerIdList = buyers?.map(b => b.id) || [];
    const { data: callIntelligence, error: callError } = await supabase
      .from("call_intelligence")
      .select("*")
      .eq("deal_id", dealId)
      .in("buyer_id", buyerIdList);
    
    if (callError) {
      console.error("Call intelligence fetch error:", callError);
    }

    // Fetch learning history for all buyers to apply learned penalties
    const { data: learningHistory, error: learningError } = await supabase
      .from("buyer_learning_history")
      .select("*")
      .in("buyer_id", buyerIdList);
    
    if (learningError) {
      console.error("Learning history fetch error:", learningError);
    }

    // Group learning history by buyer for penalty calculation
    const learningByBuyer: Record<string, any[]> = {};
    (learningHistory || []).forEach(record => {
      if (record.buyer_id) {
        if (!learningByBuyer[record.buyer_id]) {
          learningByBuyer[record.buyer_id] = [];
        }
        learningByBuyer[record.buyer_id].push(record);
      }
    });

    // Group call intelligence by buyer
    const callsByBuyer: Record<string, any[]> = {};
    (callIntelligence || []).forEach(call => {
      if (call.buyer_id) {
        if (!callsByBuyer[call.buyer_id]) {
          callsByBuyer[call.buyer_id] = [];
        }
        callsByBuyer[call.buyer_id].push(call);
      }
    });

    // Calculate deal attractiveness once
    const dealAttractiveness = calculateDealAttractiveness(deal as Deal);
    console.log(`Deal attractiveness score: ${dealAttractiveness}`);

    // Fetch custom scoring instructions for this deal
    const { data: scoringAdjustments } = await supabase
      .from("deal_scoring_adjustments")
      .select("parsed_instructions")
      .eq("deal_id", dealId)
      .maybeSingle();
    
    const parsedInstructions = scoringAdjustments?.parsed_instructions as ParsedInstructions | null;
    if (parsedInstructions?.rules?.length) {
      console.log(`Applying ${parsedInstructions.rules.length} custom scoring rules`);
    }

    // Get weights from tracker (default to equal weights)
    const weights = {
      size: (tracker.size_weight || 25) / 100,
      geography: (tracker.geography_weight || 25) / 100,
      services: (tracker.service_mix_weight || 25) / 100,
      ownerGoals: (tracker.owner_goals_weight || 25) / 100,
    };

    // Score each buyer (using async for AI service scoring)
    const scores: BuyerScore[] = await Promise.all((buyers || []).map(async (buyer) => {
      // Analyze engagement signals from call intelligence
      const buyerCalls = callsByBuyer[buyer.id] || [];
      const engagementSignals = analyzeEngagementSignals(buyerCalls);
      
      const sizeScore = scoreSizeCategory(deal as Deal, buyer as Buyer, tracker);
      const geographyScore = scoreGeographyCategory(deal as Deal, buyer as Buyer, dealAttractiveness, engagementSignals);
      
      // Try AI service scoring first, fallback to keyword matching
      const servicesScore = await getAIServiceFitScore(deal as Deal, buyer as Buyer, tracker);
      
      const ownerGoalsScore = scoreOwnerGoalsCategory(deal as Deal, buyer as Buyer);
      const thesisBonus = calculateThesisBonus(buyer as Buyer, deal as Deal);
      
      // NEW: Calculate KPI bonus from tracker configuration
      const kpiResult = calculateKPIBonus(deal, tracker);
      
      // NEW: Calculate engagement bonus (up to 15 points)
      const engagementBonus = Math.min(15, engagementSignals.engagementScore * 0.15);
      
      // NEW: Apply custom scoring instructions
      const customResult = applyCustomInstructions(buyer as Buyer, deal as Deal, parsedInstructions);
      
      // NEW: Calculate learning penalty from buyer's rejection history
      const buyerHistory = learningByBuyer[buyer.id] || [];
      const learningResult = calculateLearningPenalty(buyerHistory, deal as Deal);
      
      // Check for any disqualifications
      const disqualificationReasons: string[] = [];
      if (sizeScore.isDisqualified && sizeScore.disqualificationReason) {
        disqualificationReasons.push(sizeScore.disqualificationReason);
      }
      if (geographyScore.isDisqualified && geographyScore.disqualificationReason) {
        disqualificationReasons.push(geographyScore.disqualificationReason);
      }
      if (servicesScore.isDisqualified && servicesScore.disqualificationReason) {
        disqualificationReasons.push(servicesScore.disqualificationReason);
      }
      if (customResult.disqualify && customResult.disqualifyReason) {
        disqualificationReasons.push(customResult.disqualifyReason);
      }
      
      const isDisqualified = disqualificationReasons.length > 0;
      
      // Calculate base composite score (0 if disqualified)
      // Then apply sizeMultiplier - this enforces that size is a GATING factor
      // Even perfect geography/services can't overcome a too-small deal
      let baseComposite = isDisqualified ? 0 : (
        (sizeScore.score * weights.size) +
        (geographyScore.score * weights.geography) +
        (servicesScore.score * weights.services) +
        (ownerGoalsScore.score * weights.ownerGoals) +
        (thesisBonus * 0.3) + // Thesis bonus adds up to 9 points
        engagementBonus + // Engagement bonus adds up to 15 points
        kpiResult.bonus + // KPI bonus from industry-specific data
        customResult.bonus - // Custom scoring rules bonus/penalty
        learningResult.penalty // Learning penalty from rejection history (up to -25)
      );
      
      // Apply size multiplier - this is the key mechanism for making size a gating factor
      // When size is below minimums, sizeMultiplier < 1.0 caps the maximum achievable score
      const compositeScore = Math.max(0, baseComposite * sizeScore.sizeMultiplier);
      
      // Generate overall reasoning with size context
      let overallReasoning = "";
      if (isDisqualified) {
        overallReasoning = `❌ DISQUALIFIED: ${disqualificationReasons[0]}`;
      } else if (sizeScore.sizeMultiplier < 0.7) {
        // Size is a major limiting factor
        overallReasoning = `⚠️ Size challenge: ${sizeScore.reasoning}. Even with ${geographyScore.reasoning.split('.')[0].toLowerCase()}, size limits fit.`;
      } else if (compositeScore >= 75) {
        overallReasoning = `✅ Strong fit: ${geographyScore.reasoning.split('.')[0]}. ${servicesScore.reasoning.split('.')[0]}.`;
        if (customResult.reasoning.length > 0) {
          overallReasoning += ` ✨ ${customResult.reasoning[0]}.`;
        } else if (engagementSignals.signals.length > 0) {
          overallReasoning += ` 🎯 ${engagementSignals.signals[0]}.`;
        }
      } else if (compositeScore >= 50) {
        overallReasoning = `✓ Moderate fit: ${geographyScore.reasoning.split('.')[0]}. Consider for outreach.`;
        if (sizeScore.sizeMultiplier < 0.9) {
          overallReasoning += ` Size may be a limiting factor.`;
        }
        if (customResult.reasoning.length > 0) {
          overallReasoning += ` ✨ ${customResult.reasoning[0]}.`;
        } else if (engagementSignals.signals.length > 0) {
          overallReasoning += ` 🎯 ${engagementSignals.signals[0]}.`;
        }
      } else {
        overallReasoning = `⚠️ Long shot: ${sizeScore.reasoning}. ${geographyScore.reasoning.split('.')[0]}.`;
      }
      
      // Add learning penalty context if significant
      if (learningResult.penalty >= 10 && learningResult.reasoning.length > 0) {
        overallReasoning += ` 📉 Learning: ${learningResult.reasoning[0]}.`;
      }
      
      // Determine if this score needs human review
      const dataCompleteness = calculateDataCompleteness(buyer as Buyer, deal as Deal);
      const lowConfidenceCategories = [
        sizeScore.confidence === 'low',
        geographyScore.confidence === 'low',
        servicesScore.confidence === 'low',
        ownerGoalsScore.confidence === 'low'
      ].filter(Boolean).length;
      
      const needsReview = 
        dataCompleteness === 'Low' || 
        lowConfidenceCategories >= 2 ||
        (compositeScore >= 40 && compositeScore < 60 && !isDisqualified);
      
      const reviewReason = needsReview ? (
        dataCompleteness === 'Low' ? 'Insufficient data for confident scoring' :
        lowConfidenceCategories >= 2 ? 'Multiple scoring categories have low confidence' :
        'Score in uncertain range (40-60) - manual review recommended'
      ) : null;
      
      return {
        buyerId: buyer.id,
        buyerName: buyer.platform_company_name || buyer.pe_firm_name,
        compositeScore: Math.round(compositeScore),
        sizeScore,
        geographyScore,
        servicesScore,
        ownerGoalsScore,
        thesisBonus,
        engagementBonus: Math.round(engagementBonus),
        customBonus: customResult.bonus,
        learningPenalty: learningResult.penalty,
        overallReasoning,
        isDisqualified,
        disqualificationReasons,
        needsReview,
        reviewReason,
        dataCompleteness,
        dealAttractiveness,
        engagementSignals,
      };
    }));

    // Sort by composite score descending, disqualified at bottom
    scores.sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      return b.compositeScore - a.compositeScore;
    });

    console.log(`Scored ${scores.length} buyers. Disqualified: ${scores.filter(s => s.isDisqualified).length}, Strong (>75): ${scores.filter(s => s.compositeScore >= 75).length}`);

    // Update buyer_deal_scores table
    for (const score of scores) {
      const { error: upsertError } = await supabase
        .from("buyer_deal_scores")
        .upsert({
          buyer_id: score.buyerId,
          deal_id: dealId,
          geography_score: score.geographyScore.score,
          service_score: score.servicesScore.score,
          acquisition_score: score.sizeScore.score, // Repurposing as size score
          portfolio_score: score.ownerGoalsScore.score, // Repurposing as owner goals score
          thesis_bonus: score.thesisBonus,
          composite_score: score.compositeScore,
          fit_reasoning: score.overallReasoning,
          data_completeness: score.dataCompleteness,
          scored_at: new Date().toISOString(),
        }, {
          onConflict: 'buyer_id,deal_id'
        });
      
      if (upsertError) {
        console.error(`Failed to upsert score for buyer ${score.buyerId}:`, upsertError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      scores,
      dealAttractiveness,
      summary: {
        total: scores.length,
        strongFit: scores.filter(s => s.compositeScore >= 75).length,
        moderateFit: scores.filter(s => s.compositeScore >= 50 && s.compositeScore < 75).length,
        longShot: scores.filter(s => s.compositeScore > 0 && s.compositeScore < 50).length,
        disqualified: scores.filter(s => s.isDisqualified).length,
        needsReview: scores.filter(s => s.needsReview).length,
        withEngagement: scores.filter(s => s.engagementSignals.hasCalls).length,
        lowDataCompleteness: scores.filter(s => s.dataCompleteness === 'Low').length,
      },
      trackerCriteriaStatus: {
        hasPrimaryFocus: !!(tracker.service_criteria?.primary_focus?.length),
        hasSizeCriteria: !!(tracker.size_criteria?.min_revenue || tracker.size_criteria?.min_ebitda),
        hasBuyerTypes: !!(tracker.buyer_types_criteria?.buyer_types?.length),
        hasGeography: !!(tracker.geography_criteria?.required_regions?.length),
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in score-buyer-deal:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
