import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Deal Scoring Algorithm (0-100)
 * 
 * Size Score (50 points max):
 *   - Revenue-based: $10M+ = 50, $5-10M = 40, $3-5M = 32, $1-3M = 24, $500K-1M = 16, <$500K = 8
 *   - EBITDA margin bonus: +5 if margin >= 20%
 *   - Multi-location bonus: +5 if location_count > 1
 * 
 * Owner Motivation Score (25 points max):
 *   - Keywords: "100% sale" / "full exit" = 25, "majority" = 20, "retire" = 18, 
 *     "partnership" / "growth" = 15, "partial" = 10, otherwise = 5
 * 
 * Data Completeness Score (15 points max):
 *   - 4 points each for: revenue, ebitda, owner_goals, geography (capped at 15)
 * 
 * Bonus Factors (10 points max):
 *   - Certifications / DRPs / OEM = +3
 *   - Growth trajectory mentioned = +3
 *   - Real estate ownership = +2
 *   - Low customer concentration = +2
 */

interface DealData {
  id: string;
  revenue: number | null;
  ebitda_amount: number | null;
  ebitda_percentage: number | null;
  owner_goals: string | null;
  geography: string[] | null;
  location_count: number | null;
  additional_info: string | null;
  service_mix: string | null;
  growth_trajectory: string | null;
  real_estate: string | null;
  customer_concentration: string | null;
}

interface ScoreBreakdown {
  sizeScore: number;
  sizeDetails: string;
  ownerScore: number;
  ownerDetails: string;
  dataScore: number;
  dataDetails: string;
  bonusScore: number;
  bonusDetails: string;
  totalScore: number;
}

function calculateSizeScore(deal: DealData): { score: number; details: string } {
  let score = 0;
  const parts: string[] = [];
  
  // Revenue-based scoring
  const revenue = deal.revenue || 0;
  if (revenue >= 10) {
    score = 50;
    parts.push(`$${revenue}M revenue = 50pts`);
  } else if (revenue >= 5) {
    score = 40;
    parts.push(`$${revenue}M revenue = 40pts`);
  } else if (revenue >= 3) {
    score = 32;
    parts.push(`$${revenue}M revenue = 32pts`);
  } else if (revenue >= 1) {
    score = 24;
    parts.push(`$${revenue}M revenue = 24pts`);
  } else if (revenue >= 0.5) {
    score = 16;
    parts.push(`$${revenue}M revenue = 16pts`);
  } else if (revenue > 0) {
    score = 8;
    parts.push(`$${revenue}M revenue = 8pts`);
  } else {
    parts.push('No revenue data');
  }
  
  // EBITDA margin bonus
  const margin = deal.ebitda_percentage || 0;
  if (margin >= 20) {
    score += 5;
    parts.push(`${margin}% margin bonus = +5pts`);
  }
  
  // Multi-location bonus
  const locations = deal.location_count || 0;
  if (locations > 1) {
    score += 5;
    parts.push(`${locations} locations bonus = +5pts`);
  }
  
  // Cap at 50
  score = Math.min(score, 50);
  
  return { score, details: parts.join(', ') || 'No size data' };
}

function calculateOwnerScore(deal: DealData): { score: number; details: string } {
  const goals = (deal.owner_goals || '').toLowerCase();
  
  if (!goals) {
    return { score: 5, details: 'No owner goals specified (default 5pts)' };
  }
  
  // Check for strong exit signals
  if (goals.includes('100%') || goals.includes('full exit') || goals.includes('complete exit') || goals.includes('sell 100')) {
    return { score: 25, details: 'Full exit desired = 25pts' };
  }
  
  if (goals.includes('majority') || goals.includes('control')) {
    return { score: 20, details: 'Majority sale = 20pts' };
  }
  
  if (goals.includes('retire') || goals.includes('retirement') || goals.includes('succession')) {
    return { score: 18, details: 'Retirement/succession = 18pts' };
  }
  
  if (goals.includes('partner') || goals.includes('growth capital') || goals.includes('expansion')) {
    return { score: 15, details: 'Partnership/growth = 15pts' };
  }
  
  if (goals.includes('partial') || goals.includes('minority') || goals.includes('recapitalization')) {
    return { score: 10, details: 'Partial/minority = 10pts' };
  }
  
  return { score: 8, details: 'Owner goals present = 8pts' };
}

