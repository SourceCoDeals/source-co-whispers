import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool for extracting deal information from transcript
const extractDealInfoTool = {
  type: "function",
  function: {
    name: "extract_deal_info",
    description: "Extract company and deal information from a sales call transcript",
    parameters: {
      type: "object",
      properties: {
        company_overview: {
          type: "string",
          description: "Executive summary of the company - what they do, their market position, and key strengths"
        },
        revenue: {
          type: "number",
          description: "Annual revenue in millions (e.g., 6.5 for $6.5M)"
        },
        ebitda_percentage: {
          type: "number",
          description: "EBITDA margin as a percentage (e.g., 23 for 23%)"
        },
        geography: {
          type: "array",
          items: { type: "string" },
          description: "States or regions where the company operates"
        },
        service_mix: {
          type: "string",
          description: "Description of services or products offered"
        },
        owner_goals: {
          type: "string",
          description: "What the owner wants from the sale - timeline, involvement post-sale, financial goals"
        },
        business_model: {
          type: "string",
          description: "B2B, B2C, government, recurring revenue, project-based, etc."
        },
        employee_count: {
          type: "number",
          description: "Number of employees"
        },
        founded_year: {
          type: "number",
          description: "Year the company was founded"
        },
        headquarters: {
          type: "string",
          description: "City and state of headquarters"
        },
        ownership_structure: {
          type: "string",
          description: "Current ownership structure - sole owner, partnership, family-owned, etc."
        },
        special_requirements: {
          type: "string",
          description: "Any special deal requirements or preferences"
        },
        contact_name: {
          type: "string",
          description: "Name of the primary contact/owner"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

async function scrapeTranscriptUrl(firecrawlApiKey: string, url: string): Promise<string> {
  console.log('Scraping transcript URL:', url);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firecrawl error:', response.status, errorText);
    throw new Error(`Failed to scrape transcript: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.markdown || '';
}

async function extractDealInfo(lovableApiKey: string, transcriptContent: string): Promise<any> {
  const systemPrompt = `You are extracting company and deal information from a sales call transcript between SourceCo (an M&A advisory firm) and a company owner looking to sell their business.

The transcript contains information about the seller's company, their goals, and relevant deal details.

Extract all available information accurately. Only include fields where you have clear evidence from the transcript. Do not guess or make up information.`;

  const userPrompt = `Analyze the following call transcript and extract all relevant deal information.

Transcript Content:
${transcriptContent}

Extract:
- Company overview and what they do
- Revenue and EBITDA if mentioned
- Geographic footprint
- Services/products offered
- Owner's goals for the sale
- Business model
- Employee count and founding year if mentioned
- Headquarters location
- Ownership structure
- Any special requirements for the deal
- Primary contact name`;

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
      tools: [extractDealInfoTool],
      tool_choice: { type: 'function', function: { name: 'extract_deal_info' } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI call failed:', response.status, errorText);
    throw new Error(`AI extraction failed: ${response.status}`);
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
    const { dealId } = await req.json();

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
      return new Response(
        JSON.stringify({ success: false, error: 'Deal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deal.transcript_link) {
      return new Response(
        JSON.stringify({ success: false, error: 'Deal has no transcript link' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing deal:', deal.deal_name, 'transcript:', deal.transcript_link);

    // Scrape transcript content
    let transcriptContent: string;
    try {
      transcriptContent = await scrapeTranscriptUrl(firecrawlApiKey, deal.transcript_link);
    } catch (error) {
      console.error('Scraping failed:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape transcript URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transcriptContent || transcriptContent.length < 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transcript content too short or empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transcript scraped, length:', transcriptContent.length);

    // Extract deal info using AI
    const extractedInfo = await extractDealInfo(lovableApiKey, transcriptContent);
    console.log('Extracted deal info:', extractedInfo);

    // Build update object - only include fields that were extracted
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (extractedInfo.company_overview) updateData.company_overview = extractedInfo.company_overview;
    if (extractedInfo.revenue) updateData.revenue = extractedInfo.revenue;
    if (extractedInfo.ebitda_percentage) updateData.ebitda_percentage = extractedInfo.ebitda_percentage;
    if (extractedInfo.geography?.length) updateData.geography = extractedInfo.geography;
    if (extractedInfo.service_mix) updateData.service_mix = extractedInfo.service_mix;
    if (extractedInfo.owner_goals) updateData.owner_goals = extractedInfo.owner_goals;
    if (extractedInfo.business_model) updateData.business_model = extractedInfo.business_model;
    if (extractedInfo.employee_count) updateData.employee_count = extractedInfo.employee_count;
    if (extractedInfo.founded_year) updateData.founded_year = extractedInfo.founded_year;
    if (extractedInfo.headquarters) updateData.headquarters = extractedInfo.headquarters;
    if (extractedInfo.ownership_structure) updateData.ownership_structure = extractedInfo.ownership_structure;
    if (extractedInfo.special_requirements) updateData.special_requirements = extractedInfo.special_requirements;
    if (extractedInfo.contact_name) updateData.contact_name = extractedInfo.contact_name;

    // Update the deal
    const { error: updateError } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', dealId);

    if (updateError) {
      console.error('Error updating deal:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update deal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Deal updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedFields: Object.keys(updateData).filter(k => k !== 'updated_at'),
        data: extractedInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-deal-transcript:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
