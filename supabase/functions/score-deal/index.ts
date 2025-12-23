import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Comprehensive Deal Scoring Algorithm (0-100)
 * 
 * 1. SIZE & SCALE (35 points max):
 *    - Revenue Score (20 pts): Granular tiers from $10M+ to <$500K
 *    - Location Count Score (10 pts): Multi-location is a gating factor
 *    - Employee Count Score (5 pts): Workforce depth indicator
 * 
 * 2. SERVICE MIX & CAPABILITIES (15 points max):
 *    - Matches against tracker's service_criteria (required/preferred)
 *    - Required services (DRP, OEM certs): up to 8 pts
 *    - Preferred services (ADAS, mechanical): up to 7 pts
 *    - Off-focus services (towing, rentals): 0 pts, potential penalty
 * 
 * 3. GEOGRAPHY & MSA PROXIMITY (15 points max):
 *    - Priority MSAs from tracker criteria: 15 pts
 *    - Top 15 MSAs: 12 pts
 *    - Top 50 MSAs: 8 pts
 *    - Secondary markets: 5 pts
 *    - Rural: 2 pts
 * 
 * 4. DATA QUALITY & COMPLETENESS (15 points max):
 *    - Key fields present: revenue, ebitda, owner_goals, geography, service_mix, etc.
 * 
 * 5. OWNER GOALS & TRANSACTION READINESS (10 points max):
 *    - Exit intent scoring (reduced weight)
 *    - Transaction structure flexibility
 * 
 * 6. BONUS/PENALTY FACTORS (10 points max):
 *    - Real estate ownership: +3
 *    - Growth trajectory: +2
 *    - Low customer concentration: +2
 *    - Modern facility (10,000+ sqft): +2
 *    - Certifications: +1
 *    - PENALTY: Single location when multi required: -5
 *    - PENALTY: Below minimum revenue: -3
 */

// ============= MSA REFERENCE DATA =============

// Priority MSAs - commonly targeted by collision repair buyers
const PRIORITY_MSAS = [
  'new york', 'nyc', 'manhattan', 'brooklyn', 'bronx', 'queens',
  'san francisco', 'sf', 'bay area', 'oakland', 'san jose',
  'seattle', 'bellevue', 'tacoma',
  'washington', 'dc', 'washington dc', 'arlington', 'alexandria', 'bethesda', 'montgomery county', 'fairfax',
  'dallas', 'fort worth', 'dfw', 'plano', 'irving',
  'denver', 'aurora', 'boulder', 'colorado springs'
];

// Top 15 MSAs by population
const TIER_1_MSAS = [
  'los angeles', 'la', 'orange county', 'long beach', 'pasadena',
  'chicago', 'naperville', 'joliet', 'aurora',
  'houston', 'the woodlands', 'sugar land', 'katy',
  'phoenix', 'scottsdale', 'mesa', 'tempe', 'chandler',
  'atlanta', 'marietta', 'sandy springs', 'alpharetta',
  'boston', 'cambridge', 'worcester', 'providence',
  'philadelphia', 'camden', 'wilmington', 'chester',
  'miami', 'fort lauderdale', 'west palm beach', 'boca raton',
  'minneapolis', 'st paul', 'bloomington',
  'san diego', 'carlsbad', 'chula vista'
];

// Top 50 MSAs (secondary tier)
const TIER_2_MSAS = [
  'portland', 'beaverton', 'hillsboro',
  'austin', 'round rock', 'georgetown',
  'charlotte', 'concord', 'gastonia',
  'tampa', 'st petersburg', 'clearwater',
  'orlando', 'kissimmee', 'sanford',
  'detroit', 'warren', 'dearborn', 'ann arbor',
  'baltimore', 'columbia', 'towson',
  'st louis', 'st. louis', 'chesterfield',
  'sacramento', 'roseville', 'elk grove',
  'pittsburgh', 'allegheny',
  'cleveland', 'akron', 'canton',
  'cincinnati', 'dayton',
  'kansas city', 'overland park',
  'columbus', 'dublin',
  'indianapolis', 'carmel',
  'nashville', 'murfreesboro',
  'las vegas', 'henderson', 'north las vegas',
  'san antonio', 'new braunfels',
  'jacksonville',
  'memphis',
  'oklahoma city', 'okc', 'norman', 'edmond',
  'louisville',
  'richmond', 'virginia beach', 'norfolk',
  'milwaukee', 'waukesha',
  'raleigh', 'durham', 'cary',
  'hartford', 'new haven', 'bridgeport',
  'salt lake city', 'provo', 'ogden',
  'birmingham',
  'buffalo', 'rochester'
];

