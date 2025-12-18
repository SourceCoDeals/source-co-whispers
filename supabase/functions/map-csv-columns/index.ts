import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUYER_FIELDS = [
  { key: 'pe_firm_name', label: 'PE Firm Name', description: 'Private equity firm or sponsor name' },
  { key: 'platform_company_name', label: 'Platform Company', description: 'Portfolio company or platform name' },
  { key: 'services_offered', label: 'Services Offered', description: 'Services, products, or offerings description' },
  { key: 'hq_city', label: 'HQ City', description: 'Headquarters city' },
  { key: 'hq_state', label: 'HQ State', description: 'Headquarters state or province' },
  { key: 'hq_country', label: 'HQ Country', description: 'Headquarters country' },
  { key: 'platform_website', label: 'Platform Website', description: 'Company website URL' },
  { key: 'pe_firm_website', label: 'PE Firm Website', description: 'PE firm website URL' },
  { key: 'business_model', label: 'Business Model', description: 'Business model type (B2B, B2C, etc.)' },
  { key: 'thesis_summary', label: 'Thesis Summary', description: 'Investment thesis or strategy summary' },
  { key: 'geographic_footprint', label: 'Geographic Footprint', description: 'States or regions where company operates' },
  { key: 'target_geographies', label: 'Target Geographies', description: 'Target acquisition geographies' },
  { key: 'industry_vertical', label: 'Industry Vertical', description: 'Industry or vertical focus' },
  { key: 'min_revenue', label: 'Min Revenue', description: 'Minimum target revenue' },
  { key: 'max_revenue', label: 'Max Revenue', description: 'Maximum target revenue' },
  { key: 'min_ebitda', label: 'Min EBITDA', description: 'Minimum target EBITDA' },
  { key: 'max_ebitda', label: 'Max EBITDA', description: 'Maximum target EBITDA' },
  { key: 'business_summary', label: 'Business Summary', description: 'Company description or summary' },
  { key: 'employee_owner', label: 'Employee Owner', description: 'Assigned team member' },
  { key: 'fee_agreement_status', label: 'Fee Agreement Status', description: 'Fee agreement status' },
  { key: 'skip', label: 'Skip (Do Not Import)', description: 'Do not import this column' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
- "Company", "Platform", "Portfolio Company" → platform_company_name
- "PE", "Sponsor", "PE Firm", "Investor" → pe_firm_name
- "City", "HQ City" → hq_city
- "State", "HQ State", "Location" (if 2-letter code) → hq_state
- "Website", "URL", "Site" → platform_website
- "Services", "Description", "Offerings" → services_offered
- "Geography", "States", "Regions", "Footprint" → geographic_footprint

Return ONLY valid JSON, no explanation. Example format:
{"Company Name": "platform_company_name", "PE Sponsor": "pe_firm_name", "Location": "hq_state"}`;

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
        if (h.includes('pe') || h.includes('sponsor') || h.includes('investor')) {
          mapping[header] = 'pe_firm_name';
        } else if (h.includes('platform') || h.includes('company') || h.includes('portfolio')) {
          mapping[header] = 'platform_company_name';
        } else if (h.includes('city')) {
          mapping[header] = 'hq_city';
        } else if (h.includes('state') || h === 'location') {
          mapping[header] = 'hq_state';
        } else if (h.includes('service') || h.includes('description') || h.includes('offering')) {
          mapping[header] = 'services_offered';
        } else if (h.includes('website') || h.includes('url')) {
          mapping[header] = 'platform_website';
        } else if (h.includes('geography') || h.includes('footprint') || h.includes('region')) {
          mapping[header] = 'geographic_footprint';
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
