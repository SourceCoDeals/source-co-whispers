import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Deal Scoring Algorithm v5.0 - Prioritized Scoring
 * 
 * Weight Distribution (100 points total):
 * - Size: 40 pts (TOP PRIORITY - gating factor)
 * - Service Alignment: 30 pts (Critical - primary service detection)
 * - Data Quality: 15 pts
 * - Geography: 10 pts (Much less important)
 * - Buyer Type Bonus: 5 pts (Bonus for fitting multiple buyer types)
 * 
 * Key Features:
 * - Primary service detection (towing vs collision)
 * - Severe penalties for off-focus primary services
 * - Size disqualification for deals way below minimums
 * - NO engagement signals
 */

// ============= INTERFACES =============

interface DealData {
  id: string;
  deal_name: string;
  tracker_id: string;
  revenue: number | null;
  ebitda_amount: number | null;
  ebitda_percentage: number | null;
  owner_goals: string | null;
  geography: string[] | null;
  headquarters: string | null;
  location_count: number | null;
  employee_count: number | null;
  additional_info: string | null;
  service_mix: string | null;
  growth_trajectory: string | null;
  real_estate: string | null;
  customer_concentration: string | null;
  company_overview: string | null;
}

interface TrackerCriteria {
  fit_criteria_size: string | null;
  fit_criteria_service: string | null;
  fit_criteria_geography: string | null;
  size_criteria: any;
  service_criteria: any;
  geography_criteria: any;
  buyer_types_criteria: any;
  geography_weight: number;
  service_mix_weight: number;
  size_weight: number;
  owner_goals_weight: number;
}

interface BuyerType {
  type_name: string;
  min_revenue?: number;
  max_revenue?: number;
  min_ebitda?: number;
  max_ebitda?: number;
  min_locations?: number;
  max_locations?: number;
  geographic_scope?: string;
  exclusions?: string[];
  priority?: number;
}

interface ScoreBreakdown {
  sizeScore: number;
  sizeDetails: string;
  serviceScore: number;
  serviceDetails: string;
  geographyScore: number;
  geographyDetails: string;
  dataScore: number;
  dataDetails: string;
  buyerTypeBonusScore: number;
  buyerTypeBonusDetails: string;
  totalScore: number;
  scoringVersion: string;
  disqualified: boolean;
  disqualificationReasons: string[];
  primaryService: string;
}

// ============= PRIMARY SERVICE DETECTION =============

/**
 * Detects whether the deal's PRIMARY business is collision repair or something else (like towing).
 * This is critical for accurate scoring - a company that primarily does towing should score 
 * much lower for a collision repair tracker.
 */
