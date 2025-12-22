import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All valid US state abbreviations
const ALL_US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

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

// Regional mappings - translate region names to their constituent states
const REGION_TO_STATES: Record<string, string[]> = {
  'midwest': ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  'the midwest': ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  'midwestern': ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  'northeast': ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
  'the northeast': ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
  'new england': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'],
  'south': ['AL', 'AR', 'DE', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV'],
  'the south': ['AL', 'AR', 'DE', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV'],
  'southeast': ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
  'the southeast': ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
  'southeastern': ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
  'southwest': ['AZ', 'NM', 'OK', 'TX'],
  'the southwest': ['AZ', 'NM', 'OK', 'TX'],
  'west': ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY'],
  'the west': ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY'],
  'pacific northwest': ['OR', 'WA', 'ID'],
  'pnw': ['OR', 'WA', 'ID'],
  'northwest': ['OR', 'WA', 'ID', 'MT', 'WY'],
  'mountain west': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY'],
  'rocky mountain': ['CO', 'ID', 'MT', 'UT', 'WY'],
  'great plains': ['KS', 'NE', 'ND', 'OK', 'SD', 'TX'],
  'mid-atlantic': ['DE', 'MD', 'NJ', 'NY', 'PA'],
  'mid atlantic': ['DE', 'MD', 'NJ', 'NY', 'PA'],
  'east coast': ['CT', 'DE', 'FL', 'GA', 'MA', 'MD', 'ME', 'NC', 'NH', 'NJ', 'NY', 'PA', 'RI', 'SC', 'VA', 'VT'],
  'west coast': ['CA', 'OR', 'WA'],
  'gulf coast': ['AL', 'FL', 'LA', 'MS', 'TX'],
  'gulf states': ['AL', 'FL', 'LA', 'MS', 'TX'],
  'sun belt': ['AL', 'AZ', 'CA', 'FL', 'GA', 'LA', 'MS', 'NM', 'NV', 'SC', 'TX'],
  'sunbelt': ['AL', 'AZ', 'CA', 'FL', 'GA', 'LA', 'MS', 'NM', 'NV', 'SC', 'TX'],
  'rust belt': ['IL', 'IN', 'MI', 'OH', 'PA', 'WI'],
  'carolinas': ['NC', 'SC'],
  'the carolinas': ['NC', 'SC'],
  'dakotas': ['ND', 'SD'],
  'upper midwest': ['IA', 'MN', 'ND', 'SD', 'WI'],
  'deep south': ['AL', 'GA', 'LA', 'MS', 'SC'],
};

// Normalize geography input to standardized 2-letter US state abbreviations
function normalizeGeography(input: string[] | string | null | undefined): string[] {
  if (!input) return [];
  const items = typeof input === 'string' 
    ? input.split(',').map(s => s.trim()).filter(Boolean)
    : input;
  if (!Array.isArray(items) || items.length === 0) return [];

  const normalized: string[] = [];
  
  for (const item of items) {
    if (!item || typeof item !== 'string') continue;
    const trimmed = item.trim();
    const upper = trimmed.toUpperCase();
    const lower = trimmed.toLowerCase();
    
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
    
    // Check if it's a regional term (Midwest, Southeast, etc.)
    const regionStates = REGION_TO_STATES[lower];
    if (regionStates) {
      console.log(`[normalizeGeography] Expanding region "${item}" to states: ${regionStates.join(', ')}`);
      normalized.push(...regionStates);
      continue;
    }
    
    // "national"/"nationwide"/"USA" → all 50 states
    if (['national', 'nationwide', 'usa', 'us', 'united states', 'all states'].includes(lower)) {
      normalized.push(...ALL_US_STATES);
      continue;
    }
    
    // Handle "City, State" format
    const cityStateMatch = trimmed.match(/,\s*([A-Za-z\s]+)$/);
    if (cityStateMatch) {
      const statePart = cityStateMatch[1].trim().toLowerCase();
      if (statePart.length === 2 && ALL_US_STATES.includes(statePart.toUpperCase())) {
        normalized.push(statePart.toUpperCase());
        continue;
      }
      const stateAbbrev = STATE_NAME_TO_ABBREV[statePart];
      if (stateAbbrev) {
        normalized.push(stateAbbrev);
        continue;
      }
    }
    
    // Skip unrecognized items
    console.log(`[normalizeGeography] Skipping unrecognized: "${item}"`);
  }
  
  return [...new Set(normalized)].sort();
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

  console.log('Authenticated user:', user.id);
  return { user, error: null };
}

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

async function callAIWithTool(openaiApiKey: string, systemPrompt: string, userPrompt: string, tool: any): Promise<any> {
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
    // Authenticate user
    const { user, error: authResponse } = await authenticateUser(req);
    if (authResponse) return authResponse;

    const { transcriptId, applyToProfile = false } = await req.json();

    if (!transcriptId) {
      return new Response(
        JSON.stringify({ success: false, error: 'transcriptId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
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

    // Fetch tracker to get industry context
    const { data: tracker } = await supabase
      .from('industry_trackers')
      .select('industry_name')
      .eq('id', buyer.tracker_id)
      .single();

    const industryName = tracker?.industry_name || 'general acquisitions';
    console.log('Processing transcript:', transcript.title, 'for buyer:', buyer.pe_firm_name, 'in industry:', industryName);

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

    // Industry-aware system prompt - very explicit about platform vs PE firm distinction
    const platformName = buyer.platform_company_name || `their ${industryName} platform`;
    const peFirmName = buyer.pe_firm_name;
    
    const systemPrompt = `You are extracting buyer intelligence from a call transcript between SourceCo (an M&A advisory firm) and a private equity buyer.

**CONTEXT:**
- PE Firm: ${peFirmName} (the parent private equity firm)
- Platform Company: ${platformName} (their ${industryName} portfolio company)
- Buyer Universe: **${industryName}**

**CRITICAL DISTINCTION - READ CAREFULLY:**
The PE firm (${peFirmName}) invests across MANY industries. They may have healthcare platforms, environmental services platforms, etc.
We are ONLY interested in their **${industryName}** platform (${platformName}).

When the PE firm says things like "we don't invest in healthcare" or "we avoid oil & gas" - this is IRRELEVANT because:
- Those are PE firm-level statements about OTHER industries they don't pursue
- We already know this buyer is in the ${industryName} tracker - other industries are out of scope by definition
- We want to know what makes a GOOD or BAD **${industryName}** acquisition target

**WHAT TO EXTRACT:**
✅ ${platformName}'s specific criteria for ${industryName} add-on acquisitions
✅ Geographic preferences for ${industryName} expansion
✅ Size criteria for ${industryName} targets
✅ What makes a ${industryName} business attractive or unattractive TO THEM
✅ Deal breakers WITHIN the ${industryName} space (e.g., "no shops under $1M revenue", "avoid X type of ${industryName} business")

**WHAT TO IGNORE:**
❌ PE firm's general investment thesis (unless specifically about ${industryName})
❌ Industries the PE firm doesn't invest in (healthcare, oil & gas, etc.) - these are NOT exclusions for this tracker
❌ Other portfolio companies the PE firm owns
❌ General PE firm deal structure preferences (unless they specifically apply to ${industryName})

**REMEMBER:** Industry exclusions should be sub-categories WITHIN ${industryName} that they avoid, NOT other industries entirely.`;

    const transcriptPromptBase = `Analyze the following call transcript with ${peFirmName} about their ${industryName} platform (${platformName}).

**CRITICAL:** You are extracting criteria for their **${industryName}** acquisitions ONLY.
- ${peFirmName} = the PE firm (parent company) - may discuss many industries
- ${platformName} = their ${industryName} platform - THIS is what we care about

Ignore any discussion about other industries the PE firm invests in. Focus ONLY on what they want in ${industryName} acquisitions.

Transcript Content:
${transcriptContent}

`;

    const extractedData: Record<string, any> = {};
    const allKeyQuotes: string[] = [];

    // Prompt 7: Investment Thesis (OVERRIDE) - Platform-specific, not PE firm
    // Improved prompt to be more flexible and synthesize thesis even if not explicitly stated
    console.log('Running Prompt 7: Investment Thesis from Transcript for', industryName);
    const thesisPrompt = transcriptPromptBase + `
WHAT TO DO: Extract or SYNTHESIZE ${platformName}'s investment thesis for ${industryName} add-on acquisitions.

**CRITICAL - ALWAYS GENERATE A THESIS SUMMARY:**
Even if the buyer doesn't explicitly say "our thesis is...", you MUST synthesize a thesis_summary from what they discuss:
- What type of ${industryName} businesses are they looking for?
- What size criteria do they mention?
- What geographic preferences do they have?
- What makes them excited about a deal?

**Example synthesis:** If they say "we want $10M+ revenue shops in the Midwest with good insurance relationships" → 
thesis_summary should be: "Seeking established ${industryName} operations with $10M+ revenue in Midwest markets with strong insurance/DRP relationships"

**CRITICAL:** 
- We want the PLATFORM's thesis (${platformName}), not the PE firm's general thesis (${peFirmName})
- ${peFirmName} may describe their firm as "investing in environmental services, business services, manufacturing" - IGNORE this
- We want to know what ${platformName} is specifically looking for in ${industryName} add-ons

Look for and synthesize from:
- What makes an attractive ${industryName} acquisition target for ${platformName}
- Geographic expansion goals for the ${industryName} platform
- Size criteria mentioned (revenue, EBITDA ranges)
- Service line expansion goals within ${industryName}
- Strategic priorities for growing the ${industryName} business
- Deal structure preferences

**thesis_confidence levels:**
- "high" = They explicitly stated a thesis or strategy
- "medium" = Clear preferences discussed but not framed as thesis (most common)
- "low" = Had to infer from scattered comments

**DO NOT include:** The PE firm's general description of their investment focus across industries.

EXAMPLE OUTPUT for a collision repair platform:
- thesis_summary: "Building a regional collision repair platform focused on the Midwest, targeting shops with $5-25M revenue and strong insurance relationships"
- strategic_priorities: "Geographic density in core markets, adding OEM certifications, growing fleet/commercial business"
- thesis_confidence: "medium"
- key_quotes_thesis: ["We want shops with strong DRP relationships", "Looking to get denser in our core Midwest markets"]

**IMPORTANT:** You MUST provide a thesis_summary - do NOT leave it empty. Synthesize from ALL available information in the transcript.`;

    const thesis = await callAIWithTool(openaiApiKey, systemPrompt, thesisPrompt, extractTranscriptThesisTool);
    Object.assign(extractedData, thesis);
    if (thesis.key_quotes_thesis) allKeyQuotes.push(...thesis.key_quotes_thesis);

    // Prompt 8: Target Geographies (OVERRIDE) - WHERE THEY WANT TO ACQUIRE
    console.log('Running Prompt 8: Acquisition Target Geographies from Transcript for', industryName);
    const geographyPrompt = transcriptPromptBase + `
WHAT TO DO: Extract where the buyer WANTS TO ACQUIRE or EXPAND TO for their ${industryName} platform specifically.
This is different from where they currently have locations. Look for:
- States or regions they mention wanting to enter or grow their ${industryName} operations
- Markets they say they're actively looking at for ${industryName} deals
- Areas they explicitly say they DON'T want to acquire ${industryName} businesses in

IGNORE: Geographic preferences for other industries or portfolio companies they may discuss.

EXAMPLE OUTPUT:
- target_geographies: ["Texas", "Florida", "Southeast"] - places they WANT to acquire ${industryName} businesses
- geographic_exclusions: ["California", "New York"] - places they WON'T acquire
- acquisition_geography: ["Houston", "Dallas", "Atlanta"] - specific markets they're actively pursuing for ${industryName}
- key_quotes_geography: ["We're really trying to get into Texas for ${industryName}", "California is off the table"]

Focus on FUTURE ${industryName} acquisition targets, not where they already have locations.`;

    const geography = await callAIWithTool(openaiApiKey, systemPrompt, geographyPrompt, extractTranscriptGeographyTool);
    Object.assign(extractedData, geography);
    if (geography.key_quotes_geography) allKeyQuotes.push(...geography.key_quotes_geography);

    // Prompt 9: Size Criteria (OVERRIDE)
    console.log('Running Prompt 9: Size Criteria from Transcript for', industryName);
    const sizePrompt = transcriptPromptBase + `
WHAT TO DO: Extract size criteria (revenue, EBITDA) for ${industryName} acquisitions mentioned in the call.
Look for:
- Minimum and maximum revenue or EBITDA thresholds for ${industryName} deals
- "Sweet spot" or ideal size ranges for ${industryName} targets
- Flexibility on size criteria
- EBITDA margin preferences

IGNORE: Size criteria mentioned for other industries or portfolio companies.

EXAMPLE OUTPUT:
- min_revenue: 5
- max_revenue: 30
- revenue_sweet_spot: 15
- min_ebitda: 1
- max_ebitda: 5
- ebitda_sweet_spot: 2.5
- key_quotes_size: ["Our sweet spot for ${industryName} is $10-20M in revenue", "We need at least $1M EBITDA"]`;

    const size = await callAIWithTool(openaiApiKey, systemPrompt, sizePrompt, extractTranscriptSizeTool);
    Object.assign(extractedData, size);
    if (size.key_quotes_size) allKeyQuotes.push(...size.key_quotes_size);

    // Prompt 10: Deal Structure (OVERRIDE)
    console.log('Running Prompt 10: Deal Structure from Transcript for', industryName);
    const dealStructurePrompt = transcriptPromptBase + `
WHAT TO DO: Extract deal structure preferences for ${industryName} acquisitions mentioned in the call.
Look for:
- Owner equity rollover requirements or preferences for ${industryName} deals
- Expected transition period for ${industryName} business sellers
- Timeline for closing ${industryName} deals
- Management retention expectations

IGNORE: Deal structure preferences mentioned for other industries.

EXAMPLE OUTPUT:
- owner_roll_requirement: "Preferred but not required"
- owner_transition_goals: "12-24 month transition with owner staying on as advisor"
- acquisition_timeline: "Can close in 60-90 days"
- acquisition_appetite: "Very active - looking to do 3-4 ${industryName} deals this year"
- key_quotes_deal_structure: ["We prefer some rollover but it's not a deal breaker", "We can move quickly once we have a signed LOI"]`;

    const dealStructure = await callAIWithTool(openaiApiKey, systemPrompt, dealStructurePrompt, extractTranscriptDealStructureTool);
    Object.assign(extractedData, dealStructure);
    if (dealStructure.key_quotes_deal_structure) allKeyQuotes.push(...dealStructure.key_quotes_deal_structure);

    // Prompt 11: Deal Breakers (OVERRIDE) - Very explicit about industry context
    console.log('Running Prompt 11: Deal Breakers from Transcript for', industryName);
    const dealBreakersPrompt = transcriptPromptBase + `
WHAT TO DO: Extract deal breakers for ${industryName} acquisitions specifically.

**CRITICAL DISTINCTION:**
- If the PE firm says "we don't do healthcare" or "we avoid oil & gas" → IGNORE THIS. These are other industries, not deal breakers for ${industryName}.
- Deal breakers should be things WITHIN ${industryName} they don't want. 

**EXAMPLES OF VALID ${industryName} DEAL BREAKERS:**
- "No shops under $1M revenue" ✅
- "Avoid single-location businesses" ✅  
- "Won't do businesses with high customer concentration" ✅
- "No [specific sub-type of ${industryName}]" ✅

**EXAMPLES TO IGNORE (NOT deal breakers for this tracker):**
- "We don't invest in healthcare" ❌ (different industry entirely)
- "No oil & gas" ❌ (different industry entirely)
- "We avoid IT services" ❌ (different industry entirely)

**FOR BUSINESS MODEL EXCLUSIONS:**
Only include business models WITHIN ${industryName} they avoid. For example, if this is collision repair:
- "No PDR-only shops" ✅
- "No glass-only businesses" ✅
- "No IT services" ❌ (not a ${industryName} business model)

**FOR INDUSTRY EXCLUSIONS:**
Only include sub-categories WITHIN ${industryName}. Leave empty if they haven't mentioned excluding specific types of ${industryName} businesses.

EXAMPLE OUTPUT for a collision repair tracker:
- deal_breakers: ["No single-location shops", "Avoid high DRP concentration over 80%"]
- business_model_exclusions: ["PDR-only", "Glass-only operations"]
- industry_exclusions: [] (empty unless they exclude specific collision sub-types)
- key_quotes_deal_breakers: ["We won't look at single-location shops", "Too much DRP concentration is a concern"]`;

    const dealBreakers = await callAIWithTool(openaiApiKey, systemPrompt, dealBreakersPrompt, extractTranscriptDealBreakersTool);
    Object.assign(extractedData, dealBreakers);
    if (dealBreakers.key_quotes_deal_breakers) allKeyQuotes.push(...dealBreakers.key_quotes_deal_breakers);

    // Add all key quotes
    extractedData.key_quotes = allKeyQuotes;

    // FALLBACK: If no thesis_summary was extracted but we have key quotes, synthesize one
    if ((!extractedData.thesis_summary || extractedData.thesis_summary.trim() === '') && allKeyQuotes.length > 0) {
      console.log('[Fallback] No thesis_summary extracted, synthesizing from key quotes...');
      try {
        const synthesisPrompt = `Based on these direct quotes from a call with ${platformName} (${peFirmName}'s ${industryName} platform), synthesize a 1-2 sentence investment thesis summary:

Key Quotes:
${allKeyQuotes.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Synthesize these into a thesis_summary that describes what they're looking for in ${industryName} acquisitions. Focus on:
- Size/revenue criteria if mentioned
- Geographic preferences if mentioned
- Business characteristics they value
- Any deal structure preferences

Return ONLY a JSON object like: {"thesis_summary": "...", "thesis_confidence": "Medium"}`;

        const synthesisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: synthesisPrompt }],
            response_format: { type: 'json_object' }
          }),
        });

        if (synthesisResponse.ok) {
          const synthesisData = await synthesisResponse.json();
          const content = synthesisData.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed.thesis_summary) {
              extractedData.thesis_summary = parsed.thesis_summary;
              extractedData.thesis_confidence = parsed.thesis_confidence || 'Medium';
              console.log('[Fallback] Synthesized thesis_summary:', extractedData.thesis_summary);
            }
          }
        }
      } catch (synthError) {
        console.error('[Fallback] Failed to synthesize thesis:', synthError);
      }
    }

    // FIX: Capitalize thesis_confidence to match database constraint
    // Database expects 'High', 'Medium', 'Low' but AI returns 'high', 'medium', 'low'
    if (extractedData.thesis_confidence && typeof extractedData.thesis_confidence === 'string') {
      const original = extractedData.thesis_confidence;
      extractedData.thesis_confidence = original.charAt(0).toUpperCase() + original.slice(1).toLowerCase();
      console.log(`[thesis_confidence] Capitalized: "${original}" → "${extractedData.thesis_confidence}"`);
    }

    // FIX: Parse numeric values from key_quotes_size if direct extraction failed
    // This handles cases where AI returns quotes but doesn't extract numbers
    if (extractedData.key_quotes_size && Array.isArray(extractedData.key_quotes_size)) {
      const quotes = extractedData.key_quotes_size.join(' ');
      
      // Parse revenue from quotes like "$10 million in revenue" or "$5-$25M revenue"
      if (!extractedData.min_revenue || !extractedData.max_revenue) {
        // Match patterns like "$10M", "$10 million", "$5-$25M", "$5 to $25 million"
        const revenueRangeMatch = quotes.match(/\$(\d+(?:\.\d+)?)\s*(?:M|million|MM)?\s*(?:to|-)\s*\$?(\d+(?:\.\d+)?)\s*(?:M|million|MM)?\s*(?:in\s+)?revenue/i);
        if (revenueRangeMatch) {
          extractedData.min_revenue = parseFloat(revenueRangeMatch[1]);
          extractedData.max_revenue = parseFloat(revenueRangeMatch[2]);
          console.log(`[Size] Parsed revenue range from quotes: $${extractedData.min_revenue}M - $${extractedData.max_revenue}M`);
        } else {
          // Single revenue value like "$10 million revenue"
          const singleRevenueMatch = quotes.match(/\$(\d+(?:\.\d+)?)\s*(?:M|million|MM)?\s*(?:plus|and above|\+)?\s*(?:in\s+)?revenue/i);
          if (singleRevenueMatch) {
            extractedData.min_revenue = parseFloat(singleRevenueMatch[1]);
            console.log(`[Size] Parsed min revenue from quotes: $${extractedData.min_revenue}M`);
          }
        }
      }

      // Parse EBITDA from quotes like "$2M EBITDA" or "$1-$5 million EBITDA"
      if (!extractedData.min_ebitda || !extractedData.max_ebitda) {
        const ebitdaRangeMatch = quotes.match(/\$(\d+(?:\.\d+)?)\s*(?:M|million|MM)?\s*(?:to|-)\s*\$?(\d+(?:\.\d+)?)\s*(?:M|million|MM)?\s*(?:in\s+)?EBITDA/i);
        if (ebitdaRangeMatch) {
          extractedData.min_ebitda = parseFloat(ebitdaRangeMatch[1]);
          extractedData.max_ebitda = parseFloat(ebitdaRangeMatch[2]);
          console.log(`[Size] Parsed EBITDA range from quotes: $${extractedData.min_ebitda}M - $${extractedData.max_ebitda}M`);
        } else {
          // Single EBITDA value like "$2 million EBITDA"
          const singleEbitdaMatch = quotes.match(/\$(\d+(?:\.\d+)?)\s*(?:M|million|MM)?\s*(?:plus|and above|\+)?\s*(?:in\s+)?EBITDA/i);
          if (singleEbitdaMatch) {
            extractedData.min_ebitda = parseFloat(singleEbitdaMatch[1]);
            console.log(`[Size] Parsed min EBITDA from quotes: $${extractedData.min_ebitda}M`);
          }
        }
      }
    }

    // Normalize all geography fields to 2-letter state abbreviations
    // This converts regional terms like "Midwest", "Southeast" to actual states
    const geographyFields = ['target_geographies', 'geographic_exclusions', 'acquisition_geography'];
    for (const field of geographyFields) {
      if (extractedData[field] && Array.isArray(extractedData[field])) {
        const original = extractedData[field];
        const normalized = normalizeGeography(original);
        if (normalized.length > 0) {
          console.log(`[Geography] Normalized ${field}: ${JSON.stringify(original)} → ${JSON.stringify(normalized)}`);
          extractedData[field] = normalized;
        }
      }
    }

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

      // CLEAR BAD PLACEHOLDER DATA: If thesis_summary contains useless website scrape placeholders, clear it
      // This handles cases where the website scrape returned "The provided website content does not clearly define..."
      const badThesisPatterns = [
        'does not clearly define',
        'does not provide specific',
        'could not find',
        'no specific thesis',
        'unavailable',
        'not available'
      ];
      
      if (buyer.thesis_summary) {
        const lowerThesis = buyer.thesis_summary.toLowerCase();
        const isBadThesis = badThesisPatterns.some(pattern => lowerThesis.includes(pattern));
        if (isBadThesis) {
          console.log('[Cleanup] Clearing bad placeholder thesis_summary:', buyer.thesis_summary.substring(0, 100));
          buyerUpdateData.thesis_summary = null; // Clear it so transcript data can take over
        }
      }

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

      console.log('Buyer update data:', JSON.stringify(buyerUpdateData, null, 2));
      
      const { error: updateBuyerError, data: updatedBuyer } = await supabase
        .from('buyers')
        .update(buyerUpdateData)
        .eq('id', buyer.id)
        .select();

      if (updateBuyerError) {
        // Log detailed error for debugging constraint violations
        console.error('Error updating buyer:', JSON.stringify(updateBuyerError, null, 2));
        console.error('Failed update payload:', JSON.stringify(buyerUpdateData, null, 2));
        console.error('Error code:', updateBuyerError.code);
        console.error('Error message:', updateBuyerError.message);
        console.error('Error details:', updateBuyerError.details);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            extracted: true,
            applied: false,
            error: `Extracted data saved but failed to apply to profile: ${updateBuyerError.message}`,
            errorDetails: updateBuyerError,
            extractedData 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Successfully updated buyer:', updatedBuyer?.[0]?.id);

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
