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
          description: "Broader regions where the company provides services (may extend beyond physical locations)"
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
const extractPETargetCriteriaTool = {
  type: "function",
  function: {
    name: "extract_pe_target_criteria",
    description: "Extract target acquisition criteria from PE firm website",
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
        },
        target_geographies: {
          type: "array",
          items: { type: "string" },
          description: "Target geographic regions for acquisitions"
        },
        geographic_exclusions: {
          type: "array",
          items: { type: "string" },
          description: "Geographic regions to avoid"
        },
        business_model_prefs: {
          type: "string",
          description: "Preferred business models"
        },
        business_model_exclusions: {
          type: "array",
          items: { type: "string" },
          description: "Business models to avoid"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

async function scrapeUrl(url: string, firecrawlApiKey: string): Promise<string | null> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping:', formattedUrl);

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

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('Scrape failed for', formattedUrl, data);
      return null;
    }

    return data.data?.markdown || null;
  } catch (error) {
    console.error('Error scraping URL:', url, error);
    return null;
  }
}

async function callAIWithTool(lovableApiKey: string, systemPrompt: string, userPrompt: string, tool: any): Promise<any> {
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
      tools: [tool],
      tool_choice: { type: 'function', function: { name: tool.function.name } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI call failed:', response.status, errorText);
    throw new Error(`AI call failed: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall) {
    return {};
  }

  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return {};
  }
}

// All valid US state abbreviations
const ALL_US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

// Map full state names to abbreviations
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
function normalizeGeographicFootprint(footprint: string[] | null | undefined): string[] | null {
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
    
    // "national"/"nationwide"/"USA" -> all 50 states
    if (['national', 'nationwide', 'usa', 'us', 'united states', 'all states'].includes(lower)) {
      console.log(`Expanding "${item}" to all 50 states`);
      normalized.push(...ALL_US_STATES);
      continue;
    }
    
    // Handle "X states" pattern (e.g., "41 states", "50 states", "13 States")
    const statesMatch = lower.match(/^(\d+)\s*states?$/);
    if (statesMatch) {
      const count = parseInt(statesMatch[1], 10);
      if (count >= 30) {  // 30+ states = treat as nationwide
        console.log(`Expanding "${item}" (${count} states) to all 50 states`);
        normalized.push(...ALL_US_STATES);
        continue;
      }
      // Less than 30 states - skip as we can't know which ones
      console.log(`Skipping "${item}" - count too low to expand, need specific states`);
      continue;
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
  console.log(`Normalized geographic_footprint: ${unique.length} states`);
  return unique.length > 0 ? unique : null;
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Scrape websites
    const platformContent = buyer.platform_website 
      ? await scrapeUrl(buyer.platform_website, firecrawlApiKey)
      : null;
    
    const peFirmContent = buyer.pe_firm_website
      ? await scrapeUrl(buyer.pe_firm_website, firecrawlApiKey)
      : null;

    if (!platformContent && !peFirmContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'No websites to scrape or scraping failed' }),
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
        lovableApiKey,
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
        lovableApiKey,
        'You are extracting customer and market information from a company website. Be precise and only include information clearly stated.',
        customersPrompt,
        extractCustomersEndMarketTool
      );
      Object.assign(extractedData, customers);

      // Prompt 3: Geography / Footprint - CURRENT LOCATIONS
      console.log('Running Prompt 3: Current Geographic Footprint');
      const geographyPrompt = platformPromptBase + `
WHAT TO DO: Identify where the company CURRENTLY has physical locations (shops, offices, facilities).
Look for:
- Where is the company headquartered? (city, state, country)
- What locations or branches do they currently have? Look for "Locations", "Our Shops", "Service Areas", "Contact Us" pages
- List EVERY state where they mention having a physical presence
- This is about CURRENT locations, not where they want to expand

CRITICAL: geographic_footprint MUST contain ONLY 2-letter US state abbreviations.
- ❌ WRONG: "Texas", "national", "USA", "41 states", "Southwest", "Nationwide"
- ✅ RIGHT: "TX", "CA", "NY", "FL", "MS", "AL"

If they say "national" or "nationwide", you MUST list all 50 state abbreviations.
If they say a number like "41 states", try to identify which states from other context, or list all 50 if unclear.

EXAMPLE OUTPUT for a collision repair company:
- hq_city: "Dallas"
- hq_state: "TX"
- hq_country: "USA"
- hq_region: "Southwest"
- geographic_footprint: ["TX", "OK", "LA", "AR", "AZ"]
- other_office_locations: ["Houston, TX", "Austin, TX", "San Antonio, TX", "Oklahoma City, OK", "Phoenix, AZ"]
- service_regions: ["Southwest United States", "South Central United States"]

Be thorough - extract EVERY state where they have shops or offices, using 2-letter abbreviations ONLY.`;

      const geography = await callAIWithTool(
        lovableApiKey,
        'You are extracting CURRENT physical location information from a company website. Focus on where they have existing shops, offices, or facilities - not where they might expand. Output 2-letter US state abbreviations ONLY for geographic_footprint.',
        geographyPrompt,
        extractGeographyFootprintTool
      );
      
      // Normalize geographic_footprint to ensure only valid 2-letter state abbreviations
      if (geography.geographic_footprint) {
        geography.geographic_footprint = normalizeGeographicFootprint(geography.geographic_footprint);
      }
      
      // Also normalize service_regions (may contain "X states" or "City, State" patterns)
      if (geography.service_regions) {
        geography.service_regions = normalizeGeographicFootprint(geography.service_regions);
      }
      
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
        lovableApiKey,
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
        lovableApiKey,
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
        lovableApiKey,
        'You are extracting portfolio and acquisition history from a PE firm website. Be precise and only include information clearly stated.',
        portfolioPrompt,
        extractPEPortfolioTool
      );
      Object.assign(extractedData, portfolio);

      // Prompt 6: Target Criteria
      console.log('Running Prompt 6: PE Target Criteria');
      const criteriaPrompt = peFirmPromptBase + `
WHAT TO DO: Identify the firm's target acquisition criteria, including:
- What revenue or EBITDA ranges do they target?
- What geographic regions do they focus on?
- What business models do they prefer or avoid?
- What are their must-haves or deal breakers?

EXAMPLE OUTPUT:
- min_revenue: 5
- max_revenue: 50
- min_ebitda: 1
- max_ebitda: 10
- target_geographies: ["Southeast", "Texas", "Midwest"]
- business_model_prefs: "Recurring revenue, maintenance contracts preferred"`;

      const criteria = await callAIWithTool(
        lovableApiKey,
        'You are extracting target acquisition criteria from a PE firm website. Be precise and only include information clearly stated.',
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

    // Build update object - only update fields that are empty or where new data is more substantial
    const updateData: Record<string, any> = {
      data_last_updated: new Date().toISOString(),
    };

    const fieldsToUpdate = [
      'services_offered', 'business_summary', 'industry_vertical', 'specialized_focus',
      'business_type', 'revenue_model', 'go_to_market_strategy',
      'primary_customer_size', 'customer_industries', 'customer_geographic_reach', 'target_customer_profile',
      'hq_city', 'hq_state', 'hq_country', 'hq_region', 'service_regions', 'geographic_footprint', 'other_office_locations',
      'thesis_summary', 'strategic_priorities', 'acquisition_appetite',
      'target_industries', 'target_services', 'target_geographies', 'geographic_exclusions',
      'portfolio_companies', 'total_acquisitions', 'acquisition_frequency', 'num_platforms',
      'min_revenue', 'max_revenue', 'min_ebitda', 'max_ebitda',
      'business_model_prefs', 'business_model_exclusions'
    ];

    for (const field of fieldsToUpdate) {
      if (extractedData[field] !== undefined && extractedData[field] !== null) {
        const existingValue = buyer[field];
        const newValue = extractedData[field];
        
        // For strings, only update if we don't have data or new data is longer
        if (typeof newValue === 'string') {
          if (!existingValue || newValue.length > (existingValue?.length || 0)) {
            updateData[field] = newValue;
          }
        }
        // For arrays, only update if we don't have data or new array has more items
        else if (Array.isArray(newValue)) {
          if (!existingValue || !Array.isArray(existingValue) || newValue.length > existingValue.length) {
            updateData[field] = newValue;
          }
        }
        // For numbers, only update if we don't have data
        else if (typeof newValue === 'number') {
          if (existingValue === null || existingValue === undefined) {
            updateData[field] = newValue;
          }
        }
      }
    }

    // Merge extraction sources
    const existingSources = Array.isArray(buyer.extraction_sources) ? buyer.extraction_sources : [];
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Enriched ${fieldsUpdated} fields from ${evidenceRecords.length} source(s)`,
        fieldsUpdated,
        extractedData: updateData
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