function detectPrimaryService(deal: DealData): {
  primaryService: 'collision' | 'towing' | 'mechanical' | 'other';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
} {
  const allText = [
    deal.deal_name || '',
    deal.service_mix || '',
    deal.additional_info || '',
    deal.company_overview || ''
  ].join(' ').toLowerCase();
  
  if (allText.trim().length < 5) {
    return { primaryService: 'other', confidence: 'low', reasoning: 'Insufficient data' };
  }
  
  // 1. Asset count analysis - tow trucks strongly indicate towing business
  const towTruckMatch = allText.match(/(\d+)\s*(?:tow\s*trucks?|flatbed|flatbeds|wreckers?)/i);
  const towTruckCount = towTruckMatch ? parseInt(towTruckMatch[1]) : 0;
  
  // 2. Position analysis - first mentioned service often indicates primary focus
  const towingIndex = allText.indexOf('towing');
  const collisionIndex = allText.indexOf('collision');
  const bodyShopIndex = allText.indexOf('body shop');
  const autoBodyIndex = allText.indexOf('auto body');
  const paintIndex = allText.indexOf('paint');
  
  // Find first collision-related mention
  const collisionPositions = [collisionIndex, bodyShopIndex, autoBodyIndex, paintIndex]
    .filter(p => p >= 0);
  const firstCollisionMention = collisionPositions.length > 0 ? Math.min(...collisionPositions) : -1;
  
  // 3. Frequency analysis
  const towingMentions = (allText.match(/towing|tow\s*truck|flatbed|wrecker/g) || []).length;
  const collisionMentions = (allText.match(/collision|body\s*shop|auto\s*body|paint|refinish|drp|adas|calibration/g) || []).length;
  
  // 4. Deal name analysis - if "towing" is in the name, it's primary
  const dealNameLower = (deal.deal_name || '').toLowerCase();
  if (dealNameLower.includes('towing') || dealNameLower.includes('tow')) {
    return { 
      primaryService: 'towing', 
      confidence: 'high', 
      reasoning: `"Towing" in deal name indicates primary business` 
    };
  }
  
  // 5. Strong towing indicators
  if (towTruckCount >= 5) {
    return { 
      primaryService: 'towing', 
      confidence: 'high', 
      reasoning: `${towTruckCount} tow trucks indicate towing is primary business` 
    };
  }
  
  // 6. If towing mentioned first AND more frequently than collision
  if (towingIndex >= 0 && (firstCollisionMention === -1 || towingIndex < firstCollisionMention)) {
    if (towingMentions >= collisionMentions) {
      return { 
        primaryService: 'towing', 
        confidence: 'medium', 
        reasoning: `Towing mentioned first (position ${towingIndex}) and ${towingMentions}x vs collision ${collisionMentions}x` 
      };
    }
  }
  
  // 7. If collision clearly dominates
  if (collisionMentions > towingMentions * 2) {
    return { 
      primaryService: 'collision', 
      confidence: 'high', 
      reasoning: `Collision services dominant (${collisionMentions} mentions vs ${towingMentions} towing)` 
    };
  }
  
  // 8. If collision mentioned at all and towing not mentioned, it's collision
  if (firstCollisionMention >= 0 && towingIndex === -1) {
    return { 
      primaryService: 'collision', 
      confidence: 'high', 
      reasoning: `Collision/body shop mentioned, no towing references` 
    };
  }
  
  // 9. Mechanical shop detection
  const mechanicalMentions = (allText.match(/mechanical|oil change|brake|tire|transmission|engine repair/g) || []).length;
  if (mechanicalMentions > collisionMentions && mechanicalMentions > towingMentions) {
    return { 
      primaryService: 'mechanical', 
      confidence: 'medium', 
      reasoning: `Mechanical services dominant (${mechanicalMentions} mentions)` 
    };
  }
  
  // 10. Default - if we have any collision mentions, assume collision
  if (collisionMentions > 0) {
    return { 
      primaryService: 'collision', 
      confidence: 'low', 
      reasoning: `Defaulting to collision with ${collisionMentions} mentions` 
    };
  }
  
  return { 
    primaryService: 'other', 
    confidence: 'low', 
    reasoning: 'Could not determine primary service' 
  };
}

// ============= SIZE SCORING (40 points max) =============

