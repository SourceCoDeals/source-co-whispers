import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map pass categories to score categories
const PASS_TO_SCORE_MAP: Record<string, string | null> = {
  'geography': 'geography_score',
  'size': 'acquisition_score',
  'size_too_small': 'acquisition_score',
  'size_too_large': 'acquisition_score',
  'services': 'service_score',
  'industry': 'service_score',
  'timing': null,
  'portfolio_conflict': null,
  'other': null,
};

interface ScoringAdjustments {
  geography_weight_mult: number;
  size_weight_mult: number;
  services_weight_mult: number;
  approved_count: number;
  rejected_count: number;
  passed_geography: number;
  passed_size: number;
  passed_services: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { dealId, action, passCategory } = await req.json();

    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Recalculating weights for deal ${dealId}, action: ${action}, passCategory: ${passCategory}`);

    // Fetch all decisions for this deal
    const { data: decisions, error: decisionsError } = await supabaseClient
      .from("buyer_deal_scores")
      .select("*, buyers(id, pe_firm_name, platform_company_name)")
      .eq("deal_id", dealId);

    if (decisionsError) {
      console.error("Error fetching decisions:", decisionsError);
      return new Response(JSON.stringify({ error: decisionsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate statistics from decisions
    const stats = {
      approved_count: 0,
      rejected_count: 0,
      passed_geography: 0,
      passed_size: 0,
      passed_services: 0,
      approved_geo_scores: [] as number[],
      approved_size_scores: [] as number[],
      approved_service_scores: [] as number[],
      passed_geo_scores: [] as number[],
      passed_size_scores: [] as number[],
      passed_service_scores: [] as number[],
    };

    for (const decision of decisions || []) {
      // Count approvals
      if (decision.selected_for_outreach && !decision.passed_on_deal) {
        stats.approved_count++;
        if (decision.geography_score != null) stats.approved_geo_scores.push(decision.geography_score);
        if (decision.acquisition_score != null) stats.approved_size_scores.push(decision.acquisition_score);
        if (decision.service_score != null) stats.approved_service_scores.push(decision.service_score);
      }
      
      // Count rejections (hidden from deal or passed)
      if (decision.hidden_from_deal) {
        stats.rejected_count++;
      }
      
      // Count passes by category
      if (decision.passed_on_deal && decision.pass_category) {
        const category = decision.pass_category.toLowerCase();
        if (category.includes('geography') || category.includes('location')) {
          stats.passed_geography++;
          if (decision.geography_score != null) stats.passed_geo_scores.push(decision.geography_score);
        }
        if (category.includes('size') || category.includes('small') || category.includes('large') || category.includes('revenue')) {
          stats.passed_size++;
          if (decision.acquisition_score != null) stats.passed_size_scores.push(decision.acquisition_score);
        }
        if (category.includes('service') || category.includes('industry') || category.includes('focus')) {
          stats.passed_services++;
          if (decision.service_score != null) stats.passed_service_scores.push(decision.service_score);
        }
      }
    }

    // Calculate average scores for approved vs passed
    const avgApprovedGeo = stats.approved_geo_scores.length > 0 
      ? stats.approved_geo_scores.reduce((a, b) => a + b, 0) / stats.approved_geo_scores.length 
      : 50;
    const avgApprovedSize = stats.approved_size_scores.length > 0 
      ? stats.approved_size_scores.reduce((a, b) => a + b, 0) / stats.approved_size_scores.length 
      : 50;
    const avgApprovedService = stats.approved_service_scores.length > 0 
      ? stats.approved_service_scores.reduce((a, b) => a + b, 0) / stats.approved_service_scores.length 
      : 50;

    // Calculate weight multipliers based on decision patterns
    // If many approved buyers have low geo scores → geography matters less → reduce geo weight
    // If many passes due to size → size matters more → increase size weight
    
    let geoMult = 1.0;
    let sizeMult = 1.0;
    let servicesMult = 1.0;

    const totalDecisions = stats.approved_count + stats.passed_geography + stats.passed_size + stats.passed_services;
    
    if (totalDecisions >= 2) {
      // Geography weight adjustment
      // If approved buyers have lower geo scores than baseline (60), reduce geo importance
      if (avgApprovedGeo < 60 && stats.approved_count >= 2) {
        geoMult = Math.max(0.6, 1 - ((60 - avgApprovedGeo) / 100));
        console.log(`Geography appears less important (avg approved: ${avgApprovedGeo.toFixed(1)}), mult: ${geoMult.toFixed(2)}`);
      }
      // If many passed due to geography, increase geo importance
      if (stats.passed_geography >= 2 && stats.passed_geography > stats.approved_count * 0.3) {
        geoMult = Math.min(1.4, 1 + (stats.passed_geography / totalDecisions) * 0.5);
        console.log(`Geography appears more important (${stats.passed_geography} passed), mult: ${geoMult.toFixed(2)}`);
      }

      // Size weight adjustment
      // If approved buyers have lower size scores, size matters less for this deal
      if (avgApprovedSize < 60 && stats.approved_count >= 2) {
        sizeMult = Math.max(0.6, 1 - ((60 - avgApprovedSize) / 100));
        console.log(`Size appears less important (avg approved: ${avgApprovedSize.toFixed(1)}), mult: ${sizeMult.toFixed(2)}`);
      }
      // If many passed due to size, increase size importance
      if (stats.passed_size >= 2 && stats.passed_size > stats.approved_count * 0.3) {
        sizeMult = Math.min(1.4, 1 + (stats.passed_size / totalDecisions) * 0.5);
        console.log(`Size appears more important (${stats.passed_size} passed), mult: ${sizeMult.toFixed(2)}`);
      }

      // Services weight adjustment
      if (avgApprovedService < 60 && stats.approved_count >= 2) {
        servicesMult = Math.max(0.6, 1 - ((60 - avgApprovedService) / 100));
        console.log(`Services appears less important (avg approved: ${avgApprovedService.toFixed(1)}), mult: ${servicesMult.toFixed(2)}`);
      }
      if (stats.passed_services >= 2 && stats.passed_services > stats.approved_count * 0.3) {
        servicesMult = Math.min(1.4, 1 + (stats.passed_services / totalDecisions) * 0.5);
        console.log(`Services appears more important (${stats.passed_services} passed), mult: ${servicesMult.toFixed(2)}`);
      }
    }

    // Upsert the adjustments
    const adjustments: ScoringAdjustments = {
      geography_weight_mult: geoMult,
      size_weight_mult: sizeMult,
      services_weight_mult: servicesMult,
      approved_count: stats.approved_count,
      rejected_count: stats.rejected_count,
      passed_geography: stats.passed_geography,
      passed_size: stats.passed_size,
      passed_services: stats.passed_services,
    };

    const { error: upsertError } = await supabaseClient
      .from("deal_scoring_adjustments")
      .upsert({
        deal_id: dealId,
        ...adjustments,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'deal_id'
      });

    if (upsertError) {
      console.error("Error upserting adjustments:", upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully updated adjustments for deal ${dealId}:`, adjustments);

    // Generate insights text
    const insights: string[] = [];
    if (geoMult < 0.9) {
      insights.push(`Geography weight reduced to ${Math.round(geoMult * 100)}% - approved buyers show lower geo scores`);
    } else if (geoMult > 1.1) {
      insights.push(`Geography weight increased to ${Math.round(geoMult * 100)}% - ${stats.passed_geography} buyers passed due to geography`);
    }
    if (sizeMult < 0.9) {
      insights.push(`Size weight reduced to ${Math.round(sizeMult * 100)}% - approved buyers show lower size scores`);
    } else if (sizeMult > 1.1) {
      insights.push(`Size weight increased to ${Math.round(sizeMult * 100)}% - ${stats.passed_size} buyers passed due to size`);
    }
    if (servicesMult < 0.9) {
      insights.push(`Services weight reduced to ${Math.round(servicesMult * 100)}% - approved buyers show lower service scores`);
    } else if (servicesMult > 1.1) {
      insights.push(`Services weight increased to ${Math.round(servicesMult * 100)}% - ${stats.passed_services} buyers passed due to services`);
    }

    return new Response(JSON.stringify({
      success: true,
      adjustments,
      insights,
      stats: {
        totalDecisions,
        approved: stats.approved_count,
        passedByCategory: {
          geography: stats.passed_geography,
          size: stats.passed_size,
          services: stats.passed_services,
        },
        averageApprovedScores: {
          geography: avgApprovedGeo.toFixed(1),
          size: avgApprovedSize.toFixed(1),
          services: avgApprovedService.toFixed(1),
        }
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in recalculate-deal-weights:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
