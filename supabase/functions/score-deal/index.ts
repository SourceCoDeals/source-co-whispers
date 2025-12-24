import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Deal Scoring Algorithm v3.0 - Tracker Criteria Based
 * 
 * This version scores deals AGAINST the tracker's specific criteria:
 * - Size: Does deal fit tracker's min/max revenue/EBITDA?
 * - Services: Does deal have tracker's required/preferred services? Penalize excluded?
 * - Geography: Is deal in tracker's required/preferred regions?
 * - Data Quality: How complete is the deal data?
 * 
 * NO engagement signals - just objective fit against tracker criteria.
 */

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
  geography_weight: number;
  service_mix_weight: number;
  size_weight: number;
  owner_goals_weight: number;
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
  totalScore: number;
  scoringVersion: string;
  disqualified: boolean;
  disqualificationReasons: string[];
}

// ============= HELPER FUNCTIONS =============

function parseNumberFromString(str: string | null | undefined): number | null {
  if (!str) return null;
  // Extract numbers from strings like "$2M", "2000000", "2,000,000", "2-5M" (takes first number)
  const cleaned = str.replace(/[$,M]/gi, '').trim();
  const match = cleaned.match(/[\d.]+/);
  if (!match) return null;
  let num = parseFloat(match[0]);
  // If original had M suffix, multiply
  if (str.toLowerCase().includes('m') && num < 1000) {
    num = num * 1000000;
  }
  return num;
}

function extractLocationRange(str: string | null | undefined): { min: number; max: number } {
  if (!str) return { min: 1, max: 100 };
  const match = str.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  const singleMatch = str.match(/(\d+)\+?/);
  if (singleMatch) {
    return { min: parseInt(singleMatch[1]), max: 100 };
  }
  return { min: 1, max: 100 };
}

// ============= SIZE SCORING (25 points max) =============

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
  let maxRevenue = 1000; // Default high max
  let minEbitda = 0;
  let maxEbitda = 1000;
  let minLocations = 1;
  let maxLocations = 100;
  
  if (criteria?.size_criteria) {
    const sizeCriteria = typeof criteria.size_criteria === 'string' 
      ? JSON.parse(criteria.size_criteria) 
      : criteria.size_criteria;
    
    // Parse revenue (stored in dollars, deal.revenue is in millions)
    if (sizeCriteria.min_revenue) {
      minRevenue = sizeCriteria.min_revenue / 1000000; // Convert to millions
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
    if (sizeCriteria.location_count) {
      const locRange = extractLocationRange(sizeCriteria.location_count);
      minLocations = locRange.min;
      maxLocations = locRange.max;
    }
    
    console.log(`[score-deal] Size criteria: Revenue $${minRevenue}M-$${maxRevenue}M, EBITDA $${minEbitda}M-$${maxEbitda}M, Locations ${minLocations}-${maxLocations}`);
  }
  
  // Score revenue fit (0-12 points)
  if (dealRevenue > 0) {
    if (dealRevenue >= minRevenue && dealRevenue <= maxRevenue) {
      // Perfect fit - within range
      score += 12;
      parts.push(`Revenue $${dealRevenue}M in range ($${minRevenue}M-$${maxRevenue}M) = +12pts`);
    } else if (dealRevenue > maxRevenue) {
      // Over max - still acceptable but less ideal (might need bigger buyer)
      const overBy = ((dealRevenue - maxRevenue) / maxRevenue * 100).toFixed(0);
      if (dealRevenue > maxRevenue * 2) {
        // Way over - mild penalty
        score += 4;
        parts.push(`Revenue $${dealRevenue}M exceeds max $${maxRevenue}M by ${overBy}% = +4pts (too large for typical buyer)`);
      } else {
        score += 8;
        parts.push(`Revenue $${dealRevenue}M slightly over max $${maxRevenue}M = +8pts`);
      }
    } else if (dealRevenue < minRevenue) {
      // Under min - problematic
      const underBy = ((minRevenue - dealRevenue) / minRevenue * 100).toFixed(0);
      if (dealRevenue < minRevenue * 0.5) {
        // Significantly under - disqualify
        disqualified = true;
        disqualificationReason = `Revenue $${dealRevenue}M is ${underBy}% below minimum $${minRevenue}M`;
        score = 0;
        parts.push(`Revenue $${dealRevenue}M far below min $${minRevenue}M = DISQUALIFIED`);
      } else {
        score += 3;
        parts.push(`Revenue $${dealRevenue}M below min $${minRevenue}M = +3pts (marginal)`);
      }
    }
  } else {
    parts.push('No revenue data = +0pts');
  }
  
  // Score EBITDA fit (0-8 points)
  if (dealEbitda > 0 && (minEbitda > 0 || maxEbitda < 1000)) {
    if (dealEbitda >= minEbitda && dealEbitda <= maxEbitda) {
      score += 8;
      parts.push(`EBITDA $${dealEbitda}M in range = +8pts`);
    } else if (dealEbitda < minEbitda) {
      score += 2;
      parts.push(`EBITDA $${dealEbitda}M below min = +2pts`);
    } else {
      score += 5;
      parts.push(`EBITDA $${dealEbitda}M above range = +5pts`);
    }
  } else if (dealEbitda > 0) {
    // No EBITDA criteria but deal has EBITDA - base score
    score += 4;
    parts.push(`EBITDA $${dealEbitda}M present = +4pts`);
  }
  
  // Score location count (0-5 points)
  if (dealLocations >= minLocations && dealLocations <= maxLocations) {
    score += 5;
    parts.push(`${dealLocations} locations in range (${minLocations}-${maxLocations}) = +5pts`);
  } else if (dealLocations < minLocations) {
    if (minLocations > 1 && dealLocations === 1) {
      score += 1;
      parts.push(`Single location (need ${minLocations}+) = +1pt`);
    } else {
      score += 2;
      parts.push(`${dealLocations} locations below min ${minLocations} = +2pts`);
    }
  } else {
    score += 4;
    parts.push(`${dealLocations} locations (above range) = +4pts`);
  }
  
  return {
    score: Math.min(score, 25),
    details: parts.join('; '),
    disqualified,
    disqualificationReason
  };
}