function calculateSizeScore(deal: DealData, criteria: TrackerCriteria | null): {
  score: number;
  details: string;
  disqualified: boolean;
  disqualificationReason: string | null;
} {
  const parts: string[] = [];
  let score = 0;
  let disqualified = false;
  let disqualificationReason: string | null = null;
  
  const dealRevenue = deal.revenue || 0;
  const dealEbitda = deal.ebitda_amount || 0;
  const dealLocations = deal.location_count || 1;
  
  // Parse tracker size criteria
  let minRevenue = 0;
  let maxRevenue = 100; // Default in millions
  let minEbitda = 0;
  let maxEbitda = 20;
  let minLocations = 1;
  let maxLocations = 100;
  
  if (criteria?.size_criteria) {
    const sizeCriteria = typeof criteria.size_criteria === 'string' 
      ? JSON.parse(criteria.size_criteria) 
      : criteria.size_criteria;
    
    // Parse revenue (stored in dollars, deal.revenue is in millions)
    if (sizeCriteria.min_revenue) {
      minRevenue = sizeCriteria.min_revenue / 1000000;
    }
    if (sizeCriteria.max_revenue) {
      maxRevenue = sizeCriteria.max_revenue / 1000000;
    }
    if (sizeCriteria.min_ebitda) {
      minEbitda = sizeCriteria.min_ebitda / 1000000;
    }
    if (sizeCriteria.max_ebitda) {
      maxEbitda = sizeCriteria.max_ebitda / 1000000;
    }
    if (sizeCriteria.min_locations) {
      minLocations = sizeCriteria.min_locations;
    }
    if (sizeCriteria.max_locations) {
      maxLocations = sizeCriteria.max_locations;
    }
    
    console.log(`[score-deal v5.0] Size criteria: Revenue $${minRevenue}M-$${maxRevenue}M, EBITDA $${minEbitda}M-$${maxEbitda}M, Locations ${minLocations}-${maxLocations}`);
  }
  
  // REVENUE SCORING (16 pts max)
  if (dealRevenue > 0) {
    if (dealRevenue >= minRevenue && dealRevenue <= maxRevenue) {
      // Perfect fit
      score += 16;
      parts.push(`Revenue $${dealRevenue.toFixed(2)}M in range = +16pts`);
    } else if (dealRevenue > maxRevenue) {
      // Over max - still good but might need bigger buyer
      if (dealRevenue > maxRevenue * 2) {
        score += 8;
        parts.push(`Revenue $${dealRevenue.toFixed(2)}M way over max = +8pts`);
      } else {
        score += 12;
        parts.push(`Revenue $${dealRevenue.toFixed(2)}M slightly over = +12pts`);
      }
    } else if (dealRevenue < minRevenue) {
      // Under min - check how much
      const percentBelow = ((minRevenue - dealRevenue) / minRevenue) * 100;
      if (percentBelow > 50) {
        // Way below - DISQUALIFY
        disqualified = true;
        disqualificationReason = `Revenue $${dealRevenue.toFixed(2)}M is ${percentBelow.toFixed(0)}% below minimum $${minRevenue}M`;
        score = 0;
        parts.push(`Revenue ${percentBelow.toFixed(0)}% below min = DISQUALIFIED`);
      } else if (percentBelow > 30) {
        score += 4;
        parts.push(`Revenue ${percentBelow.toFixed(0)}% below min = +4pts`);
      } else {
        score += 8;
        parts.push(`Revenue slightly below min = +8pts`);
      }
    }
  } else {
    // No revenue data - partial score
    score += 4;
    parts.push('No revenue data = +4pts');
  }
  
  // EBITDA SCORING (16 pts max)
  if (dealEbitda > 0) {
    if (minEbitda > 0 || maxEbitda < 20) {
      // Has EBITDA criteria
      if (dealEbitda >= minEbitda && dealEbitda <= maxEbitda) {
        score += 16;
        parts.push(`EBITDA $${dealEbitda.toFixed(2)}M in range = +16pts`);
      } else if (dealEbitda > maxEbitda) {
        score += 12;
        parts.push(`EBITDA $${dealEbitda.toFixed(2)}M over range = +12pts`);
      } else {
        // Under min
        const percentBelow = ((minEbitda - dealEbitda) / minEbitda) * 100;
        if (percentBelow > 50) {
          // Way below - severe penalty
          score += 2;
          parts.push(`EBITDA ${percentBelow.toFixed(0)}% below min = +2pts (weak)`);
        } else {
          score += 8;
          parts.push(`EBITDA below min = +8pts`);
        }
      }
    } else {
      // No EBITDA criteria - give points for having EBITDA
      score += 10;
      parts.push(`EBITDA $${dealEbitda.toFixed(2)}M present = +10pts`);
    }
  } else {
    score += 2;
    parts.push('No EBITDA data = +2pts');
  }
  
  // LOCATION COUNT SCORING (8 pts max)
  if (dealLocations >= minLocations && dealLocations <= maxLocations) {
    score += 8;
    parts.push(`${dealLocations} locations in range = +8pts`);
  } else if (dealLocations < minLocations) {
    if (dealLocations === 1 && minLocations > 3) {
      score += 2;
      parts.push(`Single location (need ${minLocations}+) = +2pts`);
    } else {
      score += 4;
      parts.push(`${dealLocations} locations (need ${minLocations}+) = +4pts`);
    }
  } else {
    // Over max locations - still good
    score += 6;
    parts.push(`${dealLocations} locations (above ${maxLocations}) = +6pts`);
  }
  
  return {
    score: Math.min(score, 40),
    details: parts.join('; '),
    disqualified,
    disqualificationReason
  };
}

// ============= SERVICE SCORING (30 points max) =============

