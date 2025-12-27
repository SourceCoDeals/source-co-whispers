import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// State adjacency map for proximity calculations
const STATE_ADJACENCY: Record<string, string[]> = {
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
  IL: ["IN", "IA", "KY", "MO", "WI"],
  IN: ["IL", "KY", "MI", "OH"],
  IA: ["IL", "MN", "MO", "NE", "SD", "WI"],
  KS: ["CO", "MO", "NE", "OK"],
  KY: ["IL", "IN", "MO", "OH", "TN", "VA", "WV"],
  LA: ["AR", "MS", "TX"],
  ME: ["NH"],
  MD: ["DE", "PA", "VA", "WV", "DC"],
  MA: ["CT", "NH", "NY", "RI", "VT"],
  MI: ["IN", "OH", "WI"],
  MN: ["IA", "ND", "SD", "WI"],
  MS: ["AL", "AR", "LA", "TN"],
  MO: ["AR", "IL", "IA", "KS", "KY", "NE", "OK", "TN"],
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
  UT: ["AZ", "CO", "ID", "NV", "NM", "WY"],
  VT: ["MA", "NH", "NY"],
  VA: ["KY", "MD", "NC", "TN", "WV", "DC"],
  WA: ["ID", "OR"],
  WV: ["KY", "MD", "OH", "PA", "VA"],
  WI: ["IA", "IL", "MI", "MN"],
  WY: ["CO", "ID", "MT", "NE", "SD", "UT"],
  DC: ["MD", "VA"],
};

// Regional groupings
const REGIONS: Record<string, string[]> = {
  Northeast: ["CT", "ME", "MA", "NH", "NJ", "NY", "PA", "RI", "VT"],
  Southeast: ["AL", "FL", "GA", "KY", "MS", "NC", "SC", "TN", "VA", "WV"],
  Midwest: ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
  Southwest: ["AZ", "NM", "OK", "TX"],
  West: ["CA", "CO", "ID", "MT", "NV", "OR", "UT", "WA", "WY"],
  "Mid-Atlantic": ["DE", "MD", "NJ", "NY", "PA", "DC"],
  "New England": ["CT", "ME", "MA", "NH", "RI", "VT"],
};

