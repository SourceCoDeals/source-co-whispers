import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Placeholder detection patterns
const PLACEHOLDER_PATTERNS = [
  /\$\[X\]/gi,
  /\[X\]/gi,
  /\$X/gi,
  /X%/g,
  /\[VALUE\]/gi,
  /\[NAME\]/gi,
  /\[CITY\]/gi,
  /\[INDUSTRY\]/gi,
  /\[INSERT.*?\]/gi,
  /\{.*?TBD.*?\}/gi,
  /XX,XXX/g,
  /\$\d*X+/gi,
];

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

    // Detect placeholders in input
    const inputPlaceholders: string[] = [];
    for (const pattern of PLACEHOLDER_PATTERNS) {
      const matches = fit_criteria.match(pattern);
      if (matches) {
        inputPlaceholders.push(...matches);
      }
    }
    
    if (inputPlaceholders.length > 0) {
      console.warn('Input contains placeholders:', inputPlaceholders.slice(0, 5));
    }

    // Retry logic with exponential backoff
    let retryCount = 0;
    const maxRetries = 2;
    let lastError: Error | null = null;

    while (retryCount <= maxRetries) {
      try {
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

⚠️ CRITICAL - NO PLACEHOLDERS ⚠️
You MUST NOT output any placeholders like [X], $[X]M, [VALUE], [CITY], etc.
If you cannot determine a specific value, use null instead of a placeholder.
If the input contains placeholders, try to infer reasonable values or skip that field.

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
   
❌ NEVER put multiples in min_ebitda/max_ebitda - those are for DOLLAR AMOUNTS ONLY!
   
✅ "$2M-$10M EBITDA" = DOLLAR AMOUNT (buyer's current EBITDA)
   → Use: min_ebitda: "$2M", max_ebitda: "$10M"

PER-LOCATION vs TOTAL METRICS:
✅ "$2M+ revenue per location" → Use: min_revenue_per_location: "$2M"
   
CRITICAL INSTRUCTIONS:
1. Identify ALL buyer types/segments mentioned
2. Extract SPECIFIC thresholds for EACH type
3. NEVER output placeholder text - use null for unknown values`
              },
              {
                role: 'user',
                content: `Parse the following buyer fit criteria. DO NOT include any placeholder values like [X] or $X - use null for unknown values:\n\n${fit_criteria}`
              }
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'extract_fit_criteria',
                  description: 'Extract structured fit criteria from natural language. Never use placeholder values.',
                  parameters: {
                    type: 'object',
                    properties: {
                      size_criteria: {
                        type: 'object',
                        description: 'Size-related requirements',
                        properties: {
                          min_revenue: { type: 'string', description: 'Minimum revenue threshold in dollars. Use null if unknown.' },
                          max_revenue: { type: 'string', description: 'Maximum revenue threshold. Use null if unknown.' },
                          min_ebitda: { type: 'string', description: 'Minimum EBITDA in dollars (NOT multiples!). Use null if unknown.' },
                          max_ebitda: { type: 'string', description: 'Maximum EBITDA in dollars. Use null if unknown.' },
                          ebitda_multiple_min: { type: 'string', description: 'Minimum EBITDA valuation multiple. Use null if unknown.' },
                          ebitda_multiple_max: { type: 'string', description: 'Maximum EBITDA valuation multiple. Use null if unknown.' },
                          min_revenue_per_location: { type: 'string', description: 'Minimum revenue per location. Use null if unknown.' },
                          min_sqft_per_location: { type: 'string', description: 'Minimum square footage per location. Use null if unknown.' },
                          location_count: { type: 'string', description: 'Number of locations required. Use null if unknown.' },
                          other: { type: 'array', items: { type: 'string' }, description: 'Other size-related criteria' }
                        }
                      },
                      service_criteria: {
                        type: 'object',
                        description: 'Service/product mix requirements',
                        properties: {
                          primary_focus: { type: 'array', items: { type: 'string' }, description: 'Primary focus services - REQUIRED - must extract at least 2-3 services.' },
                          required_services: { type: 'array', items: { type: 'string' }, description: 'Must-have services' },
                          preferred_services: { type: 'array', items: { type: 'string' }, description: 'Nice-to-have services' },
                          excluded_services: { type: 'array', items: { type: 'string' }, description: 'Services that are deal breakers' },
                          business_model: { type: 'string', description: 'Required business model' },
                          recurring_revenue: { type: 'string', description: 'Recurring revenue requirements' },
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
                          coverage_type: { type: 'string', description: 'Type of coverage needed' },
                          other: { type: 'array', items: { type: 'string' }, description: 'Other geography-related criteria' }
                        }
                      },
                      buyer_types_criteria: {
                        type: 'object',
                        description: 'Different buyer segments with their specific requirements.',
                        properties: {
                          buyer_types: {
                            type: 'array',
                            description: 'Array of ALL distinct buyer types/segments.',
                            items: {
                              type: 'object',
                              properties: {
                                type_name: { type: 'string', description: 'Name of the buyer category' },
                                priority_order: { type: 'number', description: 'Priority ranking (1 = highest)' },
                                description: { type: 'string', description: 'Brief description' },
                                ownership_profile: { type: 'string', description: 'Typical ownership' },
                                min_locations: { type: 'string', description: 'Minimum locations required' },
                                max_locations: { type: 'string', description: 'Maximum locations' },
                                min_ebitda: { type: 'string', description: 'Minimum EBITDA in dollars' },
                                max_ebitda: { type: 'string', description: 'Maximum EBITDA in dollars' },
                                ebitda_multiple_min: { type: 'string', description: 'Min EBITDA multiple' },
                                ebitda_multiple_max: { type: 'string', description: 'Max EBITDA multiple' },
                                geographic_scope: { type: 'string', description: 'Geographic scope' },
                                geographic_rules: { type: 'string', description: 'Specific geographic matching rules' },
                                acquisition_style: { type: 'string', description: 'How they acquire' },
                                exclusions: { type: 'string', description: 'What disqualifies a deal' },
                                fit_notes: { type: 'string', description: 'Additional fit notes' }
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

        if (response.status === 429) {
          console.log(`Rate limited, waiting ${3 * (retryCount + 1)} seconds...`);
          await new Promise(r => setTimeout(r, 3000 * (retryCount + 1)));
          retryCount++;
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI Gateway error:', response.status, errorText);
          
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          lastError = new Error(`AI Gateway error: ${response.status}`);
          retryCount++;
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        const data = await response.json();
        console.log('AI response received');

        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall || toolCall.function.name !== 'extract_fit_criteria') {
          throw new Error('Unexpected AI response format');
        }

        const extractedCriteria = JSON.parse(toolCall.function.arguments);
        console.log('Extracted criteria:', JSON.stringify(extractedCriteria).substring(0, 200));

        // Post-process to clean placeholders from output
        const cleanPlaceholders = (obj: Record<string, unknown>): Record<string, unknown> => {
          const cleaned: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
              let hasPlaceholder = false;
              for (const pattern of PLACEHOLDER_PATTERNS) {
                if (pattern.test(value)) {
                  hasPlaceholder = true;
                  break;
                }
              }
              cleaned[key] = hasPlaceholder ? null : value;
            } else if (Array.isArray(value)) {
              cleaned[key] = value.filter(v => {
                if (typeof v === 'string') {
                  for (const pattern of PLACEHOLDER_PATTERNS) {
                    if (pattern.test(v)) return false;
                  }
                }
                return true;
              });
            } else if (value && typeof value === 'object') {
              cleaned[key] = cleanPlaceholders(value as Record<string, unknown>);
            } else {
              cleaned[key] = value;
            }
          }
          return cleaned;
        };

        // Process size criteria
        const sizeCriteria = cleanPlaceholders(extractedCriteria.size_criteria || {}) as Record<string, unknown>;
        
        // Detect misplaced EBITDA multiples
        const isLikelyMultiple = (val: string | undefined): boolean => {
          if (!val) return false;
          const cleaned = val.toString().toLowerCase().replace(/[^0-9.x]/g, '');
          if (cleaned.includes('x')) return true;
          const numVal = parseFloat(cleaned);
          return !val.includes('$') && numVal > 0 && numVal <= 15;
        };

        // Move misplaced multiples to correct fields
        if (isLikelyMultiple(sizeCriteria.min_ebitda as string)) {
          sizeCriteria.ebitda_multiple_min = (sizeCriteria.min_ebitda as string).toString().includes('x') 
            ? sizeCriteria.min_ebitda 
            : sizeCriteria.min_ebitda + 'x';
          sizeCriteria.min_ebitda = null;
        }
        
        if (isLikelyMultiple(sizeCriteria.max_ebitda as string)) {
          sizeCriteria.ebitda_multiple_max = (sizeCriteria.max_ebitda as string).toString().includes('x') 
            ? sizeCriteria.max_ebitda 
            : sizeCriteria.max_ebitda + 'x';
          sizeCriteria.max_ebitda = null;
        }

        // Process buyer types
        const buyerTypes = (extractedCriteria.buyer_types_criteria?.buyer_types || []) as Array<Record<string, unknown>>;
        for (const buyerType of buyerTypes) {
          if (isLikelyMultiple(buyerType.min_ebitda as string)) {
            buyerType.ebitda_multiple_min = (buyerType.min_ebitda as string).toString().includes('x') 
              ? buyerType.min_ebitda 
              : buyerType.min_ebitda + 'x';
            buyerType.min_ebitda = null;
          }
          if (isLikelyMultiple(buyerType.max_ebitda as string)) {
            buyerType.ebitda_multiple_max = (buyerType.max_ebitda as string).toString().includes('x') 
              ? buyerType.max_ebitda 
              : buyerType.max_ebitda + 'x';
            buyerType.max_ebitda = null;
          }
        }

        // Clean service and geography criteria
        const serviceCriteria = cleanPlaceholders(extractedCriteria.service_criteria || {});
        const geographyCriteria = cleanPlaceholders(extractedCriteria.geography_criteria || {});

        // Validate primary_focus is present
        const primaryFocus = (serviceCriteria.primary_focus as string[]) || [];
        if (primaryFocus.length === 0) {
          console.warn('No primary_focus extracted - scoring accuracy may be reduced');
        }

        return new Response(
          JSON.stringify({
            success: true,
            size_criteria: sizeCriteria,
            service_criteria: serviceCriteria,
            geography_criteria: geographyCriteria,
            buyer_types_criteria: { buyer_types: buyerTypes },
            validation: {
              has_primary_focus: primaryFocus.length > 0,
              has_size_criteria: !!(sizeCriteria.min_revenue || sizeCriteria.min_ebitda),
              buyer_types_count: buyerTypes.length,
              input_had_placeholders: inputPlaceholders.length > 0
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        lastError = error as Error;
        retryCount++;
        await new Promise(r => setTimeout(r, 2000 * retryCount));
      }
    }

    // All retries exhausted
    throw lastError || new Error('Failed after all retries');

  } catch (error) {
    console.error('Error in parse-fit-criteria:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
