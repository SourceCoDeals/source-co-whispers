import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MASTER_PROMPT = `You are an expert M&A research analyst specializing in lower middle market transactions. Generate a comprehensive M&A industry guide with the following sections:

## SECTION I: INDUSTRY OVERVIEW
- Market size and growth trends
- Industry definition and scope
- Key market segments
- Recent industry developments

## SECTION II: BUYER LANDSCAPE
- Active PE platforms in this space (name specific firms if known)
- Strategic buyers and consolidators
- Buyer archetypes (platform seekers, add-on hunters, strategic acquirers)
- Notable recent transactions

## SECTION III: VALUATION BENCHMARKS
- Typical EBITDA multiples range
- Revenue multiple ranges
- Size brackets and corresponding valuations
- Premium factors (geography, customer concentration, growth rate)

## SECTION IV: DEAL STRUCTURE PATTERNS
- Typical deal structures
- Earnout prevalence and terms
- Seller note expectations
- Rollover equity norms

## SECTION V: OPERATIONAL METRICS
- Key performance indicators buyers evaluate
- Industry-specific metrics
- Benchmark ranges for attractive targets
- Red flags and deal-breakers

## SECTION VI: GEOGRAPHIC DYNAMICS
- Regional market differences
- Geographic premium/discount factors
- Expansion patterns
- Weather/seasonal considerations if applicable

## SECTION VII: SERVICE/PRODUCT MIX
- Core service lines or product categories
- High-value vs commodity offerings
- Cross-sell opportunities
- Service mix that commands premium

## SECTION VIII: CUSTOMER PROFILE
- Target customer segments
- Customer concentration thresholds
- Contract structures
- Revenue quality factors

## SECTION IX: TECHNOLOGY & SYSTEMS
- Standard operating systems
- Technology differentiation opportunities
- Automation and efficiency tools
- Tech stack expectations

## SECTION X: WORKFORCE DYNAMICS
- Key roles and positions
- Labor market conditions
- Certification/licensing requirements
- Management team expectations

## SECTION XI: GROWTH STRATEGIES
- Organic growth levers
- M&A integration playbooks
- Geographic expansion patterns
- Service line expansion

## SECTION XII: REGULATORY ENVIRONMENT
- Key regulations
- Licensing requirements
- Compliance considerations
- Insurance requirements

## SECTION XIII: RISK FACTORS
- Industry-specific risks
- Customer concentration risks
- Competitive threats
- Economic sensitivity

## SECTION XIV: INVESTMENT THESIS PATTERNS
- Common investment theses
- Value creation levers
- Platform build strategies
- Exit timing and strategies

## SECTION XV: BUYER FIT CRITERIA SUMMARY
Based on the analysis above, provide structured buyer fit criteria:
- SIZE CRITERIA: Revenue and EBITDA ranges, location counts, employee counts
- SERVICE CRITERIA: Required services, preferred specializations, exclusions
- GEOGRAPHY CRITERIA: Target regions, expansion priorities, geographic considerations
- BUYER TYPES: PE platform profiles, strategic buyer profiles, ideal buyer characteristics

Be specific, data-driven where possible, and practical. This guide will be used to match deals with appropriate buyers.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industryName, qaResponses } = await req.json();

    if (!industryName) {
      return new Response(
        JSON.stringify({ error: 'Industry name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating M&A guide for: ${industryName}`);

    // Build context from Q&A responses
    let qaContext = "";
    if (qaResponses && Object.keys(qaResponses).length > 0) {
      qaContext = "\n\n## INDUSTRY CONTEXT FROM USER:\n";
      for (const [questionId, answer] of Object.entries(qaResponses)) {
        if (answer && typeof answer === 'string' && answer.trim()) {
          qaContext += `- ${answer}\n`;
        }
      }
    }

    const userPrompt = `Generate a comprehensive M&A guide for the "${industryName}" industry.${qaContext}

Focus on practical, actionable intelligence for matching deals with buyers in this space. Be specific about valuation ranges, buyer types, and fit criteria.`;

    // Start streaming response
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MASTER_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a TransformStream to process the OpenAI stream and add progress events
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let fullContent = "";
    let currentSection = "";
    const sectionHeaders = [
      "SECTION I", "SECTION II", "SECTION III", "SECTION IV", "SECTION V",
      "SECTION VI", "SECTION VII", "SECTION VIII", "SECTION IX", "SECTION X",
      "SECTION XI", "SECTION XII", "SECTION XIII", "SECTION XIV", "SECTION XV"
    ];

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            // Extract criteria from the final content
            const criteria = extractCriteria(fullContent);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'criteria', criteria })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            continue;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            
            if (content) {
              fullContent += content;
              
              // Check for section headers to update progress
              for (let i = 0; i < sectionHeaders.length; i++) {
                if (content.includes(sectionHeaders[i]) || fullContent.slice(-100).includes(sectionHeaders[i])) {
                  currentSection = sectionHeaders[i];
                  const progress = ((i + 1) / sectionHeaders.length) * 100;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'progress', 
                    progress: Math.round(progress),
                    section: currentSection 
                  })}\n\n`));
                  break;
                }
              }
              
              // Forward the content
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`));
            }
          } catch {
            // Not valid JSON, skip
          }
        }
      }
    });

    // Pipe the OpenAI response through our transform
    const transformedStream = response.body?.pipeThrough(transformStream);

    return new Response(transformedStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-ma-guide:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractCriteria(content: string): {
  sizeCriteria?: string;
  serviceCriteria?: string;
  geographyCriteria?: string;
  buyerTypesCriteria?: string;
} {
  const criteria: {
    sizeCriteria?: string;
    serviceCriteria?: string;
    geographyCriteria?: string;
    buyerTypesCriteria?: string;
  } = {};

  // Look for the BUYER FIT CRITERIA SUMMARY section
  const summaryMatch = content.match(/SECTION XV:?\s*BUYER FIT CRITERIA SUMMARY([\s\S]*?)(?:$|##)/i);
  if (summaryMatch) {
    const summaryText = summaryMatch[1];

    // Extract size criteria
    const sizeMatch = summaryText.match(/SIZE CRITERIA:?\s*([\s\S]*?)(?:SERVICE CRITERIA|GEOGRAPHY CRITERIA|BUYER TYPES|$)/i);
    if (sizeMatch) {
      criteria.sizeCriteria = sizeMatch[1].trim().replace(/^[-*•]\s*/gm, '').trim();
    }

    // Extract service criteria
    const serviceMatch = summaryText.match(/SERVICE CRITERIA:?\s*([\s\S]*?)(?:SIZE CRITERIA|GEOGRAPHY CRITERIA|BUYER TYPES|$)/i);
    if (serviceMatch) {
      criteria.serviceCriteria = serviceMatch[1].trim().replace(/^[-*•]\s*/gm, '').trim();
    }

    // Extract geography criteria
    const geoMatch = summaryText.match(/GEOGRAPHY CRITERIA:?\s*([\s\S]*?)(?:SIZE CRITERIA|SERVICE CRITERIA|BUYER TYPES|$)/i);
    if (geoMatch) {
      criteria.geographyCriteria = geoMatch[1].trim().replace(/^[-*•]\s*/gm, '').trim();
    }

    // Extract buyer types
    const buyerMatch = summaryText.match(/BUYER TYPES:?\s*([\s\S]*?)(?:SIZE CRITERIA|SERVICE CRITERIA|GEOGRAPHY CRITERIA|$)/i);
    if (buyerMatch) {
      criteria.buyerTypesCriteria = buyerMatch[1].trim().replace(/^[-*•]\s*/gm, '').trim();
    }
  }

  return criteria;
}
