import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      instruction, 
      currentCriteria 
    } = await req.json();

    if (!instruction) {
      return new Response(
        JSON.stringify({ success: false, error: "No instruction provided" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[update-fit-criteria-chat] Instruction:', instruction);
    console.log('[update-fit-criteria-chat] Current criteria:', JSON.stringify(currentCriteria, null, 2));

    const systemPrompt = `You are an M&A buyer fit criteria editor. Your job is to take the user's natural language instruction and update the existing buyer fit criteria accordingly.

IMPORTANT RULES:
1. Only modify what the user explicitly asks to change
2. Preserve all other existing criteria exactly as they are
3. Return the COMPLETE updated criteria (not just the changes)
4. Use the same format and structure as the input
5. Be precise with numbers and thresholds

The criteria has 4 sections:
- size_criteria: Revenue thresholds, EBITDA ranges, location counts, sq ft requirements
- service_criteria: Required/preferred services, excluded services, business model
- geography_criteria: Target regions, excluded areas, HQ requirements
- buyer_types_criteria: Different buyer categories with their specific requirements (e.g., Large MSOs, Regional Players, Independent Sponsors)

BUYER TYPES FORMAT:
When updating buyer types, maintain this structure:
"Priority 1: [Type Name]
  Description: [What this buyer type is]
  Locations: [min]+ or [min] - [max]
  Revenue/Location: $[amount]
  Min EBITDA: $[amount]
  Geography: [requirements]
  Deal Requirements: [requirements]

Priority 2: [Next Type]..."

Respond with a JSON object containing the updated criteria in this exact format:
{
  "size_criteria": "updated size criteria text",
  "service_criteria": "updated service criteria text", 
  "geography_criteria": "updated geography criteria text",
  "buyer_types_criteria": "updated buyer types criteria text",
  "changes_summary": "Brief description of what was changed"
}`;

    const userMessage = `CURRENT CRITERIA:

Size Criteria:
${currentCriteria.size || "(empty)"}

Service/Product Criteria:
${currentCriteria.service || "(empty)"}

Geography Criteria:
${currentCriteria.geography || "(empty)"}

Buyer Types:
${currentCriteria.buyerTypes || "(empty)"}

---

USER INSTRUCTION: "${instruction}"

Update the criteria according to the instruction and return the complete updated criteria as JSON.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[update-fit-criteria-chat] OpenAI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `AI request failed: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[update-fit-criteria-chat] AI response:', content);

    const parsed = JSON.parse(content);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedCriteria: {
          size: parsed.size_criteria || currentCriteria.size || "",
          service: parsed.service_criteria || currentCriteria.service || "",
          geography: parsed.geography_criteria || currentCriteria.geography || "",
          buyerTypes: parsed.buyer_types_criteria || currentCriteria.buyerTypes || ""
        },
        changesSummary: parsed.changes_summary || "Criteria updated"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[update-fit-criteria-chat] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
