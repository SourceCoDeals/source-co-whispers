import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEAL_FIELDS = [
  { key: 'deal_name', label: 'Company Name', description: 'The company or deal name' },
  { key: 'company_website', label: 'Website', description: 'Company website URL' },
  { key: 'transcript_link', label: 'Fireflies Link', description: 'Link to Fireflies transcript or call recording' },
  { key: 'additional_info', label: 'General Notes', description: 'Any additional notes or information about the deal' },
  { key: 'contact_first_name', label: 'Owner First Name', description: 'Owner/contact first name' },
  { key: 'contact_last_name', label: 'Owner Last Name', description: 'Owner/contact last name' },
  { key: 'contact_title', label: 'Owner Title', description: 'Owner/contact job title or position' },
  { key: 'contact_email', label: 'Owner Email', description: 'Owner/contact email address' },
  { key: 'contact_phone', label: 'Owner Cell Phone', description: 'Owner/contact phone or cell number' },
  { key: 'skip', label: 'Skip (Do Not Import)', description: 'Do not import this column' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { headers, sampleRows } = await req.json();

    const fieldsDescription = DEAL_FIELDS.map(f => `- "${f.key}": ${f.label} - ${f.description}`).join('\n');

    const prompt = `You are a data mapping assistant. Map CSV column headers to the available deal fields.

AVAILABLE FIELDS (you can ONLY use these):
${fieldsDescription}

CSV HEADERS TO MAP:
${headers.join(', ')}

SAMPLE DATA (first 3 rows):
${sampleRows.slice(0, 3).map((row: string[]) => row.join(' | ')).join('\n')}

MAPPING RULES:
- "Company", "Name", "Deal", "Target", "Business" → deal_name
- "Website", "URL", "Site", "Web" → company_website
- "Fireflies", "Transcript", "Recording", "Call Link", "Meeting Link" → transcript_link
- "Notes", "Comments", "Info", "Description", "Details", "Additional" → additional_info
- "First Name", "First", "Given Name", "Owner First" → contact_first_name
- "Last Name", "Last", "Surname", "Family Name", "Owner Last" → contact_last_name
- "Title", "Position", "Role", "Job Title" → contact_title
- "Email", "E-mail", "Contact Email", "Owner Email" → contact_email
- "Phone", "Cell", "Mobile", "Telephone", "Cell Phone" → contact_phone
- EVERYTHING ELSE → skip

Return a JSON object where keys are the CSV column headers and values are the matching field keys.
Example: {"Company Name": "deal_name", "Website URL": "company_website", "Random Column": "skip"}

IMPORTANT: Only return the JSON object, nothing else.`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    let mapping: Record<string, string>;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      mapping = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback: try basic matching
      mapping = {};
      for (const header of headers) {
        const lower = header.toLowerCase();
        if ((lower.includes('first') && lower.includes('name')) || lower === 'first') {
          mapping[header] = 'contact_first_name';
        } else if ((lower.includes('last') && lower.includes('name')) || lower === 'last' || lower.includes('surname')) {
          mapping[header] = 'contact_last_name';
        } else if (lower.includes('title') || lower.includes('position') || lower.includes('role')) {
          mapping[header] = 'contact_title';
        } else if (lower.includes('email') || lower.includes('e-mail')) {
          mapping[header] = 'contact_email';
        } else if (lower.includes('phone') || lower.includes('cell') || lower.includes('mobile') || lower.includes('telephone')) {
          mapping[header] = 'contact_phone';
        } else if (lower.includes('company') || lower.includes('deal') || lower.includes('target') || lower.includes('business')) {
          mapping[header] = 'deal_name';
        } else if (lower.includes('website') || lower.includes('url') || lower.includes('site')) {
          mapping[header] = 'company_website';
        } else if (lower.includes('fireflies') || lower.includes('transcript') || lower.includes('recording') || lower.includes('call')) {
          mapping[header] = 'transcript_link';
        } else if (lower.includes('note') || lower.includes('comment') || lower.includes('info') || lower.includes('description')) {
          mapping[header] = 'additional_info';
        } else {
          mapping[header] = 'skip';
        }
      }
    }

    return new Response(JSON.stringify({ 
      mapping, 
      availableFields: DEAL_FIELDS 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in map-deal-csv-columns:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
