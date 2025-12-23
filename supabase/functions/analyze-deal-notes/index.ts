import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
          description: "Company website URL if mentioned"
        },
        geography: {
          type: "array",
          items: { type: "string" },
          description: "US states where the company operates. Use 2-letter state abbreviations (e.g., TX, FL, CA)"
        },
        revenue: {
          type: "number",
          description: "Annual revenue in millions (e.g., 6.5 for $6.5M)"
        },
        ebitda_percentage: {
          type: "number",
          description: "EBITDA margin as percentage (e.g., 23 for 23%)"
        },
        service_mix: {
          type: "string",
          description: "Description of services or products offered"
        },
        owner_goals: {
          type: "string",
          description: "What the owner wants from the sale - timeline, involvement post-sale, financial goals"
        },
        location_count: {
          type: "number",
          description: "Number of physical locations the company operates"
        },
        additional_info: {
          type: "string",
          description: "Any other relevant details not captured in other fields"
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
    const { notes } = await req.json();
    
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

    console.log('Analyzing notes, length:', notes.length);

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

Your job is to identify and extract:
- Company name
- Website (if mentioned)
- Geographic presence (US states - use 2-letter abbreviations)
- Revenue (in millions, e.g., 6.5 for $6.5M)
- EBITDA margin percentage (e.g., 23 for 23%)
- Services/products offered
- Owner's goals for the sale
- Number of locations
- Any additional relevant information

Be conservative - only extract information that is clearly stated. Do not make assumptions.
For revenue and EBITDA, convert to the correct units (millions for revenue, percentage for EBITDA margin).`
          },
          {
            role: "user",
            content: `Extract deal information from these notes:\n\n${notes}`
          }
        ],
        tools: [extractDealInfoTool],
        tool_choice: { type: "function", function: { name: "extract_deal_info" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
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
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_deal_info') {
      throw new Error('Unexpected AI response format');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', extractedData);

    // Normalize geography to uppercase state abbreviations
    if (extractedData.geography && Array.isArray(extractedData.geography)) {
      extractedData.geography = extractedData.geography
        .map((g: string) => g.toUpperCase().trim())
        .filter((g: string) => g.length === 2);
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing notes:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
