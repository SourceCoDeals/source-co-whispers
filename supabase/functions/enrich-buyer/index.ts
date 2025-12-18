import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definition for structured extraction
const extractBuyerDataTool = {
  type: "function",
  function: {
    name: "extract_buyer_data",
    description: "Extract structured buyer information from scraped website content",
    parameters: {
      type: "object",
      properties: {
        // Platform company fields
        services_offered: {
          type: "string",
          description: "Description of services offered by the platform company"
        },
        business_summary: {
          type: "string",
          description: "Brief summary of what the company does"
        },
        industry_vertical: {
          type: "string",
          description: "Primary industry vertical (e.g., HVAC, Plumbing, IT Services)"
        },
        specialized_focus: {
          type: "string",
          description: "Any specialized focus areas or niches"
        },
        geographic_footprint: {
          type: "array",
          items: { type: "string" },
          description: "Geographic regions where the company operates"
        },
        service_regions: {
          type: "array",
          items: { type: "string" },
          description: "Specific states or regions served"
        },
        hq_city: {
          type: "string",
          description: "Headquarters city"
        },
        hq_state: {
          type: "string",
          description: "Headquarters state"
        },
        // PE firm fields
        thesis_summary: {
          type: "string",
          description: "Investment thesis or strategy summary"
        },
        target_geographies: {
          type: "array",
          items: { type: "string" },
          description: "Target geographic regions for acquisitions"
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
        },
        strategic_priorities: {
          type: "string",
          description: "Strategic priorities or goals"
        },
        acquisition_appetite: {
          type: "string",
          description: "Current acquisition appetite (Active, Selective, Paused)"
        },
        portfolio_companies: {
          type: "array",
          items: { type: "string" },
          description: "Names of portfolio companies"
        },
        total_acquisitions: {
          type: "number",
          description: "Total number of acquisitions made"
        },
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

    // Build prompt for AI extraction
    let prompt = `Extract structured information from the following website content for a private equity buyer profile.

`;

    if (platformContent) {
      prompt += `## Platform Company Website (${buyer.platform_company_name || 'Unknown'})
${platformContent.substring(0, 8000)}

`;
    }

    if (peFirmContent) {
      prompt += `## PE Firm Website (${buyer.pe_firm_name})
${peFirmContent.substring(0, 8000)}

`;
    }

    prompt += `
Extract as much relevant information as possible. Focus on:
- Services offered and business description
- Geographic presence and service regions
- Investment thesis and acquisition strategy
- Target criteria (industries, services, geography, size)
- Portfolio companies and acquisition history

Only include fields where you find clear, relevant information.`;

    console.log('Calling Lovable AI for extraction...');

    // Call Lovable AI with tool calling
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction specialist. Extract structured information from website content about private equity firms and their portfolio companies. Be precise and only include information you can clearly identify from the content.'
          },
          { role: 'user', content: prompt }
        ],
        tools: [extractBuyerDataTool],
        tool_choice: { type: 'function', function: { name: 'extract_buyer_data' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Parse the tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'extract_buyer_data') {
      console.error('No valid tool call in response:', aiData);
      return new Response(
        JSON.stringify({ success: false, error: 'AI extraction returned no data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let extractedData;
    try {
      extractedData = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted data:', extractedData);

    // Build update object, only including non-null values
    const updateData: Record<string, any> = {
      data_last_updated: new Date().toISOString(),
    };

    const fieldsToUpdate = [
      'services_offered', 'business_summary', 'industry_vertical', 'specialized_focus',
      'geographic_footprint', 'service_regions', 'hq_city', 'hq_state',
      'thesis_summary', 'target_geographies', 'target_industries', 'target_services',
      'strategic_priorities', 'acquisition_appetite', 'portfolio_companies',
      'total_acquisitions', 'min_revenue', 'max_revenue', 'min_ebitda', 'max_ebitda'
    ];

    for (const field of fieldsToUpdate) {
      if (extractedData[field] !== undefined && extractedData[field] !== null) {
        // Don't overwrite existing data unless the new data is more substantial
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

    const fieldsUpdated = Object.keys(updateData).filter(k => k !== 'data_last_updated').length;
    console.log(`Successfully enriched buyer with ${fieldsUpdated} fields`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Enriched ${fieldsUpdated} fields`,
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
