import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const extractTrackerCriteriaTool = {
  type: "function",
  function: {
    name: "extract_tracker_criteria",
    description: "Extract structured buyer universe criteria from unstructured notes",
    parameters: {
      type: "object",
      properties: {
        industry_name: {
          type: "string",
          description: "The industry vertical name if mentioned (e.g., 'Collision Repair', 'HVAC Services')"
        },
        size_criteria_text: {
          type: "string",
          description: "Size-related criteria formatted for display. Include revenue ranges, EBITDA ranges/multiples, location counts, employee counts. Format as bullet points or line breaks."
        },
        service_criteria_text: {
          type: "string",
          description: "Service/product mix criteria. Include required services, preferred capabilities, excluded services. Format as bullet points or line breaks."
        },
        geography_criteria_text: {
          type: "string",
          description: "Geographic criteria. Include target regions/states, coverage type (national/regional/local), excluded regions. Format as bullet points or line breaks."
        },
        buyer_types_text: {
          type: "string",
          description: "Buyer segment definitions. Include buyer type names, size thresholds, priorities. Format as numbered list or bullet points."
        },
        scoring_hints: {
          type: "object",
          properties: {
            geography_mode: {
              type: "string",
              enum: ["strict", "moderate", "relaxed"],
              description: "How strict geography matching should be. 'strict' = must be nearby, 'relaxed' = location doesn't matter much"
            },
            size_importance: {
              type: "string", 
              enum: ["high", "medium", "low"],
              description: "How important size/revenue matching is"
            },
            geography_reasoning: {
              type: "string",
              description: "Brief explanation of why geography mode was chosen"
            }
          }
        },
        additional_context: {
          type: "string",
          description: "Any other relevant information that doesn't fit the above categories"
        }
      },
      required: ["size_criteria_text", "service_criteria_text", "geography_criteria_text", "buyer_types_text"]
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
        JSON.stringify({ success: false, error: 'Notes are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `You are an M&A analyst expert at extracting buyer universe criteria from unstructured notes.

Your job is to extract structured information about what makes a buyer a good fit for deals in a specific industry.

IMPORTANT DISTINCTIONS:
- EBITDA Multiples (e.g., "3x-8x", "up to 10x") are valuation metrics, NOT dollar amounts
- EBITDA Dollar Amounts (e.g., "$1M EBITDA", "$500K-$2M") are actual earnings figures
- Keep these separate and clear in your output

FORMATTING GUIDELINES:
- Use line breaks between items for readability
- For size criteria: Include ranges like "Revenue: $5M-$25M" or "EBITDA: $1M+"
- For services: Use "Required:", "Preferred:", "Excluded:" prefixes
- For geography: List states/regions, note coverage type
- For buyer types: Number them by priority (1., 2., 3.)

SCORING HINTS:
- Geography mode should be "relaxed" for industries where location doesn't matter (software, e-commerce)
- Geography mode should be "strict" for local service businesses (auto repair, plumbing, HVAC)
- Geography mode should be "moderate" for regional businesses

Extract as much relevant information as possible from the notes.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract buyer universe criteria from these notes:\n\n${notes}` }
        ],
        tools: [extractTrackerCriteriaTool],
        tool_choice: { type: "function", function: { name: "extract_tracker_criteria" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_tracker_criteria') {
      throw new Error('No valid extraction result');
    }

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log('Extracted criteria:', JSON.stringify(extracted, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-tracker-notes:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