function calculateServiceScore(deal: DealData, criteria: TrackerCriteria | null, primaryService: string): {
  score: number;
  details: string;
  disqualified: boolean;
  disqualificationReason: string | null;
} {
  const parts: string[] = [];
  let score = 0;
  let disqualified = false;
  let disqualificationReason: string | null = null;
  
  const allText = [
    deal.service_mix || '',
    deal.additional_info || '',
    deal.company_overview || ''
  ].join(' ').toLowerCase();
  
  if (!allText || allText.trim().length < 5) {
    return { score: 8, details: 'No service data = +8pts (default)', disqualified: false, disqualificationReason: null };
  }
  
  // Parse tracker service criteria
  let requiredServices: string[] = [];
  let preferredServices: string[] = [];
  let excludedServices: string[] = [];
  let businessModel: string | null = null;
  
  if (criteria?.service_criteria) {
    const serviceCriteria = typeof criteria.service_criteria === 'string'
      ? JSON.parse(criteria.service_criteria)
      : criteria.service_criteria;
    
    requiredServices = (serviceCriteria.required_services || []).map((s: string) => s.toLowerCase());
    preferredServices = (serviceCriteria.preferred_services || []).map((s: string) => s.toLowerCase());
    excludedServices = (serviceCriteria.excluded_services || []).map((s: string) => s.toLowerCase());
    businessModel = serviceCriteria.business_model?.toLowerCase() || null;
    
    console.log(`[score-deal v5.0] Service criteria: Required=${requiredServices.join(',')}, Excluded=${excludedServices.join(',')}`);
  }
  
  // CRITICAL: Check primary service alignment
  // If primary service is on the EXCLUDED list, severe penalty
  if (primaryService === 'towing') {
    const towingExcluded = excludedServices.some(s => 
      s.includes('towing') || s.includes('tow')
    );
    
    if (towingExcluded || excludedServices.length > 0) {
      // Towing is primary and it's on excluded list - SEVERE PENALTY
      score -= 20;
      parts.push(`PRIMARY SERVICE IS TOWING (excluded) = -20pts SEVERE PENALTY`);
    } else {
      // Towing is primary but not explicitly excluded
      score -= 10;
      parts.push(`PRIMARY SERVICE IS TOWING (off-focus for collision tracker) = -10pts`);
    }
  } else if (primaryService === 'mechanical') {
    score -= 10;
    parts.push(`PRIMARY SERVICE IS MECHANICAL (off-focus) = -10pts`);
  } else if (primaryService === 'collision') {
    // On-focus primary service - bonus
    score += 15;
    parts.push(`PRIMARY SERVICE IS COLLISION = +15pts (on-focus)`);
  } else {
    // Unknown primary
    score += 5;
    parts.push(`PRIMARY SERVICE UNKNOWN = +5pts`);
  }
  
  // Check for REQUIRED services (max 8 pts additional)
  let requiredFound = 0;
  const matchedRequired: string[] = [];
  for (const required of requiredServices) {
    const keywords = required.split(' ');
    const matched = keywords.every(kw => allText.includes(kw.toLowerCase()));
    if (matched || allText.includes(required.toLowerCase())) {
      requiredFound++;
      matchedRequired.push(required);
    }
  }
  
  if (requiredServices.length > 0 && requiredFound > 0) {
    const requiredRatio = requiredFound / requiredServices.length;
    const requiredPts = Math.round(requiredRatio * 8);
    score += requiredPts;
    parts.push(`Required services (${matchedRequired.join(', ')}) = +${requiredPts}pts`);
  }
  
  // Check for PREFERRED services (max 5 pts)
  let preferredFound = 0;
  const matchedPreferred: string[] = [];
  for (const preferred of preferredServices) {
    if (allText.includes(preferred.toLowerCase())) {
      preferredFound++;
      matchedPreferred.push(preferred);
    }
  }
  
  if (preferredServices.length > 0 && preferredFound > 0) {
    const preferredPts = Math.min(preferredFound * 2, 5);
    score += preferredPts;
    parts.push(`Preferred services (${matchedPreferred.join(', ')}) = +${preferredPts}pts`);
  }
  
  // Business model match (max 2 pts)
  if (businessModel) {
    if (allText.includes(businessModel) || 
        (businessModel === 'drp-focused' && (allText.includes('drp') || allText.includes('direct repair')))) {
      score += 2;
      parts.push(`Business model match = +2pts`);
    }
  }
  
  return {
    score: Math.max(-10, Math.min(score, 30)), // Can go negative but floor at -10
    details: parts.join('; '),
    disqualified,
    disqualificationReason
  };
}

// ============= GEOGRAPHY SCORING (10 points max) =============

