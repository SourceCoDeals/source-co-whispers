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

function getStatesWithinProximity(dealStates: string[], hops: number = 1): Set<string> {
  const result = new Set<string>(dealStates);
  let frontier = new Set<string>(dealStates);
  
  for (let i = 0; i < hops; i++) {
    const newFrontier = new Set<string>();
    for (const state of frontier) {
      const adjacent = STATE_ADJACENCY[state] || [];
      for (const adj of adjacent) {
        if (!result.has(adj)) {
          newFrontier.add(adj);
          result.add(adj);
        }
      }
    }
    frontier = newFrontier;
  }
  
  return result;
}

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
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { dealId, query, messages } = await req.json();
    
    if (!dealId || !query) {
      return new Response(
        JSON.stringify({ error: "Missing dealId or query" }),
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

    // Verify user has access to this deal via RLS
    const { data: userDeal, error: accessError } = await userClient
      .from("deals")
      .select("id, tracker_id")
      .eq("id", dealId)
      .single();

    if (accessError || !userDeal) {
      console.error("Access denied for deal:", dealId, accessError?.message);
      return new Response(
        JSON.stringify({ error: "Deal not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now safe to use SERVICE_ROLE_KEY for efficient querying
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch deal data
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("*")
      .eq("id", dealId)
      .single();

    if (dealError || !deal) {
      throw new Error(`Deal not found: ${dealError?.message}`);
    }

    // Fetch all buyers for this tracker
    const { data: buyers, error: buyersError } = await supabase
      .from("buyers")
      .select("*")
      .eq("tracker_id", deal.tracker_id);

    if (buyersError) {
      throw new Error(`Failed to fetch buyers: ${buyersError.message}`);
    }

    // Get proximity states for geographic queries
    const dealStates = deal.geography || [];
    const dealRegion = dealStates.length > 0 ? getRegionForState(dealStates[0]) : null;
    const nearbyStates = getStatesWithinProximity(dealStates, 2); // ~250 miles = ~2 state hops
    const adjacentStates = getStatesWithinProximity(dealStates, 1);

    // Build context about buyers
    const buyerSummaries = (buyers || []).map((b: any) => {
      const footprint = b.geographic_footprint || [];
      const hasNearbyPresence = footprint.some((s: string) => nearbyStates.has(s));
      const hasAdjacentPresence = footprint.some((s: string) => adjacentStates.has(s));
      const inDealState = footprint.some((s: string) => dealStates.includes(s));
      
      return {
        id: b.id, // Include ID for highlighting
        name: b.platform_company_name || b.pe_firm_name,
        peFirm: b.pe_firm_name,
        hq: b.hq_city && b.hq_state ? `${b.hq_city}, ${b.hq_state}` : (b.hq_state || "Unknown"),
        geographicFootprint: footprint,
        otherOfficeLocations: b.other_office_locations || [], // Full addresses for city-level queries
        serviceRegions: b.service_regions || [],
        minRevenue: b.min_revenue,
        maxRevenue: b.max_revenue,
        minEbitda: b.min_ebitda,
        maxEbitda: b.max_ebitda,
        targetServices: b.target_services || [],
        targetIndustries: b.target_industries || [],
        acquisitionAppetite: b.acquisition_appetite,
        totalAcquisitions: b.total_acquisitions,
        lastAcquisitionDate: b.last_acquisition_date,
        thesisSummary: b.thesis_summary,
        hasNearbyPresence,
        hasAdjacentPresence,
        inDealState,
      };
    });

    const systemPrompt = `You are an expert M&A analyst helping evaluate potential buyers for an acquisition target. You have access to detailed data about both the deal and all buyers in the universe.

DEAL CONTEXT:
- Company: ${deal.deal_name}
- Location: ${deal.headquarters || "Unknown"}
- Geography/States: ${dealStates.join(", ") || "Unknown"}
- Region: ${dealRegion || "Unknown"}
- Revenue: $${deal.revenue || "Unknown"}M
- EBITDA: ${deal.ebitda_amount ? `$${deal.ebitda_amount}M` : (deal.ebitda_percentage ? `${deal.ebitda_percentage}%` : "Unknown")}
- Industry: ${deal.industry_type || "Unknown"}
- Services: ${deal.service_mix || "Unknown"}
- Business Model: ${deal.business_model || "Unknown"}

GEOGRAPHIC CONTEXT:
- Deal is in: ${dealStates.join(", ") || "Unknown states"}
- Region: ${dealRegion || "Unknown"}
- Adjacent states (within ~100 miles): ${Array.from(adjacentStates).join(", ")}
- Nearby states (within ~250 miles): ${Array.from(nearbyStates).join(", ")}

BUYER UNIVERSE (${buyerSummaries.length} buyers):
${JSON.stringify(buyerSummaries, null, 2)}

When answering questions:
1. Be specific - name actual buyers that match the criteria
2. Explain WHY each buyer matches (cite their location, acquisition history, etc.)
3. For geographic questions, use the pre-computed proximity flags (hasNearbyPresence, inDealState, etc.)
4. For "within X miles" queries, interpret this as adjacent states (~100mi) or nearby states (~250mi)
5. If no buyers match, say so clearly
6. Keep responses concise but informative
7. Format lists clearly with bullet points
8. IMPORTANT: When mentioning specific buyers in your answer, include a hidden marker at the END of your response listing their IDs:
   <!-- BUYER_HIGHLIGHT: ["buyer-uuid-1", "buyer-uuid-2"] -->
   Use the exact "id" field from the buyer data. This allows the UI to highlight those buyers in the list.
9. For CITY-SPECIFIC queries (like "buyers in Orlando" or "operations in Tampa"), search the otherOfficeLocations array for addresses containing that city name, as well as the hq field. The otherOfficeLocations field contains full street addresses with city/state info.`;

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
    console.error("query-buyer-universe error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
