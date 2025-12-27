import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Region to state abbreviation mapping
const REGION_TO_STATES: Record<string, string[]> = {
  'southeast': ['GA', 'FL', 'SC', 'NC', 'AL', 'TN', 'MS', 'LA', 'AR', 'KY', 'VA', 'WV'],
  'south': ['TX', 'OK', 'LA', 'AR', 'MS', 'AL', 'TN', 'KY', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV'],
  'northeast': ['NY', 'NJ', 'PA', 'CT', 'MA', 'RI', 'VT', 'NH', 'ME', 'DE', 'MD'],
  'midwest': ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'SD', 'ND'],
  'southwest': ['TX', 'AZ', 'NM', 'OK', 'NV'],
  'west': ['CA', 'WA', 'OR', 'NV', 'UT', 'CO', 'ID', 'MT', 'WY', 'AK', 'HI'],
  'pacific northwest': ['WA', 'OR', 'ID'],
  'new england': ['MA', 'CT', 'RI', 'VT', 'NH', 'ME'],
  'mid-atlantic': ['NY', 'NJ', 'PA', 'DE', 'MD', 'DC'],
  'great lakes': ['OH', 'MI', 'IN', 'IL', 'WI', 'MN'],
  'gulf coast': ['TX', 'LA', 'MS', 'AL', 'FL'],
  'rocky mountain': ['CO', 'UT', 'WY', 'MT', 'ID'],
  'sunbelt': ['CA', 'AZ', 'NM', 'TX', 'LA', 'MS', 'AL', 'GA', 'FL', 'SC', 'NC'],
  'east coast': ['ME', 'NH', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'VA', 'NC', 'SC', 'GA', 'FL'],
  'west coast': ['CA', 'OR', 'WA'],
  'national': [], // Empty - means all states, handled separately
  'nationwide': [],
};