// ============= SERVICE SCORING (25 points max) =============

function calculateServiceScore(deal: DealData, criteria: TrackerCriteria | null): {
  score: number;
  details: string;
  disqualified: boolean;
  disqualificationReason: string | null;
} {
  const parts: string[] = [];
  let score = 0;
  let disqualified = false;
  let disqualificationReason: string | null = null;
  
  // Combine all text fields to search
  const allText = [
    deal.service_mix || '',
    deal.additional_info || '',
    deal.company_overview || ''
  ].join(' ').toLowerCase();
  
  if (!allText || allText.trim().length < 5) {
    return { score: 5, details: 'No service data = +5pts (default)', disqualified: false, disqualificationReason: null };
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
    
    console.log(`[score-deal] Service criteria: Required=${requiredServices.join(',')}, Excluded=${excludedServices.join(',')}, Model=${businessModel}`);
  }
  
  // Check for EXCLUDED services first (deal breakers)
  const foundExcluded: string[] = [];
  for (const excluded of excludedServices) {
    if (allText.includes(excluded.toLowerCase())) {
      foundExcluded.push(excluded);
    }
  }
  
  // Check if excluded service is PRIMARY (mentioned frequently or first)
  // Towing-specific: if "towing" appears before "collision" or more times, it's primary
  const towingIndex = allText.indexOf('towing');
  const collisionIndex = allText.indexOf('collision');
  const towingCount = (allText.match(/towing/g) || []).length;
  const collisionCount = (allText.match(/collision/g) || []).length;
  
  const towingIsPrimary = towingIndex >= 0 && (towingIndex < collisionIndex || collisionIndex === -1 || towingCount > collisionCount);
  
  if (foundExcluded.length > 0) {
    if (foundExcluded.includes('towing') || foundExcluded.some(e => allText.includes(e))) {
      // Check if it's a primary off-focus service
      if (towingIsPrimary && foundExcluded.includes('towing')) {
        // Towing is primary business - heavy penalty
        score -= 10;
        parts.push(`PRIMARY off-focus service (towing) = -10pts`);
      } else {
        // Has off-focus but it's secondary
        score -= 3;
        parts.push(`Off-focus services present (${foundExcluded.join(', ')}) = -3pts`);
      }
    }
  }
  
  // Check for REQUIRED services (max 12 points)
  let requiredFound = 0;
  const matchedRequired: string[] = [];
  for (const required of requiredServices) {
    // Check for keywords and variations
    const keywords = required.split(' ');
    const matched = keywords.every(kw => allText.includes(kw.toLowerCase()));
    if (matched || allText.includes(required.toLowerCase())) {
      requiredFound++;
      matchedRequired.push(required);
    }
  }
  
  if (requiredServices.length > 0) {
    const requiredRatio = requiredFound / requiredServices.length;
    const requiredPts = Math.round(requiredRatio * 12);
    score += requiredPts;
    if (matchedRequired.length > 0) {
      parts.push(`Required services (${matchedRequired.join(', ')}) = +${requiredPts}pts`);
    } else {
      parts.push(`No required services matched = +0pts`);
    }
    
    // If missing ALL required services and there are required services, that's bad
    if (requiredFound === 0 && requiredServices.length > 0) {
      parts.push(`Missing all required services (${requiredServices.join(', ')})`);
    }
  } else {
    // No required services specified - give base score for having service data
    score += 6;
    parts.push('Service data present = +6pts');
  }
  
  // Check for PREFERRED services (max 8 points)
  let preferredFound = 0;
  const matchedPreferred: string[] = [];
  for (const preferred of preferredServices) {
    if (allText.includes(preferred.toLowerCase())) {
      preferredFound++;
      matchedPreferred.push(preferred);
    }
  }
  
  if (preferredServices.length > 0) {
    const preferredRatio = preferredFound / preferredServices.length;
    const preferredPts = Math.round(preferredRatio * 8);
    score += preferredPts;
    if (matchedPreferred.length > 0) {
      parts.push(`Preferred services (${matchedPreferred.join(', ')}) = +${preferredPts}pts`);
    }
  }
  
  // Check for business model match (max 5 points)
  if (businessModel) {
    if (allText.includes(businessModel) || 
        (businessModel === 'drp-focused' && (allText.includes('drp') || allText.includes('direct repair')))) {
      score += 5;
      parts.push(`Business model match (${businessModel}) = +5pts`);
    } else if (allText.includes('insurance') || allText.includes('drp')) {
      score += 3;
      parts.push('Insurance/DRP mentioned = +3pts');
    }
  }
  
  return {
    score: Math.max(0, Math.min(score, 25)),
    details: parts.join('; '),
    disqualified,
    disqualificationReason
  };
}

