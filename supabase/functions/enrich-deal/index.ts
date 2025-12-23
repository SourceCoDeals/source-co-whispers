import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Source priority: transcript (100) > notes (80) > website (60) > csv (40) > manual (20)
const SOURCE_PRIORITY: Record<string, number> = {
  transcript: 100,
  notes: 80,
  website: 60,
  csv: 40,
  manual: 20,
};

interface ExtractionSource {
  source: string;
  timestamp: string;
  fields: string[];
}

function getFieldSource(
  extractionSources: ExtractionSource[] | null | undefined,
  fieldName: string
): ExtractionSource | null {
  if (!extractionSources || !Array.isArray(extractionSources)) return null;
  
  const sourcesWithField = extractionSources
    .filter(s => s.fields?.includes(fieldName))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return sourcesWithField[0] || null;
}

function canOverwriteField(
  existingSources: ExtractionSource[] | null | undefined,
  fieldName: string,
  newSourceType: string
): boolean {
  const existingSource = getFieldSource(existingSources, fieldName);
  if (!existingSource) return true;
  
  const existingPriority = SOURCE_PRIORITY[existingSource.source] || 0;
  const newPriority = SOURCE_PRIORITY[newSourceType] || 0;
  
  return newPriority >= existingPriority;
}

async function authenticateUser(req: Request): Promise<{ user: any; error: Response | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return {
      user: null,
      error: new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  console.log('[enrich-deal] Authenticated user:', user.id);
  return { user, error: null };
}

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

/**
 * Merge geography arrays - union existing with new values
 */
function mergeGeography(existing: string[] | null, newValues: string[] | null): string[] | null {
  const existingSet = new Set(existing || []);
  const newSet = new Set(newValues || []);
  const merged = new Set([...existingSet, ...newSet]);
  return merged.size > 0 ? Array.from(merged).sort() : null;
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
        company_address: {
          type: "string",
          description: "Full street address including street number, suite/unit, city, state, and zip code (e.g., '123 Main Street, Suite 100, Modesto, CA 95355'). Look in contact pages, footer, about us sections."
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
    // Return empty string instead of throwing - website may be unavailable
    return '';
  }

  const data = await response.json();
  const markdown = data.data?.markdown || '';
  console.log('[enrich-deal] Scraped content length:', markdown.length);
  return markdown;
}

async function extractWebsiteInfo(openaiApiKey: string, websiteContent: string, companyName: string): Promise<any> {
  const systemPrompt = `You are an AI assistant that extracts business information from company websites for M&A deal research.

Your job is to find:
1. **Geography**: Where the company operates. Look for:
   - Physical addresses (extract city, state)
   - "Locations" or "Service Areas" pages
   - Phrases like "serving [area]", "proudly serving", "locations in"
   - Footer addresses
   - Multiple location mentions

2. **Company Address**: The FULL street address of the company. Look for:
   - Contact page addresses
   - Footer addresses with street number
   - "Visit us at" or "Located at" mentions
   - About Us page with physical location
   Format: "123 Main Street, Suite 100, City, ST 12345"

3. **Company Overview**: A brief summary of what they do

4. **Service Mix**: What services/products they offer

5. **Other Details**: Headquarters (city, state only), employee count, founding year, number of locations

Be thorough in finding geographic and address information - it's critical for buyer matching.`;

  const userPrompt = `Extract business information from this company website for "${companyName}".

Pay special attention to geographic presence - find ALL states where they operate or have locations.

Website Content:
${websiteContent.slice(0, 15000)}`;

  console.log('[enrich-deal] Calling AI to extract website info...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
    // Authenticate user
    const { user, error: authResponse } = await authenticateUser(req);
    if (authResponse) return authResponse;

    const { dealId, onlyFillEmpty = true } = await req.json();

    if (!dealId) {
      return new Response(
        JSON.stringify({ success: false, error: 'dealId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership via user client before using service role
    const userClient = createClient(
      supabaseUrl!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: userDeal, error: accessError } = await userClient
      .from('deals')
      .select('id, tracker_id')
      .eq('id', dealId)
      .single();

    if (accessError || !userDeal) {
      console.error('[enrich-deal] Access denied for deal:', dealId, accessError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Deal not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now safe to use SERVICE_ROLE_KEY
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
      console.log('[enrich-deal] Website could not be scraped or content too short');
      return new Response(
        JSON.stringify({ success: false, error: 'Could not scrape website content', updatedFields: [], skippedFields: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract info using AI
    const extracted = await extractWebsiteInfo(openaiApiKey, websiteContent, deal.deal_name);

    // Build update object - respect data priority: Transcript > Notes > Website
    const updateData: Record<string, any> = {};
    const updatedFields: string[] = [];
    const skippedFields: string[] = [];

    // Check existing extraction sources
    const existingSources: ExtractionSource[] = (deal.extraction_sources as ExtractionSource[]) || [];

    // Helper to check if a value is a placeholder (N/A, none, etc.)
    const isPlaceholder = (value: any): boolean => {
      if (typeof value !== 'string') return false;
      const trimmed = value.trim().toLowerCase();
      return ['n/a', 'na', '-', 'none', 'unknown', 'tbd', 'pending'].includes(trimmed);
    };

    // Helper to check if we should update a field
    const shouldUpdate = (field: string, extractedValue: any, currentValue: any): boolean => {
      // Check if extracted value is valid
      if (extractedValue === null || extractedValue === undefined) return false;
      if (Array.isArray(extractedValue) && extractedValue.length === 0) return false;
      if (typeof extractedValue === 'string' && extractedValue.trim() === '') return false;

      // Check source priority - website should NOT overwrite transcript or notes
      if (!canOverwriteField(existingSources, field, 'website')) {
        console.log(`[enrich-deal] Skipping ${field}: protected by higher-priority source`);
        skippedFields.push(field);
        return false;
      }

      // If onlyFillEmpty is true, only update empty fields OR placeholder values
      if (onlyFillEmpty) {
        if (currentValue === null || currentValue === undefined) return true;
        if (Array.isArray(currentValue) && currentValue.length === 0) return true;
        if (typeof currentValue === 'string' && currentValue.trim() === '') return true;
        // Treat placeholder values as empty
        if (isPlaceholder(currentValue)) return true;
        // Treat default location_count and employee_count of 1 as empty (database defaults)
        if ((field === 'location_count' || field === 'employee_count') && currentValue === 1) return true;
        return false;
      }

      return true;
    };

    // Geography - normalize and merge
    // First try explicit geography, then fall back to deriving from headquarters
    let extractedGeography: string[] = [];
    
    if (extracted.geography && Array.isArray(extracted.geography) && extracted.geography.length > 0) {
      extractedGeography = extracted.geography;
    } else if (extracted.headquarters && typeof extracted.headquarters === 'string') {
      // Derive geography from headquarters (e.g., "North Hollywood, CA" -> ["CA"])
      console.log(`[enrich-deal] No explicit geography, deriving from headquarters: ${extracted.headquarters}`);
      extractedGeography = [extracted.headquarters];
    } else if (extracted.company_address && typeof extracted.company_address === 'string') {
      // Fall back to company address
      console.log(`[enrich-deal] Deriving geography from company_address: ${extracted.company_address}`);
      extractedGeography = [extracted.company_address];
    }
    
    if (extractedGeography.length > 0) {
      const normalizedGeo = normalizeGeography(extractedGeography);
      if (normalizedGeo && normalizedGeo.length > 0) {
        if (canOverwriteField(existingSources, 'geography', 'website')) {
          // Merge with existing geography instead of replacing
          const mergedGeo = mergeGeography(deal.geography, normalizedGeo);
          if (mergedGeo && mergedGeo.length > 0) {
            updateData.geography = mergedGeo;
            updatedFields.push('geography');
            console.log(`[enrich-deal] Merged geography: ${mergedGeo.join(', ')}`);
          }
        } else {
          console.log(`[enrich-deal] Skipping geography: protected by higher-priority source`);
          skippedFields.push('geography');
        }
      }
    }

    // Company overview
    if (shouldUpdate('company_overview', extracted.company_overview, deal.company_overview)) {
      updateData.company_overview = extracted.company_overview;
      updatedFields.push('company_overview');
    }

    // Service mix
    if (shouldUpdate('service_mix', extracted.service_mix, deal.service_mix)) {
      updateData.service_mix = extracted.service_mix;
      updatedFields.push('service_mix');
    }

    // Headquarters
    if (shouldUpdate('headquarters', extracted.headquarters, deal.headquarters)) {
      updateData.headquarters = extracted.headquarters;
      updatedFields.push('headquarters');
    }

    // Employee count
    if (shouldUpdate('employee_count', extracted.employee_count, deal.employee_count)) {
      updateData.employee_count = extracted.employee_count;
      updatedFields.push('employee_count');
    }

    // Founded year
    if (shouldUpdate('founded_year', extracted.founded_year, deal.founded_year)) {
      updateData.founded_year = extracted.founded_year;
      updatedFields.push('founded_year');
    }

    // Location count
    if (shouldUpdate('location_count', extracted.location_count, deal.location_count)) {
      updateData.location_count = extracted.location_count;
      updatedFields.push('location_count');
    }

    // Business model
    if (shouldUpdate('business_model', extracted.business_model, deal.business_model)) {
      updateData.business_model = extracted.business_model;
      updatedFields.push('business_model');
    }

    // Industry type
    if (shouldUpdate('industry_type', extracted.industry_type, deal.industry_type)) {
      updateData.industry_type = extracted.industry_type;
      updatedFields.push('industry_type');
    }

    // Company address
    if (shouldUpdate('company_address', extracted.company_address, deal.company_address)) {
      updateData.company_address = extracted.company_address;
      updatedFields.push('company_address');
    }

    // Update deal if we have any changes
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      // Add website source tracking for updated fields
      if (updatedFields.length > 0) {
        const newSource: ExtractionSource = {
          source: 'website',
          timestamp: new Date().toISOString(),
          fields: updatedFields
        };
        const updatedSources = [...existingSources, newSource];
        updateData.extraction_sources = updatedSources;
      }
      
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
      if (skippedFields.length > 0) {
        console.log(`[enrich-deal] Skipped ${skippedFields.length} protected fields: ${skippedFields.join(', ')}`);
      }
    } else {
      console.log('[enrich-deal] No new fields to update (all already populated or protected)');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedFields,
        skippedFields,
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
