import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const extractDealInfoTool = {
  type: "function",
  function: {
    name: "extract_deal_info",
    description: "Extract company, financial, and deal information from general notes about a business",
    parameters: {
      type: "object",
      properties: {
        deal_name: {
          type: "string",
          description: "Company name or deal name extracted from the notes"
        },
        company_website: {
          type: "string",
          description: "Company website URL if mentioned (include https://)"
        },
        geography: {
          type: "array",
          items: { type: "string" },
          description: "US states where the company operates. Use 2-letter state abbreviations (e.g., TX, FL, CA). Extract from city/state mentions, headquarters, service areas."
        },
        revenue: {
          type: "number",
          description: "Annual revenue in MILLIONS. Convert to millions: $5M = 5, $500K = 0.5, $10 million = 10. If given as a range, use the midpoint."
        },
        ebitda_percentage: {
          type: "number", 
          description: "EBITDA or profit margin as a PERCENTAGE (not decimal). 20% = 20, 15% margins = 15. Also extract from 'profit margins', 'margins', 'profitability' mentions."
        },
        ebitda_amount: {
          type: "number",
          description: "EBITDA dollar amount in MILLIONS if mentioned (e.g., $1M EBITDA = 1)"
        },
        service_mix: {
          type: "string",
          description: "Description of services or products offered by the company"
        },
        owner_goals: {
          type: "string",
          description: "What the owner wants from the sale - timeline, involvement post-sale, retirement plans, financial goals"
        },
        location_count: {
          type: "number",
          description: "Number of physical locations, stores, shops, or offices the company operates"
        },
        additional_info: {
          type: "string",
          description: "Any other relevant details not captured in other fields - employee count, years in business, certifications, unique aspects"
        }
      },
      required: []
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, dealId, applyToRecord } = await req.json();
    
    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Notes content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('[analyze-deal-notes] Analyzing notes, length:', notes.length, 'dealId:', dealId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an M&A analyst assistant. Extract structured deal information from unstructured notes about a business opportunity.

CRITICAL: Extract ALL financial information mentioned:
- Revenue: Convert to millions (e.g., "$5 million" = 5, "$500K" = 0.5, "5M revenue" = 5)
- EBITDA/Margins: Extract as percentage (e.g., "20% margins" = 20, "15% EBITDA" = 15, "margins around 18%" = 18)
- Look for variations: "profit margins", "profitability", "bottom line", "cash flow margins"

CRITICAL: Extract geographic information:
- Convert city/state mentions to state abbreviations (e.g., "Houston, Texas" = TX, "based in Atlanta" = GA)
- Extract from headquarters, service areas, locations mentioned

CRITICAL: Extract owner goals:
- Timeline ("looking to exit in 2 years", "retire soon")
- Post-sale involvement ("wants to stay on", "clean exit")
- Financial expectations`
          },
          {
            role: "user",
            content: `Extract ALL deal information from these notes. Pay special attention to any revenue, EBITDA, margin, or profitability figures mentioned:\n\n${notes}`
          }
        ],
        tools: [extractDealInfoTool],
        tool_choice: { type: "function", function: { name: "extract_deal_info" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[analyze-deal-notes] AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[analyze-deal-notes] AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_deal_info') {
      throw new Error('Unexpected AI response format');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('[analyze-deal-notes] Extracted data:', extractedData);

    // Normalize geography to uppercase state abbreviations
    if (extractedData.geography && Array.isArray(extractedData.geography)) {
      extractedData.geography = extractedData.geography
        .map((g: string) => g.toUpperCase().trim())
        .filter((g: string) => g.length === 2);
    }

    // Build list of fields that were extracted
    const fieldsExtracted: string[] = [];
    if (extractedData.deal_name) fieldsExtracted.push('deal_name');
    if (extractedData.company_website) fieldsExtracted.push('company_website');
    if (extractedData.geography?.length) fieldsExtracted.push('geography');
    if (extractedData.revenue) fieldsExtracted.push('revenue');
    if (extractedData.ebitda_percentage) fieldsExtracted.push('ebitda_percentage');
    if (extractedData.ebitda_amount) fieldsExtracted.push('ebitda_amount');
    if (extractedData.service_mix) fieldsExtracted.push('service_mix');
    if (extractedData.owner_goals) fieldsExtracted.push('owner_goals');
    if (extractedData.location_count) fieldsExtracted.push('location_count');
    if (extractedData.additional_info) fieldsExtracted.push('additional_info');

    // If dealId is provided, update extraction_sources and optionally apply data
    if (dealId && fieldsExtracted.length > 0) {
      console.log('[analyze-deal-notes] Updating deal:', dealId, 'applyToRecord:', applyToRecord);
      
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        
        // First verify access with user client
        const userClient = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        );
        
        const { data: userDeal, error: accessError } = await userClient
          .from('deals')
          .select('id, extraction_sources, revenue, ebitda_percentage, ebitda_amount, geography, service_mix, owner_goals, location_count, employee_count')
          .eq('id', dealId)
          .single();
        
        if (!accessError && userDeal) {
          // Use service role to update
          const serviceClient = createClient(supabaseUrl, supabaseKey);
          
          const existingSources = (userDeal.extraction_sources as any[]) || [];
          
          // Create new source entry for notes
          const newSource = {
            source: 'notes',
            timestamp: new Date().toISOString(),
            fields: fieldsExtracted
          };
          
          const updatedSources = [...existingSources, newSource];
          
          // Build update object
          const updateData: Record<string, any> = { 
            extraction_sources: updatedSources,
            updated_at: new Date().toISOString()
          };
          
          // If applyToRecord is true, apply extracted data to empty fields
          // Notes have priority 80 (below transcript at 100), so only fill empty fields
          if (applyToRecord) {
            const isEmptyOrPlaceholder = (value: any): boolean => {
              if (value === null || value === undefined) return true;
              if (typeof value === 'string') {
                const trimmed = value.trim().toLowerCase();
                return trimmed === '' || trimmed === 'n/a' || trimmed === 'na' || trimmed === '-' || trimmed === 'none' || trimmed === 'unknown';
              }
              if (Array.isArray(value)) return value.length === 0;
              if (typeof value === 'number') return false; // Numbers are considered filled
              return false;
            };
            
            // Apply extracted fields only if current value is empty
            if (extractedData.revenue && isEmptyOrPlaceholder(userDeal.revenue)) {
              updateData.revenue = extractedData.revenue;
            }
            if (extractedData.ebitda_percentage && isEmptyOrPlaceholder(userDeal.ebitda_percentage)) {
              updateData.ebitda_percentage = extractedData.ebitda_percentage;
            }
            if (extractedData.ebitda_amount && isEmptyOrPlaceholder(userDeal.ebitda_amount)) {
              updateData.ebitda_amount = extractedData.ebitda_amount;
            }
            if (extractedData.geography?.length && isEmptyOrPlaceholder(userDeal.geography)) {
              updateData.geography = extractedData.geography;
            }
            if (extractedData.service_mix && isEmptyOrPlaceholder(userDeal.service_mix)) {
              updateData.service_mix = extractedData.service_mix;
            }
            if (extractedData.owner_goals && isEmptyOrPlaceholder(userDeal.owner_goals)) {
              updateData.owner_goals = extractedData.owner_goals;
            }
            if (extractedData.location_count && isEmptyOrPlaceholder(userDeal.location_count)) {
              updateData.location_count = extractedData.location_count;
            }
            // Handle employee_count from additional_info
            if (extractedData.additional_info) {
              const empMatch = extractedData.additional_info.match(/(\d+)\s*employees?/i);
              if (empMatch && isEmptyOrPlaceholder(userDeal.employee_count)) {
                updateData.employee_count = parseInt(empMatch[1], 10);
              }
            }
            
            console.log('[analyze-deal-notes] Applying data to deal:', Object.keys(updateData).filter(k => k !== 'extraction_sources' && k !== 'updated_at'));
          }
          
          const { error: updateError } = await serviceClient
            .from('deals')
            .update(updateData)
            .eq('id', dealId);
          
          if (updateError) {
            console.error('[analyze-deal-notes] Failed to update deal:', updateError);
          } else {
            console.log('[analyze-deal-notes] Successfully updated deal with notes data');
          }
        } else {
          console.log('[analyze-deal-notes] Could not access deal to update:', accessError?.message);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData, fieldsExtracted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[analyze-deal-notes] Error analyzing notes:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
