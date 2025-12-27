import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { fit_criteria } = await req.json();

    if (!fit_criteria || typeof fit_criteria !== 'string') {
      return new Response(
        JSON.stringify({ error: 'fit_criteria is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing fit criteria:', fit_criteria.substring(0, 100) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert M&A analyst who parses buyer fit criteria into structured data. Your job is to extract EVERY distinct buyer segment/type mentioned in the text.

⚠️ CRITICAL - PRIMARY FOCUS SERVICES ⚠️
You MUST extract primary_focus services - these are the MAIN services that define the industry vertical.
Examples:
- For "Residential Roofing" industry: ["residential roofing", "roof replacement", "roof repair", "shingle installation", "metal roofing"]
- For "HVAC Services" industry: ["HVAC installation", "AC repair", "heating services", "ductwork", "commercial HVAC"]
- For "Auto Body/Collision" industry: ["collision repair", "auto body work", "paintless dent repair", "frame repair"]

If the text doesn't explicitly list primary services, INFER them from the industry context and buyer types mentioned.

⚠️ UNIVERSAL EXTRACTION GUIDE - CRITICAL SEMANTIC DISTINCTIONS ⚠️

VALUATION MULTIPLES vs DOLLAR AMOUNTS:
✅ "3x-12x EBITDA" = VALUATION MULTIPLE (for what buyers pay for deals)
   → Use: ebitda_multiple_min: "3x", ebitda_multiple_max: "12x"
✅ "1x-2x revenue" = REVENUE MULTIPLE
   → Use: revenue_multiple_min: "1x", revenue_multiple_max: "2x"
   
❌ NEVER put multiples in min_ebitda/max_ebitda - those are for DOLLAR AMOUNTS ONLY!
   
✅ "$2M-$10M EBITDA" = DOLLAR AMOUNT (buyer's current EBITDA)
   → Use: min_ebitda: "$2M", max_ebitda: "$10M"
✅ "$5M+ revenue" = DOLLAR AMOUNT
   → Use: min_revenue: "$5M"

PER-LOCATION vs TOTAL METRICS:
✅ "$2M+ revenue per location" or "$2M per store"
   → Use: min_revenue_per_location: "$2M"
✅ "7,500 sq ft per location"
   → Use: min_sqft_per_location: "7,500 sq ft"
   
❌ These are DIFFERENT from total company metrics!

CRITICAL INSTRUCTIONS:
1. Identify ALL buyer types/segments mentioned - there may be 2-6+ different buyer categories
2. Look for distinct segments like: "Large MSOs", "Regional MSOs", "PE Platform Seekers", "Small Local Buyers", "Strategic Buyers", etc.
3. Each buyer type has different requirements - extract the SPECIFIC thresholds for EACH type
4. Pay close attention to numbered lists, bullet points, or paragraph breaks that indicate different buyer categories
5. Extract geographic rules and deal requirements for each buyer type separately
6. Include priority ordering if mentioned (1st priority, 2nd priority, etc.)

Common buyer type patterns to look for:
- Size-based: "Large MSO", "Regional MSO", "Small/Local buyers"
- Ownership-based: "PE-backed", "Family office", "Strategic"
- Strategy-based: "Platform seekers", "Add-on focused", "Roll-up"
- Geographic-based: "National players", "Regional players", "Local operators"

For each buyer type, extract ALL of these if mentioned:
- Min/max locations, revenue, EBITDA, sq ft requirements
- Geographic scope and specific geographic rules
- Deal requirements (single vs multi-location, timing, etc.)
- What makes them a good/bad fit`
          },
          {
            role: 'user',
            content: `Parse the following buyer fit criteria. Make sure to extract EVERY distinct buyer type/segment mentioned, along with their specific requirements:\n\n${fit_criteria}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_fit_criteria',
              description: 'Extract structured fit criteria from natural language',
              parameters: {
                type: 'object',
                properties: {
                  size_criteria: {
                    type: 'object',
                    description: 'Size-related requirements',
                    properties: {
                      min_revenue: { type: 'string', description: 'Minimum revenue threshold in dollars (e.g., "$5M+")' },
                      max_revenue: { type: 'string', description: 'Maximum revenue threshold in dollars' },
                      min_ebitda: { type: 'string', description: 'Minimum EBITDA threshold in dollars (NOT multiples!)' },
                      max_ebitda: { type: 'string', description: 'Maximum EBITDA threshold in dollars (NOT multiples!)' },
                      ebitda_multiple_min: { type: 'string', description: 'Minimum EBITDA valuation multiple (e.g., "3x", "4x")' },
                      ebitda_multiple_max: { type: 'string', description: 'Maximum EBITDA valuation multiple (e.g., "8x", "12x")' },
                      revenue_multiple_min: { type: 'string', description: 'Minimum revenue valuation multiple (e.g., "1x")' },
                      revenue_multiple_max: { type: 'string', description: 'Maximum revenue valuation multiple (e.g., "2x")' },
                      min_revenue_per_location: { type: 'string', description: 'Minimum revenue per location/store (e.g., "$2M per location")' },
                      max_revenue_per_location: { type: 'string', description: 'Maximum revenue per location/store' },
                      min_sqft_per_location: { type: 'string', description: 'Minimum square footage per location (e.g., "7,500 sq ft")' },
                      employee_count: { type: 'string', description: 'Employee count requirements' },
                      location_count: { type: 'string', description: 'Number of locations required' },
                      sqft_requirements: { type: 'string', description: 'Total square footage requirements' },
                      other: { type: 'array', items: { type: 'string' }, description: 'Other size-related criteria' }
                    }
                  },
                  service_criteria: {
                    type: 'object',
                    description: 'Service/product mix requirements',
                    properties: {
                      primary_focus: { type: 'array', items: { type: 'string' }, description: 'Primary focus services - the MAIN services that define this industry (e.g., for roofing: ["residential roofing", "commercial roofing", "roof repair", "roof replacement"])' },
                      required_services: { type: 'array', items: { type: 'string' }, description: 'Must-have services or capabilities' },
                      preferred_services: { type: 'array', items: { type: 'string' }, description: 'Nice-to-have services' },
                      excluded_services: { type: 'array', items: { type: 'string' }, description: 'Services that are deal breakers' },
                      business_model: { type: 'string', description: 'Required business model (B2B, B2C, recurring, etc.)' },
                      recurring_revenue: { type: 'string', description: 'Recurring revenue requirements if any' },
                      customer_profile: { type: 'string', description: 'Target customer profile requirements' },
                      other: { type: 'array', items: { type: 'string' }, description: 'Other service-related criteria' }
                    }
                  },
                  geography_criteria: {
                    type: 'object',
                    description: 'Geographic requirements',
                    properties: {
                      required_regions: { type: 'array', items: { type: 'string' }, description: 'Must be present in these regions' },
                      preferred_regions: { type: 'array', items: { type: 'string' }, description: 'Preferred geographic areas' },
                      excluded_regions: { type: 'array', items: { type: 'string' }, description: 'Regions to avoid' },
                      coverage_type: { type: 'string', description: 'Type of coverage needed (national, regional, local, etc.)' },
                      hq_requirements: { type: 'string', description: 'Headquarters location requirements' },
                      other: { type: 'array', items: { type: 'string' }, description: 'Other geography-related criteria' }
                    }
                  },
                  buyer_types_criteria: {
                    type: 'object',
                    description: 'Different buyer segments with their specific requirements. EXTRACT ALL DISTINCT BUYER TYPES MENTIONED.',
                    properties: {
                      buyer_types: {
                        type: 'array',
                        description: 'Array of ALL distinct buyer types/segments. Look for numbered lists, bullet points, or different categories mentioned.',
                        items: {
                          type: 'object',
                          properties: {
                            type_name: { type: 'string', description: 'Name of the buyer category (e.g., "Large MSOs", "Regional MSOs", "PE Platform Seekers", "Small Local Buyers")' },
                            priority_order: { type: 'number', description: 'Priority ranking (1 = highest priority). Infer from text order if not explicit.' },
                            description: { type: 'string', description: 'Brief one-line description of this buyer type' },
                            ownership_profile: { type: 'string', description: 'Typical ownership (e.g., "Large PE-backed", "Private", "Regional PE-backed", "Family office")' },
                            min_locations: { type: 'string', description: 'Minimum locations required (e.g., "3+ locations", "6-50 locations")' },
                            max_locations: { type: 'string', description: 'Maximum locations if mentioned' },
                            min_revenue_per_location: { type: 'string', description: 'Revenue per location requirement (e.g., "$2M+ per location")' },
                            min_ebitda: { type: 'string', description: 'Minimum EBITDA requirements in dollars (e.g., "$1.5M+")' },
                            max_ebitda: { type: 'string', description: 'Maximum EBITDA in dollars if mentioned (e.g., "$3M")' },
                            ebitda_multiple_min: { type: 'string', description: 'Min EBITDA multiple for valuation (e.g., "3x")' },
                            ebitda_multiple_max: { type: 'string', description: 'Max EBITDA multiple for valuation (e.g., "8x")' },
                            min_sqft_per_location: { type: 'string', description: 'Sq ft per location requirement (e.g., "7,500+ sq ft")' },
                            geographic_scope: { type: 'string', description: 'Geographic scope (e.g., "National", "Regional", "Adjacent regions only")' },
                            geographic_rules: { type: 'string', description: 'Specific geographic matching rules (e.g., "1 shop must be in exact footprint, 2-4 shops can be adjacent regions")' },
                            deal_requirements: { type: 'string', description: 'Deal structure requirements (e.g., "Multi-location preferred", "Single location OK", "Platform with ability to scale")' },
                            acquisition_style: { type: 'string', description: 'How they acquire (e.g., "Multi-location deals", "Single location", "Platform only", "Add-ons")' },
                            exclusions: { type: 'string', description: 'What disqualifies a deal for this buyer type' },
                            fit_notes: { type: 'string', description: 'Additional notes about what makes a good fit for this buyer type' }
                          },
                          required: ['type_name', 'priority_order']
                        }
                      }
                    }
                  }
                },
                required: ['size_criteria', 'service_criteria', 'geography_criteria', 'buyer_types_criteria']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_fit_criteria' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_fit_criteria') {
      throw new Error('Unexpected AI response format');
    }

    const extractedCriteria = JSON.parse(toolCall.function.arguments);
    console.log('Extracted criteria:', JSON.stringify(extractedCriteria).substring(0, 200));

    // Post-process to validate and correct EBITDA multiples vs dollar amounts
    const sizeCriteria = extractedCriteria.size_criteria || {};
    
    // Detect misplaced EBITDA multiples (values like "3", "3x", "8x" in min_ebitda/max_ebitda)
    const isLikelyMultiple = (val: string | undefined): boolean => {
      if (!val) return false;
      const cleaned = val.toString().toLowerCase().replace(/[^0-9.x]/g, '');
      // If it contains 'x' or is a small number without $ prefix, it's likely a multiple
      if (cleaned.includes('x')) return true;
      const numVal = parseFloat(cleaned);
      return !val.includes('$') && numVal > 0 && numVal <= 15;
    };

    // Move misplaced multiples to correct fields
    if (isLikelyMultiple(sizeCriteria.min_ebitda)) {
      sizeCriteria.ebitda_multiple_min = sizeCriteria.min_ebitda.toString().includes('x') 
        ? sizeCriteria.min_ebitda 
        : sizeCriteria.min_ebitda + 'x';
      sizeCriteria.min_ebitda = null;
      console.log('Corrected min_ebitda to ebitda_multiple_min:', sizeCriteria.ebitda_multiple_min);
    }
    
    if (isLikelyMultiple(sizeCriteria.max_ebitda)) {
      sizeCriteria.ebitda_multiple_max = sizeCriteria.max_ebitda.toString().includes('x') 
        ? sizeCriteria.max_ebitda 
        : sizeCriteria.max_ebitda + 'x';
      sizeCriteria.max_ebitda = null;
      console.log('Corrected max_ebitda to ebitda_multiple_max:', sizeCriteria.ebitda_multiple_max);
    }

    // Also validate buyer_types_criteria for the same issue
    const buyerTypes = extractedCriteria.buyer_types_criteria?.buyer_types || [];
    for (const buyerType of buyerTypes) {
      if (isLikelyMultiple(buyerType.min_ebitda)) {
        buyerType.ebitda_multiple_min = buyerType.min_ebitda.toString().includes('x') 
          ? buyerType.min_ebitda 
          : buyerType.min_ebitda + 'x';
        buyerType.min_ebitda = null;
      }
      if (isLikelyMultiple(buyerType.max_ebitda)) {
        buyerType.ebitda_multiple_max = buyerType.max_ebitda.toString().includes('x') 
          ? buyerType.max_ebitda 
          : buyerType.max_ebitda + 'x';
        buyerType.max_ebitda = null;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        size_criteria: sizeCriteria,
        service_criteria: extractedCriteria.service_criteria || {},
        geography_criteria: extractedCriteria.geography_criteria || {},
        buyer_types_criteria: extractedCriteria.buyer_types_criteria || {}
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-fit-criteria:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
