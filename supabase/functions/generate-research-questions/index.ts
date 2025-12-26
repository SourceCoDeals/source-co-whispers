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
    const { industryName } = await req.json();

    if (!industryName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Industry name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating research questions for industry: ${industryName}`);

    const systemPrompt = `You are an expert M&A research analyst specializing in lower middle market transactions. Your task is to generate 5-10 clarifying questions that would help create a comprehensive M&A industry guide.

These questions should help understand the INDUSTRY'S M&A landscape - NOT filter for specific deal preferences or what a buyer wants.

Focus on understanding:
- Industry structure and service verticals
- Typical business models and company sizes in this space
- Geographic and market dynamics
- Key operational metrics and value drivers
- Consolidation trends and active buyers/platforms
- Regulatory, certification, or licensing factors
- Technology and systems commonly used
- Labor and workforce dynamics
- Common expansion strategies

Return a JSON array of question objects with this structure:
{
  "id": "unique_id",
  "question": "The question text",
  "hint": "Optional hint or examples to help answer",
  "inputType": "text" or "textarea"
}

Use "textarea" for questions that might need longer, detailed answers.
Generate between 5-10 questions based on what's most relevant for this specific industry.`;

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
          { role: 'user', content: `Generate research questions for the "${industryName}" industry to help create a comprehensive M&A guide. Return ONLY the JSON array, no other text.` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `OpenAI API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON from the response
    let questions;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse questions JSON:', parseError, content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated ${questions.length} questions for ${industryName}`);

    return new Response(
      JSON.stringify({ success: true, questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-research-questions:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
