import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  console.log('Authenticated user:', user.id);
  return { user, error: null };
}

// Tool definitions for structured extraction - 6 prompts total

// Prompt 1: Business Overview (Platform Website)
const extractBusinessOverviewTool = {
  type: "function",
  function: {
    name: "extract_business_overview",
    description: "Extract business overview from platform company website",
    parameters: {
      type: "object",
      properties: {
        services_offered: {
          type: "string",
          description: "Primary services or products offered"
        },
        business_summary: {
          type: "string",
          description: "Brief summary of what the company does"
        },
        business_type: {
          type: "string",
          description: "Type of business (e.g., Service Provider, Manufacturer)"
        },
        revenue_model: {
          type: "string",
          description: "How the company generates revenue (e.g., Recurring, Project-based)"
        },
        industry_vertical: {
          type: "string",
          description: "Primary industry vertical"
        },
        specialized_focus: {
          type: "string",
          description: "Any specialized focus areas or niches"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 2: Customers / End Market (Platform Website)
const extractCustomersEndMarketTool = {
  type: "function",
  function: {
    name: "extract_customers_end_market",
    description: "Extract customer and end market information from platform company website",
    parameters: {
      type: "object",
      properties: {
        primary_customer_size: {
          type: "string",
          description: "Primary customer size segment (e.g., SMB, Mid-market, Enterprise)"
        },
        customer_industries: {
          type: "array",
          items: { type: "string" },
          description: "Industries served by the company"
        },
        customer_geographic_reach: {
          type: "string",
          description: "Geographic reach of customer base"
        },
        target_customer_profile: {
          type: "string",
          description: "Description of ideal customer profile"
        },
        go_to_market_strategy: {
          type: "string",
          description: "How the company reaches its customers"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 3: Geography / Footprint (Platform Website) - CURRENT LOCATIONS
const extractGeographyFootprintTool = {
  type: "function",
  function: {
    name: "extract_geography_footprint",
    description: "Extract CURRENT geographic locations where the company has physical locations or operations. IMPORTANT: geographic_footprint MUST contain ONLY 2-letter US state abbreviations.",
    parameters: {
      type: "object",
      properties: {
        hq_city: {
          type: "string",
          description: "Headquarters city"
        },
        hq_state: {
          type: "string",
          description: "Headquarters state as 2-letter abbreviation (e.g., 'TX', 'CA')"
        },
        hq_country: {
          type: "string",
          description: "Headquarters country"
        },
        hq_region: {
          type: "string",
          description: "Headquarters region (e.g., Southeast, Midwest)"
        },
        geographic_footprint: {
          type: "array",
          items: { type: "string" },
          description: "US 2-letter state abbreviations ONLY (e.g., 'TX', 'CA', 'NY', 'FL') for each state where the company has physical locations. MUST be valid 2-letter state codes. Do NOT use full state names, 'national', 'USA', or region names."
        },
        service_regions: {
          type: "array",
          items: { type: "string" },
          description: "ONLY include US states where the company actively serves customers FROM their physical locations. Use 2-letter state abbreviations ONLY. If they have locations in AZ and CA, service_regions should ONLY be those states plus maybe 1-2 immediate neighboring states. DO NOT say 'national', 'nationwide', or 'USA' unless the company EXPLICITLY has customer contracts or operations in 30+ different states. A regional collision repair or service company is NOT national even if they say 'serving customers nationwide' - that's marketing speak. Be conservative."
        },
        other_office_locations: {
          type: "array",
          items: { type: "string" },
          description: "Specific addresses or cities of branch offices/shops beyond headquarters"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 3b: Platform Acquisition History (Platform Website)
const extractPlatformAcquisitionsTool = {
  type: "function",
  function: {
    name: "extract_platform_acquisitions",
    description: "Extract acquisition history for the platform company itself (not the PE firm)",
    parameters: {
      type: "object",
      properties: {
        recent_acquisitions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Name of acquired company" },
              date: { type: "string", description: "Date of acquisition (YYYY-MM or YYYY)" },
              location: { type: "string", description: "City/State of acquired company" },
              description: { type: "string", description: "Brief description of the acquisition" },
              source_url: { type: "string", description: "URL to press release or news article about the acquisition" }
            }
          },
          description: "List of companies acquired by this platform"
        },
        total_acquisitions: {
          type: "number",
          description: "Total number of acquisitions made by the platform"
        },
        acquisition_frequency: {
          type: "string",
          description: "How often they acquire (e.g., '3-4 per year', 'monthly')"
        },
        last_acquisition_date: {
          type: "string",
          description: "Date of most recent acquisition in YYYY-MM-DD format"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 4: PE Firm Investment Thesis
const extractPEInvestmentThesisTool = {
  type: "function",
  function: {
    name: "extract_pe_investment_thesis",
    description: "Extract investment thesis and strategy from PE firm website",
    parameters: {
      type: "object",
      properties: {
        thesis_summary: {
          type: "string",
          description: "Investment thesis or strategy summary"
        },
        strategic_priorities: {
          type: "string",
          description: "Strategic priorities or goals"
        },
        acquisition_appetite: {
          type: "string",
          description: "Current acquisition appetite (Active, Selective, Paused)"
        },
        target_industries: {
          type: "array",
          items: { type: "string" },
          description: "Target industries for investment"
        },
        target_services: {
          type: "array",
          items: { type: "string" },
          description: "Target service types for acquisition"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 5: PE Firm Portfolio & Track Record
const extractPEPortfolioTool = {
  type: "function",
  function: {
    name: "extract_pe_portfolio",
    description: "Extract portfolio companies and acquisition history from PE firm website",
    parameters: {
      type: "object",
      properties: {
        portfolio_companies: {
          type: "array",
          items: { type: "string" },
          description: "Names of portfolio companies"
        },
        total_acquisitions: {
          type: "number",
          description: "Total number of acquisitions made"
        },
        acquisition_frequency: {
          type: "string",
          description: "Frequency of acquisitions (e.g., 2-3 per year)"
        },
        num_platforms: {
          type: "number",
          description: "Number of platform companies"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 6: PE Firm Target Criteria
// NOTE: We only extract SIZE criteria from websites. Deal structure preferences 
// (geographies, business models, exclusions, etc.) should ONLY come from transcripts/notes.
const extractPETargetCriteriaTool = {
  type: "function",
  function: {
    name: "extract_pe_target_criteria",
    description: "Extract target SIZE criteria only from PE firm website. Do NOT extract deal structure preferences, geography preferences, or business model preferences - those should only come from transcripts.",
    parameters: {
      type: "object",
      properties: {
        min_revenue: {
          type: "number",
          description: "Minimum target revenue in millions"
        },
        max_revenue: {
          type: "number",
          description: "Maximum target revenue in millions"
        },
        min_ebitda: {
          type: "number",
          description: "Minimum target EBITDA in millions"
        },
        max_ebitda: {
          type: "number",
          description: "Maximum target EBITDA in millions"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

async function scrapeUrl(url: string, firecrawlApiKey: string, options?: { waitFor?: number }): Promise<string | null> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping:', formattedUrl, options?.waitFor ? `(waitFor: ${options.waitFor}ms)` : '');

    const requestBody: any = {
      url: formattedUrl,
      formats: ['markdown'],
      onlyMainContent: true,
    };
    
    if (options?.waitFor) {
      requestBody.waitFor = options.waitFor;
    }

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error(`Scrape FAILED for ${formattedUrl} - Status: ${response.status}`, data.error || data);
      return null;
    }

    return data.data?.markdown || null;
  } catch (error) {
    console.error('Error scraping URL:', url, error);
    return null;
  }
}

// Scrape platform website plus location pages
async function scrapeWithLocationPages(baseUrl: string, firecrawlApiKey: string): Promise<{ main: string | null; locations: string | null }> {
  // Scrape main page
  const mainContent = await scrapeUrl(baseUrl, firecrawlApiKey);
  
  // Common location page paths for multi-location businesses
  const locationPaths = [
    '/locations',
    '/our-locations',
    '/find-a-shop',
    '/find-a-location',
    '/our-shops',
    '/stores',
    '/branches',
    '/service-areas',
    '/find-us',
    '/contact',
    '/about/locations',
    '/about-us/locations'
  ];
  
  let locationsContent: string | null = null;
  
  // Format base URL
  let formattedBase = baseUrl.trim();
  if (!formattedBase.startsWith('http://') && !formattedBase.startsWith('https://')) {
    formattedBase = `https://${formattedBase}`;
  }
  // Remove trailing slash
  formattedBase = formattedBase.replace(/\/$/, '');
  
  // Try each location path until we find one that works
  for (const path of locationPaths) {
    const locationUrl = `${formattedBase}${path}`;
    console.log('Trying location page:', locationUrl);
    
    const content = await scrapeUrl(locationUrl, firecrawlApiKey);
    if (content && content.length > 500) {
      console.log(`Found location page at ${path} with ${content.length} characters`);
      locationsContent = content;
      break;
    }
  }
  
  return { main: mainContent, locations: locationsContent };
}

async function callAIWithTool(anthropicApiKey: string, systemPrompt: string, userPrompt: string, tool: any, maxRetries = 3): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          tools: [{
            name: tool.function.name,
            description: tool.function.description,
            input_schema: tool.function.parameters
          }],
          tool_choice: { type: 'tool', name: tool.function.name },
          messages: [
            { role: 'user', content: userPrompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Claude call failed (attempt ${attempt + 1}):`, response.status, errorText);
        
        // Only retry on 5xx errors (server errors)
        if (response.status >= 500 && attempt < maxRetries - 1) {
          lastError = new Error(`Claude call failed: ${response.status}`);
          continue;
        }
        throw new Error(`Claude call failed: ${response.status}`);
      }

      const data = await response.json();
      const toolUse = data.content?.find((block: any) => block.type === 'tool_use');
      
      if (!toolUse) {
        return {};
      }

      return toolUse.input || {};
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Claude call error (attempt ${attempt + 1}):`, lastError.message);
      
      if (attempt >= maxRetries - 1) {
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error('Claude call failed after retries');
}

// Import geography utilities from shared module
import { normalizeGeography, mergeGeography, ALL_US_STATES, STATE_NAME_TO_ABBREV, GEO_MISSPELLINGS } from '../_shared/geography.ts';

// Patterns to skip - UI text, URLs, garbage data
const SKIP_PATTERNS = [
  /find\s*(a\s*)?shop/i,
  /near\s*(you|me)/i,
  /body-shop/i,
  /locations?$/i,
  /^https?:\/\//i,
  /\.com/i,
  /\.net/i,
  /\.org/i,
  /click\s*here/i,
  /learn\s*more/i,
  /view\s*all/i,
  /see\s*all/i,
  /^\d+\s*\d*\s*\d*\s*\d*\s*\d*\s*\d*$/, // Just numbers like "13 States 2 3 4 5 6..."
];

// Normalize geographic footprint to 2-letter state abbreviations only
// When isServiceRegions=true, we are MORE CONSERVATIVE about expanding "national"
function normalizeGeographicFootprint(footprint: string[] | null | undefined, isServiceRegions: boolean = false): string[] | null {
  if (!footprint || !Array.isArray(footprint) || footprint.length === 0) {
    return null;
  }

  const normalized: string[] = [];
  
  for (const item of footprint) {
    if (!item || typeof item !== 'string') continue;
    
    const trimmed = item.trim();
    const upper = trimmed.toUpperCase();
    const lower = trimmed.toLowerCase();
    
    // Skip garbage data patterns
    if (SKIP_PATTERNS.some(pattern => pattern.test(trimmed))) {
      console.log(`Skipping garbage data: "${item}"`);
      continue;
    }
    
    // Skip very short or very long entries (likely garbage)
    if (trimmed.length < 2 || trimmed.length > 100) {
      console.log(`Skipping entry with unusual length: "${item}"`);
      continue;
    }
    
    // Check if already valid 2-letter abbreviation
    if (ALL_US_STATES.includes(upper)) {
      normalized.push(upper);
      continue;
    }
    
    // Convert full state name to abbreviation
    const abbrev = STATE_NAME_TO_ABBREV[lower];
    if (abbrev) {
      normalized.push(abbrev);
      continue;
    }
    
    // Handle common misspellings
    const misspellings: Record<string, string> = {
      'conneticut': 'CT', 'conecticut': 'CT', 'conneticutt': 'CT',
      'massachusets': 'MA', 'massachussetts': 'MA', 'massachucetts': 'MA',
      'pennsilvania': 'PA', 'pensylvania': 'PA',
      'tennesee': 'TN', 'tennesse': 'TN',
      'missisipi': 'MS', 'mississipi': 'MS', 'missisippi': 'MS',
      'louisianna': 'LA', 'lousiana': 'LA',
      'virgina': 'VA',
      'north carolia': 'NC', 'n carolina': 'NC', 'n. carolina': 'NC',
      'south carolia': 'SC', 's carolina': 'SC', 's. carolina': 'SC',
      'west virgina': 'WV', 'w virginia': 'WV', 'w. virginia': 'WV',
      'new jersery': 'NJ',
    };
    if (misspellings[lower]) {
      console.log(`Fixed misspelling "${item}" -> "${misspellings[lower]}"`);
      normalized.push(misspellings[lower]);
      continue;
    }
    
    // "national"/"nationwide"/"USA" handling
    // For service_regions, we DO NOT auto-expand to all 50 states - we skip it entirely
    // and let the cross-check logic handle it based on geographic_footprint
    if (['national', 'nationwide', 'usa', 'us', 'united states', 'all states'].includes(lower)) {
      if (isServiceRegions) {
        console.log(`SKIPPING "${item}" for service_regions - will be validated against geographic_footprint`);
        continue; // Skip - we'll use geographic_footprint as the basis instead
      } else {
        console.log(`Expanding "${item}" to all 50 states for geographic_footprint`);
        normalized.push(...ALL_US_STATES);
        continue;
      }
    }
    
    // Handle "X states" pattern (e.g., "41 states", "50 states", "13 States")
    const statesMatch = lower.match(/^(\d+)\s*states?$/);
    if (statesMatch) {
      const count = parseInt(statesMatch[1], 10);
      if (isServiceRegions) {
        // For service_regions, never expand "X states" - skip it
        console.log(`SKIPPING "${item}" for service_regions - vague count, need specifics`);
        continue;
      } else if (count >= 30) {  // 30+ states = treat as nationwide for geographic_footprint only
        console.log(`Expanding "${item}" (${count} states) to all 50 states`);
        normalized.push(...ALL_US_STATES);
        continue;
      } else {
        // Less than 30 states - skip as we can't know which ones
        console.log(`Skipping "${item}" - count too low to expand, need specific states`);
        continue;
      }
    }
    
    // Handle "City, State" format with full state name (e.g., "Jackson, Mississippi")
    const cityFullStateMatch = trimmed.match(/,\s*([A-Za-z\s]+)$/);
    if (cityFullStateMatch) {
      const statePart = cityFullStateMatch[1].trim().toLowerCase();
      // Remove parenthetical text like "(and 5 surrounding towns)"
      const cleanedState = statePart.replace(/\s*\([^)]*\)\s*/g, '').trim();
      
      // Check if it's a 2-letter abbreviation
      if (cleanedState.length === 2 && ALL_US_STATES.includes(cleanedState.toUpperCase())) {
        console.log(`Extracted state "${cleanedState.toUpperCase()}" from "${item}"`);
        normalized.push(cleanedState.toUpperCase());
        continue;
      }
      
      // Check if it's a full state name
      const stateAbbrev = STATE_NAME_TO_ABBREV[cleanedState];
      if (stateAbbrev) {
        console.log(`Extracted state "${stateAbbrev}" from "${item}"`);
        normalized.push(stateAbbrev);
        continue;
      }
    }
    
    // Handle space-separated abbreviations (e.g., "TX OK AR LA")
    if (/^[A-Z]{2}(\s+[A-Z]{2})+$/i.test(trimmed)) {
      const parts = upper.split(/\s+/);
      for (const part of parts) {
        if (ALL_US_STATES.includes(part)) {
          normalized.push(part);
        }
      }
      if (normalized.length > 0) {
        console.log(`Parsed space-separated states from "${item}"`);
        continue;
      }
    }
    
    // Skip invalid entries (log warning)
    console.warn(`Skipping invalid geographic entry: "${item}"`);
  }
  
  // Remove duplicates and return
  const unique = [...new Set(normalized)];
  console.log(`Normalized ${isServiceRegions ? 'service_regions' : 'geographic_footprint'}: ${unique.length} states`);
  return unique.length > 0 ? unique : null;
}

// Get adjacent states for expansion (used when deriving service_regions from geographic_footprint)
const STATE_ADJACENCY: Record<string, string[]> = {
  'AL': ['FL', 'GA', 'MS', 'TN'],
  'AK': [],
  'AZ': ['CA', 'CO', 'NM', 'NV', 'UT'],
  'AR': ['LA', 'MO', 'MS', 'OK', 'TN', 'TX'],
  'CA': ['AZ', 'NV', 'OR'],
  'CO': ['AZ', 'KS', 'NE', 'NM', 'OK', 'UT', 'WY'],
  'CT': ['MA', 'NY', 'RI'],
  'DE': ['MD', 'NJ', 'PA'],
  'FL': ['AL', 'GA'],
  'GA': ['AL', 'FL', 'NC', 'SC', 'TN'],
  'HI': [],
  'ID': ['MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  'IL': ['IA', 'IN', 'KY', 'MO', 'WI'],
  'IN': ['IL', 'KY', 'MI', 'OH'],
  'IA': ['IL', 'MN', 'MO', 'NE', 'SD', 'WI'],
  'KS': ['CO', 'MO', 'NE', 'OK'],
  'KY': ['IL', 'IN', 'MO', 'OH', 'TN', 'VA', 'WV'],
  'LA': ['AR', 'MS', 'TX'],
  'ME': ['NH'],
  'MD': ['DE', 'PA', 'VA', 'WV', 'DC'],
  'MA': ['CT', 'NH', 'NY', 'RI', 'VT'],
  'MI': ['IN', 'OH', 'WI'],
  'MN': ['IA', 'ND', 'SD', 'WI'],
  'MS': ['AL', 'AR', 'LA', 'TN'],
  'MO': ['AR', 'IA', 'IL', 'KS', 'KY', 'NE', 'OK', 'TN'],
  'MT': ['ID', 'ND', 'SD', 'WY'],
  'NE': ['CO', 'IA', 'KS', 'MO', 'SD', 'WY'],
  'NV': ['AZ', 'CA', 'ID', 'OR', 'UT'],
  'NH': ['MA', 'ME', 'VT'],
  'NJ': ['DE', 'NY', 'PA'],
  'NM': ['AZ', 'CO', 'OK', 'TX', 'UT'],
  'NY': ['CT', 'MA', 'NJ', 'PA', 'VT'],
  'NC': ['GA', 'SC', 'TN', 'VA'],
  'ND': ['MN', 'MT', 'SD'],
  'OH': ['IN', 'KY', 'MI', 'PA', 'WV'],
  'OK': ['AR', 'CO', 'KS', 'MO', 'NM', 'TX'],
  'OR': ['CA', 'ID', 'NV', 'WA'],
  'PA': ['DE', 'MD', 'NJ', 'NY', 'OH', 'WV'],
  'RI': ['CT', 'MA'],
  'SC': ['GA', 'NC'],
  'SD': ['IA', 'MN', 'MT', 'ND', 'NE', 'WY'],
  'TN': ['AL', 'AR', 'GA', 'KY', 'MO', 'MS', 'NC', 'VA'],
  'TX': ['AR', 'LA', 'NM', 'OK'],
  'UT': ['AZ', 'CO', 'ID', 'NM', 'NV', 'WY'],
  'VT': ['MA', 'NH', 'NY'],
  'VA': ['KY', 'MD', 'NC', 'TN', 'WV', 'DC'],
  'WA': ['ID', 'OR'],
  'WV': ['KY', 'MD', 'OH', 'PA', 'VA'],
  'WI': ['IA', 'IL', 'MI', 'MN'],
  'WY': ['CO', 'ID', 'MT', 'NE', 'SD', 'UT'],
  'DC': ['MD', 'VA']
};

// Expand geographic footprint to include adjacent states (for deriving service regions)
function expandToAdjacentStates(states: string[]): string[] {
  const expanded = new Set(states);
  for (const state of states) {
    const adjacent = STATE_ADJACENCY[state] || [];
    for (const adj of adjacent) {
      expanded.add(adj);
    }
  }
  return [...expanded].sort();
}

// Cross-check and validate service_regions against geographic_footprint
function validateServiceRegions(
  serviceRegions: string[] | null, 
  geographicFootprint: string[] | null
): string[] | null {
  // If no geographic footprint, we can't validate - return service_regions as-is but cap at 20 states
  if (!geographicFootprint || geographicFootprint.length === 0) {
    if (serviceRegions && serviceRegions.length > 20) {
      console.log(`No geographic_footprint to validate against, but service_regions has ${serviceRegions.length} states - likely incorrect. Returning null.`);
      return null;
    }
    return serviceRegions;
  }

  // If service_regions is empty/null, derive it from geographic_footprint + adjacent states
  if (!serviceRegions || serviceRegions.length === 0) {
    const derived = expandToAdjacentStates(geographicFootprint);
    console.log(`Derived service_regions from geographic_footprint: ${derived.length} states (from ${geographicFootprint.length} locations + adjacent)`);
    return derived;
  }

  // Cross-check: if service_regions >> geographic_footprint, it's likely wrong
  // Rule: if geographic_footprint < 10 states and service_regions > 25 states, revert to derived
  if (geographicFootprint.length < 10 && serviceRegions.length > 25) {
    const derived = expandToAdjacentStates(geographicFootprint);
    console.log(`VALIDATION FAILED: geographic_footprint has ${geographicFootprint.length} states but service_regions has ${serviceRegions.length}. Reverting to derived: ${derived.length} states`);
    return derived;
  }

  // More aggressive check: if geographic_footprint < 5 states and service_regions > 15 states
  if (geographicFootprint.length < 5 && serviceRegions.length > 15) {
    const derived = expandToAdjacentStates(geographicFootprint);
    console.log(`VALIDATION FAILED: geographic_footprint has ${geographicFootprint.length} states but service_regions has ${serviceRegions.length}. Reverting to derived: ${derived.length} states`);
    return derived;
  }

  // Check if service_regions equals all 50 states but footprint is small
  if (serviceRegions.length === 50 && geographicFootprint.length < 30) {
    const derived = expandToAdjacentStates(geographicFootprint);
    console.log(`VALIDATION FAILED: service_regions is all 50 states but geographic_footprint only has ${geographicFootprint.length}. Reverting to derived: ${derived.length} states`);
    return derived;
  }

  console.log(`service_regions validation PASSED: ${serviceRegions.length} service states for ${geographicFootprint.length} location states`);
  return serviceRegions;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const { user, error: authResponse } = await authenticateUser(req);
    if (authResponse) return authResponse;

    const { buyerId } = await req.json();

    if (!buyerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'buyerId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Anthropic API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership via user client before using service role
    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(
      supabaseUrl!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user has access to this buyer via RLS
    const { data: userBuyer, error: accessError } = await userClient
      .from('buyers')
      .select('id, tracker_id')
      .eq('id', buyerId)
      .single();

    if (accessError || !userBuyer) {
      console.error('Access denied for buyer:', buyerId, accessError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Buyer not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now safe to use SERVICE_ROLE_KEY
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Fetch buyer
    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', buyerId)
      .single();

    if (buyerError || !buyer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Buyer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enriching buyer:', buyer.pe_firm_name, buyer.platform_company_name);

    // Scrape websites (with location page discovery for platform website)
    let platformContent: string | null = null;
    let platformLocationsContent: string | null = null;
    let platformScrapeFailed = false;
    let peFirmScrapeFailed = false;
    
    if (buyer.platform_website) {
      const { main, locations } = await scrapeWithLocationPages(buyer.platform_website, firecrawlApiKey);
      platformContent = main;
      platformLocationsContent = locations;
      
      // If main page failed, retry with waitFor option (sometimes helps with bot protection)
      if (!platformContent) {
        console.warn(`Platform website scrape FAILED for ${buyer.platform_company_name}: ${buyer.platform_website} - Retrying with waitFor...`);
        platformContent = await scrapeUrl(buyer.platform_website, firecrawlApiKey, { waitFor: 3000 });
        
        if (!platformContent) {
          console.warn(`Platform website retry ALSO FAILED for ${buyer.platform_company_name}: ${buyer.platform_website}`);
          platformScrapeFailed = true;
        } else {
          console.log(`Platform website retry SUCCEEDED for ${buyer.platform_company_name}`);
        }
      }
      
      if (platformLocationsContent) {
        console.log(`Found location page content: ${platformLocationsContent.length} characters`);
      } else if (platformContent) {
        console.log('No location page found, will use main page only for geography');
      }
    }
    
    let peFirmContent: string | null = null;
    if (buyer.pe_firm_website) {
      peFirmContent = await scrapeUrl(buyer.pe_firm_website, firecrawlApiKey);
      if (!peFirmContent) {
        console.warn(`PE firm website scrape FAILED for ${buyer.pe_firm_name}: ${buyer.pe_firm_website}`);
        peFirmScrapeFailed = true;
      }
    }

    if (!platformContent && !peFirmContent) {
      const failedSites: string[] = [];
      if (buyer.platform_website) failedSites.push(`platform: ${buyer.platform_website}`);
      if (buyer.pe_firm_website) failedSites.push(`PE firm: ${buyer.pe_firm_website}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `All websites failed to scrape (may be blocked): ${failedSites.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData: Record<string, any> = {};
    const evidenceRecords: any[] = [];

    // PROMPTS 1-3: Platform Website Extraction
    if (platformContent) {
      const platformPromptBase = `Analyze the following website content for ${buyer.platform_company_name || 'this company'}.

Website Content:
${platformContent.substring(0, 10000)}

`;

      // Prompt 1: Business Overview
      console.log('Running Prompt 1: Business Overview');
      const businessOverviewPrompt = platformPromptBase + `
WHAT TO DO: Identify what the company does, including:
- What products or services does the company offer? List the primary services/products.
- What is their delivery model? (e.g., in-person, remote, hybrid)
- What is their key value proposition?

EXAMPLE OUTPUT:
- services_offered: "Commercial HVAC installation, maintenance, and repair services; residential HVAC services; building automation systems"
- business_summary: "Full-service HVAC contractor providing commercial and residential heating, cooling, and ventilation solutions"
- business_type: "Service Provider"
- revenue_model: "Project-based and recurring maintenance contracts"`;

      const businessOverview = await callAIWithTool(
        anthropicApiKey,
        'You are extracting business overview information from a company website. Be precise and only include information clearly stated.',
        businessOverviewPrompt,
        extractBusinessOverviewTool
      );
      Object.assign(extractedData, businessOverview);

      // Prompt 2: Customers / End Market
      console.log('Running Prompt 2: Customers / End Market');
      const customersPrompt = platformPromptBase + `
WHAT TO DO: Identify who the company's customers are, including:
- Who are the company's primary customers?
- What industries or end markets does the company serve?
- Is the company B2B, B2C, or both?

EXAMPLE OUTPUT:
- primary_customer_size: "Mid-market and Enterprise"
- customer_industries: ["Commercial Real Estate", "Healthcare", "Education", "Industrial"]
- customer_geographic_reach: "Regional - Midwest United States"
- go_to_market_strategy: "Direct sales with dedicated account managers for commercial clients"`;

      const customers = await callAIWithTool(
        anthropicApiKey,
        'You are extracting customer and market information from a company website. Be precise and only include information clearly stated.',
        customersPrompt,
        extractCustomersEndMarketTool
      );
      Object.assign(extractedData, customers);

      // Prompt 3: Geography / Footprint - CURRENT LOCATIONS
      // Use combined main page + locations page content for better extraction
      console.log('Running Prompt 3: Current Geographic Footprint');
      
      // Combine main page and locations page content for geography extraction
      let geographyContent = platformContent.substring(0, 15000);
      if (platformLocationsContent) {
        geographyContent += '\n\n--- LOCATIONS PAGE CONTENT ---\n' + platformLocationsContent.substring(0, 25000);
        console.log(`Geography extraction using ${geographyContent.length} total characters (main + locations page)`);
      } else {
        console.log(`Geography extraction using ${geographyContent.length} characters (main page only)`);
      }
      
      const geographyPrompt = `Analyze the following website content for ${buyer.platform_company_name || 'this company'}.

Website Content:
${geographyContent}

WHAT TO DO: Extract ONLY the physical locations that are EXPLICITLY mentioned in the website content above.

CRITICAL ANTI-HALLUCINATION RULES:
1. ONLY include states that have SPECIFIC ADDRESSES or CITY NAMES mentioned in the content
2. If you see "123 Main St, Reading, PA 19601" → extract PA
3. If you see "Long Island City, NY" → extract NY
4. If you see "Boston, Massachusetts" → extract MA
5. DO NOT include states that are not explicitly mentioned with a city or address
6. DO NOT guess or infer states based on regional descriptions
7. If the content says "serving the Northeast" but only lists addresses in NY and PA, ONLY output NY and PA
8. If no specific locations are mentioned, return an EMPTY array []

Look for:
- Physical addresses (street addresses with city, state, zip)
- City, State mentions (e.g., "Houston, TX" or "Philadelphia, Pennsylvania")
- Location lists or "Our Locations" sections
- Contact information with addresses

CRITICAL: geographic_footprint MUST contain ONLY 2-letter US state abbreviations.
- ❌ WRONG: "Texas", "national", "USA", "41 states", "Southwest", "Nationwide"
- ✅ RIGHT: "TX", "CA", "NY"

DO NOT use the example states below - they are ONLY for formatting reference:
- hq_city: "City Name"
- hq_state: "XX"
- hq_country: "USA"
- geographic_footprint: ["XX", "YY"] (ONLY states with explicit addresses/cities in content)
- other_office_locations: ["City, ST", "City, ST"] (actual addresses from content)
- service_regions: [] (leave empty - will be derived from geographic_footprint)

ONLY extract states that appear as explicit addresses or location names in the content above.`;

      const geography = await callAIWithTool(
        anthropicApiKey,
        `You are extracting ONLY explicitly mentioned physical locations from website content. 

CRITICAL RULES:
- ONLY include states where you see a SPECIFIC ADDRESS or CITY NAME in the provided content
- Example: "37-46 9th St, Long Island City, NY 11101" → extract NY
- Example: "Reading, PA" → extract PA  
- DO NOT hallucinate or guess states that are not explicitly mentioned
- DO NOT include states just because they are in a region the company mentions serving
- If you cannot find specific location mentions, return an EMPTY geographic_footprint array
- Output 2-letter US state abbreviations ONLY`,
        geographyPrompt,
        extractGeographyFootprintTool
      );
      
      console.log('Geography extraction raw result:', JSON.stringify(geography));
      
      // Normalize geographic_footprint to ensure only valid 2-letter state abbreviations
      if (geography.geographic_footprint) {
        console.log('Raw geographic_footprint before normalization:', geography.geographic_footprint);
        geography.geographic_footprint = normalizeGeographicFootprint(geography.geographic_footprint, false);
        console.log('Normalized geographic_footprint:', geography.geographic_footprint);
      } else {
        console.log('No geographic_footprint extracted from AI');
      }
      
      // Normalize service_regions with isServiceRegions=true (more conservative, no auto-expand to national)
      if (geography.service_regions) {
        console.log('Raw service_regions before normalization:', geography.service_regions);
        geography.service_regions = normalizeGeographicFootprint(geography.service_regions, true);
        console.log('Normalized service_regions (before validation):', geography.service_regions);
      }
      
      // CRITICAL: Cross-validate service_regions against geographic_footprint
      // This prevents false "national" classifications for regional businesses
      geography.service_regions = validateServiceRegions(
        geography.service_regions, 
        geography.geographic_footprint
      );
      console.log('Final validated service_regions:', geography.service_regions);
      
      Object.assign(extractedData, geography);

      // Prompt 3b: Platform Acquisition History
      console.log('Running Prompt 3b: Platform Acquisition History');
      const acquisitionsPrompt = platformPromptBase + `
WHAT TO DO: Find acquisitions made BY this platform company (not acquisitions of this company).
Look for:
- Press releases about acquisitions
- "News" or "About Us" sections mentioning company growth through acquisitions
- Any mentions of companies they have acquired or merged with
- Dates and locations of acquired companies

For each acquisition found, try to identify:
- Name of the acquired company
- Date of acquisition
- Location (city, state) of the acquired company
- Brief description
- URL to the press release or news article if available

EXAMPLE OUTPUT:
- recent_acquisitions: [
    { "name": "ABC Collision", "date": "2024-03", "location": "Houston, TX", "description": "Added 3 locations in Houston market", "source_url": "https://example.com/news/abc-acquisition" },
    { "name": "XYZ Auto Body", "date": "2023-11", "location": "Dallas, TX", "description": "Strategic expansion into DFW", "source_url": "https://example.com/news/xyz-deal" }
  ]
- total_acquisitions: 8
- acquisition_frequency: "3-4 per year"
- last_acquisition_date: "2024-03-15"`;

      const acquisitions = await callAIWithTool(
        anthropicApiKey,
        'You are extracting PLATFORM acquisition history - companies acquired BY this platform. Look for press releases, news, and announcements about their acquisitions.',
        acquisitionsPrompt,
        extractPlatformAcquisitionsTool
      );
      Object.assign(extractedData, acquisitions);

      evidenceRecords.push({
        source: 'platform_website',
        source_url: buyer.platform_website,
        extracted_at: new Date().toISOString(),
        prompts_run: ['business_overview', 'customers_end_market', 'geography_footprint', 'platform_acquisitions'],
        fields_extracted: Object.keys({ ...businessOverview, ...customers, ...geography, ...acquisitions }).filter(k => extractedData[k])
      });
    }

    // PROMPTS 4-6: PE Firm Website Extraction
    if (peFirmContent) {
      const peFirmPromptBase = `Analyze the following PE firm website content for ${buyer.pe_firm_name}.

Website Content:
${peFirmContent.substring(0, 10000)}

`;

      // Prompt 4: Investment Thesis
      console.log('Running Prompt 4: PE Investment Thesis');
      const thesisPrompt = peFirmPromptBase + `
WHAT TO DO: Identify the firm's investment thesis and strategy, including:
- What types of investments does this firm make? (platform, add-on, growth equity, etc.)
- What are their investment criteria or focus areas?
- What is their overall investment strategy or thesis?
- What industries do they focus on?

EXAMPLE OUTPUT:
- thesis_summary: "Building market-leading home services platforms through buy-and-build strategy, focusing on fragmented service industries with recurring revenue potential"
- strategic_priorities: "Geographic expansion, operational improvement, technology enablement"
- acquisition_appetite: "Active"
- target_industries: ["HVAC", "Plumbing", "Electrical", "Home Services"]`;

      const thesis = await callAIWithTool(
        anthropicApiKey,
        'You are extracting investment thesis information from a PE firm website. Be precise and only include information clearly stated.',
        thesisPrompt,
        extractPEInvestmentThesisTool
      );
      Object.assign(extractedData, thesis);

      // Prompt 5: Portfolio & Track Record
      console.log('Running Prompt 5: PE Portfolio & Track Record');
      const portfolioPrompt = peFirmPromptBase + `
WHAT TO DO: Identify the firm's portfolio and acquisition history, including:
- What portfolio companies does the firm have?
- How many acquisitions has the firm made?
- What industries are their portfolio companies in?
- How frequently do they make acquisitions?

EXAMPLE OUTPUT:
- portfolio_companies: ["ServiceMaster", "ABC Plumbing", "XYZ HVAC"]
- total_acquisitions: 15
- acquisition_frequency: "3-4 per year"
- num_platforms: 3`;

      const portfolio = await callAIWithTool(
        anthropicApiKey,
        'You are extracting portfolio and acquisition history from a PE firm website. Be precise and only include information clearly stated.',
        portfolioPrompt,
        extractPEPortfolioTool
      );
      Object.assign(extractedData, portfolio);

      // Prompt 6: Target Criteria - SIZE ONLY
      // NOTE: We ONLY extract size criteria from websites. Deal structure preferences
      // (geographies, business models, exclusions, deal breakers) should ONLY come from transcripts/notes.
      console.log('Running Prompt 6: PE Target Size Criteria (NOT deal structure)');
      const criteriaPrompt = peFirmPromptBase + `
WHAT TO DO: Identify the firm's target SIZE criteria ONLY:
- What revenue or EBITDA ranges do they target?

DO NOT EXTRACT:
- Geographic preferences (target_geographies, geographic_exclusions)
- Business model preferences (business_model_prefs, business_model_exclusions)
- Deal structure preferences (owner roll, transition goals, deal breakers)
These should ONLY come from call transcripts.

EXAMPLE OUTPUT:
- min_revenue: 5
- max_revenue: 50
- min_ebitda: 1
- max_ebitda: 10`;

      const criteria = await callAIWithTool(
        anthropicApiKey,
        'You are extracting target SIZE criteria ONLY from a PE firm website. Only extract revenue/EBITDA ranges. Do NOT extract geography preferences, business model preferences, or any deal structure preferences.',
        criteriaPrompt,
        extractPETargetCriteriaTool
      );
      Object.assign(extractedData, criteria);

      evidenceRecords.push({
        source: 'pe_firm_website',
        source_url: buyer.pe_firm_website,
        extracted_at: new Date().toISOString(),
        prompts_run: ['pe_investment_thesis', 'pe_portfolio', 'pe_target_criteria'],
        fields_extracted: Object.keys({ ...thesis, ...portfolio, ...criteria }).filter(k => extractedData[k])
      });
    }

    console.log('Total extracted data:', extractedData);

    // Fields that should NEVER be overwritten if they came from a transcript
    // Transcript data is primary authority for investment criteria
    const transcriptProtectedFields = [
      'thesis_summary', 'strategic_priorities', 'thesis_confidence',
      'target_geographies', 'geographic_exclusions', 'acquisition_geography',
      'min_revenue', 'max_revenue', 'revenue_sweet_spot',
      'min_ebitda', 'max_ebitda', 'ebitda_sweet_spot', 'preferred_ebitda',
      'owner_roll_requirement', 'owner_transition_goals', 'acquisition_timeline', 'acquisition_appetite',
      'deal_breakers', 'business_model_exclusions', 'industry_exclusions', 'key_quotes',
      'target_services', 'target_industries', 'required_capabilities',
      'service_mix_prefs', 'business_model_prefs', 'target_business_model'
    ];

    // Check if this buyer has transcript-sourced data
    const existingSources = Array.isArray(buyer.extraction_sources) ? buyer.extraction_sources : [];
    const hasTranscriptSource = existingSources.some(
      (src: any) => src.source === 'transcript' || src.source === 'buyer_transcript'
    );
    
    console.log('Has transcript source:', hasTranscriptSource);
    if (hasTranscriptSource) {
      console.log('Transcript-protected fields will NOT be overwritten by website data');
    }

    // Build update object - only update fields that are empty or where new data is more substantial
    const updateData: Record<string, any> = {
      data_last_updated: new Date().toISOString(),
    };

    const PLACEHOLDER_STRINGS = new Set([
      'not specified',
      'n/a',
      'na',
      'unknown',
      'none',
      'tbd',
    ]);

    const normalizeString = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      const v = value.trim();
      if (!v) return null;
      if (PLACEHOLDER_STRINGS.has(v.toLowerCase())) return null;
      return v;
    };

    const normalizeArray = (value: unknown): string[] | null => {
      if (!Array.isArray(value)) return null;
      const normalized = value
        .map((v) => normalizeString(v))
        .filter((v): v is string => !!v);
      if (normalized.length === 0) return null;
      // de-dupe while preserving order
      const seen = new Set<string>();
      const unique: string[] = [];
      for (const v of normalized) {
        const key = v.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(v);
        }
      }
      return unique;
    };

    // Fields to update from website enrichment
    // NOTE: Deal structure fields are EXCLUDED - they should ONLY come from transcripts/notes:
    // - target_geographies, geographic_exclusions, acquisition_geography
    // - business_model_prefs, business_model_exclusions
    // - deal_breakers, owner_roll_requirement, owner_transition_goals
    // - service_mix_prefs, target_business_model
    const fieldsToUpdate = [
      'services_offered', 'business_summary', 'industry_vertical', 'specialized_focus',
      'business_type', 'revenue_model', 'go_to_market_strategy',
      'primary_customer_size', 'customer_industries', 'customer_geographic_reach', 'target_customer_profile',
      'hq_city', 'hq_state', 'hq_country', 'hq_region', 'service_regions', 'geographic_footprint', 'other_office_locations',
      'thesis_summary', 'strategic_priorities', 'acquisition_appetite',
      'target_industries', 'target_services',
      'portfolio_companies', 'total_acquisitions', 'acquisition_frequency', 'num_platforms',
      'min_revenue', 'max_revenue', 'min_ebitda', 'max_ebitda'
      // REMOVED from website updates: target_geographies, geographic_exclusions, business_model_prefs, business_model_exclusions
    ];

    for (const field of fieldsToUpdate) {
      if (extractedData[field] === undefined || extractedData[field] === null) continue;

      const existingValue = buyer[field];
      const newValue = extractedData[field];

      // CRITICAL: Never overwrite transcript-protected fields if transcript data exists
      if (hasTranscriptSource && transcriptProtectedFields.includes(field)) {
        const isEmpty =
          existingValue === null ||
          existingValue === undefined ||
          (typeof existingValue === 'string' && (normalizeString(existingValue) === null)) ||
          (Array.isArray(existingValue) && existingValue.length === 0);

        if (!isEmpty) {
          console.log(`Skipping ${field}: protected by transcript data`);
          continue;
        }
      }

      // Strings: skip placeholders and only update if empty or new is longer
      if (typeof newValue === 'string') {
        const normalizedNew = normalizeString(newValue);
        if (!normalizedNew) continue;

        const normalizedExisting = normalizeString(existingValue);
        if (!normalizedExisting || normalizedNew.length > normalizedExisting.length) {
          updateData[field] = normalizedNew;
        }
        continue;
      }

      // Arrays: skip empty/placeholder entries and only update if empty or new has more items
      if (Array.isArray(newValue)) {
        const normalizedNewArr = normalizeArray(newValue);
        if (!normalizedNewArr) continue;

        const existingArr = Array.isArray(existingValue) ? existingValue : null;
        if (!existingArr || !Array.isArray(existingArr) || normalizedNewArr.length > existingArr.length) {
          updateData[field] = normalizedNewArr;
        }
        continue;
      }

      // Numbers: only update if we don't have data
      if (typeof newValue === 'number') {
        if (existingValue === null || existingValue === undefined) {
          updateData[field] = newValue;
        }
        continue;
      }

      // Everything else: leave as-is
    }

    // Merge extraction sources (reuse existingSources from above)
    updateData.extraction_sources = [...existingSources, ...evidenceRecords];
    updateData.extraction_evidence = {
      last_website_enrichment: new Date().toISOString(),
      sources_processed: evidenceRecords.map(e => e.source)
    };

    // Update the buyer record
    const { error: updateError } = await supabase
      .from('buyers')
      .update(updateData)
      .eq('id', buyerId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update buyer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fieldsUpdated = Object.keys(updateData).filter(k => !['data_last_updated', 'extraction_sources', 'extraction_evidence'].includes(k)).length;
    console.log(`Successfully enriched buyer with ${fieldsUpdated} fields`);

    // Build warning message if any scrapes failed
    const warnings: string[] = [];
    if (platformScrapeFailed && buyer.platform_website) {
      warnings.push(`Platform website (${buyer.platform_website}) could not be scraped (may be blocked)`);
    }
    if (peFirmScrapeFailed && buyer.pe_firm_website) {
      warnings.push(`PE firm website (${buyer.pe_firm_website}) could not be scraped`);
    }

    // If we couldn't update any meaningful fields, treat it as a non-success so the client can retry.
    if (fieldsUpdated === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No extractable data found (0 fields updated). The site may be blocked, thin, or mostly non-text content.',
          fieldsUpdated,
          scraped: {
            platform: !!platformContent,
            peFirm: !!peFirmContent,
          },
          warning: warnings.length > 0 ? warnings.join('; ') : null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Enriched ${fieldsUpdated} fields from ${evidenceRecords.length} source(s)`,
        fieldsUpdated,
        extractedData: updateData,
        scraped: {
          platform: !!platformContent,
          peFirm: !!peFirmContent,
        },
        warning: warnings.length > 0 ? warnings.join('; ') : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enrich-buyer:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