// ============= SERVICE KEYWORDS =============

// Required/high-value services for collision repair
const REQUIRED_SERVICE_KEYWORDS = [
  'drp', 'direct repair', 'direct repair program',
  'oem', 'oem certified', 'profirst', 'pro first',
  'honda certified', 'toyota certified', 'acura certified',
  'bmw certified', 'mercedes certified', 'tesla certified',
  'aluminum certified', 'structural repair'
];

// Preferred/value-add services
const PREFERRED_SERVICE_KEYWORDS = [
  'adas', 'calibration', 'adas calibration', 'advanced driver',
  'mechanical', 'mechanical repair', 'mechanical services',
  'glass', 'glass repair', 'windshield',
  'detailing', 'detail', 'reconditioning',
  'pdr', 'paintless dent', 'dent repair',
  'paint', 'refinish', 'refinishing', 'body shop',
  'frame', 'frame repair', 'unibody'
];

// Off-focus services (not what collision buyers want)
const OFF_FOCUS_SERVICE_KEYWORDS = [
  'towing', 'tow truck', 'roadside', 'roadside assistance',
  'rental', 'car rental', 'rental car', 'enterprise',
  'storage', 'vehicle storage', 'impound', 'salvage',
  'junk', 'junkyard', 'scrap', 'parts recycling'
];

// ============= INTERFACES =============

interface DealData {
  id: string;
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
}

interface ScoreBreakdown {
  // Size & Scale (35 pts)
  sizeScore: number;
  sizeDetails: string;
  revenueScore: number;
  locationScore: number;
  employeeScore: number;
  
  // Service Mix (15 pts)
  serviceScore: number;
  serviceDetails: string;
  requiredServicesScore: number;
  preferredServicesScore: number;
  
  // Geography (15 pts)
  geographyScore: number;
  geographyDetails: string;
  msaTier: string;
  
  // Data Quality (15 pts)
  dataScore: number;
  dataDetails: string;
  fieldsPresent: string[];
  
  // Owner Goals (10 pts)
  ownerScore: number;
  ownerDetails: string;
  
  // Bonus/Penalty (10 pts max, can go negative)
  bonusScore: number;
  bonusDetails: string;
  penalties: string[];
  
  // Total
  totalScore: number;
  scoringVersion: string;
}

// ============= SCORING FUNCTIONS =============

/**
 * SIZE & SCALE SCORING (35 points max)
 * - Revenue: 20 pts
 * - Location Count: 10 pts
 * - Employee Count: 5 pts
 */
