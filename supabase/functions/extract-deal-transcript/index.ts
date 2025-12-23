import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse PDF file to text using pdfjs-serverless (Deno compatible)
async function parsePdfToText(fileData: Blob, fileName?: string): Promise<string> {
  console.log('Parsing PDF file...', fileName ? `(${fileName})` : '');
  try {
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Check if this is actually a PDF
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    if (!header.startsWith('%PDF')) {
      console.log('File does not appear to be a PDF, treating as text');
      return new TextDecoder().decode(bytes);
    }
    
    // Use pdfjs-serverless which works in Deno/serverless environments
    console.log('Loading pdfjs-serverless...');
    const pdfjs = await import('https://esm.sh/pdfjs-serverless@0.5.0');
    const pdfjsLib = await pdfjs.resolvePDFJS();
    
    console.log('Parsing PDF document...');
    const pdfDoc = await pdfjsLib.getDocument({ 
      data: bytes, 
      useSystemFonts: true 
    }).promise;
    
    console.log('PDF loaded successfully, pages:', pdfDoc.numPages);
    
    // Extract text from all pages
    const textParts: string[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      textParts.push(pageText);
    }
    
    const extractedText = textParts.join('\n\n');
    
    console.log('PDF parsing complete:');
    console.log('  - Pages:', pdfDoc.numPages);
    console.log('  - Total characters:', extractedText.length);
    console.log('  - Preview (first 500 chars):', extractedText.substring(0, 500));
    
    if (extractedText.length < 100) {
      throw new Error('Could not extract meaningful text from PDF. The PDF may be image-based or encrypted. Please paste the transcript content directly in the notes field instead.');
    }
    
    return extractedText;
  } catch (error) {
    console.error('PDF parsing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse PDF: ${errorMessage}`);
  }
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

// ============== GEOGRAPHY NORMALIZATION ==============
// All valid US state abbreviations
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
    
    // Skip garbage
    if (trimmed.length < 2 || trimmed.length > 100) continue;
    if (/find\s*(a\s*)?shop/i.test(trimmed) || /near\s*(you|me)/i.test(trimmed)) continue;
    if (/^https?:\/\//i.test(trimmed) || /\.(com|net|org)/i.test(trimmed)) continue;
    
    // Valid 2-letter abbreviation
    if (ALL_US_STATES.includes(upper)) { normalized.push(upper); continue; }
    
    // Full state name
    const abbrev = STATE_NAME_TO_ABBREV[lower];
    if (abbrev) { normalized.push(abbrev); continue; }
    
    // Misspellings
    if (GEO_MISSPELLINGS[lower]) { normalized.push(GEO_MISSPELLINGS[lower]); continue; }
    
    // National/Nationwide
    if (['national', 'nationwide', 'usa', 'us', 'united states', 'all states'].includes(lower)) {
      normalized.push(...ALL_US_STATES); continue;
    }
    
    // "X states" pattern
    const statesMatch = lower.match(/^(\d+)\s*states?$/);
    if (statesMatch && parseInt(statesMatch[1], 10) >= 30) {
      normalized.push(...ALL_US_STATES); continue;
    }
    
    // "City, State" format
    const cityStateMatch = trimmed.match(/,\s*([A-Za-z\s]+)$/);
    if (cityStateMatch) {
      const statePart = cityStateMatch[1].trim().toLowerCase().replace(/\s*\([^)]*\)\s*/g, '').trim();
      if (statePart.length === 2 && ALL_US_STATES.includes(statePart.toUpperCase())) {
        normalized.push(statePart.toUpperCase()); continue;
      }
      const stateAbbrev = STATE_NAME_TO_ABBREV[statePart];
      if (stateAbbrev) { normalized.push(stateAbbrev); continue; }
    }
    
    // Space-separated abbreviations (e.g., "TX OK AR LA")
    if (/^[A-Z]{2}(\s+[A-Z]{2})+$/i.test(trimmed)) {
      for (const part of upper.split(/\s+/)) {
        if (ALL_US_STATES.includes(part)) normalized.push(part);
      }
      continue;
    }
    
    console.warn(`[normalizeGeography] Skipping: "${item}"`);
  }
  
  const unique = [...new Set(normalized)];
  console.log(`[normalizeGeography] Normalized ${items.length} items to ${unique.length} states`);
  return unique.length > 0 ? unique : null;
}
// ============== END GEOGRAPHY NORMALIZATION ==============

