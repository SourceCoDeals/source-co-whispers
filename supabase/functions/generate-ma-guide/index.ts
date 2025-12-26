import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt that forces detailed execution
const SYSTEM_PROMPT = `You are an M&A industry research expert creating a comprehensive buyer intelligence guide.

CRITICAL REQUIREMENTS:
1. You must provide REAL, SPECIFIC data - never use placeholders like "X%", "$XM", or "[Value]"
2. Every section must have multiple detailed data tables with actual numbers
3. You are writing for professional M&A advisors who need actionable intelligence
4. Minimum content requirements are strictly enforced - write EXTENSIVELY
5. Include specific company names, transaction examples, and market data where possible

OUTPUT QUALITY STANDARDS:
- Every KPI must have specific benchmark numbers with quartile breakdowns
- Every table must have at least 5-7 rows of real data
- Include named PE firms, platforms, and strategic buyers active in the industry
- Provide specific geographic market analysis with named metros
- Reference actual NAICS codes with exact 6-digit numbers

You will be penalized for:
- Using placeholder values (X%, $XM, [Value], etc.)
- Being generic instead of industry-specific  
- Short sections that lack detail
- Missing tables or benchmarks
- Vague recommendations without specific criteria`;

// Enhanced phase prompts with word count enforcement
const PHASE_PROMPTS = {
  phase1: {
    name: "Industry Fundamentals",
    minWords: 8000,
    instruction: `CREATE COMPREHENSIVE INDUSTRY FUNDAMENTALS GUIDE

You MUST write AT LEAST 8,000 words for this section. This is a strict minimum requirement.

REQUIRED SECTIONS (complete all with extensive detail):

## 1. INDUSTRY DEFINITION & SCOPE
- **NAICS Code**: Provide the actual 6-digit NAICS code(s)
- **Industry Size**: Total US market size in dollars, number of businesses, employment
- **Growth Rate**: Historical and projected CAGR with specific percentages
- **Included vs Excluded Services**: Comprehensive list of what's in/out of scope

CREATE TABLE: Market Segmentation
| Segment | % of Market | Avg Revenue | EBITDA Margin | PE Activity |
(Include 6-8 segments with real data)

## 2. TERMINOLOGY & JARGON GLOSSARY
CREATE TABLE: 30+ Industry Terms
| Term | Definition | M&A Significance | Typical Benchmark |
(Must include: revenue metrics, operational KPIs, customer types, regulatory terms, technology terms, service categories)

## 3. BUSINESS MODELS IN DEPTH
For each business model, provide:
- Revenue structure and pricing norms
- Cost structure breakdown
- Typical margins
- Scalability characteristics
- Buyer preferences

CREATE TABLE: Business Model Comparison
| Model Type | Description | Revenue/Unit | Gross Margin | EBITDA Margin | Scalability | PE Interest |
(Include 4-6 models)

CREATE TABLE: Revenue Model Impact on Valuation
| Revenue Type | % of Businesses | Predictability | Multiple Premium/Discount |
(Recurring, Repeat, Project-based, etc.)

## 4. INDUSTRY ECOSYSTEM MAP
Detail every stakeholder:
- **Customers**: Demographics, buying behavior, lifetime value
- **Payers**: If different from customers (insurance, B2B, government)
- **Suppliers**: Categories, concentration risks, switching costs
- **Referral Sources**: Who drives business
- **Regulators**: Licensing bodies, compliance requirements
- **Technology Vendors**: Key software/equipment providers

CREATE TABLE: Supplier Concentration Risk Matrix
| Concentration Level | Risk Rating | Multiple Impact | Mitigation |

CREATE TABLE: Regulatory Requirements
| Requirement | Type | Cost | Renewal | Risk of Non-Compliance |

## 5. INDUSTRY ECONOMICS DEEP DIVE

CREATE TABLE: Detailed Cost Structure
| Category | % of Revenue (Low) | % of Revenue (Median) | % of Revenue (High) | Notes |
(Include: COGS, Labor, Occupancy, Equipment, Marketing, Insurance, G&A, Owner Comp, EBITDA)

CREATE TABLE: Unit Economics Example
| Metric | Value | Calculation |
(Build out complete unit economics for typical transaction)

CREATE TABLE: Scale Economics Curve
| Revenue Level | EBITDA % | G&A % | Owner Draw | Management Layer |
($0-500K, $500K-1M, $1-2M, $2-5M, $5-10M, $10M+)

CREATE TABLE: Seasonality Impact (if applicable)
| Month | % of Annual Revenue | Capacity Utilization |

## 6. COMPETITIVE LANDSCAPE & CONSOLIDATION

Provide comprehensive analysis of:
- Market fragmentation level
- Top 10 player market share
- Number of PE-backed platforms
- Recent platform formation activity
- Strategic buyer activity

CREATE TABLE: Active Acquirers in This Industry
| Buyer Name | Type | PE Sponsor (if any) | Target Size | Geographic Focus | Est. Acquisitions |
(List 10-15 known active buyers)

CREATE TABLE: Recent Notable Transactions
| Date | Acquirer | Target | Revenue | EBITDA | Multiple | Deal Type |
(List 5-10 recent deals if known)

CREATE TABLE: Barriers to Entry Analysis
| Barrier Type | Strength | Description | Defensibility |

REMEMBER: You must write AT LEAST 8,000 words. Be thorough and specific.`
  },

  phase2: {
    name: "Acquisition Attractiveness Factors",
    minWords: 8000,
    instruction: `CREATE COMPREHENSIVE ACQUISITION ATTRACTIVENESS GUIDE

You MUST write AT LEAST 8,000 words for this section. This is a strict minimum requirement.

REQUIRED SECTIONS:

## 7. FINANCIAL ATTRACTIVENESS DEEP DIVE

CREATE TABLE: EBITDA Size & Buyer Type Matrix
| EBITDA Range | Primary Buyer Type | Typical Multiple | Deal Structure | Competition Level | Notes |
(<$250K, $250-500K, $500K-1M, $1-2M, $2-3M, $3-5M, $5-10M, $10M+)

CREATE TABLE: EBITDA Margin Benchmarks
| Percentile | EBITDA Margin | What It Signals | Multiple Impact |
(Top 5%, Top 10%, Top Quartile, Median, Bottom Quartile, Bottom 10%)

CREATE TABLE: Revenue Quality Analysis
| Characteristic | Premium | Baseline | Discount |
(Recurring %, Growth rate, Concentration, Predictability)

CREATE TABLE: Customer Concentration Impact
| Top Customer % | Risk Level | Multiple Impact | Buyer Response |
(0-5%, 5-10%, 10-15%, 15-20%, 20-30%, 30-40%, 40-50%, 50%+)

CREATE TABLE: Financial Health Indicators
| Metric | Excellent | Good | Acceptable | Concerning | Deal Killer |

## 8. OPERATIONAL ATTRACTIVENESS

CREATE TABLE: Top 10 Industry-Specific KPIs
| KPI | Definition | Top 10% | Top Quartile | Median | Bottom Quartile | Weight in Scoring |
(Include industry-specific metrics like revenue per tech, utilization rate, etc.)

CREATE TABLE: Management & Team Assessment
| Factor | Premium (5) | Strong (4) | Adequate (3) | Weak (2) | Concerning (1) |
(Management depth, Key person dependency, Tenure, Training programs)

CREATE TABLE: Technology & Systems Maturity
| Area | Modern/Best Practice | Current | Dated | Legacy | Paper-Based |
(CRM, ERP, Scheduling, Marketing, Financial, Operations)

CREATE TABLE: Owner Dependency Assessment
| Owner Hours/Week | Critical Functions Held | Risk Level | Value Impact | Transition Needs |

CREATE TABLE: Workforce Analysis
| Metric | Excellent | Good | Average | Below Avg | Poor |
(Turnover, Tenure, Licensing, Training, Compensation vs market)

## 9. STRATEGIC ATTRACTIVENESS

CREATE TABLE: Geographic Market Value
| Market Tier | Characteristics | Population | Growth | PE Interest | Multiple Premium |
(Tier 1, 2, 3, 4 markets with specific criteria)

CREATE TABLE: High-Value Markets for This Industry
| Metro/Region | Population | Growth Rate | Why Attractive | Active Buyers |
(List 10-15 specific metros)

CREATE TABLE: Markets to Avoid
| Market Type | Characteristics | Why Unattractive | Discount |

CREATE TABLE: Competitive Moat Assessment
| Moat Type | Example in Industry | Sustainability | Value Impact |
(Licenses, Relationships, Contracts, Brand, Scale, Geographic density)

CREATE TABLE: Certification & Credential Value
| Certification/License | Required? | Cost to Obtain | Time Required | Value Impact |
(List all relevant industry certifications)

## 10. DEAL KILLERS & RED FLAGS

CREATE TABLE: Absolute Deal Killers
| Issue | Threshold | Why It Kills Deals | Frequency |

CREATE TABLE: Financial Red Flags
| Issue | Yellow Flag | Red Flag | Deal Killer | Recovery Possible? |
(Revenue decline, Margin erosion, Concentration, Add-backs, AR issues)

CREATE TABLE: Operational Red Flags  
| Issue | Warning Signs | Impact | Remediation Time |
(Owner dependency, Turnover, Compliance, Technology, Reputation)

CREATE TABLE: Legal & Regulatory Red Flags
| Issue | How Identified | Impact | Mitigation |

REMEMBER: You must write AT LEAST 8,000 words. Be thorough with specific data.`
  },

  phase3: {
    name: "Buyer Matching & Valuation",
    minWords: 8000,
    instruction: `CREATE COMPREHENSIVE BUYER MATCHING & VALUATION GUIDE

You MUST write AT LEAST 8,000 words for this section. This is a strict minimum requirement.

REQUIRED SECTIONS:

## 11. SELLER EVALUATION SCORECARDS

CREATE TABLE: Financial Scorecard
| Metric | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 | Weight |
(EBITDA amount, EBITDA margin, Revenue growth, Concentration, Recurring %)
Include specific dollar/percentage thresholds for each score level.

CREATE TABLE: Operational Scorecard  
| Metric | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 | Weight |
(Use industry-specific KPIs identified earlier)

CREATE TABLE: Strategic Scorecard
| Factor | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 | Weight |
(Market quality, Competitive moats, Growth runway, Certifications)

CREATE TABLE: Score Interpretation
| Total Score Range | Rating | Buyer Interest Level | Expected Process |

## 12. BUYER MATCHING CRITERIA (CRITICAL SECTION)

This section is used to automatically match deals with buyers. Be extremely specific.

### SIZE CRITERIA
CREATE TABLE: Size Thresholds
| Metric | Minimum | Preferred Range | Optimal | Maximum | Notes |
| Revenue | $X.XM | $X.XM - $XXM | $XM - $XM | $XXM+ | Explanation |
| EBITDA | $XXXK | $XXXK - $X.XM | $XM - $XM | N/A | Explanation |
| Employees | XX | XX-XXX | XXX-XXX | N/A | Explanation |
| Locations | X | X-X | X-XX | N/A | Explanation |
| Years Operating | X | X+ | X+ | N/A | Explanation |

TEXT SUMMARY:
- Minimum revenue threshold: $X.XM (specific number)
- Preferred revenue range: $X.XM to $XXM
- Minimum EBITDA: $XXXK
- Preferred EBITDA: $XXXK to $X.XM
- Employee count preference: XX to XXX
- Location preference: X to XX

### SERVICE CRITERIA
CREATE TABLE: Service Type Prioritization
| Service Category | Priority Level | Explanation |
(List 10+ service types with Required/Preferred/Neutral/Avoid designations)

TEXT SUMMARY:
- Required services: [List specific services that must be offered]
- Preferred services: [List services that add value]
- Acceptable services: [List neutral services]
- Services to avoid: [List services that reduce attractiveness]
- Ideal service mix: XX% [Type A], XX% [Type B], XX% [Type C]
- Minimum recurring revenue: XX%

### GEOGRAPHY CRITERIA
CREATE TABLE: Priority Regions
| Region | Priority | Population Req | Why Attractive | Active Buyers |
(List specific regions/states with criteria)

CREATE TABLE: Target Metros
| Metro | State | Population | Growth | Priority | Notes |
(List 15-20 specific cities)

TEXT SUMMARY:
- Priority regions: [List top 5-7 regions/states]
- Priority metros: [List top 10 cities]
- Minimum market population: XXX,XXX
- Geographic density preference: [Single-market dense vs multi-market]
- Regions to avoid: [List with reasons]

### BUYER TYPES
CREATE TABLE: PE Platforms Active in Industry
| Platform Name | PE Sponsor | Strategy | Size Target (EBITDA) | Geography | Notes |
(List 10-20 actual or archetypal platforms)

CREATE TABLE: Strategic Buyer Profiles
| Buyer Type | What They Seek | Size Range | Typical Multiple | Integration Plan |

TEXT SUMMARY:
- Primary buyer type: [PE add-on / PE platform / Strategic / Individual]
- Active PE platforms: [List names or archetypes]
- Strategic buyer categories: [List types]
- Ideal buyer profile: [Describe the perfect buyer for deals in this industry]

## 13. VALUATION BENCHMARKS

CREATE TABLE: Multiple Ranges by Quality Tier
| Quality Tier | EBITDA Multiple Range | Revenue Multiple | Characteristics |
(Premium, Above Average, Average, Below Average, Distressed)

CREATE TABLE: Premium Factors & Impact
| Factor | Multiple Impact | Evidence Required | Stacking Rules |

CREATE TABLE: Discount Factors & Impact
| Factor | Multiple Impact | Mitigation Possible | Timeline |

CREATE TABLE: Deal Structure Norms
| Component | Typical % | Range | Negotiation Factors |
(Cash, Seller Note, Earnout, Equity Rollover)

CREATE TABLE: Working Capital Expectations
| WC Metric | Industry Norm | Peg Calculation |

## 14. COMPLETE EVALUATION EXAMPLE

Create a detailed example for a realistic company in this industry:

**SAMPLE COMPANY PROFILE:**
(Include 15+ specific data points)

**FINANCIAL SCORECARD WALKTHROUGH:**
(Score each metric with explanation)

**OPERATIONAL SCORECARD WALKTHROUGH:**
(Score each KPI with explanation)

**STRATEGIC SCORECARD WALKTHROUGH:**
(Score each factor with explanation)

**OVERALL ASSESSMENT:**
- Composite score: X.XX/5.00
- Rating: [Rating]
- Likely buyer types: [List]
- Expected multiple: X.X-X.Xx EBITDA
- Expected enterprise value: $X.XM - $X.XM
- Key value drivers: [List]
- Key value detractors: [List]
- Recommended positioning: [Strategy]

---

## BUYER FIT CRITERIA SUMMARY

This summary is used for automated buyer matching. Be extremely specific with numbers.

**SIZE CRITERIA:**
- Minimum revenue: $X.XM
- Preferred revenue range: $X.XM to $XXM  
- Optimal revenue: $XM to $XM
- Minimum EBITDA: $XXXK
- Preferred EBITDA: $XXXK to $X.XM
- Minimum employees: XX
- Preferred employees: XX to XXX
- Minimum locations: X
- Preferred locations: X to XX
- Minimum years in business: X years

**SERVICE CRITERIA:**
- Required services: [List 3-5 core services]
- Preferred services: [List 3-5 value-add services]
- Premium services: [List specialty services that command higher multiples]
- Services to avoid: [List 2-3 low-value or problematic services]
- Minimum recurring revenue: XX%
- Ideal service mix: XX% [Type], XX% [Type], XX% [Type]

**GEOGRAPHY CRITERIA:**
- Priority regions: [List top 5-7 states or regions]
- Priority metros: [List top 10-15 specific cities]
- Minimum market population: XXX,XXX
- Geographic preference: [Dense single-market OR regional multi-market]
- Regions to avoid: [List 2-3 with reasons]

**BUYER TYPES:**
- Primary buyer category: [PE Add-on / PE Platform / Strategic / Individual]
- Active PE platforms: [List 5-10 names or archetypes]  
- Strategic buyer types: [List 3-5 categories]
- Ideal buyer profile: [2-3 sentence description]
- Deal structure preference: [Describe typical structure]

REMEMBER: You must write AT LEAST 8,000 words. The BUYER FIT CRITERIA SUMMARY section is critical for the system to work properly.`
  }
};