function calculateGeographyScore(deal: DealData, criteria: TrackerCriteria | null): {
  score: number;
  details: string;
} {
  const parts: string[] = [];
  let score = 0;
  
  const dealStates = (deal.geography || []).map(s => s.toUpperCase().trim());
  const headquarters = (deal.headquarters || '').toLowerCase();
  
  if (dealStates.length === 0 && !headquarters) {
    return { score: 3, details: 'No geography data = +3pts (default)' };
  }
  
  // Parse geography criteria
  let requiredRegions: string[] = [];
  let preferredRegions: string[] = [];
  let excludedRegions: string[] = [];
  
  if (criteria?.geography_criteria) {
    const geoCriteria = typeof criteria.geography_criteria === 'string'
      ? JSON.parse(criteria.geography_criteria)
      : criteria.geography_criteria;
    
    requiredRegions = (geoCriteria.required_regions || []).map((s: string) => s.toLowerCase());
    preferredRegions = (geoCriteria.preferred_regions || []).map((s: string) => s.toLowerCase());
    excludedRegions = (geoCriteria.excluded_regions || []).map((s: string) => s.toLowerCase());
  }
  
  // Region mapping
  const regionStates: Record<string, string[]> = {
    'southeast': ['FL', 'GA', 'AL', 'SC', 'NC', 'TN', 'MS', 'LA', 'AR', 'KY', 'VA', 'WV'],
    'texas': ['TX'],
    'california': ['CA'],
    'southwest': ['AZ', 'NM', 'NV', 'UT', 'CO'],
    'northeast': ['NY', 'NJ', 'PA', 'CT', 'MA', 'RI', 'VT', 'NH', 'ME', 'MD', 'DE'],
    'midwest': ['IL', 'IN', 'OH', 'MI', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'SD', 'ND'],
    'pacific': ['CA', 'OR', 'WA', 'AK', 'HI'],
    'mountain': ['MT', 'ID', 'WY', 'CO', 'UT', 'NV'],
    'oklahoma': ['OK'],
    'mid-atlantic': ['MD', 'DE', 'NJ', 'PA', 'VA', 'WV', 'DC'],
  };
  
  let inRequired = false;
  let inPreferred = false;
  let inExcluded = false;
  
  // Check regions
  for (const region of requiredRegions) {
    const statesInRegion = regionStates[region.toLowerCase()] || [];
    if (headquarters.includes(region)) {
      inRequired = true;
      parts.push(`HQ in required region`);
      break;
    }
    for (const state of dealStates) {
      if (statesInRegion.includes(state)) {
        inRequired = true;
        parts.push(`${state} in required region`);
        break;
      }
    }
    if (inRequired) break;
  }
  
  for (const region of preferredRegions) {
    const statesInRegion = regionStates[region.toLowerCase()] || [];
    for (const state of dealStates) {
      if (statesInRegion.includes(state)) {
        inPreferred = true;
        break;
      }
    }
    if (inPreferred) break;
  }
  
  for (const region of excludedRegions) {
    const statesInRegion = regionStates[region.toLowerCase()] || [];
    for (const state of dealStates) {
      if (statesInRegion.includes(state)) {
        inExcluded = true;
        parts.push(`${state} in excluded region`);
        break;
      }
    }
    if (inExcluded) break;
  }
  
  // Score
  if (inExcluded) {
    score = 1;
    parts.push('= +1pt');
  } else if (inRequired) {
    score = 10;
    parts.push('= +10pts');
  } else if (inPreferred) {
    score = 7;
    parts.push('In preferred region = +7pts');
  } else if (requiredRegions.length === 0 && preferredRegions.length === 0) {
    score = 6;
    parts.push('No region criteria = +6pts');
  } else {
    score = 4;
    parts.push(`Location (${dealStates.join(', ')}) not in target = +4pts`);
  }
  
  return {
    score: Math.min(score, 10),
    details: parts.join('; ')
  };
}

// ============= DATA QUALITY SCORING (15 points max) =============