// Pre-extract patterns from notes to help AI
function preExtractHints(notes: string): { hints: string; preExtracted: Record<string, any> } {
  const preExtracted: Record<string, any> = {};
  const hintLines: string[] = [];
  
  // Website extraction
  const websiteMatch = notes.match(/(?:Website|URL|Site|Web)[:\s]+\s*(https?:\/\/[^\s\n]+)/i);
  if (websiteMatch) {
    preExtracted.company_website = websiteMatch[1].replace(/[.,;]+$/, ''); // Remove trailing punctuation
    hintLines.push(`PRE-EXTRACTED Website: ${preExtracted.company_website}`);
  }
  
  // Revenue extraction with various formats
  const revenuePatterns = [
    /Revenue[:\s]+\$?([\d,.]+)\s*(M|MM|million|mil)?/i,
    /\$?([\d,.]+)\s*(M|MM|million)\s+(?:in\s+)?revenue/i,
    /annual\s+revenue[:\s]+\$?([\d,.]+)\s*(M|MM|million|K|thousand)?/i,
  ];
  for (const pattern of revenuePatterns) {
    const match = notes.match(pattern);
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const suffix = match[2]?.toLowerCase();
      if (suffix === 'k' || suffix === 'thousand') {
        value = value / 1000; // Convert K to millions
      } else if (!suffix && value > 100) {
        // Likely already in thousands or actual dollars, try to normalize
        if (value > 1000000) value = value / 1000000;
        else if (value > 1000) value = value / 1000;
      }
      preExtracted.revenue = value;
      hintLines.push(`PRE-EXTRACTED Revenue: $${value}M`);
      break;
    }
  }
  
  // EBITDA dollar amount extraction
  const ebitdaAmountPatterns = [
    /EBITDA[:\s]+\$?([\d,.]+)\s*(K|thousand|M|MM|million)?/i,
    /\$?([\d,.]+)\s*(K|thousand|M|MM|million)?\s+EBITDA/i,
  ];
  for (const pattern of ebitdaAmountPatterns) {
    const match = notes.match(pattern);
    if (match && !match[0].includes('%')) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const suffix = match[2]?.toLowerCase();
      if (suffix === 'k' || suffix === 'thousand') {
        value = value / 1000; // Convert K to millions
      } else if (!suffix && value > 100) {
        // Likely in thousands or actual dollars
        if (value > 1000000) value = value / 1000000;
        else if (value > 1000) value = value / 1000;
      }
      preExtracted.ebitda_amount = value;
      hintLines.push(`PRE-EXTRACTED EBITDA Amount: $${value}M`);
      break;
    }
  }
  
  // EBITDA margin/percentage extraction
  const ebitdaPercentPatterns = [
    /EBITDA\s+Margin[:\s]+([\d.]+)\s*%/i,
    /EBITDA[:\s]+([\d.]+)\s*%/i,
    /([\d.]+)\s*%\s+EBITDA/i,
    /margins?[:\s]+([\d.]+)\s*%/i,
  ];
  for (const pattern of ebitdaPercentPatterns) {
    const match = notes.match(pattern);
    if (match) {
      preExtracted.ebitda_percentage = parseFloat(match[1]);
      hintLines.push(`PRE-EXTRACTED EBITDA Margin: ${preExtracted.ebitda_percentage}%`);
      break;
    }
  }
  
  // Region/geography extraction
  const regionPattern = /(?:across|throughout|in|serving)\s+(?:the\s+)?(southeast|southwest|northeast|midwest|west coast|east coast|pacific northwest|new england|mid-atlantic|gulf coast|sunbelt|south|west)/gi;
  const regionMatches = [...notes.matchAll(regionPattern)];
  if (regionMatches.length > 0) {
    const regions = regionMatches.map(m => m[1].toLowerCase());
    const expandedStates = new Set<string>();
    for (const region of regions) {
      const states = REGION_TO_STATES[region] || REGION_TO_STATES[region.replace(/\s+/g, ' ')];
      if (states) {
        states.forEach(s => expandedStates.add(s));
      }
    }
    if (expandedStates.size > 0) {
      preExtracted.geography = Array.from(expandedStates);
      hintLines.push(`PRE-EXTRACTED Geography from regions (${regions.join(', ')}): ${preExtracted.geography.join(', ')}`);
    }
  }
  
  // Location count extraction
  const locationPatterns = [
    /(\d+)\s+(?:staffed\s+)?locations?/i,
    /(\d+)\s+offices?/i,
    /(\d+)\s+branches?/i,
    /(\d+)\s+stores?/i,
    /locations?[:\s]+(\d+)/i,
  ];
  for (const pattern of locationPatterns) {
    const match = notes.match(pattern);
    if (match) {
      preExtracted.location_count = parseInt(match[1], 10);
      hintLines.push(`PRE-EXTRACTED Location Count: ${preExtracted.location_count}`);
      break;
    }
  }
  
  // "Multiple locations" handling
  if (!preExtracted.location_count) {
    if (/multiple\s+(?:staffed\s+)?locations?/i.test(notes)) {
      preExtracted.location_count = 3; // Conservative estimate
      hintLines.push(`PRE-EXTRACTED Location Count: ~3 (from "multiple locations")`);
    }
  }
  
  // Founded year extraction
  const foundedMatch = notes.match(/(?:Founded|Established|Started)[:\s]+(\d{4})/i);
  if (foundedMatch) {
    preExtracted.founded_year = parseInt(foundedMatch[1], 10);
    hintLines.push(`PRE-EXTRACTED Founded: ${preExtracted.founded_year}`);
  }
  
  const hints = hintLines.length > 0 
    ? '\n\n--- PRE-EXTRACTED HINTS (use these values) ---\n' + hintLines.join('\n') 
    : '';
    
  return { hints, preExtracted };
}

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
          description: "Company name or deal name. Look for explicit labels like 'Company:', 'Deal:', memo titles, or identify from context."
        },
        company_website: {
          type: "string",
          description: "Company website URL if mentioned. Include https://. Look for 'Website:', 'URL:', 'Site:' labels."
        },
        geography: {
          type: "array",
          items: { type: "string" },
          description: "US states where the company operates as 2-letter abbreviations. Expand regions: 'Southeast' = GA,FL,SC,NC,AL,TN,MS,LA. Extract from service areas, headquarters, city mentions."
        },
        revenue: {
          type: "number",
          description: "Annual revenue in MILLIONS. Convert: $6.0M = 6, $6,000,000 = 6, $500K = 0.5, $10 million = 10. Use midpoint for ranges."
        },
        ebitda_percentage: {
          type: "number", 
          description: "EBITDA margin as PERCENTAGE (whole number). '10.8%' = 10.8, '20% margins' = 20. Also from 'profit margins', 'EBITDA Margin:'."
        },
        ebitda_amount: {
          type: "number",
          description: "EBITDA dollar amount in MILLIONS. '$650,000' = 0.65, '$650K' = 0.65, '$1M EBITDA' = 1."
        },
        service_mix: {
          type: "string",
          description: "ALL services/products with percentages if given. Include: '70% residential / 30% commercial', specialties, revenue mix, capabilities."
        },
        owner_goals: {
          type: "string",
          description: "Sale intentions and preferences: 'open to sale discussions', timeline, retirement plans, post-sale involvement, financial goals."
        },
        location_count: {
          type: "number",
          description: "Number of physical locations/offices/branches. 'Multiple locations' = estimate 3. 'Several' = estimate 3-5."
        },
        additional_info: {
          type: "string",
          description: "Other relevant details: founded year, employee count, certifications, licenses, team experience, unique capabilities, geographic coverage details."
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
    console.log('[analyze-deal-notes] Notes preview (first 500 chars):', notes.substring(0, 500));

    // Pre-extract obvious patterns
    const { hints, preExtracted } = preExtractHints(notes);
    console.log('[analyze-deal-notes] Pre-extracted data:', JSON.stringify(preExtracted, null, 2));

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
            content: `You are an M&A analyst assistant. Extract structured deal information from notes about a business opportunity.

The notes may be in various formats:
- Conversational notes from calls or emails
- Structured memos with bullet points and headers
- Mixed formats with sections and tables

EXTRACTION RULES:

1. DEAL NAME / COMPANY NAME:
   - Look for explicit labels: "Company:", "Deal:", "Lead Memo –", or memo title/header
   - If a descriptive name is given (e.g., "Southeast Roofing Contractor"), use it
   - Can also extract from website domain if no other name given

2. WEBSITE:
   - Look for URLs anywhere: https://example.com
   - Look for labels: "Website:", "URL:", "Site:", "Web:"
   - Include full URL with https://

3. FINANCIAL DATA (convert to MILLIONS):
   - Revenue: "$6.0M" = 6, "$6,000,000" = 6, "$500K" = 0.5
   - EBITDA Amount: "$650,000" = 0.65, "$650K" = 0.65, "$1.2M" = 1.2
   - EBITDA Percentage: "10.8%" = 10.8, "EBITDA Margin: 15%" = 15
   - Also look for: "margins", "profitability", "cash flow"

4. GEOGRAPHY (expand regions to states):
   - "Southeast" → GA, FL, SC, NC, AL, TN, MS, LA
   - "Northeast" → NY, NJ, PA, CT, MA, RI, VT, NH, ME
   - "Midwest" → OH, MI, IN, IL, WI, MN, IA, MO, KS, NE, SD, ND
   - "Southwest" → TX, AZ, NM, OK
   - "West Coast" → CA, WA, OR
   - "Gulf Coast" → TX, LA, MS, AL, FL
   - "Pacific Northwest" → WA, OR, ID
   - Extract from city mentions: "Atlanta" = GA, "Houston" = TX
   - Return as array of 2-letter state codes

5. LOCATION COUNT:
   - Look for: "X locations", "X offices", "X branches"
   - "Multiple staffed locations" = estimate 3
   - "Several locations" = estimate 4

6. SERVICE MIX:
   - Extract ALL services mentioned with percentages
   - Format: "70% residential / 30% commercial. Metal roofing ~50% of production."
   - Include specialties and unique capabilities

7. OWNER GOALS:
   - Sale intentions: "open to sale discussions", "looking to exit"
   - Timeline: "retire in 2 years"
   - Post-sale: "management can run operations post-transaction"
   - Involvement preferences

8. ADDITIONAL INFO:
   - Founded/established date
   - Employee count
   - Years of experience
   - Certifications, licenses
   - Team structure
   - Customer base details
   - Unique aspects`
          },
          {
            role: "user",
            content: `Extract ALL deal information from these notes. Be thorough - extract every data point mentioned.

${notes}${hints}`
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
    console.log('[analyze-deal-notes] Full AI response:', JSON.stringify(data.choices?.[0]?.message, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_deal_info') {
      console.error('[analyze-deal-notes] Unexpected response format:', JSON.stringify(data, null, 2));
      throw new Error('Unexpected AI response format');
    }

    let extractedData = JSON.parse(toolCall.function.arguments);
    console.log('[analyze-deal-notes] AI extracted data:', JSON.stringify(extractedData, null, 2));

    // Merge pre-extracted data with AI results (pre-extracted takes precedence for numeric values)
    if (preExtracted.company_website && !extractedData.company_website) {
      extractedData.company_website = preExtracted.company_website;
    }
    if (preExtracted.revenue && !extractedData.revenue) {
      extractedData.revenue = preExtracted.revenue;
    }
    if (preExtracted.ebitda_amount && !extractedData.ebitda_amount) {
      extractedData.ebitda_amount = preExtracted.ebitda_amount;
    }
    if (preExtracted.ebitda_percentage && !extractedData.ebitda_percentage) {
      extractedData.ebitda_percentage = preExtracted.ebitda_percentage;
    }
    if (preExtracted.geography?.length && (!extractedData.geography || extractedData.geography.length === 0)) {
      extractedData.geography = preExtracted.geography;
    }
    if (preExtracted.location_count && !extractedData.location_count) {
      extractedData.location_count = preExtracted.location_count;
    }
    
    console.log('[analyze-deal-notes] After merging pre-extracted:', JSON.stringify(extractedData, null, 2));

    // Normalize geography to uppercase state abbreviations
    if (extractedData.geography && Array.isArray(extractedData.geography)) {
      const normalizedGeo = new Set<string>();
      for (const g of extractedData.geography) {
        const upper = g.toUpperCase().trim();
        // Check if it's already a valid 2-letter code
        if (upper.length === 2) {
          normalizedGeo.add(upper);
        } else {
          // Check if it's a region name
          const regionKey = g.toLowerCase().trim();
          const states = REGION_TO_STATES[regionKey];
          if (states && states.length > 0) {
            states.forEach(s => normalizedGeo.add(s));
          }
        }
      }
      extractedData.geography = Array.from(normalizedGeo).sort();
    }

    // Calculate ebitda_amount from percentage if not explicitly provided
    if (extractedData.revenue && extractedData.ebitda_percentage && !extractedData.ebitda_amount) {
      extractedData.ebitda_amount = extractedData.revenue * (extractedData.ebitda_percentage / 100);
      console.log('[analyze-deal-notes] Calculated ebitda_amount:', extractedData.ebitda_amount, 'from revenue:', extractedData.revenue, 'and margin:', extractedData.ebitda_percentage, '%');
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

    console.log('[analyze-deal-notes] Fields extracted:', fieldsExtracted);

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
          
          // extraction_sources is stored as an object { field: { source, extractedAt } }
          const existingSources = (userDeal.extraction_sources as Record<string, any>) || {};
          
          // Update source entries for each extracted field
          const updatedSources = { ...existingSources };
          const now = new Date().toISOString();
          for (const field of fieldsExtracted) {
            updatedSources[field] = { source: 'notes', extractedAt: now };
          }
          
          // Build update object
          const updateData: Record<string, any> = { 
            extraction_sources: updatedSources,
            updated_at: now
          };
          
          // If applyToRecord is true, apply extracted data to empty fields
          if (applyToRecord) {
            const isEmptyOrPlaceholder = (value: any, fieldName?: string): boolean => {
              if (value === null || value === undefined) return true;
              if (typeof value === 'string') {
                const trimmed = value.trim().toLowerCase();
                return trimmed === '' || trimmed === 'n/a' || trimmed === 'na' || trimmed === '-' || trimmed === 'none' || trimmed === 'unknown';
              }
              if (Array.isArray(value)) return value.length === 0;
              if ((fieldName === 'location_count' || fieldName === 'employee_count') && value === 1) return true;
              if (typeof value === 'number') return false;
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
            if (extractedData.location_count && isEmptyOrPlaceholder(userDeal.location_count, 'location_count')) {
              updateData.location_count = extractedData.location_count;
            }
            if (extractedData.additional_info) {
              const empMatch = extractedData.additional_info.match(/(\d+)\s*employees?/i);
              if (empMatch && isEmptyOrPlaceholder(userDeal.employee_count, 'employee_count')) {
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
            
            // Trigger deal scoring after successful update
            try {
              const scoreResponse = await fetch(`${supabaseUrl}/functions/v1/score-deal`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({ dealId })
              });
              if (scoreResponse.ok) {
                console.log('[analyze-deal-notes] Triggered deal scoring successfully');
              } else {
                console.error('[analyze-deal-notes] Failed to trigger scoring:', await scoreResponse.text());
              }
            } catch (scoreErr) {
              console.error('[analyze-deal-notes] Failed to trigger scoring:', scoreErr);
            }
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
