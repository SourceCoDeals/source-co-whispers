import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Condensed but comprehensive master prompt for system context
const MASTER_PROMPT = `You are an expert M&A research analyst specializing in lower middle market transactions. You have deep expertise in industry analysis, valuation, buyer matching, and deal structuring.

Your mission: Generate comprehensive, actionable M&A intelligence that helps match sellers with buyers by understanding what buyers want in each industry.

RESEARCH METHODOLOGY:
1. Define the industry precisely (NAICS code, scope, subsegments)
2. Map the ecosystem (customers, payers, suppliers, regulators)
3. Understand the economics (unit economics, margins, cost structure)
4. Identify what makes companies attractive (financial, operational, strategic factors)
5. Document deal-killers and red flags
6. Create buyer matching criteria

OUTPUT REQUIREMENTS:
- Be SPECIFIC with numbers, percentages, and benchmarks
- Use TABLES for KPIs, scorecards, and comparisons
- Include actual data where known (market size, multiples, thresholds)
- Name specific PE firms, consolidators, and platforms when relevant
- Provide actionable criteria, not generic advice

QUALITY STANDARDS:
- Every metric needs a benchmark (excellent/average/poor)
- Every statement about value impact needs quantification (+/- X%)
- Every buyer preference needs specific thresholds
- Use industry-specific terminology correctly`;

// Phase-specific prompts
const PHASE_PROMPTS = {
  phase1: {
    name: "Industry Fundamentals",
    instruction: `Generate PART 1: INDUSTRY FUNDAMENTALS for the specified industry.

Include these sections with DEEP, RESEARCHED content:

## 1. INDUSTRY DEFINITION & SCOPE
- NAICS Code (the actual 6-digit code)
- Official and common industry names
- What's included vs excluded
- Key subsegments with characteristics

## 2. INDUSTRY TERMINOLOGY & LANGUAGE
- Business types within the industry with examples
- Revenue and business model terms specific to this industry
- Key operational metrics (KPIs) with SPECIFIC BENCHMARKS
- Glossary table: Term | Definition | Why It Matters | Benchmark

## 3. BUSINESS MODELS & HOW COMPANIES MAKE MONEY
- Service delivery models (fixed location, mobile, hybrid)
- Revenue models (transaction, recurring, hybrid) with valuation impact
- Customer segment models (B2C, B2B, B2G)

## 4. INDUSTRY ECOSYSTEM & STAKEHOLDERS
- Customers and payers (if different)
- Suppliers & vendors with concentration risks
- Referral sources
- Regulators & compliance requirements

## 5. INDUSTRY ECONOMICS & UNIT ECONOMICS
- Revenue drivers with formulas
- Cost structure with SPECIFIC PERCENTAGES
- Unit economics framework with example
- Economies of scale opportunities

## 6. MARKET SEGMENTS & COMPETITIVE LANDSCAPE
- Consolidation status (early/mid/late with market share data)
- Barriers to entry
- Geographic considerations
- Active PE platforms in this space

USE TABLES. Be SPECIFIC with numbers. Target: 10,000+ words.`
  },
  
  phase2: {
    name: "Acquisition Attractiveness",
    instruction: `Generate PART 2: ACQUISITION ATTRACTIVENESS for the specified industry.

Include these sections with DEEP, RESEARCHED content:

## 7. FINANCIAL ATTRACTIVENESS
- EBITDA size categories with SPECIFIC thresholds
  - Minimum EBITDA for PE interest
  - Sweet spot for add-on acquisitions
  - Multiples at each size tier
- EBITDA margin benchmarks table (top quartile, median, bottom quartile)
- Revenue concentration risk thresholds
- Growth rate expectations vs industry
- Quality of earnings standards

## 8. OPERATIONAL ATTRACTIVENESS
- TOP 5-7 KPIs with BENCHMARK TABLE:
  | KPI | Excellent | Average | Poor | Why It Matters |
- Operational value drivers (systems, tech, management, brand)
- Operational red flags (owner dependency, turnover, capacity)

## 9. STRATEGIC ATTRACTIVENESS
- Geographic factors and high-value markets
- Competitive advantages/moats specific to this industry
- Key certifications and licenses that add value
- Clustering premium opportunities

## 10. DEAL KILLERS & RED FLAGS
- Financial red flags with specific thresholds
- Operational red flags
- Legal/regulatory red flags
- Market/strategic red flags
- Deal Killer Checklist for this industry

USE TABLES. Be SPECIFIC with thresholds. Target: 12,000+ words.`
  },
  
  phase3: {
    name: "Application & Buyer Fit",
    instruction: `Generate PART 3: APPLICATION & BUYER FIT CRITERIA for the specified industry.

Include these sections:

## 11. SELLER EVALUATION FRAMEWORK
Create COMPLETE SCORING TEMPLATES:

### Financial Assessment Scorecard
| Metric | Excellent (5) | Good (4) | Average (3) | Below Avg (2) | Poor (1) |
|--------|---------------|----------|-------------|---------------|----------|
| EBITDA Size | [threshold] | ... | ... | ... | [threshold] |
| EBITDA Margin | [%] | [%] | [%] | [%] | [%] |
| Revenue Growth | [%] | [%] | [%] | [%] | [%] |
| Concentration | [%] | [%] | [%] | [%] | [%] |

### Operational Assessment Scorecard (all 5-7 KPIs)
### Strategic Assessment Scorecard

## 12. BUYER MATCHING CRITERIA

### SIZE CRITERIA
- Minimum revenue: $[X]M
- Minimum EBITDA: $[X]M
- Preferred EBITDA range: $[X]M - $[X]M
- Location count preferences
- Employee count preferences

### SERVICE CRITERIA
- Required service lines
- Preferred specializations
- Service exclusions
- Revenue mix preferences

### GEOGRAPHY CRITERIA
- Target regions for PE activity
- High-priority markets
- Markets to avoid

### BUYER TYPES
- PE platform profiles (name specific active firms)
- Strategic buyer profiles
- Recent notable transactions

## 13. VALUATION BENCHMARKS
- Multiple ranges by quality tier
- Premium and discount factors
- Deal structure norms

## 14. EXAMPLE SELLER EVALUATION
Complete example with scoring

## BUYER FIT CRITERIA SUMMARY
Consolidated summary of all criteria:
- SIZE CRITERIA: [requirements]
- SERVICE CRITERIA: [requirements]
- GEOGRAPHY CRITERIA: [requirements]
- BUYER TYPES: [buyer profiles]

Target: 10,000+ words.`
  }
};