// ============= GEOGRAPHY SCORING (25 points max) =============

function calculateGeographyScore(deal: DealData, criteria: TrackerCriteria | null): {
  score: number;
  details: string;
} {
  const parts: string[] = [];
  let score = 0;
  
  const dealStates = (deal.geography || []).map(s => s.toUpperCase().trim());
  const headquarters = (deal.headquarters || '').toLowerCase();
  
  if (dealStates.length === 0 && !headquarters) {
    return { score: 5, details: 'No geography data = +5pts (default)' };
  }
  
  // Parse tracker geography criteria
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
    
    console.log(`[score-deal] Geography criteria: Required=${requiredRegions.join(',')}, Preferred=${preferredRegions.join(',')}`);
  }
  
  // Region/state mapping
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
  };
  
  // Check if deal is in required regions
  let inRequired = false;
  let inPreferred = false;
  let inExcluded = false;
  
  for (const region of requiredRegions) {
    const regionLower = region.toLowerCase();
    // Check if region name matches any state
    const statesInRegion = regionStates[regionLower] || [];
    
    // Check headquarters match
    if (headquarters.includes(regionLower)) {
      inRequired = true;
      parts.push(`HQ matches required region (${region})`);
      break;
    }
    
    // Check state match
    for (const dealState of dealStates) {
      if (statesInRegion.includes(dealState)) {
        inRequired = true;
        parts.push(`State ${dealState} in required region (${region})`);
        break;
      }
      // Direct state match (e.g., "Texas" -> "TX")
      if (regionLower === 'texas' && dealState === 'TX') {
        inRequired = true;
        parts.push('Texas = required region');
        break;
      }
      if (regionLower === 'california' && dealState === 'CA') {
        inRequired = true;
        parts.push('California = required region');
        break;
      }
    }
    if (inRequired) break;
  }
  
  // Check preferred regions
  for (const region of preferredRegions) {
    const regionLower = region.toLowerCase();
    const statesInRegion = regionStates[regionLower] || [];
    
    if (headquarters.includes(regionLower)) {
      inPreferred = true;
      break;
    }
    
    for (const dealState of dealStates) {
      if (statesInRegion.includes(dealState)) {
        inPreferred = true;
        break;
      }
    }
    if (inPreferred) break;
  }
  
  // Check excluded regions
  for (const region of excludedRegions) {
    const regionLower = region.toLowerCase();
    const statesInRegion = regionStates[regionLower] || [];
    
    for (const dealState of dealStates) {
      if (statesInRegion.includes(dealState)) {
        inExcluded = true;
        parts.push(`State ${dealState} in excluded region (${region})`);
        break;
      }
    }
    if (inExcluded) break;
  }
  
  // Score based on region fit
  if (inExcluded) {
    score = 2;
    parts.push('In excluded region = +2pts');
  } else if (inRequired) {
    score = 25;
    parts.push('In required region = +25pts');
  } else if (inPreferred) {
    score = 18;
    parts.push('In preferred region = +18pts');
  } else if (requiredRegions.length === 0 && preferredRegions.length === 0) {
    // No geographic criteria specified - give moderate score
    score = 15;
    parts.push('No region criteria specified = +15pts');
  } else {
    // Has location but not in any target region
    score = 8;
    parts.push(`Location (${dealStates.join(', ')}) not in target regions = +8pts`);
  }
  
  return {
    score: Math.min(score, 25),
    details: parts.join('; ')
  };
}

