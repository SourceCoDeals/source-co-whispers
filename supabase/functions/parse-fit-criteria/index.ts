import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { fit_criteria } = await req.json();

    if (!fit_criteria || typeof fit_criteria !== 'string') {
      return new Response(
        JSON.stringify({ error: 'fit_criteria is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Parsing fit criteria:', fit_criteria.substring(0, 100) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at parsing M&A buyer fit criteria. Extract structured data from natural language descriptions of what makes a good buyer fit for an acquisition target.`
          },
          {
            role: 'user',
            content: `Parse the following buyer fit criteria into structured categories:\n\n${fit_criteria}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_fit_criteria',
              description: 'Extract structured fit criteria from natural language',
              parameters: {
                type: 'object',
                properties: {
                  size_criteria: {
                    type: 'object',
                    description: 'Size-related requirements',
                    properties: {
                      min_revenue: { type: 'string', description: 'Minimum revenue threshold (e.g., "$5M+")' },
                      max_revenue: { type: 'string', description: 'Maximum revenue threshold' },
                      min_ebitda: { type: 'string', description: 'Minimum EBITDA threshold' },
                      max_ebitda: { type: 'string', description: 'Maximum EBITDA threshold' },
                      employee_count: { type: 'string', description: 'Employee count requirements' },
                      location_count: { type: 'string', description: 'Number of locations required' },
                      sqft_requirements: { type: 'string', description: 'Square footage requirements' },
                      other: { type: 'array', items: { type: 'string' }, description: 'Other size-related criteria' }
                    }
                  },
                  service_criteria: {
                    type: 'object',
                    description: 'Service/product mix requirements',
                    properties: {
                      required_services: { type: 'array', items: { type: 'string' }, description: 'Must-have services or capabilities' },
                      preferred_services: { type: 'array', items: { type: 'string' }, description: 'Nice-to-have services' },
                      excluded_services: { type: 'array', items: { type: 'string' }, description: 'Services that are deal breakers' },
                      business_model: { type: 'string', description: 'Required business model (B2B, B2C, recurring, etc.)' },
                      customer_profile: { type: 'string', description: 'Target customer profile requirements' },
                      other: { type: 'array', items: { type: 'string' }, description: 'Other service-related criteria' }
                    }
                  },
                  geography_criteria: {
                    type: 'object',
                    description: 'Geographic requirements',
                    properties: {
                      required_regions: { type: 'array', items: { type: 'string' }, description: 'Must be present in these regions' },
                      preferred_regions: { type: 'array', items: { type: 'string' }, description: 'Preferred geographic areas' },
                      excluded_regions: { type: 'array', items: { type: 'string' }, description: 'Regions to avoid' },
                      coverage_type: { type: 'string', description: 'Type of coverage needed (national, regional, local, etc.)' },
                      hq_requirements: { type: 'string', description: 'Headquarters location requirements' },
                      other: { type: 'array', items: { type: 'string' }, description: 'Other geography-related criteria' }
                    }
                  }
                },
                required: ['size_criteria', 'service_criteria', 'geography_criteria']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_fit_criteria' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_fit_criteria') {
      throw new Error('Unexpected AI response format');
    }

    const extractedCriteria = JSON.parse(toolCall.function.arguments);
    console.log('Extracted criteria:', JSON.stringify(extractedCriteria).substring(0, 200));

    return new Response(
      JSON.stringify({
        success: true,
        size_criteria: extractedCriteria.size_criteria || {},
        service_criteria: extractedCriteria.service_criteria || {},
        geography_criteria: extractedCriteria.geography_criteria || {}
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-fit-criteria:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