function calculateDataScore(deal: DealData): {
  score: number;
  details: string;
  fieldsPresent: string[];
} {
  let score = 0;
  const fieldsPresent: string[] = [];
  
  // Key fields
  if (deal.revenue && deal.revenue > 0) {
    score += 3;
    fieldsPresent.push('revenue');
  }
  
  if ((deal.ebitda_amount && deal.ebitda_amount > 0) || (deal.ebitda_percentage && deal.ebitda_percentage > 0)) {
    score += 3;
    fieldsPresent.push('ebitda');
  }
  
  if (deal.owner_goals && deal.owner_goals.trim().length > 10) {
    score += 2;
    fieldsPresent.push('owner_goals');
  }
  
  if ((deal.geography && deal.geography.length > 0) || deal.headquarters) {
    score += 2;
    fieldsPresent.push('geography');
  }
  
  if (deal.service_mix && deal.service_mix.trim().length > 10) {
    score += 2;
    fieldsPresent.push('service_mix');
  }
  
  if (deal.location_count && deal.location_count > 0) {
    score += 1;
    fieldsPresent.push('locations');
  }
  
  if (deal.employee_count && deal.employee_count > 0) {
    score += 1;
    fieldsPresent.push('employees');
  }
  
  if (deal.growth_trajectory && deal.growth_trajectory.trim().length > 5) {
    score += 1;
    fieldsPresent.push('growth');
  }
  
  return { 
    score: Math.min(score, 15), 
    details: `${fieldsPresent.length} fields: ${fieldsPresent.join(', ')} = ${Math.min(score, 15)}pts`,
    fieldsPresent
  };
}

// ============= BUYER TYPE BONUS (5 points max) =============

function calculateBuyerTypeBonus(deal: DealData, criteria: TrackerCriteria | null): {
  score: number;
  details: string;
  fittingBuyerTypes: string[];
} {
  const fittingBuyerTypes: string[] = [];
  
  if (!criteria?.buyer_types_criteria) {
    return { score: 2, details: 'No buyer types defined = +2pts default', fittingBuyerTypes: [] };
  }
  
  let buyerTypes: BuyerType[] = [];
  try {
    const parsed = typeof criteria.buyer_types_criteria === 'string'
      ? JSON.parse(criteria.buyer_types_criteria)
      : criteria.buyer_types_criteria;
    buyerTypes = parsed.buyer_types || [];
  } catch (e) {
    return { score: 2, details: 'Could not parse buyer types = +2pts', fittingBuyerTypes: [] };
  }
  
  if (buyerTypes.length === 0) {
    return { score: 2, details: 'No buyer types configured = +2pts', fittingBuyerTypes: [] };
  }
  
  const dealRevenue = deal.revenue || 0;
  const dealEbitda = deal.ebitda_amount || 0;
  const dealLocations = deal.location_count || 1;
  
  // Check each buyer type for fit
  for (const bt of buyerTypes) {
    let fits = true;
    
    // Check revenue
    if (bt.min_revenue && dealRevenue < bt.min_revenue / 1000000) fits = false;
    if (bt.max_revenue && dealRevenue > bt.max_revenue / 1000000) fits = false;
    
    // Check EBITDA
    if (bt.min_ebitda && dealEbitda < bt.min_ebitda / 1000000) fits = false;
    if (bt.max_ebitda && dealEbitda > bt.max_ebitda / 1000000) fits = false;
    
    // Check locations
    if (bt.min_locations && dealLocations < bt.min_locations) fits = false;
    if (bt.max_locations && dealLocations > bt.max_locations) fits = false;
    
    if (fits) {
      fittingBuyerTypes.push(bt.type_name);
    }
  }
  
  // Score based on how many buyer types this deal fits
  let score = 0;
  if (fittingBuyerTypes.length >= 3) {
    score = 5;
  } else if (fittingBuyerTypes.length === 2) {
    score = 3;
  } else if (fittingBuyerTypes.length === 1) {
    score = 2;
  } else {
    score = 0;
  }
  
  return {
    score,
    details: fittingBuyerTypes.length > 0 
      ? `Fits ${fittingBuyerTypes.length} buyer types (${fittingBuyerTypes.slice(0, 3).join(', ')}) = +${score}pts`
      : 'Fits 0 buyer types = +0pts',
    fittingBuyerTypes
  };
}

// ============= MAIN SCORING FUNCTION =============