function getRegionForState(state: string): string | null {
  for (const [region, states] of Object.entries(REGIONS)) {
    if (states.includes(state)) return region;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { trackerId, query, messages } = await req.json();
    
    if (!trackerId || !query) {
      return new Response(
        JSON.stringify({ error: "Missing trackerId or query" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    
    // Create user client to verify ownership via RLS
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user has access to this tracker via RLS
    const { data: userTracker, error: accessError } = await userClient
      .from("industry_trackers")
      .select("id")
      .eq("id", trackerId)
      .single();

    if (accessError || !userTracker) {
      console.error("Access denied for tracker:", trackerId, accessError?.message);
      return new Response(
        JSON.stringify({ error: "Tracker not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now safe to use SERVICE_ROLE_KEY for efficient querying
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tracker data with criteria and M&A guide
    const { data: tracker, error: trackerError } = await supabase
      .from("industry_trackers")
      .select("*")
      .eq("id", trackerId)
      .single();

    if (trackerError || !tracker) {
      throw new Error(`Tracker not found: ${trackerError?.message}`);
    }

    // Fetch all buyers for this tracker
    const { data: buyers, error: buyersError } = await supabase
      .from("buyers")
      .select("*")
      .eq("tracker_id", trackerId);

    if (buyersError) {
      throw new Error(`Failed to fetch buyers: ${buyersError.message}`);
    }

    // Fetch all deals for this tracker
    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select("*")
      .eq("tracker_id", trackerId);

    if (dealsError) {
      throw new Error(`Failed to fetch deals: ${dealsError.message}`);
    }

    // Build buyer summaries
    const buyerSummaries = (buyers || []).map((b: any) => {
      const footprint = b.geographic_footprint || [];
      const targetGeos = b.target_geographies || [];
      const regions = [...new Set([...footprint, ...targetGeos].map(s => getRegionForState(s)).filter(Boolean))];
      
      return {
        id: b.id,
        name: b.platform_company_name || b.pe_firm_name,
        peFirm: b.pe_firm_name,
        hq: b.hq_city && b.hq_state ? `${b.hq_city}, ${b.hq_state}` : (b.hq_state || null),
        geographicFootprint: footprint,
        targetGeographies: targetGeos,
        regions,
        serviceRegions: b.service_regions || [],
        minRevenue: b.min_revenue,
        maxRevenue: b.max_revenue,
        minEbitda: b.min_ebitda,
        maxEbitda: b.max_ebitda,
        ebitdaSweetSpot: b.ebitda_sweet_spot,
        revenueSweetSpot: b.revenue_sweet_spot,
        targetServices: b.target_services || [],
        targetIndustries: b.target_industries || [],
        acquisitionAppetite: b.acquisition_appetite,
        acquisitionFrequency: b.acquisition_frequency,
        totalAcquisitions: b.total_acquisitions,
        lastAcquisitionDate: b.last_acquisition_date,
        thesisSummary: b.thesis_summary,
        strategicPriorities: b.strategic_priorities,
        businessSummary: b.business_summary,
        servicesOffered: b.services_offered,
        dealBreakers: b.deal_breakers || [],
        addonOnly: b.addon_only,
        platformOnly: b.platform_only,
        hasFeeAgreement: b.has_fee_agreement,
      };
    });

    // Build deal summaries
    const dealSummaries = (deals || []).map((d: any) => ({
      id: d.id,
      name: d.deal_name,
      geography: d.geography || [],
      headquarters: d.headquarters,
      revenue: d.revenue,
      ebitdaAmount: d.ebitda_amount,
      ebitdaPercentage: d.ebitda_percentage,
      serviceMix: d.service_mix,
      businessModel: d.business_model,
      industryType: d.industry_type,
      status: d.status,
      dealScore: d.deal_score,
    }));

    // Build criteria summary
    const sizeCriteria = tracker.size_criteria as any || {};
    const serviceCriteria = tracker.service_criteria as any || {};
    const geographyCriteria = tracker.geography_criteria as any || {};
    const buyerTypesCriteria = tracker.buyer_types_criteria as any || {};

    const criteriaContext = {
      size: {
        minRevenue: sizeCriteria.min_revenue,
        maxRevenue: sizeCriteria.max_revenue,
        minEbitda: sizeCriteria.min_ebitda,
        maxEbitda: sizeCriteria.max_ebitda,
      },
      service: {
        requiredServices: serviceCriteria.required_services || [],
        preferredServices: serviceCriteria.preferred_services || [],
        excludedServices: serviceCriteria.excluded_services || [],
        primaryFocus: serviceCriteria.primary_focus || [],
      },
      geography: {
        requiredRegions: geographyCriteria.required_regions || [],
        preferredRegions: geographyCriteria.preferred_regions || [],
        excludedRegions: geographyCriteria.excluded_regions || [],
      },
      buyerTypes: buyerTypesCriteria.buyer_types || [],
    };

    // Truncate M&A guide if too long
    const maGuideExcerpt = tracker.ma_guide_content 
      ? tracker.ma_guide_content.substring(0, 3000) + (tracker.ma_guide_content.length > 3000 ? "..." : "")
      : null;

    const systemPrompt = `You are an expert M&A analyst helping evaluate the buyer universe for the "${tracker.industry_name}" industry tracker.

TRACKER OVERVIEW:
- Industry: ${tracker.industry_name}
- Total Buyers: ${buyerSummaries.length}
- Total Deals: ${dealSummaries.length}

BUYER FIT CRITERIA:
${JSON.stringify(criteriaContext, null, 2)}

${maGuideExcerpt ? `M&A GUIDE EXCERPT:\n${maGuideExcerpt}\n` : ""}

BUYER UNIVERSE (${buyerSummaries.length} buyers):
${JSON.stringify(buyerSummaries, null, 2)}

DEALS (${dealSummaries.length} deals):
${JSON.stringify(dealSummaries, null, 2)}

REGIONAL REFERENCE:
- Southeast: AL, FL, GA, KY, MS, NC, SC, TN, VA, WV
- Northeast: CT, ME, MA, NH, NJ, NY, PA, RI, VT
- Midwest: IL, IN, IA, KS, MI, MN, MO, NE, ND, OH, SD, WI
- Southwest: AZ, NM, OK, TX
- West: CA, CO, ID, MT, NV, OR, UT, WA, WY

When answering questions:
1. Be specific - name actual buyers that match criteria
2. Explain WHY each buyer matches (cite their data)
3. For geographic questions, use the regions array and state lists
4. For deal matching, consider both buyer criteria and deal characteristics
5. If no buyers match, say so clearly
6. Keep responses concise but informative
7. Format lists clearly with bullet points
8. When comparing buyers, provide clear pros/cons for each
9. Consider the fit criteria when making recommendations

CRITICAL - BUYER HIGHLIGHTING:
When you identify specific buyers in your response (whether filtering, recommending, or analyzing them), you MUST include their IDs at the VERY END of your response in this exact format:
<!-- BUYER_HIGHLIGHT: ["buyer-id-1", "buyer-id-2", "buyer-id-3"] -->

This hidden marker allows the UI to highlight these buyers in the table. Always include this when you mention specific buyers by name. Use the exact "id" field from the buyer data provided above.`;

    console.log(`[query-tracker-universe] Processing query for tracker ${trackerId}: "${query}"`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []).map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: query },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("query-tracker-universe error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