interface QualityResult {
  passed: boolean;
  score: number;
  wordCount: number;
  sectionsFound: string[];
  missingElements: string[];
  tableCount: number;
  placeholderCount: number;
  industryMentions: number;
  dataRowCount: number;
  issues: string[];
  hasCriteria: boolean;
}

function validateQuality(content: string, industryName: string): QualityResult {
  const wordCount = content.split(/\s+/).length;
  
  // Count tables
  const tableLines = (content.match(/\|.*\|/g) || []);
  const tableCount = Math.floor(tableLines.length / 3);
  const dataRowCount = tableLines.filter(line => /\d+[%$]?/.test(line)).length;
  
  // Detect placeholders (more aggressive patterns)
  const placeholderPatterns = [
    /\bX%\b/gi,
    /\$X[MKB]?\b/gi,
    /\[Value\]/gi,
    /\[Industry\]/gi,
    /\[Name\]/gi,
    /\[Specific\]/gi,
    /\bX\.X[MK]?\b/gi,
    /\bXX-XX%/gi,
    /\bX-X%/gi,
    /\bXXX,XXX\b/g, // Placeholder population
    /\$XXX[K]?\b/gi,
  ];
  
  let placeholderCount = 0;
  for (const pattern of placeholderPatterns) {
    const matches = content.match(pattern) || [];
    placeholderCount += matches.length;
  }
  
  // Count industry mentions
  const industryRegex = new RegExp(industryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const industryMentions = (content.match(industryRegex) || []).length;
  
  // Check for buyer fit criteria section
  const hasCriteria = /BUYER FIT CRITERIA SUMMARY/i.test(content) && 
                      /SIZE CRITERIA/i.test(content) &&
                      /SERVICE CRITERIA/i.test(content) &&
                      /GEOGRAPHY CRITERIA/i.test(content);
  
  const requiredElements = [
    "NAICS",
    "EBITDA",
    "KPI",
    "SCORECARD",
    "VALUATION"
  ];
  
  const sectionsToCheck = [
    "INDUSTRY DEFINITION",
    "TERMINOLOGY",
    "BUSINESS MODEL",
    "ECOSYSTEM",
    "ECONOMICS",
    "COMPETITIVE LANDSCAPE",
    "FINANCIAL ATTRACTIVENESS",
    "OPERATIONAL ATTRACTIVENESS",
    "STRATEGIC ATTRACTIVENESS",
    "DEAL KILLER",
    "RED FLAG",
    "SELLER EVALUATION",
    "BUYER MATCHING",
    "BUYER FIT CRITERIA"
  ];
  
  const contentUpper = content.toUpperCase();
  const sectionsFound = sectionsToCheck.filter(s => contentUpper.includes(s));
  const missingElements = requiredElements.filter(e => !contentUpper.includes(e));
  
  const issues: string[] = [];
  
  if (wordCount < 15000) {
    issues.push(`Word count ${wordCount.toLocaleString()} below minimum 15,000`);
  }
  if (tableCount < 15) {
    issues.push(`Table count ${tableCount} below target 15`);
  }
  if (sectionsFound.length < 10) {
    issues.push(`Only ${sectionsFound.length}/14 key sections found`);
  }
  if (missingElements.length > 0) {
    issues.push(`Missing elements: ${missingElements.join(", ")}`);
  }
  if (placeholderCount > 20) {
    issues.push(`${placeholderCount} placeholders detected (target <20)`);
  }
  if (industryMentions < 20) {
    issues.push(`Industry mentioned only ${industryMentions} times (target 20+)`);
  }
  if (!hasCriteria) {
    issues.push("Missing BUYER FIT CRITERIA SUMMARY section");
  }
  
  // Calculate score (100 point scale)
  let score = 0;
  score += Math.min(25, (wordCount / 25000) * 25);
  score += Math.min(15, (sectionsFound.length / 14) * 15);
  score += Math.min(15, (tableCount / 25) * 15);
  score += Math.min(10, ((requiredElements.length - missingElements.length) / requiredElements.length) * 10);
  score += Math.min(10, Math.max(0, (30 - placeholderCount) / 30) * 10);
  score += Math.min(10, (industryMentions / 30) * 10);
  score += Math.min(10, (dataRowCount / 100) * 10);
  score += hasCriteria ? 5 : 0;
  
  return {
    passed: score >= 60 && hasCriteria && missingElements.length <= 1,
    score: Math.round(score),
    wordCount,
    sectionsFound,
    missingElements,
    tableCount,
    placeholderCount,
    industryMentions,
    dataRowCount,
    issues,
    hasCriteria
  };
}

// Enhanced criteria extraction with more flexible patterns
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

  // Try summary section first
  const summaryMatch = content.match(/BUYER FIT CRITERIA SUMMARY([\s\S]*?)(?:---|\n#\s[^#]|$)/i);
  const searchText = summaryMatch ? summaryMatch[1] : content;

  // Size criteria - multiple patterns
  const sizePatterns = [
    /\*?\*?SIZE CRITERIA:?\*?\*?\s*([\s\S]*?)(?=\*?\*?SERVICE CRITERIA|\*?\*?GEOGRAPHY|\*?\*?BUYER TYPE|\n##|\n---)/i,
    /#{2,3}\s*SIZE CRITERIA\s*([\s\S]*?)(?=#{2,3}|\n---)/i,
    /Size Thresholds[:\s]*([\s\S]*?)(?=Service|Geography|Buyer|##)/i
  ];
  
  for (const pattern of sizePatterns) {
    const match = searchText.match(pattern);
    if (match && match[1].trim().length > 50) {
      criteria.sizeCriteria = match[1].trim().substring(0, 3000);
      break;
    }
  }

  // Service criteria
  const servicePatterns = [
    /\*?\*?SERVICE CRITERIA:?\*?\*?\s*([\s\S]*?)(?=\*?\*?SIZE CRITERIA|\*?\*?GEOGRAPHY|\*?\*?BUYER TYPE|\n##|\n---)/i,
    /#{2,3}\s*SERVICE CRITERIA\s*([\s\S]*?)(?=#{2,3}|\n---)/i,
    /Service Type Prioritization[:\s]*([\s\S]*?)(?=Size|Geography|Buyer|##)/i
  ];
  
  for (const pattern of servicePatterns) {
    const match = searchText.match(pattern);
    if (match && match[1].trim().length > 50) {
      criteria.serviceCriteria = match[1].trim().substring(0, 3000);
      break;
    }
  }

  // Geography criteria
  const geoPatterns = [
    /\*?\*?GEOGRAPHY CRITERIA:?\*?\*?\s*([\s\S]*?)(?=\*?\*?SIZE CRITERIA|\*?\*?SERVICE|\*?\*?BUYER TYPE|\n##|\n---)/i,
    /#{2,3}\s*GEOGRAPHY CRITERIA\s*([\s\S]*?)(?=#{2,3}|\n---)/i,
    /Priority Regions[:\s]*([\s\S]*?)(?=Size|Service|Buyer|##)/i
  ];
  
  for (const pattern of geoPatterns) {
    const match = searchText.match(pattern);
    if (match && match[1].trim().length > 50) {
      criteria.geographyCriteria = match[1].trim().substring(0, 3000);
      break;
    }
  }

  // Buyer types
  const buyerPatterns = [
    /\*?\*?BUYER TYPES?:?\*?\*?\s*([\s\S]*?)(?=\*?\*?SIZE CRITERIA|\*?\*?SERVICE|\*?\*?GEOGRAPHY|\n##|\n---)/i,
    /#{2,3}\s*BUYER TYPES?\s*([\s\S]*?)(?=#{2,3}|\n---)/i,
    /PE Platforms Active[:\s]*([\s\S]*?)(?=Size|Service|Geography|##|Valuation)/i
  ];
  
  for (const pattern of buyerPatterns) {
    const match = searchText.match(pattern);
    if (match && match[1].trim().length > 50) {
      criteria.buyerTypesCriteria = match[1].trim().substring(0, 3000);
      break;
    }
  }

  return criteria;
}

// Supplemental content generator for missing sections
async function generateSupplementalContent(
  existingContent: string,
  issues: string[],
  industryName: string
): Promise<string> {
  const supplementPrompt = `You are adding supplemental content to an M&A guide for the "${industryName}" industry.

ISSUES TO ADDRESS:
${issues.map(i => `- ${i}`).join('\n')}

EXISTING CONTENT LENGTH: ${existingContent.split(/\s+/).length} words

${issues.some(i => i.includes('BUYER FIT CRITERIA')) ? `
CRITICAL: Generate the complete BUYER FIT CRITERIA SUMMARY section:

## BUYER FIT CRITERIA SUMMARY

**SIZE CRITERIA:**
- Minimum revenue: [specific dollar amount]
- Preferred revenue range: [specific range]
- Minimum EBITDA: [specific dollar amount]
- Preferred EBITDA: [specific range]
- Employee count: [specific numbers]
- Location requirements: [specific numbers]

**SERVICE CRITERIA:**
- Required services: [list specific services for ${industryName}]
- Preferred services: [list value-add services]
- Services to avoid: [list problematic services]
- Minimum recurring revenue: [specific percentage]

**GEOGRAPHY CRITERIA:**
- Priority regions: [list specific states/regions]
- Priority metros: [list 10+ specific cities with populations]
- Minimum market size: [specific population number]
- Geographic preferences: [dense vs distributed]

**BUYER TYPES:**
- Primary buyers: [PE platform, strategic, etc.]
- Active platforms: [list 5-10 specific or archetypal names]
- Strategic buyers: [describe categories]
- Ideal buyer: [2-3 sentence profile]
` : ''}

REQUIREMENTS:
- Use SPECIFIC numbers, not placeholders
- Be specific to ${industryName}
- Include detailed tables where appropriate
- Write at least 2,000 words`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: supplementPrompt }
        ],
        max_tokens: 8000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('Supplemental content API error:', response.status);
      return "";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error('Supplemental content error:', error);
    return "";
  }
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

    console.log(`Starting M&A guide generation for: ${industryName}`);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        let fullContent = "";
        const phases = ['phase1', 'phase2', 'phase3'] as const;
        
        try {
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

            const userPrompt = `Generate comprehensive M&A industry intelligence for: ${industryName}

${phase.instruction}

CRITICAL REMINDERS:
- You MUST write at least ${phase.minWords.toLocaleString()} words for this section
- NO PLACEHOLDERS - use real numbers throughout
- This is for professional M&A advisors - be thorough and specific
- Every table must have real data, not template values
- Reference ${industryName} specifically throughout`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                  { role: 'system', content: SYSTEM_PROMPT },
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
                  // Skip malformed JSON
                }
              }
            }

            const phaseWordCount = phaseContent.split(/\s+/).length;
            console.log(`Phase ${phaseNum} complete: ${phaseWordCount} words`);
            
            sendEvent({
              type: 'phase_complete',
              phase: phaseNum,
              phaseName: phase.name,
              phaseWordCount
            });

            // Add separator
            if (i < phases.length - 1) {
              fullContent += "\n\n---\n\n";
            }
          }

          // Quality validation
          console.log('Running quality validation...');
          sendEvent({ type: 'quality_check_start' });
          
          let quality = validateQuality(fullContent, industryName);
          console.log('Initial quality result:', quality);
          
          sendEvent({
            type: 'quality_check_result',
            ...quality
          });

          // If missing buyer criteria, generate supplemental content
          if (!quality.hasCriteria || quality.issues.length > 0) {
            console.log('Generating supplemental content for missing criteria...');
            sendEvent({ 
              type: 'gap_fill_start',
              attempt: 1,
              issues: quality.issues
            });
            
            const supplemental = await generateSupplementalContent(
              fullContent,
              quality.issues,
              industryName
            );
            
            if (supplemental) {
              fullContent += "\n\n---\n\n" + supplemental;
              
              sendEvent({
                type: 'gap_fill_content',
                content: supplemental,
                attempt: 1
              });
              
              // Re-validate
              quality = validateQuality(fullContent, industryName);
              console.log('Quality after supplemental:', quality);
              
              sendEvent({
                type: 'quality_check_result',
                ...quality,
                afterGapFill: true
              });
            }
          }

          // Extract criteria
          const criteria = extractCriteria(fullContent);
          const criteriaKeys = Object.keys(criteria).filter(k => criteria[k as keyof typeof criteria]);
          console.log('Extracted criteria:', criteriaKeys);
          
          sendEvent({
            type: 'criteria',
            criteria,
            criteriaKeys
          });

          // Final event
          sendEvent({
            type: 'complete',
            content: fullContent,
            wordCount: fullContent.split(/\s+/).length,
            criteria,
            quality
          });

        } catch (error) {
          console.error('Generation error:', error);
          sendEvent({ 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Generation failed' 
          });
        }

        controller.close();
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

  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