function calculateSizeScore(deal: DealData, trackerCriteria: TrackerCriteria | null): { 
  score: number; 
  details: string; 
  revenueScore: number;
  locationScore: number;
  employeeScore: number;
} {
  let revenueScore = 0;
  let locationScore = 0;
  let employeeScore = 0;
  const parts: string[] = [];
  
  // Revenue scoring (20 pts max) - granular tiers based on buyer minimums
  const revenue = deal.revenue || 0;
  if (revenue >= 10) {
    revenueScore = 20;
    parts.push(`$${revenue}M revenue = 20pts (platform-ready)`);
  } else if (revenue >= 7) {
    revenueScore = 17;
    parts.push(`$${revenue}M revenue = 17pts (strong platform)`);
  } else if (revenue >= 5) {
    revenueScore = 14;
    parts.push(`$${revenue}M revenue = 14pts (large add-on)`);
  } else if (revenue >= 3) {
    revenueScore = 11;
    parts.push(`$${revenue}M revenue = 11pts (solid add-on)`);
  } else if (revenue >= 2) {
    revenueScore = 8;
    parts.push(`$${revenue}M revenue = 8pts (meets minimum)`);
  } else if (revenue >= 1) {
    revenueScore = 5;
    parts.push(`$${revenue}M revenue = 5pts (below minimum)`);
  } else if (revenue >= 0.5) {
    revenueScore = 3;
    parts.push(`$${revenue}M revenue = 3pts (marginal)`);
  } else if (revenue > 0) {
    revenueScore = 1;
    parts.push(`$${revenue}M revenue = 1pt (too small)`);
  } else {
    parts.push('No revenue data = 0pts');
  }
  
  // Location count scoring (10 pts max) - multi-location is gating factor
  const locations = deal.location_count || 0;
  if (locations >= 5) {
    locationScore = 10;
    parts.push(`${locations} locations = 10pts (strong MSO)`);
  } else if (locations >= 3) {
    locationScore = 8;
    parts.push(`${locations} locations = 8pts (meets target)`);
  } else if (locations === 2) {
    locationScore = 5;
    parts.push(`${locations} locations = 5pts (starter multi-site)`);
  } else if (locations === 1) {
    locationScore = 2;
    parts.push(`Single location = 2pts (deal-breaker for some)`);
  } else {
    locationScore = 1;
    parts.push('Unknown locations = 1pt');
  }
  
  // Employee count scoring (5 pts max)
  const employees = deal.employee_count || 0;
  if (employees >= 30) {
    employeeScore = 5;
    parts.push(`${employees} employees = 5pts`);
  } else if (employees >= 15) {
    employeeScore = 4;
    parts.push(`${employees} employees = 4pts`);
  } else if (employees >= 8) {
    employeeScore = 3;
    parts.push(`${employees} employees = 3pts`);
  } else if (employees >= 4) {
    employeeScore = 2;
    parts.push(`${employees} employees = 2pts`);
  } else if (employees >= 1) {
    employeeScore = 1;
    parts.push(`${employees} employees = 1pt`);
  } else {
    parts.push('No employee data = 0pts');
  }
  
  const totalScore = revenueScore + locationScore + employeeScore;
  
  return { 
    score: Math.min(totalScore, 35), 
    details: parts.join('; '),
    revenueScore,
    locationScore,
    employeeScore
  };
}

/**
 * SERVICE MIX SCORING (15 points max)
 * Matches against tracker's service criteria, NOT generic diversification
 * - Required services (DRP, OEM): 8 pts max
 * - Preferred services (ADAS, mechanical): 7 pts max
 * - Off-focus services (towing, rentals): 0 pts, potential penalty
 */
