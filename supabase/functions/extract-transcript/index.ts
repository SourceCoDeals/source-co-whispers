import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions for transcript extraction - 5 prompts (PRIMARY AUTHORITY - OVERRIDE)

// Prompt 7: Investment Thesis from Transcript (OVERRIDE)
const extractTranscriptThesisTool = {
  type: "function",
  function: {
    name: "extract_transcript_thesis",
    description: "Extract investment thesis from call transcript - PRIMARY AUTHORITY",
    parameters: {
      type: "object",
      properties: {
        thesis_summary: {
          type: "string",
          description: "Investment thesis as stated by the buyer in the call"
        },
        strategic_priorities: {
          type: "string",
          description: "Strategic priorities mentioned in the call"
        },
        thesis_confidence: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Confidence level based on clarity and specificity of statements"
        },
        key_quotes_thesis: {
          type: "array",
          items: { type: "string" },
          description: "Direct quotes about investment thesis"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 8: Target Geographies from Transcript (OVERRIDE) - WHERE THEY WANT TO ACQUIRE
const extractTranscriptGeographyTool = {
  type: "function",
  function: {
    name: "extract_transcript_geography",
    description: "Extract where the buyer WANTS TO ACQUIRE new companies - their expansion targets, not their current locations",
    parameters: {
      type: "object",
      properties: {
        target_geographies: {
          type: "array",
          items: { type: "string" },
          description: "States, regions, or cities where they WANT TO ACQUIRE or EXPAND TO. These are future targets, not current locations."
        },
        geographic_exclusions: {
          type: "array",
          items: { type: "string" },
          description: "Locations they explicitly do NOT want to acquire in or have ruled out"
        },
        acquisition_geography: {
          type: "array",
          items: { type: "string" },
          description: "Specific markets they are actively looking at for acquisitions right now"
        },
        key_quotes_geography: {
          type: "array",
          items: { type: "string" },
          description: "Direct quotes about where they want to expand or acquire"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 9: Size Criteria from Transcript (OVERRIDE)
const extractTranscriptSizeTool = {
  type: "function",
  function: {
    name: "extract_transcript_size",
    description: "Extract size criteria from call transcript - PRIMARY AUTHORITY",
    parameters: {
      type: "object",
      properties: {
        min_revenue: {
          type: "number",
          description: "Minimum revenue in millions"
        },
        max_revenue: {
          type: "number",
          description: "Maximum revenue in millions"
        },
        revenue_sweet_spot: {
          type: "number",
          description: "Ideal revenue target in millions"
        },
        min_ebitda: {
          type: "number",
          description: "Minimum EBITDA in millions"
        },
        max_ebitda: {
          type: "number",
          description: "Maximum EBITDA in millions"
        },
        ebitda_sweet_spot: {
          type: "number",
          description: "Ideal EBITDA target in millions"
        },
        preferred_ebitda: {
          type: "number",
          description: "Target EBITDA margin percentage"
        },
        key_quotes_size: {
          type: "array",
          items: { type: "string" },
          description: "Direct quotes about size criteria"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 10: Deal Structure Preferences from Transcript (OVERRIDE)
const extractTranscriptDealStructureTool = {
  type: "function",
  function: {
    name: "extract_transcript_deal_structure",
    description: "Extract deal structure preferences from call transcript - PRIMARY AUTHORITY",
    parameters: {
      type: "object",
      properties: {
        owner_roll_requirement: {
          type: "string",
          description: "Owner equity roll requirements (Required, Preferred, Optional, Not Required)"
        },
        owner_transition_goals: {
          type: "string",
          description: "Expected owner transition period and involvement"
        },
        acquisition_timeline: {
          type: "string",
          description: "Timeline for closing acquisitions"
        },
        acquisition_appetite: {
          type: "string",
          description: "Current appetite for acquisitions"
        },
        key_quotes_deal_structure: {
          type: "array",
          items: { type: "string" },
          description: "Direct quotes about deal structure preferences"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

// Prompt 11: Deal Breakers from Transcript (OVERRIDE)
const extractTranscriptDealBreakersTool = {
  type: "function",
  function: {
    name: "extract_transcript_deal_breakers",
    description: "Extract deal breakers and exclusions from call transcript - PRIMARY AUTHORITY",
    parameters: {
      type: "object",
      properties: {
        deal_breakers: {
          type: "array",
          items: { type: "string" },
          description: "Hard deal breakers that would kill a deal"
        },
        business_model_exclusions: {
          type: "array",
          items: { type: "string" },
          description: "Business models they won't consider"
        },
        industry_exclusions: {
          type: "array",
          items: { type: "string" },
          description: "Industries they won't invest in"
        },
        key_quotes_deal_breakers: {
          type: "array",
          items: { type: "string" },
          description: "Direct quotes about deal breakers"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

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
    const { transcriptId, applyToProfile = false } = await req.json();

    if (!transcriptId) {
      return new Response(
        JSON.stringify({ success: false, error: 'transcriptId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Fetch transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('buyer_transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transcript not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch buyer
    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('*')
      .eq('id', transcript.buyer_id)
      .single();

    if (buyerError || !buyer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Buyer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing transcript:', transcript.title, 'for buyer:', buyer.pe_firm_name);

    // Get transcript content
    let transcriptContent = '';
    
    if (transcript.transcript_type === 'link' && transcript.url) {
      // For now, use notes as content if available, or indicate URL-based transcript
      transcriptContent = transcript.notes || `Transcript available at: ${transcript.url}`;
    } else if (transcript.transcript_type === 'file' && transcript.url) {
      // For file-based transcripts, we'd need to download and parse
      // For now, use notes
      transcriptContent = transcript.notes || 'File-based transcript (content extraction pending)';
    }

    // If we have notes, use them as the primary content
    if (transcript.notes && transcript.notes.length > 50) {
      transcriptContent = transcript.notes;
    }

    if (!transcriptContent || transcriptContent.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Transcript has insufficient content. Please add detailed notes or upload a text file.',
          needsContent: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are extracting buyer intelligence from a call transcript between SourceCo (an M&A advisory firm) and a private equity buyer. 

The transcript is a record of a conversation where the buyer discusses their acquisition interests, criteria, and preferences.

IMPORTANT: Information from transcripts is PRIMARY AUTHORITY and should always be treated as the most accurate and current information about the buyer's preferences. Extract direct quotes where possible.`;

    const transcriptPromptBase = `Analyze the following call transcript with ${buyer.pe_firm_name} / ${buyer.platform_company_name || 'their platform'}.

Transcript Content:
${transcriptContent}

`;

    const extractedData: Record<string, any> = {};
    const allKeyQuotes: string[] = [];

    // Prompt 7: Investment Thesis (OVERRIDE)
    console.log('Running Prompt 7: Investment Thesis from Transcript');
    const thesisPrompt = transcriptPromptBase + `
WHAT TO DO: Extract the buyer's stated investment thesis and strategic priorities from this call.
Look for:
- What they say they are looking for in acquisitions
- Their stated investment strategy
- Strategic goals or priorities mentioned

EXAMPLE OUTPUT:
- thesis_summary: "Looking to build a national HVAC platform through add-on acquisitions of companies with strong commercial customer bases"
- strategic_priorities: "Geographic expansion into the Southeast and Texas, adding commercial capabilities"
- thesis_confidence: "high"
- key_quotes_thesis: ["We're really focused on commercial HVAC right now", "Our goal is to be in 10 states by end of next year"]`;

    const thesis = await callAIWithTool(lovableApiKey, systemPrompt, thesisPrompt, extractTranscriptThesisTool);
    Object.assign(extractedData, thesis);
    if (thesis.key_quotes_thesis) allKeyQuotes.push(...thesis.key_quotes_thesis);

    // Prompt 8: Target Geographies (OVERRIDE) - WHERE THEY WANT TO ACQUIRE
    console.log('Running Prompt 8: Acquisition Target Geographies from Transcript');
    const geographyPrompt = transcriptPromptBase + `
WHAT TO DO: Extract where the buyer WANTS TO ACQUIRE or EXPAND TO - their geographic growth targets.
This is different from where they currently have locations. Look for:
- States or regions they mention wanting to enter or grow in
- Markets they say they're actively looking at for deals
- Areas they explicitly say they DON'T want to acquire in
- Any reasoning about why certain geographies are attractive or unattractive

EXAMPLE OUTPUT:
- target_geographies: ["Texas", "Florida", "Southeast"] - places they WANT to acquire
- geographic_exclusions: ["California", "New York"] - places they WON'T acquire
- acquisition_geography: ["Houston", "Dallas", "Atlanta"] - specific markets they're actively pursuing
- key_quotes_geography: ["We're really trying to get into Texas", "California is off the table for us"]

Focus on FUTURE acquisition targets, not where they already have shops.`;

    const geography = await callAIWithTool(lovableApiKey, systemPrompt, geographyPrompt, extractTranscriptGeographyTool);
    Object.assign(extractedData, geography);
    if (geography.key_quotes_geography) allKeyQuotes.push(...geography.key_quotes_geography);

    // Prompt 9: Size Criteria (OVERRIDE)
    console.log('Running Prompt 9: Size Criteria from Transcript');
    const sizePrompt = transcriptPromptBase + `
WHAT TO DO: Extract size criteria (revenue, EBITDA) mentioned in the call.
Look for:
- Minimum and maximum revenue or EBITDA thresholds
- "Sweet spot" or ideal size ranges
- Flexibility on size criteria
- EBITDA margin preferences

EXAMPLE OUTPUT:
- min_revenue: 5
- max_revenue: 30
- revenue_sweet_spot: 15
- min_ebitda: 1
- max_ebitda: 5
- ebitda_sweet_spot: 2.5
- key_quotes_size: ["Our sweet spot is $10-20M in revenue", "We need at least $1M EBITDA"]`;

    const size = await callAIWithTool(lovableApiKey, systemPrompt, sizePrompt, extractTranscriptSizeTool);
    Object.assign(extractedData, size);
    if (size.key_quotes_size) allKeyQuotes.push(...size.key_quotes_size);

    // Prompt 10: Deal Structure (OVERRIDE)
    console.log('Running Prompt 10: Deal Structure from Transcript');
    const dealStructurePrompt = transcriptPromptBase + `
WHAT TO DO: Extract deal structure preferences mentioned in the call.
Look for:
- Owner equity rollover requirements or preferences
- Expected transition period for sellers
- Timeline for closing deals
- Management retention expectations

EXAMPLE OUTPUT:
- owner_roll_requirement: "Preferred but not required"
- owner_transition_goals: "12-24 month transition with owner staying on as advisor"
- acquisition_timeline: "Can close in 60-90 days"
- acquisition_appetite: "Very active - looking to do 3-4 deals this year"
- key_quotes_deal_structure: ["We prefer some rollover but it's not a deal breaker", "We can move quickly once we have a signed LOI"]`;

    const dealStructure = await callAIWithTool(lovableApiKey, systemPrompt, dealStructurePrompt, extractTranscriptDealStructureTool);
    Object.assign(extractedData, dealStructure);
    if (dealStructure.key_quotes_deal_structure) allKeyQuotes.push(...dealStructure.key_quotes_deal_structure);

    // Prompt 11: Deal Breakers (OVERRIDE)
    console.log('Running Prompt 11: Deal Breakers from Transcript');
    const dealBreakersPrompt = transcriptPromptBase + `
WHAT TO DO: Extract deal breakers and strong preferences against certain things.
Look for:
- Hard deal breakers that would kill a deal
- Business models they won't consider
- Industries or services they avoid
- Strong negative statements about certain characteristics

EXAMPLE OUTPUT:
- deal_breakers: ["No residential-only businesses", "Won't consider companies with customer concentration over 30%"]
- business_model_exclusions: ["Pure construction/new build", "Manufacturer reps"]
- industry_exclusions: ["Residential-only HVAC", "Ductwork fabrication"]
- key_quotes_deal_breakers: ["We absolutely won't do residential-only", "Customer concentration over 30% is a non-starter for us"]`;

    const dealBreakers = await callAIWithTool(lovableApiKey, systemPrompt, dealBreakersPrompt, extractTranscriptDealBreakersTool);
    Object.assign(extractedData, dealBreakers);
    if (dealBreakers.key_quotes_deal_breakers) allKeyQuotes.push(...dealBreakers.key_quotes_deal_breakers);

    // Add all key quotes
    extractedData.key_quotes = allKeyQuotes;

    console.log('Extracted data from transcript:', extractedData);

    // Save extracted data to transcript record
    const { error: updateTranscriptError } = await supabase
      .from('buyer_transcripts')
      .update({
        extracted_data: extractedData,
        extraction_evidence: {
          prompts_run: ['thesis', 'geography', 'size', 'deal_structure', 'deal_breakers'],
          extracted_at: new Date().toISOString(),
          key_quotes_count: allKeyQuotes.length
        },
        processed_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    if (updateTranscriptError) {
      console.error('Error updating transcript:', updateTranscriptError);
    }

    // If applyToProfile is true, update the buyer profile with OVERRIDE behavior
    if (applyToProfile) {
      console.log('Applying extracted data to buyer profile with OVERRIDE behavior');
      
      const buyerUpdateData: Record<string, any> = {
        data_last_updated: new Date().toISOString(),
      };

      // OVERRIDE fields - transcript always wins for these
      const overrideFields = [
        'thesis_summary', 'strategic_priorities', 'thesis_confidence',
        'target_geographies', 'geographic_exclusions', 'acquisition_geography',
        'min_revenue', 'max_revenue', 'revenue_sweet_spot',
        'min_ebitda', 'max_ebitda', 'ebitda_sweet_spot', 'preferred_ebitda',
        'owner_roll_requirement', 'owner_transition_goals', 'acquisition_timeline', 'acquisition_appetite'
      ];

      for (const field of overrideFields) {
        if (extractedData[field] !== undefined && extractedData[field] !== null) {
          buyerUpdateData[field] = extractedData[field];
        }
      }

      // APPEND fields - add to existing arrays
      const appendFields = ['deal_breakers', 'business_model_exclusions', 'industry_exclusions'];
      
      for (const field of appendFields) {
        if (extractedData[field] && Array.isArray(extractedData[field]) && extractedData[field].length > 0) {
          const existingValues = Array.isArray(buyer[field]) ? buyer[field] : [];
          const newValues = extractedData[field];
          // Merge and deduplicate
          const merged = [...new Set([...existingValues, ...newValues])];
          buyerUpdateData[field] = merged;
        }
      }

      // APPEND key quotes - accumulate across all sources
      if (allKeyQuotes.length > 0) {
        const existingQuotes = Array.isArray(buyer.key_quotes) ? buyer.key_quotes : [];
        const mergedQuotes = [...new Set([...existingQuotes, ...allKeyQuotes])];
        buyerUpdateData.key_quotes = mergedQuotes;
      }

      // Update extraction sources
      const existingSources = Array.isArray(buyer.extraction_sources) ? buyer.extraction_sources : [];
      buyerUpdateData.extraction_sources = [...existingSources, {
        source: 'transcript',
        source_id: transcriptId,
        source_title: transcript.title,
        extracted_at: new Date().toISOString(),
        fields_extracted: Object.keys(buyerUpdateData).filter(k => !['data_last_updated', 'extraction_sources'].includes(k)),
        is_primary_authority: true
      }];

      const { error: updateBuyerError } = await supabase
        .from('buyers')
        .update(buyerUpdateData)
        .eq('id', buyer.id);

      if (updateBuyerError) {
        console.error('Error updating buyer:', updateBuyerError);
        return new Response(
          JSON.stringify({ 
            success: true, 
            extracted: true,
            applied: false,
            error: 'Extracted data saved but failed to apply to profile',
            extractedData 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          extracted: true,
          applied: true,
          message: `Extracted and applied ${Object.keys(buyerUpdateData).length - 2} fields to buyer profile`,
          keyQuotesAdded: allKeyQuotes.length,
          extractedData 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted: true,
        applied: false,
        message: `Extracted ${Object.keys(extractedData).length} fields from transcript`,
        keyQuotesFound: allKeyQuotes.length,
        extractedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-transcript:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
