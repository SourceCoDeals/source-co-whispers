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
};

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

interface Tracker {
  id: string;
  industry_name: string;
  fit_criteria: string | null;
  geography_weight: number;
  service_mix_weight: number;
  size_weight: number;
  owner_goals_weight: number;
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
  overallReasoning: string;
  isDisqualified: boolean;
  disqualificationReasons: string[];
  dataCompleteness: 'High' | 'Medium' | 'Low';
  dealAttractiveness: number;
  engagementSignals: EngagementSignals;
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

// Score SIZE category - SIZE IS A GATING FACTOR
// When deal is too small for buyer, it should significantly limit the overall score
// Even if geography and services are perfect, a too-small deal is rarely a fit
function scoreSizeCategory(deal: Deal, buyer: Buyer): CategoryScore & { sizeMultiplier: number } {
  const dealRevenue = deal.revenue || 0;
  const dealLocations = deal.location_count || 1;
  
  // Calculate a "size multiplier" that will be applied to the final composite score
  // This enforces the rule that size matters more than other factors when it's wrong
  let sizeMultiplier = 1.0;
  
  // STRICT: Hard disqualify if deal revenue is significantly below buyer's minimum (more than 30% below)
  if (buyer.min_revenue && dealRevenue < buyer.min_revenue * 0.7) {
    const percentBelow = ((buyer.min_revenue - dealRevenue) / buyer.min_revenue * 100).toFixed(0);
    return {
      score: 0,
      reasoning: `Deal revenue ($${dealRevenue}M) is ${percentBelow}% below buyer minimum ($${buyer.min_revenue}M) - too small`,
      isDisqualified: true,
      disqualificationReason: `Revenue ($${dealRevenue}M) significantly below minimum ($${buyer.min_revenue}M)`,
      confidence: 'high',
      sizeMultiplier: 0
    };
  }
  
  // Soft disqualification: Below minimum but within 30% - apply heavy penalty multiplier
  if (buyer.min_revenue && dealRevenue < buyer.min_revenue) {
    const percentBelow = ((buyer.min_revenue - dealRevenue) / buyer.min_revenue * 100);
    // If 20% below, multiplier = 0.5; if 10% below, multiplier = 0.65; etc.
    sizeMultiplier = 0.35 + (1 - percentBelow / 30) * 0.35; // Range from 0.35 to 0.70
    
    return {
      score: Math.round(25 + (30 - percentBelow)), // Score between 25-55
      reasoning: `Deal revenue ($${dealRevenue}M) is ${percentBelow.toFixed(0)}% below buyer minimum ($${buyer.min_revenue}M) - challenging fit`,
      isDisqualified: false, // Not hard-disqualified, but heavily penalized
      disqualificationReason: null,
      confidence: 'high',
      sizeMultiplier
    };
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
  
  // Check if this is a single-location deal against a national/multi-location platform
  const buyerIsNationalPlatform = 
    (buyer.total_acquisitions && buyer.total_acquisitions > 5) ||
    (buyer.target_geographies && buyer.target_geographies.length > 3) ||
    (buyer.geographic_footprint && buyer.geographic_footprint.length > 3);
    
  // Single-location deals are penalized for national platforms  
  if (dealLocations === 1 && buyerIsNationalPlatform) {
    // If they're also below the sweet spot, it's a double penalty
    if (buyer.revenue_sweet_spot && dealRevenue < buyer.revenue_sweet_spot * 0.6) {
      sizeMultiplier = Math.min(sizeMultiplier, 0.45);
      return {
        score: 20,
        reasoning: `Single-location deal ($${dealRevenue}M) significantly below national platform's sweet spot ($${buyer.revenue_sweet_spot}M)`,
        isDisqualified: true,
        disqualificationReason: `Single location + small revenue unlikely to attract national platform`,
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
    const dealEbitda = deal.ebitda_amount || (deal.revenue && deal.ebitda_percentage 
      ? (deal.revenue * deal.ebitda_percentage / 100) 
      : null);
    
    if (dealEbitda) {
      const min = buyer.min_ebitda || 0;
      const max = buyer.max_ebitda || 100;
      
      if (dealEbitda >= min && dealEbitda <= max) {
        score = Math.min(100, score + 10);
        reasons.push(`EBITDA ($${dealEbitda.toFixed(1)}M) within range`);
      } else if (dealEbitda < min) {
        score = Math.max(score - 15, 10);
        sizeMultiplier = Math.min(sizeMultiplier, 0.75);
        reasons.push(`EBITDA ($${dealEbitda.toFixed(1)}M) below minimum ($${min}M)`);
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
  
  return {
    score: Math.round(score),
    reasoning: reasons.length > 0 ? reasons.join(". ") : "Limited size criteria data available",
    isDisqualified: false,
    disqualificationReason: null,
    confidence: hasData ? 'high' : 'low',
    sizeMultiplier
  };
}

// Score GEOGRAPHY category with deal attractiveness adjustment and regional matching
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
  
  // Collect buyer geographic data
  const buyerStates = new Set<string>();
  if (buyer.hq_state) buyerStates.add(normalizeState(buyer.hq_state));
  if (buyer.hq_city) extractStatesFromText(buyer.hq_city).forEach(s => buyerStates.add(s));
  extractStatesFromGeography(buyer.target_geographies).forEach(s => buyerStates.add(s));
  extractStatesFromGeography(buyer.service_regions).forEach(s => buyerStates.add(s));
  extractStatesFromGeography(buyer.geographic_footprint).forEach(s => buyerStates.add(s));
  const buyerStateArray = Array.from(buyerStates).filter(Boolean);
  
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
  
  // Check for exact state matches
  const exactMatches = dealStates.filter(ds => buyerStateArray.includes(ds));
  
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
      const baseScore = 95 * attractivenessBonus * engagementMultiplier;
      return {
        score: Math.round(Math.min(100, baseScore)),
        reasoning: `Strong fit: Buyer has presence in ${exactMatches.join(", ")} - same state as deal${engagementOverride ? '. Active buyer interest shown.' : ''}`,
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
    const baseScore = (90 + multiLocationBonus) * attractivenessBonus * engagementMultiplier;
    return {
      score: Math.round(Math.min(100, baseScore)),
      reasoning: `Strong fit: Buyer targets ${exactMatches.join(", ")} - direct overlap with deal geography${engagementOverride ? '. Active interest confirmed.' : ''}`,
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

// Score SERVICES category using keyword matching
function scoreServicesCategory(deal: Deal, buyer: Buyer, industryName: string): CategoryScore {
  const dealServices = deal.service_mix?.toLowerCase() || "";
  const buyerServices = (buyer.services_offered || "").toLowerCase();
  const targetServices = (buyer.target_services || []).map(s => s.toLowerCase());
  const servicePrefs = (buyer.service_mix_prefs || "").toLowerCase();
  
  // Check for industry/service exclusions
  const exclusions = (buyer.industry_exclusions || []).map(e => e.toLowerCase());
  const dealIndustry = (deal.industry_type || "").toLowerCase();
  
  if (exclusions.some(ex => dealIndustry.includes(ex) || dealServices.includes(ex))) {
    return {
      score: 0,
      reasoning: `Deal industry/services match buyer's exclusion criteria`,
      isDisqualified: true,
      disqualificationReason: `Industry exclusion match found`,
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
  
  let score = 50;
  let reasoning = "";
  
  if (overlapPercent >= 70) {
    score = 90 + (overlapPercent - 70) / 3;
    reasoning = `Strong service alignment (${Math.round(overlapPercent)}% overlap): ${matches.slice(0, 4).join(", ")}`;
  } else if (overlapPercent >= 40) {
    score = 70 + (overlapPercent - 40);
    reasoning = `Good service alignment (${Math.round(overlapPercent)}% overlap): ${matches.slice(0, 3).join(", ")}`;
  } else if (overlapPercent >= 20) {
    score = 50 + overlapPercent;
    reasoning = `Partial service overlap (${Math.round(overlapPercent)}%): ${matches.join(", ")}. May be complementary.`;
  } else if (matches.length > 0) {
    score = 40;
    reasoning = `Limited service overlap: ${matches.join(", ")}. Consider as add-on opportunity.`;
  } else {
    score = 25;
    reasoning = `No direct service overlap. Deal: ${dealKeywords.slice(0, 3).join(", ")}. Buyer focuses on: ${Array.from(buyerKeywords).slice(0, 3).join(", ")}`;
  }
  
  return {
    score: Math.round(Math.min(100, score)),
    reasoning,
    isDisqualified: false,
    disqualificationReason: null,
    confidence: overlapPercent > 0 ? 'high' : 'medium'
  };
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
function calculateThesisBonus(buyer: Buyer): number {
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Scoring deal ${dealId}...`);

    // Fetch deal with tracker
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*, industry_trackers!inner(id, industry_name, fit_criteria, geography_weight, service_mix_weight, size_weight, owner_goals_weight)")
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

    // Get weights from tracker (default to equal weights)
    const weights = {
      size: (tracker.size_weight || 25) / 100,
      geography: (tracker.geography_weight || 25) / 100,
      services: (tracker.service_mix_weight || 25) / 100,
      ownerGoals: (tracker.owner_goals_weight || 25) / 100,
    };

    // Score each buyer
    const scores: BuyerScore[] = (buyers || []).map(buyer => {
      // Analyze engagement signals from call intelligence
      const buyerCalls = callsByBuyer[buyer.id] || [];
      const engagementSignals = analyzeEngagementSignals(buyerCalls);
      
      const sizeScore = scoreSizeCategory(deal as Deal, buyer as Buyer);
      const geographyScore = scoreGeographyCategory(deal as Deal, buyer as Buyer, dealAttractiveness, engagementSignals);
      const servicesScore = scoreServicesCategory(deal as Deal, buyer as Buyer, tracker.industry_name);
      const ownerGoalsScore = scoreOwnerGoalsCategory(deal as Deal, buyer as Buyer);
      const thesisBonus = calculateThesisBonus(buyer as Buyer);
      
      // NEW: Calculate engagement bonus (up to 15 points)
      const engagementBonus = Math.min(15, engagementSignals.engagementScore * 0.15);
      
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
        engagementBonus // Engagement bonus adds up to 15 points
      );
      
      // Apply size multiplier - this is the key mechanism for making size a gating factor
      // When size is below minimums, sizeMultiplier < 1.0 caps the maximum achievable score
      const compositeScore = baseComposite * sizeScore.sizeMultiplier;
      
      // Generate overall reasoning with size context
      let overallReasoning = "";
      if (isDisqualified) {
        overallReasoning = `❌ DISQUALIFIED: ${disqualificationReasons[0]}`;
      } else if (sizeScore.sizeMultiplier < 0.7) {
        // Size is a major limiting factor
        overallReasoning = `⚠️ Size challenge: ${sizeScore.reasoning}. Even with ${geographyScore.reasoning.split('.')[0].toLowerCase()}, size limits fit.`;
      } else if (compositeScore >= 75) {
        overallReasoning = `✅ Strong fit: ${geographyScore.reasoning.split('.')[0]}. ${servicesScore.reasoning.split('.')[0]}.`;
        if (engagementSignals.signals.length > 0) {
          overallReasoning += ` 🎯 ${engagementSignals.signals[0]}.`;
        }
      } else if (compositeScore >= 50) {
        overallReasoning = `✓ Moderate fit: ${geographyScore.reasoning.split('.')[0]}. Consider for outreach.`;
        if (sizeScore.sizeMultiplier < 0.9) {
          overallReasoning += ` Size may be a limiting factor.`;
        }
        if (engagementSignals.signals.length > 0) {
          overallReasoning += ` 🎯 ${engagementSignals.signals[0]}.`;
        }
      } else {
        overallReasoning = `⚠️ Long shot: ${sizeScore.reasoning}. ${geographyScore.reasoning.split('.')[0]}.`;
      }
      
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
        overallReasoning,
        isDisqualified,
        disqualificationReasons,
        dataCompleteness: calculateDataCompleteness(buyer as Buyer, deal as Deal),
        dealAttractiveness,
        engagementSignals,
      };
    });

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
        withEngagement: scores.filter(s => s.engagementSignals.hasCalls).length,
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
