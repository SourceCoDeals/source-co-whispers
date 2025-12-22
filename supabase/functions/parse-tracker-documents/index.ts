import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert ArrayBuffer to base64 in chunks to avoid stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // Process 8KB at a time
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

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

    const { tracker_id } = await req.json();

    if (!tracker_id) {
      return new Response(
        JSON.stringify({ error: 'tracker_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the tracker to get its documents
    const { data: tracker, error: trackerError } = await supabaseClient
      .from('industry_trackers')
      .select('id, documents, fit_criteria, fit_criteria_size, fit_criteria_service, fit_criteria_geography, fit_criteria_buyer_types')
      .eq('id', tracker_id)
      .single();

    if (trackerError || !tracker) {
      console.error('Tracker fetch error:', trackerError);
      return new Response(
        JSON.stringify({ error: 'Tracker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const documents = tracker.documents as { name: string; path: string; size: number }[] | null;
    
    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No documents to analyze' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${documents.length} documents for tracker ${tracker_id}`);

    // Download and parse each document
    const documentContents: string[] = [];
    
    for (const doc of documents) {
      console.log(`Downloading document: ${doc.name} from path: ${doc.path}`);
      
      // Download the file from storage
      const { data: fileData, error: downloadError } = await supabaseClient
        .storage
        .from('tracker-documents')
        .download(doc.path);

      if (downloadError) {
        console.error(`Failed to download ${doc.name}:`, downloadError);
        continue;
      }

      // Convert to base64 for parsing API
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      
      // Determine file type
      const extension = doc.name.split('.').pop()?.toLowerCase() || '';
      let mimeType = 'application/octet-stream';
      if (extension === 'pdf') mimeType = 'application/pdf';
      else if (extension === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (extension === 'doc') mimeType = 'application/msword';
      else if (extension === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (extension === 'xls') mimeType = 'application/vnd.ms-excel';
      else if (extension === 'txt') mimeType = 'text/plain';

      console.log(`File ${doc.name}: type=${mimeType}, size=${arrayBuffer.byteLength} bytes`);

      // For text files, just decode directly
      if (mimeType === 'text/plain') {
        const textContent = new TextDecoder().decode(arrayBuffer);
        documentContents.push(`=== Document: ${doc.name} ===\n\n${textContent}`);
        continue;
      }

      // Use the Lovable document parsing API for binary documents
      try {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          throw new Error('LOVABLE_API_KEY is not configured');
        }

        // For DOCX files, use a simpler approach - send to Gemini directly with the file
        // Gemini 2.5 Flash can handle document content natively
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
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Extract ALL text content from this document. Return ONLY the raw text content, preserving the structure and formatting as much as possible. This is a business document about buyer fit criteria.`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64}`
                    }
                  }
                ]
              }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI parsing error for ${doc.name}:`, response.status, errorText);
          continue;
        }

        const aiData = await response.json();
        const extractedText = aiData.choices?.[0]?.message?.content || '';
        
        if (extractedText) {
          console.log(`Extracted ${extractedText.length} chars from ${doc.name}`);
          documentContents.push(`=== Document: ${doc.name} ===\n\n${extractedText}`);
        }
      } catch (parseError) {
        console.error(`Error parsing ${doc.name}:`, parseError);
      }
    }

    if (documentContents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not extract content from any documents' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine all document contents
    const combinedContent = documentContents.join('\n\n---\n\n');
    console.log(`Combined document content: ${combinedContent.length} chars`);

    // Also include any existing manually-entered fit criteria
    let existingCriteria = '';
    if (tracker.fit_criteria) {
      existingCriteria = `\n\n=== Existing Manual Fit Criteria ===\n${tracker.fit_criteria}`;
    }
    if (tracker.fit_criteria_size || tracker.fit_criteria_service || tracker.fit_criteria_geography || tracker.fit_criteria_buyer_types) {
      existingCriteria += `\n\nSize: ${tracker.fit_criteria_size || ''}\nService: ${tracker.fit_criteria_service || ''}\nGeography: ${tracker.fit_criteria_geography || ''}\nBuyer Types: ${tracker.fit_criteria_buyer_types || ''}`;
    }

    const fullContent = combinedContent + existingCriteria;

    // Now send to AI to extract structured buyer fit criteria
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Sending to AI for structured extraction...');

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
            content: `You are an expert M&A analyst who extracts buyer fit criteria from business documents. Your job is to extract EVERY distinct buyer segment/type mentioned.

CRITICAL INSTRUCTIONS:
1. Identify ALL buyer types/segments mentioned - there may be 2-6+ different buyer categories
2. Look for: "Large MSOs", "Regional MSOs", "PE Platform Seekers", "Small Local Buyers", "Strategic Buyers", etc.
3. Each buyer type has different requirements - extract the SPECIFIC thresholds for EACH type
4. Pay close attention to numbered lists, bullet points, or paragraph breaks that indicate different buyer categories
5. Extract geographic rules and deal requirements for each buyer type separately
6. Include priority ordering if mentioned

Look for these key data points:
- Revenue thresholds, EBITDA ranges, multiples
- Location counts, square footage requirements
- Geographic coverage and footprint requirements
- Service/product mix requirements (OEM certifications, DRP programs, etc.)
- Buyer type classifications and their specific requirements
- Deal structure preferences (single vs multi-location, platform vs add-on)`
          },
          {
            role: 'user',
            content: `Analyze these business documents and extract ALL buyer fit criteria. Focus on finding distinct buyer types/segments and their specific requirements:\n\n${fullContent}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_fit_criteria',
              description: 'Extract structured fit criteria from documents',
              parameters: {
                type: 'object',
                properties: {
                  size_criteria: {
                    type: 'object',
                    properties: {
                      min_revenue: { type: 'string' },
                      max_revenue: { type: 'string' },
                      min_ebitda: { type: 'string' },
                      max_ebitda: { type: 'string' },
                      employee_count: { type: 'string' },
                      location_count: { type: 'string' },
                      sqft_requirements: { type: 'string' },
                      other: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  service_criteria: {
                    type: 'object',
                    properties: {
                      required_services: { type: 'array', items: { type: 'string' } },
                      preferred_services: { type: 'array', items: { type: 'string' } },
                      excluded_services: { type: 'array', items: { type: 'string' } },
                      business_model: { type: 'string' },
                      customer_profile: { type: 'string' },
                      other: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  geography_criteria: {
                    type: 'object',
                    properties: {
                      required_regions: { type: 'array', items: { type: 'string' } },
                      preferred_regions: { type: 'array', items: { type: 'string' } },
                      excluded_regions: { type: 'array', items: { type: 'string' } },
                      coverage_type: { type: 'string' },
                      hq_requirements: { type: 'string' },
                      other: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  buyer_types_criteria: {
                    type: 'object',
                    properties: {
                      buyer_types: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type_name: { type: 'string' },
                            priority_order: { type: 'number' },
                            description: { type: 'string' },
                            ownership_profile: { type: 'string' },
                            min_locations: { type: 'string' },
                            max_locations: { type: 'string' },
                            min_revenue_per_location: { type: 'string' },
                            min_ebitda: { type: 'string' },
                            max_ebitda: { type: 'string' },
                            min_sqft_per_location: { type: 'string' },
                            geographic_scope: { type: 'string' },
                            geographic_rules: { type: 'string' },
                            deal_requirements: { type: 'string' },
                            acquisition_style: { type: 'string' },
                            exclusions: { type: 'string' },
                            fit_notes: { type: 'string' }
                          },
                          required: ['type_name', 'priority_order']
                        }
                      }
                    }
                  }
                },
                required: ['size_criteria', 'service_criteria', 'geography_criteria', 'buyer_types_criteria']
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
    console.log('Extracted criteria from documents');

    // Update the tracker with extracted criteria
    const { error: updateError } = await supabaseClient
      .from('industry_trackers')
      .update({
        size_criteria: extractedCriteria.size_criteria || {},
        service_criteria: extractedCriteria.service_criteria || {},
        geography_criteria: extractedCriteria.geography_criteria || {},
        buyer_types_criteria: extractedCriteria.buyer_types_criteria || {},
        documents_analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', tracker_id);

    if (updateError) {
      console.error('Failed to update tracker:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save extracted criteria' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        documents_processed: documentContents.length,
        size_criteria: extractedCriteria.size_criteria || {},
        service_criteria: extractedCriteria.service_criteria || {},
        geography_criteria: extractedCriteria.geography_criteria || {},
        buyer_types_criteria: extractedCriteria.buyer_types_criteria || {}
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-tracker-documents:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