// ============= DATA QUALITY SCORING (25 points max) =============

function calculateDataScore(deal: DealData): {
  score: number;
  details: string;
  fieldsPresent: string[];
} {
  let score = 0;
  const fieldsPresent: string[] = [];
  
  // Key fields worth 3 points each
  if (deal.revenue && deal.revenue > 0) {
    score += 4;
    fieldsPresent.push('revenue');
  }
  
  if ((deal.ebitda_amount && deal.ebitda_amount > 0) || (deal.ebitda_percentage && deal.ebitda_percentage > 0)) {
    score += 4;
    fieldsPresent.push('ebitda');
  }
  
  if (deal.owner_goals && deal.owner_goals.trim().length > 10) {
    score += 3;
    fieldsPresent.push('owner_goals');
  }
  
  if ((deal.geography && deal.geography.length > 0) || deal.headquarters) {
    score += 3;
    fieldsPresent.push('geography');
  }
  
  if (deal.service_mix && deal.service_mix.trim().length > 10) {
    score += 4;
    fieldsPresent.push('service_mix');
  }
  
  if (deal.location_count && deal.location_count > 0) {
    score += 2;
    fieldsPresent.push('location_count');
  }
  
  if (deal.employee_count && deal.employee_count > 0) {
    score += 2;
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
  
  return { 
    score: Math.min(score, 25), 
    details: fieldsPresent.length > 0 
      ? `${fieldsPresent.length} key fields: ${fieldsPresent.join(', ')} = ${Math.min(score, 25)}pts` 
      : 'No key data = 0pts',
    fieldsPresent
  };
}

// ============= MAIN SCORING FUNCTION =============

async function scoreDeal(deal: DealData, supabase: any): Promise<ScoreBreakdown> {
  // Fetch tracker criteria for context-aware scoring
  let trackerCriteria: TrackerCriteria | null = null;
  
  try {
    const { data: tracker } = await supabase
      .from('industry_trackers')
      .select('fit_criteria_size, fit_criteria_service, fit_criteria_geography, size_criteria, service_criteria, geography_criteria, geography_weight, service_mix_weight, size_weight, owner_goals_weight')
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
  
  // Collect disqualification reasons
  const disqualificationReasons: string[] = [];
  if (size.disqualified && size.disqualificationReason) {
    disqualificationReasons.push(size.disqualificationReason);
  }
  if (service.disqualified && service.disqualificationReason) {
    disqualificationReasons.push(service.disqualificationReason);
  }
  
  const isDisqualified = size.disqualified || service.disqualified;
  
  // Calculate total (100 points possible: 25 each for size, service, geography, data)
  // If disqualified, cap at 30
  let rawTotal = size.score + service.score + geography.score + data.score;
  
  if (isDisqualified) {
    rawTotal = Math.min(rawTotal, 30);
  }
  
  const totalScore = Math.max(0, Math.min(rawTotal, 100));
  
  console.log(`[score-deal] Scores - Size: ${size.score}, Service: ${service.score}, Geography: ${geography.score}, Data: ${data.score}, Total: ${totalScore}`);
  
  return {
    sizeScore: size.score,
    sizeDetails: size.details,
    serviceScore: service.score,
    serviceDetails: service.details,
    geographyScore: geography.score,
    geographyDetails: geography.details,
    dataScore: data.score,
    dataDetails: data.details,
    totalScore,
    scoringVersion: '3.0-tracker-criteria',
    disqualified: isDisqualified,
    disqualificationReasons
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

    console.log('[score-deal] Scoring deal with tracker-criteria algorithm v3.0:', dealId);

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