function calculateDataScore(deal: DealData): { score: number; details: string } {
  let score = 0;
  const parts: string[] = [];
  
  if (deal.revenue && deal.revenue > 0) {
    score += 4;
    parts.push('revenue');
  }
  
  if ((deal.ebitda_amount && deal.ebitda_amount > 0) || (deal.ebitda_percentage && deal.ebitda_percentage > 0)) {
    score += 4;
    parts.push('ebitda');
  }
  
  if (deal.owner_goals && deal.owner_goals.trim().length > 5) {
    score += 4;
    parts.push('owner_goals');
  }
  
  if (deal.geography && deal.geography.length > 0) {
    score += 4;
    parts.push('geography');
  }
  
  // Cap at 15
  score = Math.min(score, 15);
  
  return { 
    score, 
    details: parts.length > 0 ? `Has: ${parts.join(', ')} = ${score}pts` : 'No key data = 0pts' 
  };
}

function calculateBonusScore(deal: DealData): { score: number; details: string } {
  let score = 0;
  const parts: string[] = [];
  
  const allText = [
    deal.additional_info || '',
    deal.service_mix || '',
    deal.growth_trajectory || ''
  ].join(' ').toLowerCase();
  
  // Certifications / DRPs / OEM (collision repair specific)
  if (allText.includes('certification') || allText.includes('certified') || 
      allText.includes('drp') || allText.includes('oem') || 
      allText.includes('i-car') || allText.includes('ase')) {
    score += 3;
    parts.push('certifications +3');
  }
  
  // Growth trajectory
  if (deal.growth_trajectory && deal.growth_trajectory.toLowerCase().includes('grow')) {
    score += 3;
    parts.push('growth +3');
  } else if (allText.includes('growing') || allText.includes('growth')) {
    score += 2;
    parts.push('growth mentioned +2');
  }
  
  // Real estate ownership
  const realEstate = (deal.real_estate || '').toLowerCase();
  if (realEstate.includes('own') || realEstate.includes('fee simple')) {
    score += 2;
    parts.push('real estate +2');
  }
  
  // Low customer concentration
  const concentration = (deal.customer_concentration || '').toLowerCase();
  if (concentration.includes('diversified') || concentration.includes('no concentration') || concentration.includes('low')) {
    score += 2;
    parts.push('diversified customers +2');
  }
  
  // Cap at 10
  score = Math.min(score, 10);
  
  return { 
    score, 
    details: parts.length > 0 ? parts.join(', ') : 'No bonus factors' 
  };
}

function scoreDeal(deal: DealData): ScoreBreakdown {
  const size = calculateSizeScore(deal);
  const owner = calculateOwnerScore(deal);
  const data = calculateDataScore(deal);
  const bonus = calculateBonusScore(deal);
  
  const totalScore = Math.min(size.score + owner.score + data.score + bonus.score, 100);
  
  return {
    sizeScore: size.score,
    sizeDetails: size.details,
    ownerScore: owner.score,
    ownerDetails: owner.details,
    dataScore: data.score,
    dataDetails: data.details,
    bonusScore: bonus.score,
    bonusDetails: bonus.details,
    totalScore
  };
}

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

    console.log('[score-deal] Scoring deal:', dealId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, supabaseKey);

    // Fetch deal data
    const { data: deal, error: fetchError } = await serviceClient
      .from('deals')
      .select('id, revenue, ebitda_amount, ebitda_percentage, owner_goals, geography, location_count, additional_info, service_mix, growth_trajectory, real_estate, customer_concentration')
      .eq('id', dealId)
      .single();

    if (fetchError || !deal) {
      console.error('[score-deal] Failed to fetch deal:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Deal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate score
    const breakdown = scoreDeal(deal as DealData);
    
    console.log('[score-deal] Score breakdown:', breakdown);

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

    console.log('[score-deal] Successfully scored deal:', dealId, 'score:', breakdown.totalScore);

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
