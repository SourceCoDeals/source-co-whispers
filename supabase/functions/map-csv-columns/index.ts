import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUYER_FIELDS = [
  { key: 'platform_company_name', label: 'Platform Company', description: 'Portfolio company or platform name' },
  { key: 'platform_website', label: 'Platform Website', description: 'Company website URL' },
  { key: 'pe_firm_name', label: 'PE Firm Name', description: 'Private equity firm or sponsor name' },
  { key: 'pe_firm_website', label: 'PE Firm Website', description: 'PE firm website URL' },
  { key: 'hq_city_state', label: 'HQ City & State (combined)', description: 'Combined city and state like "Dallas, TX" - will be auto-split' },
  { key: 'hq_city', label: 'HQ City', description: 'Headquarters city only' },
  { key: 'hq_state', label: 'HQ State', description: 'Headquarters state or province only' },
  { key: 'hq_country', label: 'HQ Country', description: 'Headquarters country' },
  { key: 'skip', label: 'Skip (Do Not Import)', description: 'Do not import this column' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { headers, sampleRows } = await req.json();
    
    if (!headers || !Array.isArray(headers)) {
      throw new Error('Headers array is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const fieldsList = BUYER_FIELDS.map(f => `- ${f.key}: ${f.description}`).join('\n');
    
    const prompt = `You are a data mapping assistant. Given CSV column headers and sample data, map each column to the most appropriate buyer database field.

Available database fields:
${fieldsList}

CSV Headers: ${JSON.stringify(headers)}
Sample Data (first 3 rows): ${JSON.stringify(sampleRows?.slice(0, 3) || [])}

Return a JSON object mapping each CSV header to a database field key. Use "skip" for columns that don't match any field. Be intelligent about matching - for example:
- "Company", "Platform", "Portfolio Company", "Name" → platform_company_name
- "PE", "Sponsor", "PE Firm", "Investor", "Fund" → pe_firm_name
- "Location", "City/State", "HQ", "Headquarters" with data like "Dallas, TX" or "New York, NY" → hq_city_state (combined city and state)
- "City", "HQ City" (city only, no state) → hq_city
- "State", "HQ State" (state only, 2-letter code) → hq_state
- "Country" → hq_country
- "Website", "URL", "Site", "Platform Website" → platform_website
- "PE Website", "Firm Website", "Sponsor Website" → pe_firm_website

IMPORTANT: If the sample data shows values like "City, ST" format (e.g., "Dallas, TX", "Chicago, IL"), map to hq_city_state so it gets auto-split.

Return ONLY valid JSON, no explanation. Example format:
{"Company Name": "platform_company_name", "PE Sponsor": "pe_firm_name", "Location": "hq_city_state"}`;

    console.log('Calling Lovable AI for column mapping...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', jsonStr);
      // Fallback: create basic mapping based on header names
      mapping = {};
      for (const header of headers) {
        const h = header.toLowerCase();
        if (h.includes('pe') || h.includes('sponsor') || h.includes('investor') || h.includes('fund')) {
          mapping[header] = 'pe_firm_name';
        } else if (h.includes('platform') || h.includes('company') || h.includes('portfolio') || h.includes('name')) {
          mapping[header] = 'platform_company_name';
        } else if (h.includes('location') || h.includes('headquarters') || h === 'hq') {
          // Check sample data to see if it looks like "City, State" format
          const sampleValue = sampleRows?.[0]?.[headers.indexOf(header)] || '';
          if (sampleValue.includes(',')) {
            mapping[header] = 'hq_city_state';
          } else {
            mapping[header] = 'hq_city';
          }
        } else if (h.includes('city') && !h.includes('state')) {
          mapping[header] = 'hq_city';
        } else if (h.includes('state') && !h.includes('city')) {
          mapping[header] = 'hq_state';
        } else if (h.includes('country')) {
          mapping[header] = 'hq_country';
        } else if ((h.includes('pe') || h.includes('firm') || h.includes('sponsor')) && h.includes('website')) {
          mapping[header] = 'pe_firm_website';
        } else if (h.includes('website') || h.includes('url')) {
          mapping[header] = 'platform_website';
        } else {
          mapping[header] = 'skip';
        }
      }
    }

    return new Response(JSON.stringify({ 
      mapping,
      availableFields: BUYER_FIELDS 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in map-csv-columns:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
