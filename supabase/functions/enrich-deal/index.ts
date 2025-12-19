import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============== GEOGRAPHY NORMALIZATION ==============
const ALL_US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const STATE_NAME_TO_ABBREV: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'district of columbia': 'DC', 'florida': 'FL',
  'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN',
  'iowa': 'IA', 'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME',
  'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
};

const GEO_MISSPELLINGS: Record<string, string> = {
  'conneticut': 'CT', 'conecticut': 'CT', 'conneticutt': 'CT',
  'massachusets': 'MA', 'massachussetts': 'MA', 'massachucetts': 'MA',
  'pennsilvania': 'PA', 'pensylvania': 'PA', 'tennesee': 'TN', 'tennesse': 'TN',
  'missisipi': 'MS', 'mississipi': 'MS', 'missisippi': 'MS',
  'louisianna': 'LA', 'lousiana': 'LA', 'virgina': 'VA',
  'north carolia': 'NC', 'south carolia': 'SC', 'west virgina': 'WV',
};

function normalizeGeography(items: string[] | null | undefined): string[] | null {
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  const normalized: string[] = [];
  
  for (const item of items) {
    if (!item || typeof item !== 'string') continue;
    const trimmed = item.trim();
    const upper = trimmed.toUpperCase();
    const lower = trimmed.toLowerCase();
    
    if (trimmed.length < 2 || trimmed.length > 100) continue;
    if (/find\s*(a\s*)?shop/i.test(trimmed) || /near\s*(you|me)/i.test(trimmed)) continue;
    if (/^https?:\/\//i.test(trimmed) || /\.(com|net|org)/i.test(trimmed)) continue;
    
    if (ALL_US_STATES.includes(upper)) { normalized.push(upper); continue; }
    
    const abbrev = STATE_NAME_TO_ABBREV[lower];
    if (abbrev) { normalized.push(abbrev); continue; }
    
    if (GEO_MISSPELLINGS[lower]) { normalized.push(GEO_MISSPELLINGS[lower]); continue; }
    
    if (['national', 'nationwide', 'usa', 'us', 'united states', 'all states'].includes(lower)) {
      normalized.push(...ALL_US_STATES); continue;
    }
    
    const statesMatch = lower.match(/^(\d+)\s*states?$/);
    if (statesMatch && parseInt(statesMatch[1], 10) >= 30) {
      normalized.push(...ALL_US_STATES); continue;
    }
    
    const cityStateMatch = trimmed.match(/,\s*([A-Za-z\s]+)$/);
    if (cityStateMatch) {
      const statePart = cityStateMatch[1].trim().toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
      if (statePart.length === 2 && ALL_US_STATES.includes(statePart.toUpperCase())) {
        normalized.push(statePart.toUpperCase()); continue;
      }
      const stateAbbrev = STATE_NAME_TO_ABBREV[statePart];
      if (stateAbbrev) { normalized.push(stateAbbrev); continue; }
    }
    
    if (/^[A-Z]{2}(\s+[A-Z]{2})+$/i.test(trimmed)) {
      for (const part of upper.split(/\s+/)) {
        if (ALL_US_STATES.includes(part)) normalized.push(part);
      }
      continue;
    }
    
    console.warn(`[normalizeGeography] Skipping: "${item}"`);
  }
  
  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique.sort() : null;
}

// Tool for extracting company info from website
const extractWebsiteInfoTool = {
  type: "function",
  function: {
    name: "extract_website_info",
    description: "Extract company information from a business website",
    parameters: {
      type: "object",
      properties: {
        company_overview: {
          type: "string",
          description: "Brief executive summary of what the company does, their services, and market position"
        },
        geography: {
          type: "array",
          items: { type: "string" },
          description: "US states where the company operates or has locations. Use 2-letter codes (CA, TX) or full names. Look for addresses, 'locations', 'service areas', 'serving [areas]' mentions."
        },
        headquarters: {
          type: "string",
          description: "City and state of headquarters or main office (e.g., 'Modesto, CA')"
        },
        service_mix: {
          type: "string",
          description: "Description of services or products offered"
        },
        employee_count: {
          type: "number",
          description: "Number of employees if mentioned"
        },
        founded_year: {
          type: "number",
          description: "Year the company was founded"
        },
        location_count: {
          type: "number",
          description: "Number of physical locations, shops, offices, or branches"
        },
        business_model: {
          type: "string",
          description: "B2B, B2C, government, etc."
        },
        industry_type: {
          type: "string",
          description: "Specific industry or vertical (e.g., 'Auto Body Repair', 'HVAC Services')"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

async function scrapeWebsite(firecrawlApiKey: string, url: string): Promise<string> {
  console.log('[enrich-deal] Scraping website:', url);
  
  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: formattedUrl,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[enrich-deal] Firecrawl error:', response.status, errorText);
    throw new Error(`Failed to scrape website: ${response.status}`);
  }

  const data = await response.json();
  const markdown = data.data?.markdown || '';
  console.log('[enrich-deal] Scraped content length:', markdown.length);
  return markdown;
}

async function extractWebsiteInfo(lovableApiKey: string, websiteContent: string, companyName: string): Promise<any> {
  const systemPrompt = `You are an AI assistant that extracts business information from company websites for M&A deal research.

Your job is to find:
1. **Geography**: Where the company operates. Look for:
   - Physical addresses (extract city, state)
   - "Locations" or "Service Areas" pages
   - Phrases like "serving [area]", "proudly serving", "locations in"
   - Footer addresses
   - Multiple location mentions

2. **Company Overview**: A brief summary of what they do

3. **Service Mix**: What services/products they offer

4. **Other Details**: Headquarters, employee count, founding year, number of locations

Be thorough in finding geographic information - it's critical for buyer matching. Extract every state mentioned.`;

  const userPrompt = `Extract business information from this company website for "${companyName}".

Pay special attention to geographic presence - find ALL states where they operate or have locations.

Website Content:
${websiteContent.slice(0, 15000)}`;

  console.log('[enrich-deal] Calling AI to extract website info...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [extractWebsiteInfoTool],
      tool_choice: { type: 'function', function: { name: 'extract_website_info' } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[enrich-deal] AI call failed:', response.status, errorText);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    console.log('[enrich-deal] No tool call in response');
    return {};
  }

  try {
    const result = JSON.parse(toolCall.function.arguments);
    console.log('[enrich-deal] Extracted info:', JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.error('[enrich-deal] Failed to parse tool call arguments:', e);
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId, onlyFillEmpty = true } = await req.json();

    if (!dealId) {
      return new Response(
        JSON.stringify({ success: false, error: 'dealId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Fetch deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      console.error('[enrich-deal] Deal not found:', dealError);
      return new Response(
        JSON.stringify({ success: false, error: 'Deal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deal.company_website) {
      return new Response(
        JSON.stringify({ success: false, error: 'Deal has no company website' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[enrich-deal] Processing deal: ${deal.deal_name} (${deal.company_website})`);

    // Scrape the website
    const websiteContent = await scrapeWebsite(firecrawlApiKey, deal.company_website);
    
    if (!websiteContent || websiteContent.length < 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not scrape website content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract info using AI
    const extracted = await extractWebsiteInfo(lovableApiKey, websiteContent, deal.deal_name);

    // Build update object - only update empty/null fields if onlyFillEmpty is true
    const updateData: Record<string, any> = {};
    const updatedFields: string[] = [];

    const shouldUpdate = (field: string, currentValue: any) => {
      if (!onlyFillEmpty) return true;
      if (currentValue === null || currentValue === undefined) return true;
      if (Array.isArray(currentValue) && currentValue.length === 0) return true;
      if (typeof currentValue === 'string' && currentValue.trim() === '') return true;
      return false;
    };

    // Geography - normalize extracted values
    if (extracted.geography && Array.isArray(extracted.geography) && extracted.geography.length > 0) {
      const normalizedGeo = normalizeGeography(extracted.geography);
      if (normalizedGeo && normalizedGeo.length > 0 && shouldUpdate('geography', deal.geography)) {
        updateData.geography = normalizedGeo;
        updatedFields.push('geography');
        console.log(`[enrich-deal] Setting geography to: ${normalizedGeo.join(', ')}`);
      }
    }

    // Company overview
    if (extracted.company_overview && shouldUpdate('company_overview', deal.company_overview)) {
      updateData.company_overview = extracted.company_overview;
      updatedFields.push('company_overview');
    }

    // Service mix
    if (extracted.service_mix && shouldUpdate('service_mix', deal.service_mix)) {
      updateData.service_mix = extracted.service_mix;
      updatedFields.push('service_mix');
    }

    // Headquarters
    if (extracted.headquarters && shouldUpdate('headquarters', deal.headquarters)) {
      updateData.headquarters = extracted.headquarters;
      updatedFields.push('headquarters');
    }

    // Employee count
    if (extracted.employee_count && shouldUpdate('employee_count', deal.employee_count)) {
      updateData.employee_count = extracted.employee_count;
      updatedFields.push('employee_count');
    }

    // Founded year
    if (extracted.founded_year && shouldUpdate('founded_year', deal.founded_year)) {
      updateData.founded_year = extracted.founded_year;
      updatedFields.push('founded_year');
    }

    // Location count
    if (extracted.location_count && shouldUpdate('location_count', deal.location_count)) {
      updateData.location_count = extracted.location_count;
      updatedFields.push('location_count');
    }

    // Business model
    if (extracted.business_model && shouldUpdate('business_model', deal.business_model)) {
      updateData.business_model = extracted.business_model;
      updatedFields.push('business_model');
    }

    // Industry type
    if (extracted.industry_type && shouldUpdate('industry_type', deal.industry_type)) {
      updateData.industry_type = extracted.industry_type;
      updatedFields.push('industry_type');
    }

    // Update deal if we have any changes
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);

      if (updateError) {
        console.error('[enrich-deal] Update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update deal' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[enrich-deal] Updated ${updatedFields.length} fields: ${updatedFields.join(', ')}`);
    } else {
      console.log('[enrich-deal] No new fields to update (all already populated)');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedFields,
        extracted: {
          geography: extracted.geography,
          headquarters: extracted.headquarters,
          location_count: extracted.location_count
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-deal] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
