import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Prompt 3: Geography / Footprint (Platform Website)
const extractGeographyFootprintTool = {
  type: "function",
  function: {
    name: "extract_geography_footprint",
    description: "Extract geographic footprint information from platform company website",
    parameters: {
      type: "object",
      properties: {
        hq_city: {
          type: "string",
          description: "Headquarters city"
        },
        hq_state: {
          type: "string",
          description: "Headquarters state"
        },
        hq_country: {
          type: "string",
          description: "Headquarters country"
        },
        hq_region: {
          type: "string",
          description: "Headquarters region (e.g., Southeast, Midwest)"
        },
        service_regions: {
          type: "array",
          items: { type: "string" },
          description: "Specific states or regions served"
        },
        geographic_footprint: {
          type: "array",
          items: { type: "string" },
          description: "Geographic regions where the company operates"
        },
        other_office_locations: {
          type: "array",
          items: { type: "string" },
          description: "Other office or branch locations"
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

      // Prompt 3: Geography / Footprint
      console.log('Running Prompt 3: Geography / Footprint');
      const geographyPrompt = platformPromptBase + `
WHAT TO DO: Identify where the company operates, including:
- Where is the company headquartered? (city, state, country)
- In which geographies does the company operate? (local, regional, national, international)
- Does the company have multiple locations?

EXAMPLE OUTPUT:
- hq_city: "Chicago"
- hq_state: "Illinois"
- hq_country: "USA"
- hq_region: "Midwest"
- service_regions: ["Illinois", "Indiana", "Wisconsin", "Michigan"]
- geographic_footprint: ["Midwest United States"]`;

      const geography = await callAIWithTool(
        lovableApiKey,
        'You are extracting geographic information from a company website. Be precise and only include information clearly stated.',
        geographyPrompt,
        extractGeographyFootprintTool
      );
      Object.assign(extractedData, geography);

      evidenceRecords.push({
        source: 'platform_website',
        source_url: buyer.platform_website,
        extracted_at: new Date().toISOString(),
        prompts_run: ['business_overview', 'customers_end_market', 'geography_footprint'],
        fields_extracted: Object.keys({ ...businessOverview, ...customers, ...geography }).filter(k => extractedData[k])
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