// Quality validation function
interface QualityResult {
  passed: boolean;
  score: number;
  wordCount: number;
  sectionsFound: string[];
  missingElements: string[];
  tableCount: number;
  issues: string[];
}

function validateQuality(content: string): QualityResult {
  const wordCount = content.split(/\s+/).length;
  const tableCount = (content.match(/\|.*\|/g) || []).length / 3; // Rough table row estimate
  
  const requiredElements = [
    "NAICS",
    "EBITDA",
    "KPI",
    "VALUATION",
    "SIZE CRITERIA",
    "SERVICE CRITERIA",
    "GEOGRAPHY CRITERIA",
    "BUYER TYPES"
  ];
  
  const sectionsToCheck = [
    "INDUSTRY DEFINITION",
    "TERMINOLOGY",
    "BUSINESS MODEL",
    "ECOSYSTEM",
    "ECONOMICS",
    "CONSOLIDATION",
    "FINANCIAL ATTRACTIVENESS",
    "OPERATIONAL ATTRACTIVENESS",
    "STRATEGIC ATTRACTIVENESS",
    "DEAL KILLER",
    "RED FLAG",
    "EVALUATION",
    "SCORECARD",
    "BUYER MATCHING",
    "MULTIPLE"
  ];
  
  const contentUpper = content.toUpperCase();
  const sectionsFound = sectionsToCheck.filter(s => contentUpper.includes(s));
  const missingElements = requiredElements.filter(e => !contentUpper.includes(e));
  
  const issues: string[] = [];
  
  if (wordCount < 25000) {
    issues.push(`Word count (${wordCount}) below target (25,000)`);
  }
  if (tableCount < 5) {
    issues.push(`Table count (${Math.round(tableCount)}) below target (5)`);
  }
  if (sectionsFound.length < 10) {
    issues.push(`Only ${sectionsFound.length}/15 key sections found`);
  }
  if (missingElements.length > 0) {
    issues.push(`Missing required elements: ${missingElements.join(", ")}`);
  }
  
  // Calculate score (0-100)
  let score = 0;
  score += Math.min(40, (wordCount / 35000) * 40); // Up to 40 points for word count
  score += Math.min(20, (sectionsFound.length / 15) * 20); // Up to 20 points for sections
  score += Math.min(20, (tableCount / 8) * 20); // Up to 20 points for tables
  score += Math.min(20, ((requiredElements.length - missingElements.length) / requiredElements.length) * 20);
  
  return {
    passed: score >= 70 && missingElements.length <= 2,
    score: Math.round(score),
    wordCount,
    sectionsFound,
    missingElements,
    tableCount: Math.round(tableCount),
    issues
  };
}