// M&A Financial Extraction Tool with conservative extraction logic
const extractDealInfoTool = {
  type: "function",
  function: {
    name: "extract_deal_info",
    description: "Extract company, financial, and deal information from a sales call transcript with a buy-side M&A advisory firm",
    parameters: {
      type: "object",
      properties: {
        company_overview: {
          type: "string",
          description: "Executive summary of the company - what they do, their market position, and key strengths"
        },
        // Revenue extraction with confidence metadata
        revenue: {
          type: "object",
          properties: {
            value: { type: "number", description: "Annual revenue in millions (midpoint if range). E.g., 6.5 for $6.5M" },
            is_range: { type: "boolean", description: "True if owner gave a range instead of exact figure" },
            range_low: { type: "number", description: "Low end of range in millions if applicable" },
            range_high: { type: "number", description: "High end of range in millions if applicable" },
            is_inferred: { type: "boolean", description: "True if revenue was calculated from margin and profit rather than stated directly" },
            confidence: { type: "string", enum: ["high", "medium", "low"], description: "High: direct statement. Medium: calculated from clear data. Low: ambiguous or unclear." },
            source_quote: { type: "string", description: "Exact quote from owner supporting the revenue figure" },
            inference_method: { type: "string", description: "If inferred, explain how (e.g., 'Calculated from $800k profit at 10% margins')" }
          },
          required: ["confidence"],
          description: "Revenue data with confidence level and source"
        },
        // EBITDA extraction with confidence metadata
        ebitda: {
          type: "object",
          properties: {
            margin_percentage: { type: "number", description: "EBITDA margin as percentage (e.g., 23 for 23%)" },
            amount: { type: "number", description: "Actual EBITDA in millions if calculable" },
            is_explicit: { type: "boolean", description: "True if owner used terms like EBITDA, operating EBITDA, or earnings before interest/taxes/depreciation" },
            is_inferred: { type: "boolean", description: "True if inferred from operating profit, net profit before taxes, cash flow, owner earnings, or margins" },
            confidence: { type: "string", enum: ["high", "medium", "low"], description: "High: explicit EBITDA or clear pre-tax/pre-debt profit. Medium: owner income/cash flow discussed. Low: ambiguous or partially personal." },
            source_quote: { type: "string", description: "Exact quote from owner supporting the EBITDA figure" },
            inference_method: { type: "string", description: "If inferred, explain the proxy used (e.g., 'Inferred from operating profit statement')" },
            assumptions: { type: "array", items: { type: "string" }, description: "Any assumptions made during inference" },
            do_not_use_reason: { type: "string", description: "If EBITDA cannot be inferred (post-tax income, personal distributions, includes debt service), explain why" }
          },
          required: ["confidence"],
          description: "EBITDA data with confidence level and source"
        },
        // Follow-up questions for unclear financials
        financial_followup_questions: {
          type: "array",
          items: { type: "string" },
          description: "Specific questions to ask in follow-up call to clarify financial figures"
        },
        financial_notes: {
          type: "string",
          description: "Extraction notes, assumptions, and any flags for the deal team"
        },
        geography: {
          type: "array",
          items: { type: "string" },
          description: "US states where the company operates. Use 2-letter state abbreviations (e.g., TX, FL, CA) or full state names. Extract from mentions of locations, service areas, or headquarters."
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
        location_count: {
          type: "number",
          description: "Number of physical locations, stores, shops, branches, or offices the company operates"
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
        },
        // End Market / Customers fields
        end_market_customers: {
          type: "string",
          description: "Primary customer types/segments - who are they selling to? Examples: 'insurance companies, enterprise rental, individual consumers', 'commercial contractors, residential homeowners', 'Fortune 500 companies, SMBs'"
        },
        customer_concentration: {
          type: "string",
          description: "Any mentions of top customers, concentration risk, or customer dependencies. Examples: 'Top 3 customers = 40% of revenue', 'No single customer > 10%', 'Main customer is [Company Name] at 25%'"
        },
        customer_geography: {
          type: "string",
          description: "Where customers are located geographically, if discussed and different from operations. Examples: 'Customers are nationwide', 'Primarily serves local metro area', 'Exports to Canada and Mexico'"
        },
        // Additional Information structured fields
        key_risks: {
          type: "array",
          items: { type: "string" },
          description: "Concerns or risks mentioned during the call. Examples: customer concentration, key-man dependency, lease expiration, regulatory issues, pending litigation, equipment age, union labor"
        },
        competitive_position: {
          type: "string",
          description: "Market position, competitors, and differentiation mentioned. Examples: 'Largest provider in metro area', 'Competes with [Competitor A] and [Competitor B]', 'Only certified provider in region'"
        },
        technology_systems: {
          type: "string",
          description: "Key systems, software, and technology dependencies. Examples: 'Uses SAP for ERP', 'Proprietary scheduling software', 'Recently upgraded to cloud-based systems'"
        },
        real_estate: {
          type: "string",
          description: "Owned vs leased properties, lease terms, property details. Examples: '3 owned locations, 2 leased', 'Main facility lease expires 2026', 'Owns 5-acre lot with building'"
        },
        growth_trajectory: {
          type: "string",
          description: "Historical growth patterns and future outlook discussed. Examples: '15% CAGR over last 3 years', 'Flat revenue but improving margins', 'Planning expansion into new market'"
        }
      },
      required: [],
      additionalProperties: false
    }
  }
};

const MA_ANALYST_SYSTEM_PROMPT = `You are an AI agent supporting a buy-side M&A firm. Your job is to extract revenue and EBITDA from phone call transcripts with business owners. These calls often reference financial performance without using formal accounting terms, so you must interpret owner language carefully and conservatively.

Your output will be used for deal screening and buyer matching. Accuracy matters more than completeness.

## PRIMARY GOAL
From each call transcript, determine:
- Revenue (explicit or inferred)
- EBITDA (explicit or inferred)
- EBITDA margin (if possible)
- How confident the data is and what it is based on

If something is unclear, you must flag it rather than guessing.

## REVENUE EXTRACTION
- If the owner states revenue directly (e.g., "we do about $7 million a year"), record it as revenue.
- If they give a range, record the midpoint and note that it is a range.
- If revenue is not stated but can be calculated from margin and profit (e.g., "we make $800k at 10% margins"), you may infer revenue and clearly label it as inferred.
- Always capture the exact quote that supports the number.

## EBITDA EXTRACTION

### Explicit EBITDA
If the owner uses terms like:
- EBITDA
- Earnings before interest, taxes, depreciation
- Operating EBITDA

Record the figure as explicit EBITDA.

### Inferred EBITDA (Allowed)
If EBITDA is not mentioned, you may infer it only when the transcript supports a reasonable proxy.

You may infer EBITDA when the owner refers to:
- Operating profit
- Net profit before taxes and debt
- Cash flow that excludes financing and taxes
- Owner earnings in an owner-operated business
- Margins paired with revenue ("we run at about 15% margins")

When inferring EBITDA:
- Clearly explain how you arrived at the number
- State any assumptions
- Assign a confidence level (high, medium, or low)
- Default to the lower end if there is uncertainty

### Inference Confidence Levels
- **High confidence**: Revenue and margin are both stated, or profit is clearly pre-tax and pre-debt
- **Medium confidence**: Owner income or cash flow is discussed without full clarity
- **Low confidence**: Statements are ambiguous or partially personal

If confidence is low, do not treat the number as firm—flag it for follow-up.

### Do NOT Infer EBITDA From:
- Post-tax income
- Personal income after distributions
- Profit figures that clearly include debt service
- Statements like "what I take home after everything"

In these cases, note that EBITDA is unclear and recommend clarification questions.

## CONSERVATIVE BIAS RULE
If there is any ambiguity:
- Choose the more conservative interpretation
- Lower the confidence level
- Flag the issue for follow-up

Never fabricate numbers or assume financial definitions that are not supported by the transcript.

## OUTPUT REQUIREMENTS
For every transcript, you must clearly communicate:
- The financial figures you extracted or inferred
- Whether each number is explicit or inferred
- The exact language used by the owner
- Your confidence level
- Any questions that should be asked in a follow-up call

## FINAL PRINCIPLE
Your role is not to "fill in the blanks."
Your role is to translate owner language into investor-usable financial signals without overstating certainty.

When in doubt, flag—not guess.`;

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

async function extractDealInfo(openaiApiKey: string, transcriptContent: string): Promise<any> {
  const userPrompt = `Analyze the following call transcript and extract all relevant deal information.

Apply the M&A financial extraction framework strictly:
1. Extract revenue with confidence level and source quote
2. Extract EBITDA only if explicit or if a valid proxy exists - otherwise flag for follow-up
3. Be conservative - when in doubt, lower confidence and flag
4. Generate specific follow-up questions for any unclear financial data

Transcript Content:
${transcriptContent}

Extract all available information including:
- Company overview and what they do
- Revenue with confidence level, source quote, and inference method if applicable
- EBITDA with confidence level, source quote, and inference method if applicable
- Geographic footprint
- Services/products offered
- Owner's goals for the sale
- Business model
- Employee count and founding year if mentioned
- Headquarters location
- Ownership structure
- Any special requirements for the deal
- Primary contact name
- Follow-up questions for unclear financial data

IMPORTANT - Also extract End Market / Customer information:
- end_market_customers: Who are their primary customers? What segments do they serve?
- customer_concentration: Any mentions of top customers, revenue concentration, or dependencies?
- customer_geography: Where are customers located (if different from operations)?

IMPORTANT - Also extract Additional Intelligence:
- key_risks: List any concerns or risks mentioned (customer concentration, key-man, lease issues, regulatory, litigation, equipment, labor)
- competitive_position: Market position, competitors, differentiation
- technology_systems: Key software, systems, technology used
- real_estate: Property ownership, lease terms, facility details
- growth_trajectory: Historical growth, future outlook, expansion plans`;

  console.log('Calling AI with M&A extraction prompt...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: MA_ANALYST_SYSTEM_PROMPT },
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
    console.log('No tool call in response');
    return {};
  }

  try {
    const result = JSON.parse(toolCall.function.arguments);
    console.log('Extracted deal info:', JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.error('Failed to parse tool call arguments:', e);
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

    const { dealId, transcriptId } = await req.json();

    // Need either dealId (legacy) or transcriptId (new flow)
    if (!dealId && !transcriptId) {
      return new Response(
        JSON.stringify({ success: false, error: 'dealId or transcriptId is required' }),
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
    const authHeader = req.headers.get('Authorization')!;
    const userClient = createClient(
      supabaseUrl!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user has access to this transcript or deal via RLS
    if (transcriptId) {
      const { data: userTranscript, error: accessError } = await userClient
        .from('deal_transcripts')
        .select('id, deal_id')
        .eq('id', transcriptId)
        .single();

      if (accessError || !userTranscript) {
        console.error('Access denied for transcript:', transcriptId, accessError?.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Transcript not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (dealId) {
      const { data: userDeal, error: accessError } = await userClient
        .from('deals')
        .select('id, tracker_id')
        .eq('id', dealId)
        .single();

      if (accessError || !userDeal) {
        console.error('Access denied for deal:', dealId, accessError?.message);
        return new Response(
          JSON.stringify({ success: false, error: 'Deal not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Now safe to use SERVICE_ROLE_KEY
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    let deal: any;
    let transcriptContent: string;
    let transcriptRecord: any = null;

    // NEW FLOW: transcriptId provided - use deal_transcripts table
    if (transcriptId) {
      console.log('Processing transcript from deal_transcripts:', transcriptId);
      
      // Fetch transcript record
      const { data: transcript, error: transcriptError } = await supabase
        .from('deal_transcripts')
        .select('*')
        .eq('id', transcriptId)
        .single();

      if (transcriptError || !transcript) {
        return new Response(
          JSON.stringify({ success: false, error: 'Transcript not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      transcriptRecord = transcript;

      // Fetch the associated deal
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', transcript.deal_id)
        .single();

      if (dealError || !dealData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Deal not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      deal = dealData;

      // Get content based on transcript type
      if (transcript.transcript_type === 'link' && transcript.url) {
        console.log('Scraping link-based transcript:', transcript.url);
        try {
          transcriptContent = await scrapeTranscriptUrl(firecrawlApiKey, transcript.url);
        } catch (error) {
          console.error('Scraping failed:', error);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to scrape transcript URL' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else if (transcript.transcript_type === 'file' && transcript.url) {
        console.log('Downloading file-based transcript:', transcript.url);
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('deal-transcripts')
          .download(transcript.url);

        if (downloadError || !fileData) {
          console.error('File download failed:', downloadError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to download transcript file' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Detect if file is PDF and parse accordingly
        const filePath = transcript.url.toLowerCase();
        const isPdf = filePath.endsWith('.pdf') || fileData.type === 'application/pdf';
        
        if (isPdf) {
          console.log('Detected PDF file, using PDF parser...');
          try {
            transcriptContent = await parsePdfToText(fileData);
          } catch (pdfError) {
            console.error('PDF parsing failed:', pdfError);
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to parse PDF transcript. Please try uploading a text file or pasting the transcript content.' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // Plain text file
          transcriptContent = await fileData.text();
        }
        console.log('File content length:', transcriptContent.length);
        console.log('File content preview (first 300 chars):', transcriptContent.substring(0, 300));
      } else if (transcript.notes && transcript.notes.length > 50) {
        // Use notes as content if no URL
        transcriptContent = transcript.notes;
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Transcript has no content (no URL, file, or sufficient notes)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } 
    // LEGACY FLOW: dealId provided - use transcript_link from deals table
    else {
      console.log('Processing deal transcript_link (legacy):', dealId);
      
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (dealError || !dealData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Deal not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      deal = dealData;

      if (!deal.transcript_link) {
        return new Response(
          JSON.stringify({ success: false, error: 'Deal has no transcript link' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Processing deal:', deal.deal_name, 'transcript:', deal.transcript_link);

      try {
        transcriptContent = await scrapeTranscriptUrl(firecrawlApiKey, deal.transcript_link);
      } catch (error) {
        console.error('Scraping failed:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to scrape transcript URL' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!transcriptContent || transcriptContent.length < 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Transcript content too short or empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transcript content ready, length:', transcriptContent.length);

    // Extract deal info using AI with M&A framework
    const extractedInfo = await extractDealInfo(openaiApiKey, transcriptContent);
    console.log('Extracted deal info with financial metadata');

    // Build update object with enhanced financial metadata
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    // Standard fields
    if (extractedInfo.company_overview) updateData.company_overview = extractedInfo.company_overview;
    // Normalize geography to standardized 2-letter state abbreviations
    const normalizedGeo = normalizeGeography(extractedInfo.geography);
    if (normalizedGeo) updateData.geography = normalizedGeo;
    if (extractedInfo.service_mix) updateData.service_mix = extractedInfo.service_mix;
    if (extractedInfo.owner_goals) updateData.owner_goals = extractedInfo.owner_goals;
    if (extractedInfo.business_model) updateData.business_model = extractedInfo.business_model;
    if (extractedInfo.employee_count) updateData.employee_count = extractedInfo.employee_count;
    if (extractedInfo.founded_year) updateData.founded_year = extractedInfo.founded_year;
    if (extractedInfo.headquarters) updateData.headquarters = extractedInfo.headquarters;
    if (extractedInfo.location_count) updateData.location_count = extractedInfo.location_count;
    if (extractedInfo.ownership_structure) updateData.ownership_structure = extractedInfo.ownership_structure;
    if (extractedInfo.special_requirements) updateData.special_requirements = extractedInfo.special_requirements;
    if (extractedInfo.contact_name) updateData.contact_name = extractedInfo.contact_name;

    // Enhanced revenue extraction with metadata
    if (extractedInfo.revenue) {
      const rev = extractedInfo.revenue;
      if (rev.value) updateData.revenue = rev.value;
      if (rev.confidence) updateData.revenue_confidence = rev.confidence;
      if (rev.is_inferred !== undefined) updateData.revenue_is_inferred = rev.is_inferred;
      if (rev.source_quote) updateData.revenue_source_quote = rev.source_quote;
    }

    // Enhanced EBITDA extraction with metadata
    if (extractedInfo.ebitda) {
      const ebitda = extractedInfo.ebitda;
      if (ebitda.margin_percentage) updateData.ebitda_percentage = ebitda.margin_percentage;
      if (ebitda.amount) updateData.ebitda_amount = ebitda.amount;
      if (ebitda.confidence) updateData.ebitda_confidence = ebitda.confidence;
      if (ebitda.is_inferred !== undefined) updateData.ebitda_is_inferred = ebitda.is_inferred;
      if (ebitda.source_quote) updateData.ebitda_source_quote = ebitda.source_quote;
    }

    // Financial notes and follow-up questions
    if (extractedInfo.financial_notes) updateData.financial_notes = extractedInfo.financial_notes;
    if (extractedInfo.financial_followup_questions?.length) {
      updateData.financial_followup_questions = extractedInfo.financial_followup_questions;
    }

    // End Market / Customers fields
    if (extractedInfo.end_market_customers) updateData.end_market_customers = extractedInfo.end_market_customers;
    if (extractedInfo.customer_concentration) updateData.customer_concentration = extractedInfo.customer_concentration;
    if (extractedInfo.customer_geography) updateData.customer_geography = extractedInfo.customer_geography;

    // Additional Information structured fields
    if (extractedInfo.key_risks?.length) updateData.key_risks = extractedInfo.key_risks;
    if (extractedInfo.competitive_position) updateData.competitive_position = extractedInfo.competitive_position;
    if (extractedInfo.technology_systems) updateData.technology_systems = extractedInfo.technology_systems;
    if (extractedInfo.real_estate) updateData.real_estate = extractedInfo.real_estate;
    if (extractedInfo.growth_trajectory) updateData.growth_trajectory = extractedInfo.growth_trajectory;

    // Update the deal
    const { error: updateError } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', deal.id);

    if (updateError) {
      console.error('Error updating deal:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update deal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If using new transcript flow, also update the transcript record
    if (transcriptRecord) {
      const { error: transcriptUpdateError } = await supabase
        .from('deal_transcripts')
        .update({
          extracted_data: extractedInfo,
          processed_at: new Date().toISOString(),
        })
        .eq('id', transcriptId);

      if (transcriptUpdateError) {
        console.error('Error updating transcript record:', transcriptUpdateError);
      }
    }

    console.log('Deal updated successfully with enhanced financial metadata');

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedFields: Object.keys(updateData).filter(k => k !== 'updated_at'),
        data: extractedInfo,
        hasFollowupQuestions: (extractedInfo.financial_followup_questions?.length || 0) > 0
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