function calculateServiceScore(deal: DealData, trackerCriteria: TrackerCriteria | null): {
  score: number;
  details: string;
  requiredScore: number;
  preferredScore: number;
} {
  let requiredScore = 0;
  let preferredScore = 0;
  const parts: string[] = [];
  const matchedRequired: string[] = [];
  const matchedPreferred: string[] = [];
  const offFocusFound: string[] = [];
  
  // Combine all text fields to search
  const allText = [
    deal.service_mix || '',
    deal.additional_info || '',
    deal.company_overview || ''
  ].join(' ').toLowerCase();
  
  // Check for required/high-value services
  for (const keyword of REQUIRED_SERVICE_KEYWORDS) {
    if (allText.includes(keyword.toLowerCase())) {
      if (!matchedRequired.some(m => m.includes(keyword.split(' ')[0]))) {
        matchedRequired.push(keyword);
      }
    }
  }
  
  // Check for preferred services
  for (const keyword of PREFERRED_SERVICE_KEYWORDS) {
    if (allText.includes(keyword.toLowerCase())) {
      if (!matchedPreferred.some(m => m.includes(keyword.split(' ')[0]))) {
        matchedPreferred.push(keyword);
      }
    }
  }
  
  // Check for off-focus services
  for (const keyword of OFF_FOCUS_SERVICE_KEYWORDS) {
    if (allText.includes(keyword.toLowerCase())) {
      if (!offFocusFound.some(m => m.includes(keyword.split(' ')[0]))) {
        offFocusFound.push(keyword);
      }
    }
  }
  
  // Score required services (max 8 pts)
  // DRP = 4 pts, OEM cert = 4 pts
  const hasDRP = matchedRequired.some(s => s.includes('drp') || s.includes('direct repair'));
  const hasOEM = matchedRequired.some(s => 
    s.includes('oem') || s.includes('certified') || s.includes('profirst')
  );
  
  if (hasDRP) {
    requiredScore += 4;
    parts.push('DRP relationships = +4pts');
  }
  if (hasOEM) {
    requiredScore += 4;
    parts.push('OEM certifications = +4pts');
  }
  
  // Score preferred services (max 7 pts) - 2 pts each, capped
  let prefPts = 0;
  const hasADAS = matchedPreferred.some(s => s.includes('adas') || s.includes('calibration'));
  const hasMechanical = matchedPreferred.some(s => s.includes('mechanical'));
  const hasGlass = matchedPreferred.some(s => s.includes('glass') || s.includes('windshield'));
  const hasPDR = matchedPreferred.some(s => s.includes('pdr') || s.includes('paintless'));
  const hasDetailBody = matchedPreferred.some(s => 
    s.includes('detail') || s.includes('paint') || s.includes('refinish') || 
    s.includes('body shop') || s.includes('frame')
  );
  
  if (hasADAS) { prefPts += 2; parts.push('ADAS/calibration = +2pts'); }
  if (hasMechanical) { prefPts += 2; parts.push('Mechanical = +2pts'); }
  if (hasGlass) { prefPts += 2; parts.push('Glass services = +2pts'); }
  if (hasPDR) { prefPts += 1; parts.push('PDR = +1pt'); }
  if (hasDetailBody) { prefPts += 1; parts.push('Body/refinish = +1pt'); }
  
  preferredScore = Math.min(prefPts, 7);
  
  // Note off-focus but don't penalize unless primary
  if (offFocusFound.length > 0) {
    const isPrimaryOffFocus = offFocusFound.length > matchedPreferred.length + matchedRequired.length;
    if (isPrimaryOffFocus) {
      parts.push(`Primary off-focus services (${offFocusFound.join(', ')}) = no additional penalty`);
    } else {
      parts.push(`Off-focus services present (${offFocusFound.join(', ')}) = 0pts for these`);
    }
  }
  
  // If no services matched at all, give base collision credit
  if (requiredScore === 0 && preferredScore === 0) {
    if (allText.includes('collision') || allText.includes('body shop') || allText.includes('auto body')) {
      preferredScore = 2;
      parts.push('Base collision services = 2pts');
    } else {
      parts.push('No recognized services = 0pts');
    }
  }
  
  const totalScore = Math.min(requiredScore + preferredScore, 15);
  
  return {
    score: totalScore,
    details: parts.join('; ') || 'No service data',
    requiredScore: Math.min(requiredScore, 8),
    preferredScore: Math.min(preferredScore, 7)
  };
}

/**
 * GEOGRAPHY SCORING (15 points max)
 * Based on MSA tier and proximity to buyer target markets
 */
function calculateGeographyScore(deal: DealData, trackerCriteria: TrackerCriteria | null): {
  score: number;
  details: string;
  msaTier: string;
} {
  const parts: string[] = [];
  let score = 0;
  let msaTier = 'unknown';
  
  // Get location text from multiple fields
  const locationText = [
    deal.headquarters || '',
    ...(deal.geography || [])
  ].join(' ').toLowerCase();
  
  if (!locationText || locationText.trim() === '') {
    return { score: 2, details: 'No geography data = 2pts (default)', msaTier: 'unknown' };
  }
  
  // Check Priority MSAs first (from tracker criteria)
  let isPriority = PRIORITY_MSAS.some(msa => locationText.includes(msa));
  
  // Also check tracker's specific geography criteria if available
  if (trackerCriteria?.fit_criteria_geography) {
    const trackerGeos = trackerCriteria.fit_criteria_geography.toLowerCase();
    // Extract city names from criteria and check if deal matches
    const geoMatches = ['new york', 'san francisco', 'seattle', 'washington', 'dallas', 'denver']
      .filter(city => trackerGeos.includes(city) && locationText.includes(city));
    if (geoMatches.length > 0) {
      isPriority = true;
    }
  }
  
  if (isPriority) {
    score = 15;
    msaTier = 'priority';
    parts.push(`Priority MSA match = 15pts`);
  } else if (TIER_1_MSAS.some(msa => locationText.includes(msa))) {
    score = 12;
    msaTier = 'tier1';
    parts.push(`Top 15 MSA = 12pts`);
  } else if (TIER_2_MSAS.some(msa => locationText.includes(msa))) {
    score = 8;
    msaTier = 'tier2';
    parts.push(`Top 50 MSA = 8pts`);
  } else {
    // Check for any state/region indicators for secondary scoring
    const hasStateIndicator = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i.test(locationText);
    if (hasStateIndicator) {
      score = 5;
      msaTier = 'secondary';
      parts.push(`Secondary market = 5pts`);
    } else {
      score = 2;
      msaTier = 'rural';
      parts.push(`Rural/unknown = 2pts`);
    }
  }
  
  // Location context
  parts.push(`Location: ${locationText.substring(0, 50)}${locationText.length > 50 ? '...' : ''}`);
  
  return { score, details: parts.join('; '), msaTier };
}