// Gap fill function - generates missing content
async function fillGaps(
  content: string, 
  missingElements: string[],
  industryName: string
): Promise<string> {
  if (missingElements.length === 0) return "";
  
  const gapPrompt = `The M&A guide for "${industryName}" is missing the following required elements: ${missingElements.join(", ")}.

Generate ONLY the missing sections with the same depth and quality as the rest of the guide. Include specific benchmarks, tables, and actionable criteria.

Missing elements to generate:
${missingElements.map(e => `- ${e}: Provide complete, detailed content`).join("\n")}

Be specific with numbers, use tables, and ensure this content integrates with an existing M&A guide.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: MASTER_PROMPT },
        { role: 'user', content: gapPrompt }
      ],
      max_tokens: 8000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    console.error('Gap fill API error:', response.status);
    return "";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Extract buyer fit criteria from content
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
  const summaryMatch = content.match(/BUYER FIT CRITERIA SUMMARY([\s\S]*?)(?:---|\n##|\n#\s|$)/i);
  if (summaryMatch) {
    const summaryText = summaryMatch[1];

    const sizeMatch = summaryText.match(/SIZE CRITERIA:?\s*([\s\S]*?)(?:SERVICE CRITERIA|GEOGRAPHY CRITERIA|BUYER TYPES|$)/i);
    if (sizeMatch) {
      criteria.sizeCriteria = sizeMatch[1].trim().replace(/^[-*•]\s*/gm, '').substring(0, 2000);
    }

    const serviceMatch = summaryText.match(/SERVICE CRITERIA:?\s*([\s\S]*?)(?:SIZE CRITERIA|GEOGRAPHY CRITERIA|BUYER TYPES|$)/i);
    if (serviceMatch) {
      criteria.serviceCriteria = serviceMatch[1].trim().replace(/^[-*•]\s*/gm, '').substring(0, 2000);
    }

    const geoMatch = summaryText.match(/GEOGRAPHY CRITERIA:?\s*([\s\S]*?)(?:SIZE CRITERIA|SERVICE CRITERIA|BUYER TYPES|$)/i);
    if (geoMatch) {
      criteria.geographyCriteria = geoMatch[1].trim().replace(/^[-*•]\s*/gm, '').substring(0, 2000);
    }

    const buyerMatch = summaryText.match(/BUYER TYPES:?\s*([\s\S]*?)(?:SIZE CRITERIA|SERVICE CRITERIA|GEOGRAPHY CRITERIA|$)/i);
    if (buyerMatch) {
      criteria.buyerTypesCriteria = buyerMatch[1].trim().replace(/^[-*•]\s*/gm, '').substring(0, 2000);
    }
  }

  // Fallback: try to extract from individual sections
  if (!criteria.sizeCriteria) {
    const sizeMatch = content.match(/##\s*(?:12\.\s*)?.*SIZE CRITERIA([\s\S]*?)(?:\n##|\n###\s*SERVICE|$)/i);
    if (sizeMatch) {
      criteria.sizeCriteria = sizeMatch[1].trim().substring(0, 2000);
    }
  }

  if (!criteria.serviceCriteria) {
    const serviceMatch = content.match(/###\s*SERVICE CRITERIA([\s\S]*?)(?:\n###|\n##|$)/i);
    if (serviceMatch) {
      criteria.serviceCriteria = serviceMatch[1].trim().substring(0, 2000);
    }
  }

  if (!criteria.geographyCriteria) {
    const geoMatch = content.match(/###\s*GEOGRAPHY CRITERIA([\s\S]*?)(?:\n###|\n##|$)/i);
    if (geoMatch) {
      criteria.geographyCriteria = geoMatch[1].trim().substring(0, 2000);
    }
  }

  if (!criteria.buyerTypesCriteria) {
    const buyerMatch = content.match(/###\s*BUYER TYPES([\s\S]*?)(?:\n###|\n##|$)/i);
    if (buyerMatch) {
      criteria.buyerTypesCriteria = buyerMatch[1].trim().substring(0, 2000);
    }
  }

  return criteria;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industryName } = await req.json();

    if (!industryName) {
      return new Response(
        JSON.stringify({ error: 'Industry name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting multi-phase M&A guide generation for: ${industryName}`);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        let fullContent = "";
        const phases = ['phase1', 'phase2', 'phase3'] as const;
        
        try {
          // Generate each phase sequentially
          for (let i = 0; i < phases.length; i++) {
            const phaseKey = phases[i];
            const phase = PHASE_PROMPTS[phaseKey];
            const phaseNum = i + 1;
            
            console.log(`Starting Phase ${phaseNum}: ${phase.name}`);
            
            sendEvent({
              type: 'phase_start',
              phase: phaseNum,
              totalPhases: 3,
              phaseName: phase.name
            });

            const userPrompt = `Generate a comprehensive M&A guide for the "${industryName}" industry.

${phase.instruction}

Remember: Be SPECIFIC with numbers, use TABLES, include BENCHMARKS. This is for professional M&A advisors.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                  { role: 'system', content: MASTER_PROMPT },
                  { role: 'user', content: userPrompt }
                ],
                stream: true,
                max_tokens: 16000,
                temperature: 0.7,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Phase ${phaseNum} API error:`, response.status, errorText);
              sendEvent({ type: 'error', message: `Phase ${phaseNum} failed: ${response.status}` });
              continue;
            }

            const reader = response.body?.getReader();
            if (!reader) {
              sendEvent({ type: 'error', message: `Phase ${phaseNum}: No response body` });
              continue;
            }

            const decoder = new TextDecoder();
            let buffer = "";
            let phaseContent = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              
              let newlineIndex: number;
              while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                let line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (!line.startsWith("data: ")) continue;

                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    phaseContent += content;
                    fullContent += content;
                    
                    // Calculate progress within this phase
                    const phaseProgress = Math.min(100, (phaseContent.length / 40000) * 100);
                    const overallProgress = ((i * 100) + phaseProgress) / 3;
                    
                    sendEvent({
                      type: 'content',
                      content,
                      phase: phaseNum,
                      phaseName: phase.name,
                      phaseProgress: Math.round(phaseProgress),
                      overallProgress: Math.round(overallProgress)
                    });
                  }
                } catch {
                  // Incomplete JSON, continue
                }
              }
            }

            console.log(`Phase ${phaseNum} complete: ${phaseContent.length} characters`);
            
            sendEvent({
              type: 'phase_complete',
              phase: phaseNum,
              phaseName: phase.name,
              phaseWordCount: phaseContent.split(/\s+/).length
            });

            // Add separator between phases
            if (i < phases.length - 1) {
              fullContent += "\n\n---\n\n";
            }
          }

          // Quality check
          console.log("Running quality validation...");
          sendEvent({ type: 'quality_check_start' });
          
          const qualityResult = validateQuality(fullContent);
          
          sendEvent({
            type: 'quality_check_result',
            ...qualityResult
          });

          console.log(`Quality check: score=${qualityResult.score}, passed=${qualityResult.passed}, issues=${qualityResult.issues.length}`);

          // Gap filling if needed
          if (qualityResult.missingElements.length > 0 && qualityResult.missingElements.length <= 4) {
            console.log(`Filling gaps for: ${qualityResult.missingElements.join(", ")}`);
            sendEvent({ 
              type: 'gap_fill_start',
              missingElements: qualityResult.missingElements 
            });

            const gapContent = await fillGaps(fullContent, qualityResult.missingElements, industryName);
            
            if (gapContent) {
              fullContent += "\n\n---\n\n## ADDITIONAL CONTENT\n\n" + gapContent;
              
              sendEvent({
                type: 'gap_fill_content',
                content: gapContent
              });

              // Re-validate
              const finalQuality = validateQuality(fullContent);
              sendEvent({
                type: 'final_quality',
                ...finalQuality
              });
            }

            sendEvent({ type: 'gap_fill_complete' });
          }

          // Extract criteria
          const criteria = extractCriteria(fullContent);
          sendEvent({ type: 'criteria', criteria });

          // Complete
          const finalWordCount = fullContent.split(/\s+/).length;
          console.log(`Generation complete: ${finalWordCount} words, ${fullContent.length} characters`);
          
          sendEvent({
            type: 'complete',
            wordCount: finalWordCount,
            characterCount: fullContent.length
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
        } catch (error) {
          console.error('Stream error:', error);
          sendEvent({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
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