async function scoreDeal(deal: DealData, supabase: any): Promise<ScoreBreakdown> {
  // Fetch tracker criteria
  let trackerCriteria: TrackerCriteria | null = null;
  
  try {
    const { data: tracker } = await supabase
      .from('industry_trackers')
      .select(`
        fit_criteria_size, fit_criteria_service, fit_criteria_geography, 
        size_criteria, service_criteria, geography_criteria, buyer_types_criteria,
        geography_weight, service_mix_weight, size_weight, owner_goals_weight
      `)
      .eq('id', deal.tracker_id)
      .single();
    
    if (tracker) {
      trackerCriteria = tracker;
      console.log('[score-deal v5.0] Using tracker criteria');
    }
  } catch (e) {
    console.log('[score-deal v5.0] Could not fetch tracker criteria');
  }
  
  // STEP 1: Detect primary service
  const primaryServiceInfo = detectPrimaryService(deal);
  console.log(`[score-deal v5.0] Primary service: ${primaryServiceInfo.primaryService} (${primaryServiceInfo.confidence}) - ${primaryServiceInfo.reasoning}`);
  
  // STEP 2: Calculate all scores
  const size = calculateSizeScore(deal, trackerCriteria);
  const service = calculateServiceScore(deal, trackerCriteria, primaryServiceInfo.primaryService);
  const geography = calculateGeographyScore(deal, trackerCriteria);
  const data = calculateDataScore(deal);
  const buyerTypeBonus = calculateBuyerTypeBonus(deal, trackerCriteria);
  
  // Collect disqualifications
  const disqualificationReasons: string[] = [];
  if (size.disqualified && size.disqualificationReason) {
    disqualificationReasons.push(size.disqualificationReason);
  }
  if (service.disqualified && service.disqualificationReason) {
    disqualificationReasons.push(service.disqualificationReason);
  }
  
  const isDisqualified = size.disqualified || service.disqualified;
  
  // Calculate total (100 pts max: 40 size + 30 service + 10 geo + 15 data + 5 bonus)
  let rawTotal = size.score + service.score + geography.score + data.score + buyerTypeBonus.score;
  
  // Cap disqualified deals at 25
  if (isDisqualified) {
    rawTotal = Math.min(rawTotal, 25);
  }
  
  const totalScore = Math.max(0, Math.min(rawTotal, 100));
  
  console.log(`[score-deal v5.0] ${deal.deal_name}: Size=${size.score}/40, Service=${service.score}/30, Geo=${geography.score}/10, Data=${data.score}/15, Bonus=${buyerTypeBonus.score}/5 = ${totalScore}`);
  
  return {
    sizeScore: size.score,
    sizeDetails: size.details,
    serviceScore: service.score,
    serviceDetails: service.details,
    geographyScore: geography.score,
    geographyDetails: geography.details,
    dataScore: data.score,
    dataDetails: data.details,
    buyerTypeBonusScore: buyerTypeBonus.score,
    buyerTypeBonusDetails: buyerTypeBonus.details,
    totalScore,
    scoringVersion: '5.0-prioritized',
    disqualified: isDisqualified,
    disqualificationReasons,
    primaryService: primaryServiceInfo.primaryService
  };
}

// ============= HTTP HANDLER =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId } = await req.json();
    
    if (!dealId) {
      return new Response(
        JSON.stringify({ success: false, error: 'dealId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[score-deal v5.0] Scoring deal:', dealId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, supabaseKey);

    // Fetch deal
    const { data: deal, error: fetchError } = await serviceClient
      .from('deals')
      .select(`
        id, deal_name, tracker_id, revenue, ebitda_amount, ebitda_percentage, 
        owner_goals, geography, headquarters, location_count, employee_count,
        additional_info, service_mix, growth_trajectory, real_estate, 
        customer_concentration, company_overview
      `)
      .eq('id', dealId)
      .single();

    if (fetchError || !deal) {
      console.error('[score-deal v5.0] Deal not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Deal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Score
    const breakdown = await scoreDeal(deal as DealData, serviceClient);
    
    console.log('[score-deal v5.0] Score breakdown:', JSON.stringify(breakdown, null, 2));

    // Update deal
    const { error: updateError } = await serviceClient
      .from('deals')
      .update({ 
        deal_score: breakdown.totalScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', dealId);

    if (updateError) {
      console.error('[score-deal v5.0] Update failed:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save score' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[score-deal v5.0] Scored:', deal.deal_name, '=', breakdown.totalScore);

    return new Response(
      JSON.stringify({ 
        success: true, 
        score: breakdown.totalScore,
        breakdown 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[score-deal v5.0] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