/**
 * DATA QUALITY SCORING (15 points max)
 * More complete data = faster due diligence = more attractive deal
 */
function calculateDataScore(deal: DealData): {
  score: number;
  details: string;
  fieldsPresent: string[];
} {
  let score = 0;
  const fieldsPresent: string[] = [];
  
  // Key fields worth 2 points each
  if (deal.revenue && deal.revenue > 0) {
    score += 2;
    fieldsPresent.push('revenue');
  }
  
  if ((deal.ebitda_amount && deal.ebitda_amount > 0) || (deal.ebitda_percentage && deal.ebitda_percentage > 0)) {
    score += 2;
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
  
  if (deal.service_mix && deal.service_mix.trim().length > 5) {
    score += 2;
    fieldsPresent.push('service_mix');
  }
  
  if (deal.location_count && deal.location_count > 0) {
    score += 1;
    fieldsPresent.push('location_count');
  }
  
  if (deal.employee_count && deal.employee_count > 0) {
    score += 1;
    fieldsPresent.push('employee_count');
  }
  
  if (deal.real_estate && deal.real_estate.trim().length > 3) {
    score += 1;
    fieldsPresent.push('real_estate');
  }
  
  if (deal.growth_trajectory && deal.growth_trajectory.trim().length > 5) {
    score += 1;
    fieldsPresent.push('growth_trajectory');
  }
  
  if (deal.customer_concentration && deal.customer_concentration.trim().length > 5) {
    score += 1;
    fieldsPresent.push('customer_concentration');
  }
  
  // Cap at 15
  score = Math.min(score, 15);
  
  return { 
    score, 
    details: fieldsPresent.length > 0 
      ? `${fieldsPresent.length} key fields: ${fieldsPresent.join(', ')} = ${score}pts` 
      : 'No key data = 0pts',
    fieldsPresent
  };
}

/**
 * OWNER GOALS SCORING (10 points max) - REDUCED WEIGHT
 * Exit intent and transaction readiness
 */
function calculateOwnerScore(deal: DealData): { score: number; details: string } {
  const goals = (deal.owner_goals || '').toLowerCase();
  const additionalInfo = (deal.additional_info || '').toLowerCase();
  const allText = goals + ' ' + additionalInfo;
  
  if (!goals && !additionalInfo) {
    return { score: 2, details: 'No owner goals specified = 2pts (default)' };
  }
  
  // Strong exit signals (10 pts)
  if (allText.includes('100%') || allText.includes('full exit') || 
      allText.includes('complete exit') || allText.includes('sell 100') ||
      allText.includes('looking for buyer') || allText.includes('ready to sell')) {
    return { score: 10, details: 'Full exit desired = 10pts' };
  }
  
  // Majority sale (8 pts)
  if (allText.includes('majority') || allText.includes('control')) {
    return { score: 8, details: 'Majority sale = 8pts' };
  }
  
  // Retirement/succession (7 pts)
  if (allText.includes('retire') || allText.includes('retirement') || allText.includes('succession') || allText.includes('aging')) {
    return { score: 7, details: 'Retirement/succession = 7pts' };
  }
  
  // Growth partnership (5 pts)
  if (allText.includes('partner') || allText.includes('growth capital') || allText.includes('expansion capital')) {
    return { score: 5, details: 'Partnership/growth = 5pts' };
  }
  
  // Partial/recapitalization (4 pts)
  if (allText.includes('partial') || allText.includes('minority') || allText.includes('recapitalization') || allText.includes('recap')) {
    return { score: 4, details: 'Partial/minority = 4pts' };
  }
  
  // Prefers debt / ambiguous (3 pts)
  if (allText.includes('debt') || allText.includes('loan') || allText.includes('financing')) {
    return { score: 3, details: 'Prefers debt = 3pts' };
  }
  
  // Ambiguous signals
  if (allText.includes('exploring') || allText.includes('understand options') || allText.includes('possibly')) {
    return { score: 2, details: 'Ambiguous intent = 2pts' };
  }
  
  // Has some owner info
  return { score: 3, details: 'Owner goals present but unclear = 3pts' };
}

/**
 * BONUS & PENALTY SCORING (10 points max, can go negative from penalties)
 * Industry-specific value drivers and deal-breakers
 */
function calculateBonusScore(deal: DealData, trackerCriteria: TrackerCriteria | null): {
  score: number;
  details: string;
  penalties: string[];
} {
  let score = 0;
  const parts: string[] = [];
  const penalties: string[] = [];
  
  const allText = [
    deal.additional_info || '',
    deal.service_mix || '',
    deal.growth_trajectory || '',
    deal.real_estate || '',
    deal.company_overview || ''
  ].join(' ').toLowerCase();
  
  // BONUSES
  
  // Real estate ownership (+3)
  const realEstate = (deal.real_estate || '').toLowerCase();
  if (realEstate.includes('own') || realEstate.includes('fee simple') || realEstate.includes('owns real estate')) {
    score += 3;
    parts.push('Owns real estate = +3pts');
  }
  
  // Growth trajectory (+2)
  if (deal.growth_trajectory) {
    const growth = deal.growth_trajectory.toLowerCase();
    if (growth.includes('grow') || growth.includes('expansion') || growth.includes('increasing')) {
      score += 2;
      parts.push('Growth trajectory = +2pts');
    }
  } else if (allText.includes('growing') || allText.includes('growth') || allText.includes('expanding')) {
    score += 1;
    parts.push('Growth mentioned = +1pt');
  }
  
  // Low customer concentration (+2)
  const concentration = (deal.customer_concentration || '').toLowerCase();
  if (concentration.includes('diversified') || concentration.includes('no concentration') || 
      concentration.includes('low concentration') || concentration.includes('diversified customer')) {
    score += 2;
    parts.push('Diversified customers = +2pts');
  }
  
  // Modern facility - look for sqft indicators (+2)
  if (allText.includes('10,000') || allText.includes('10000') || 
      allText.includes('15,000') || allText.includes('20,000') ||
      allText.includes('modern facility') || allText.includes('state of the art') ||
      allText.includes('newly built') || allText.includes('recently renovated')) {
    score += 2;
    parts.push('Modern/large facility = +2pts');
  }
  
  // Additional certifications not caught in service mix (+1)
  if (allText.includes('i-car gold') || allText.includes('icar gold') || allText.includes('ase master')) {
    score += 1;
    parts.push('Premium certifications = +1pt');
  }
  
  // Cap bonuses at 10
  score = Math.min(score, 10);
  
  // PENALTIES (can bring score negative)
  
  // Check tracker size criteria for minimum requirements
  let minRevenue = 2; // Default minimum $2M
  let minLocations = 3; // Default minimum 3 locations
  
  if (trackerCriteria?.size_criteria) {
    try {
      const sizeCriteria = typeof trackerCriteria.size_criteria === 'string' 
        ? JSON.parse(trackerCriteria.size_criteria) 
        : trackerCriteria.size_criteria;
      if (sizeCriteria.minRevenue) minRevenue = sizeCriteria.minRevenue;
      if (sizeCriteria.minLocations) minLocations = sizeCriteria.minLocations;
    } catch (e) {
      console.log('[score-deal] Could not parse size_criteria');
    }
  }
  
  // Penalty: Single location when multi required (-5)
  if (minLocations > 1 && deal.location_count === 1) {
    score -= 5;
    penalties.push(`Single location (requires ${minLocations}+) = -5pts`);
  }
  
  // Penalty: Below minimum revenue (-3)
  if (deal.revenue && deal.revenue < minRevenue && deal.revenue > 0) {
    score -= 3;
    penalties.push(`Below $${minRevenue}M minimum = -3pts`);
  }
  
  // Penalty: Under 8,000 sqft (if mentioned)
  if (allText.includes('under 8,000') || allText.includes('5,000 sqft') || 
      allText.includes('small facility') || allText.includes('2,000 sqft')) {
    score -= 2;
    penalties.push('Small facility (<8,000 sqft) = -2pts');
  }
  
  return { 
    score,
    details: parts.length > 0 ? parts.join('; ') : 'No bonus factors',
    penalties
  };
}

/**
 * MAIN SCORING FUNCTION
 */
async function scoreDeal(deal: DealData, supabase: any): Promise<ScoreBreakdown> {
  // Fetch tracker criteria for context-aware scoring
  let trackerCriteria: TrackerCriteria | null = null;
  
  try {
    const { data: tracker } = await supabase
      .from('industry_trackers')
      .select('fit_criteria_size, fit_criteria_service, fit_criteria_geography, size_criteria, service_criteria, geography_criteria')
      .eq('id', deal.tracker_id)
      .single();
    
    if (tracker) {
      trackerCriteria = tracker;
      console.log('[score-deal] Using tracker criteria for scoring');
    }
  } catch (e) {
    console.log('[score-deal] Could not fetch tracker criteria, using defaults');
  }
  
  // Calculate all score components
  const size = calculateSizeScore(deal, trackerCriteria);
  const service = calculateServiceScore(deal, trackerCriteria);
  const geography = calculateGeographyScore(deal, trackerCriteria);
  const data = calculateDataScore(deal);
  const owner = calculateOwnerScore(deal);
  const bonus = calculateBonusScore(deal, trackerCriteria);
  
  // Calculate total (cap at 100, floor at 0)
  const rawTotal = size.score + service.score + geography.score + data.score + owner.score + bonus.score;
  const totalScore = Math.max(0, Math.min(rawTotal, 100));
  
  return {
    // Size & Scale
    sizeScore: size.score,
    sizeDetails: size.details,
    revenueScore: size.revenueScore,
    locationScore: size.locationScore,
    employeeScore: size.employeeScore,
    
    // Service Mix
    serviceScore: service.score,
    serviceDetails: service.details,
    requiredServicesScore: service.requiredScore,
    preferredServicesScore: service.preferredScore,
    
    // Geography
    geographyScore: geography.score,
    geographyDetails: geography.details,
    msaTier: geography.msaTier,
    
    // Data Quality
    dataScore: data.score,
    dataDetails: data.details,
    fieldsPresent: data.fieldsPresent,
    
    // Owner Goals
    ownerScore: owner.score,
    ownerDetails: owner.details,
    
    // Bonus/Penalty
    bonusScore: bonus.score,
    bonusDetails: bonus.details,
    penalties: bonus.penalties,
    
    // Total
    totalScore,
    scoringVersion: '2.0-comprehensive'
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

    console.log('[score-deal] Scoring deal with comprehensive algorithm v2.0:', dealId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, supabaseKey);

    // Fetch deal data with all relevant fields
    const { data: deal, error: fetchError } = await serviceClient
      .from('deals')
      .select(`
        id, tracker_id, revenue, ebitda_amount, ebitda_percentage, 
        owner_goals, geography, headquarters, location_count, employee_count,
        additional_info, service_mix, growth_trajectory, real_estate, 
        customer_concentration, company_overview
      `)
      .eq('id', dealId)
      .single();

    if (fetchError || !deal) {
      console.error('[score-deal] Failed to fetch deal:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Deal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate comprehensive score
    const breakdown = await scoreDeal(deal as DealData, serviceClient);
    
    console.log('[score-deal] Score breakdown:', JSON.stringify(breakdown, null, 2));

    // Save score to deal
    const { error: updateError } = await serviceClient
      .from('deals')
      .update({ 
        deal_score: breakdown.totalScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', dealId);

    if (updateError) {
      console.error('[score-deal] Failed to update deal score:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save score' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[score-deal] Successfully scored deal:', dealId, 'total:', breakdown.totalScore);

    return new Response(
      JSON.stringify({ 
        success: true, 
        score: breakdown.totalScore,
        breakdown 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[score-deal] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
