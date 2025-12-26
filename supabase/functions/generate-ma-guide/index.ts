import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EXECUTION-FOCUSED Master Prompt - Tells AI to DO, not TEACH
const EXECUTION_WRAPPER = `YOU ARE EXECUTING A RESEARCH TASK, NOT TEACHING.

CRITICAL RULES:
1. DO NOT explain "How to research" - ACTUALLY DO the research
2. DO NOT use placeholders like "X%", "$XM", "[Value]", "[Industry]" - USE REAL NUMBERS
3. DO NOT give ranges like "10-20%" - GIVE SPECIFIC BENCHMARKS with context
4. DO NOT say "varies by company" - STATE THE TYPICAL VALUE with top/median/bottom quartiles

QUALITY BENCHMARKS TO MATCH:
- The Veterinary industry guide has: NAICS 541940, specific EBITDA margins (15-25%), actual PE firms (NVA, VetCor, BluePearl), specific multiples (6-10x)
- The HVAC industry guide has: specific KPIs (Revenue per tech: $150-250K), named consolidators (Wrench Group, Apex Service Partners), actual deal values

YOUR OUTPUT MUST HAVE:
✓ Actual 6-digit NAICS code(s)
✓ At least 15 data tables with real numbers
✓ Named PE firms and platforms active in this industry
✓ Specific dollar thresholds (not ranges)
✓ Actual percentage benchmarks for each KPI
✓ Real transaction examples if known
✓ Industry-specific terminology (25+ terms minimum)`;

// Streamlined, execution-focused phase prompts
const PHASE_PROMPTS = {
  phase1: {
    name: "Industry Fundamentals",
    instruction: `GENERATE PART 1: INDUSTRY FUNDAMENTALS

OUTPUT EXACTLY THESE SECTIONS:

## 1. INDUSTRY DEFINITION
- NAICS Code: [Actual 6-digit code] 
- Official Name: [Exact name from census.gov]
- Revenue Size: $X billion industry
- Company Count: X,XXX companies
- What's INCLUDED: [Specific services/products]
- What's EXCLUDED: [Adjacent industries NOT included]
- KEY SUBSEGMENTS TABLE:
| Subsegment | % of Industry | Avg Company Size | Typical Margin | PE Interest |
| [Name] | XX% | $X.XM | XX% | High/Med/Low |
(Include 5-7 subsegments)

## 2. INDUSTRY TERMINOLOGY GLOSSARY
Create TABLE with 25+ terms:
| Term | Definition | M&A Relevance | Benchmark |
| [Term] | [Definition] | [Why it matters] | [Specific number if applicable] |

Must include: Revenue terms, pricing terms, KPIs, customer types, regulatory terms.

## 3. BUSINESS MODELS
DELIVERY MODELS TABLE:
| Model | Description | Revenue/Unit | Margin | Scalability | Buyer Preference |
| [Model A] | [How it works] | $XXX | XX% | High/Med/Low | [Why] |
(3-5 models)

REVENUE MODELS TABLE:
| Model | % of Businesses | Predictability | Valuation Impact |
| Recurring/Subscription | XX% | High | +X.Xx multiple |
| Repeat Transaction | XX% | Medium | Baseline |
| Project-Based | XX% | Low | -X.Xx multiple |

## 4. INDUSTRY ECOSYSTEM
STAKEHOLDER MAP:
- Customers: [Who, demographics, buying frequency]
- Payers: [If different - insurance, govt, etc.]
- Suppliers: [Key categories, concentration risks]
- Referral Sources: [Who sends business]
- Regulators: [Governing bodies, key licenses]

SUPPLIER CONCENTRATION TABLE:
| % from Top Supplier | Risk Level | Multiple Impact |
| <30% | Low | None |
| 30-50% | Moderate | -0.25x |
| 50-70% | High | -0.5x |
| >70% | Critical | -1.0x |

## 5. INDUSTRY ECONOMICS
COST STRUCTURE TABLE:
| Category | % of Revenue | Range | Notes |
| COGS | XX% | XX-XX% | [Industry specifics] |
| Labor | XX% | XX-XX% | [Wage norms] |
| Occupancy | XX% | XX-XX% | |
| Marketing | XX% | XX-XX% | |
| G&A | XX% | XX-XX% | |
| EBITDA | XX% | XX-XX% | |

UNIT ECONOMICS EXAMPLE:
- Revenue per [unit]: $X,XXX
- Variable cost: $X,XXX  
- Contribution margin: $XXX (XX%)
- Breakeven: X units

SCALE ECONOMICS TABLE:
| Revenue Level | EBITDA Margin | G&A per Location | Notes |
| <$2M | X% | $XXX,XXX | Owner-operator |
| $2-5M | X% | $XXX,XXX | |
| $5-10M | X% | $XXX,XXX | |
| $10M+ | X% | $XXX,XXX | Platform scale |

## 6. COMPETITIVE LANDSCAPE
CONSOLIDATION STATUS:
- Stage: Early/Mid/Late (with evidence)
- Top 10 market share: XX%
- Number of PE platforms: XX
- Average platform size: $XXM revenue

ACTIVE ACQUIRERS TABLE:
| Buyer Name | Type | Strategy | Target Size | Geographic Focus |
| [Name] | PE Platform | Add-on | $X-XM EBITDA | [Regions] |
(List 5-10 active buyers - use real names if known)

BARRIERS TO ENTRY TABLE:
| Barrier | Strength | Description | Value Impact |
| Licensing | High/Med/Low | [Requirements] | [Impact] |
| Capital | | | |
| Expertise | | | |
| Relationships | | | |
| Brand | | | |

TARGET: 12,000+ words. Every metric needs a specific number.`
  },

  phase2: {
    name: "Acquisition Attractiveness",
    instruction: `GENERATE PART 2: WHAT MAKES COMPANIES ATTRACTIVE

OUTPUT EXACTLY THESE SECTIONS:

## 7. FINANCIAL ATTRACTIVENESS

EBITDA SIZE MATRIX:
| EBITDA Range | Buyer Type | Multiple | Deal Type | Competition Level |
| <$500K | Individual/Search | 2.5-3.5x SDE | Asset | Low |
| $500K-$1M | Sm. PE/Indep Sponsor | 3.5-4.5x | Equity | Moderate |
| $1M-$3M | Add-on Platforms | 4.5-6.0x | Add-on | High |
| $3M-$5M | Platform/Add-on | 5.5-7.0x | Either | Very High |
| $5M-$10M | Large PE | 6.0-8.0x | Platform | Competitive |
| $10M+ | Strategic/Large PE | 7.0-10x+ | Platform | Very Competitive |

PE THRESHOLD for this industry: $X EBITDA minimum (explain why)

EBITDA MARGIN BENCHMARKS:
| Percentile | EBITDA Margin | What It Signals | Multiple Impact |
| Top 5% | >XX% | Best-in-class ops | +1.0-1.5x |
| Top Quartile | XX-XX% | Strong operator | +0.5x |
| Median | XX-XX% | Industry normal | Baseline |
| Bottom Quartile | XX-XX% | Improvement needed | -0.5x |
| Bottom 10% | <XX% | Operational issues | -1.0x or pass |

CONCENTRATION RISK MATRIX:
| Top Customer % | Risk | Multiple Impact | Buyer Response |
| <5% | Minimal | None | Very attractive |
| 5-10% | Low | None | Proceed |
| 10-20% | Moderate | -0.25x | Questions |
| 20-30% | Elevated | -0.5x | Concern |
| 30-40% | High | -1.0x | Serious concern |
| 40-50% | Very High | -1.5x | Often pass |
| >50% | Critical | N/A | Almost always pass |

REVENUE QUALITY PREMIUM TABLE:
| Recurring % | Valuation Premium | Buyer Enthusiasm |
| >80% | +1.5-2.0x | Highly competitive |
| 60-80% | +0.75-1.0x | Very attractive |
| 40-60% | +0.25-0.5x | Attractive |
| 20-40% | Baseline | Normal interest |
| <20% | -0.5x | Less interest |

## 8. OPERATIONAL ATTRACTIVENESS

TOP 7 KPIs FOR THIS INDUSTRY:
| KPI | Excellent | Good | Average | Below Avg | Poor | Weight |
| [KPI 1] | [value] | [value] | [value] | [value] | [value] | XX% |
| [KPI 2] | | | | | | XX% |
| [KPI 3] | | | | | | XX% |
| [KPI 4] | | | | | | XX% |
| [KPI 5] | | | | | | XX% |
| [KPI 6] | | | | | | XX% |
| [KPI 7] | | | | | | XX% |

OPERATIONAL VALUE FACTORS:
| Factor | Premium (+value) | Baseline | Discount (-value) |
| Management | Professional GM: +20% | Some depth | Owner-dependent: -25% |
| Technology | Cloud/modern: +10% | Current | Paper/outdated: -15% |
| SOPs | Documented: +15% | Partial | None: -20% |
| Facilities | Excellent: +10% | Good | Deferred maint: -15% |
| Reputation | 4.5+ stars: +10% | 4.0+ | <3.5 stars: -15% |

OWNER DEPENDENCY ASSESSMENT:
| Owner Hours/Week | Critical Functions | Risk Level | Value Impact |
| <20 | None | Low | None |
| 20-30 | 1-2 | Moderate | -10% |
| 30-40 | 2-3 | Elevated | -15% |
| 40-50 | 3+ | High | -25% |
| 50+ | All | Critical | -30% to unsellable |

## 9. STRATEGIC ATTRACTIVENESS

GEOGRAPHIC VALUE:
| Market Type | Characteristics | PE Interest | Premium |
| Tier 1 | Pop 1M+, growing, high income | Very High | +0.5-1.0x |
| Tier 2 | Pop 500K-1M, stable | High | +0.25-0.5x |
| Tier 3 | Pop 250K-500K | Moderate | Baseline |
| Tier 4 | Pop <250K, declining | Low | -0.5-1.0x |

HOT MARKETS for this industry: [List 5-10 specific MSAs]
COLD MARKETS to avoid: [List reasons]

COMPETITIVE MOATS:
| Moat Type | Example in This Industry | Sustainability | Value Impact |
| Licensing/Regulatory | [Specific] | High | +X% |
| Customer Lock-in | [Specific] | Medium | +X% |
| Exclusive Contracts | [Specific] | Medium | +X% |
| Brand/Reputation | [Specific] | High | +X% |
| Scale Economics | [Specific] | High | +X% |

CERTIFICATIONS VALUE TABLE:
| Certification | Required? | Cost | Time | Value Impact |
| [Cert 1] | Yes/No | $X,XXX | X months | [Impact] |
(List 5-10 relevant certifications)

## 10. DEAL KILLERS & RED FLAGS

ABSOLUTE DEAL KILLERS:
❌ Revenue decline >XX% for 2+ years
❌ Customer concentration >50%
❌ Owner-operator who can't transition
❌ Pending litigation >$XXX,XXX exposure
❌ Regulatory violations/suspended license
❌ Environmental contamination
❌ <X years remaining on critical lease

FINANCIAL RED FLAGS TABLE:
| Issue | Threshold | Impact | Recoverable? |
| Revenue decline | >X% YoY | -1.0x to pass | Rarely |
| Margin decline | >X pts/year | -0.5x | Sometimes |
| Add-backs >30% | >30% of EBITDA | Scrutiny | Depends |
| AR aging | >X days | -0.25x | Yes |
| Inventory issues | >X months | -0.25x | Yes |

OPERATIONAL RED FLAGS TABLE:
| Issue | How to Identify | Impact | Fix Timeline |
| Owner dependency | >40 hrs critical work | -25% to pass | 12-24 months |
| High turnover | >XX% annual | -15% | 12 months |
| Tech debt | Paper/legacy systems | -15% | 6-12 months |
| Deferred maintenance | CapEx needed | Subtract from value | Immediate |

TARGET: 12,000+ words. Be specific - no ranges without context.`
  },

  phase3: {
    name: "Application & Buyer Fit",
    instruction: `GENERATE PART 3: PRACTICAL APPLICATION

OUTPUT EXACTLY THESE SECTIONS:

## 11. SELLER EVALUATION FRAMEWORK

FINANCIAL SCORECARD:
| Metric | 5 (Excellent) | 4 (Good) | 3 (Average) | 2 (Below) | 1 (Poor) | Weight |
| EBITDA | >$XM | $X-XM | $X-XM | $X-XK | <$XK | 25% |
| Margin | >XX% | XX-XX% | XX-XX% | XX-XX% | <XX% | 20% |
| Growth | >XX% | XX-XX% | X-X% | 0-X% | Negative | 15% |
| Concentration | <X% | X-XX% | XX-XX% | XX-XX% | >XX% | 20% |
| Recurring % | >XX% | XX-XX% | XX-XX% | XX-XX% | <XX% | 20% |

OPERATIONAL SCORECARD:
| Metric | 5 | 4 | 3 | 2 | 1 | Weight |
| [Industry KPI 1] | [val] | [val] | [val] | [val] | [val] | XX% |
| [Industry KPI 2] | [val] | [val] | [val] | [val] | [val] | XX% |
| [Industry KPI 3] | [val] | [val] | [val] | [val] | [val] | XX% |
| Management | Prof GM | Strong #2 | Some depth | Minimal | Owner-only | XX% |
| Technology | Modern | Current | Dated | Legacy | Paper | XX% |
| SOPs | Complete | Mostly | Some | Few | None | XX% |

STRATEGIC SCORECARD:
| Factor | 5 | 4 | 3 | 2 | 1 | Weight |
| Market | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Declining | 30% |
| Moats | Multiple | 2+ | 1 | Weak | None | 30% |
| Certs | Premium | Required+ | Required | Gaps | Missing | 20% |
| Growth Runway | Large | Good | Moderate | Limited | None | 20% |

SCORE INTERPRETATION:
| Overall | Rating | Recommendation | Expected Outcome |
| 4.0-5.0 | Excellent | Aggressive pursuit | Competitive process |
| 3.5-4.0 | Good | Strong interest | Multiple offers likely |
| 3.0-3.5 | Acceptable | Proceed with diligence | Selective interest |
| 2.5-3.0 | Marginal | Only if strategic fit | 1-2 buyers maybe |
| <2.5 | Poor | Pass or restructure | Difficult to sell |

## 12. BUYER MATCHING CRITERIA

**SIZE CRITERIA:**
| Metric | Minimum | Preferred | Optimal | Notes |
| Revenue | $XM | $X-XM | $X-XXM | Below min = no PE |
| EBITDA | $XK | $X-XM | $X-XM | Sweet spot for add-ons |
| Employees | X | XX-XX | XX-XXX | Scale indicator |
| Locations | X | X-X | X+ | Density matters |
| Years | X | X+ | X+ | Track record |

**SERVICE CRITERIA:**
| Service Type | Required | Preferred | Neutral | Avoid |
| [Service A] | ✓ | | | |
| [Service B] | | ✓ | | |
| [Service C] | | | ✓ | |
| [Service D] | | | | ✓ |

Service Mix Notes:
- Ideal: XX% [service A], XX% [service B]
- Minimum recurring: XX%
- Premium for: [specific specializations]
- Avoid: [specific low-margin services]

**GEOGRAPHY CRITERIA:**
Target Regions (High Priority):
1. [Region] - [Why, which buyers active]
2. [Region] - [Why, which buyers active]
3. [Region] - [Why, which buyers active]

Target MSAs (Specific):
- [City, State] - Pop X.XM, [why attractive]
- [City, State] - Pop X.XM, [why attractive]
- [City, State] - Pop X.XM, [why attractive]

Avoid:
- [Region/type] - [Why]

**BUYER TYPES:**

PE PLATFORMS ACTIVE IN THIS INDUSTRY:
| Platform | PE Sponsor | Strategy | Size Target | Geography |
| [Name] | [PE Firm] | [Add-on/Platform] | $X-XM EBITDA | [Regions] |
| [Name] | | | | |
| [Name] | | | | |
| [Name] | | | | |
| [Name] | | | | |
(List as many as you can identify - 5-15 if possible)

STRATEGIC BUYERS:
| Type | What They Want | Size Range | Typical Multiple |
| National strategic | [Criteria] | $XM+ rev | X-Xx |
| Regional strategic | [Criteria] | $XM+ rev | X-Xx |
| Adjacent industry | [Criteria] | Varies | X-Xx |

RECENT TRANSACTIONS (if known):
| Date | Acquirer | Target | Size | Multiple |
| [Year] | [Buyer] | [Seller] | $XM | X.Xx |

## 13. VALUATION BENCHMARKS

MULTIPLE RANGES BY QUALITY:
| Tier | EBITDA Multiple | Characteristics |
| Premium (Top 10%) | X.X-X.Xx | [What earns premium] |
| Above Average | X.X-X.Xx | [Characteristics] |
| Average | X.X-X.Xx | [Standard deal] |
| Below Average | X.X-X.Xx | [Issues present] |
| Distressed | X.X-X.Xx | [Significant issues] |

PREMIUM FACTORS:
| Factor | Multiple Impact | Evidence Required |
| Recurring >60% | +0.5-1.0x | Contracts, history |
| Professional mgmt | +0.5x | Org chart, tenure |
| Strong growth >15% | +0.5-1.0x | 3yr financials |
| Clustering value | +0.25-0.5x | Buyer location analysis |
| Premium certs | +0.25-0.5x | Documentation |
| Strong brand | +0.25x | Reviews, reputation |

DISCOUNT FACTORS:
| Factor | Multiple Impact | Mitigation |
| Concentration >20% | -0.5-1.5x | Customer contracts, diversification |
| Owner dependency | -1.0-2.0x | Extended transition, earnout |
| Below-avg margins | -0.25-0.5x | Improvement plan |
| Technology debt | -0.25-0.5x | Upgrade budget |
| Declining revenue | -1.0x+ | Turnaround evidence |

DEAL STRUCTURE NORMS:
| Component | Typical Range | Notes |
| Cash at close | XX-XX% | Higher for premium deals |
| Seller note | X-XX% | X-year term, X% rate |
| Earnout | 0-XX% | X-year, tied to [metric] |
| Equity rollover | XX-XX% | Standard for PE |

## 14. COMPLETE EVALUATION EXAMPLE

**SAMPLE COMPANY:**
- Industry: [This industry]
- Location: [Specific MSA]
- Revenue: $X.XM
- EBITDA: $XXX,XXX (XX% margin)
- Growth: X% 3-year CAGR
- Employees: XX
- Locations: X
- Top customer: X% of revenue
- Recurring revenue: XX%
- Owner hours/week: XX (X% critical)
- Management: [Description]
- Technology: [Description]
- Online reputation: X.X stars, XXX reviews
- Years in business: XX
- Certifications: [List]

**FINANCIAL SCORE:**
| Metric | Value | Score | Weight | Weighted |
| EBITDA | $XXX,XXX | X | 25% | X.XX |
| Margin | XX% | X | 20% | X.XX |
| Growth | X% | X | 15% | X.XX |
| Concentration | X% | X | 20% | X.XX |
| Recurring | XX% | X | 20% | X.XX |
| **Subtotal** | | | **100%** | **X.XX** |

**OPERATIONAL SCORE:**
[Same detailed format]
**Subtotal: X.XX**

**STRATEGIC SCORE:**
[Same detailed format]
**Subtotal: X.XX**

**OVERALL SCORE: X.XX**
**RATING: [Excellent/Good/Acceptable/Marginal/Poor]**

**ANALYSIS:**
Strengths:
- [Strength 1 with specific data]
- [Strength 2 with specific data]
- [Strength 3 with specific data]

Concerns:
- [Concern 1 with impact]
- [Concern 2 with impact]

**LIKELY BUYERS:**
1. [Buyer type] - Because [specific reason]
2. [Buyer type] - Because [specific reason]

**EXPECTED VALUATION:**
- Base multiple: X.Xx
- Premiums: +X.Xx for [reasons]
- Discounts: -X.Xx for [reasons]
- Net multiple: X.Xx
- Enterprise value: $X.X-X.XM

---

## BUYER FIT CRITERIA SUMMARY

**SIZE CRITERIA:**
- Minimum revenue: $X.XM
- Preferred revenue: $X-XXM
- Minimum EBITDA: $XXXK
- Preferred EBITDA: $X-XM
- Minimum employees: XX
- Minimum locations: X
- Minimum years: X

**SERVICE CRITERIA:**
- Required services: [List]
- Preferred services: [List]
- Avoid services: [List]
- Minimum recurring: XX%
- Service mix: XX% [type A], XX% [type B]

**GEOGRAPHY CRITERIA:**
- Priority regions: [List]
- Priority MSAs: [List cities]
- Avoid: [List]
- Minimum market size: XXX,XXX population

**BUYER TYPES:**
- PE platforms: [List names or archetypes]
- Strategic buyers: [Describe profiles]
- Ideal fit: [Describe perfect buyer]

TARGET: 10,000+ words. Every number must be specific.`
  }
};

// Enhanced quality validation with placeholder detection
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
}

function validateQuality(content: string, industryName: string): QualityResult {
  const wordCount = content.split(/\s+/).length;
  
  // Count tables (lines with |...|)
  const tableLines = (content.match(/\|.*\|/g) || []);
  const tableCount = Math.floor(tableLines.length / 3);
  
  // Count data rows (table rows with numbers)
  const dataRowCount = tableLines.filter(line => /\d+[%$]?/.test(line)).length;
  
  // Detect placeholders
  const placeholderPatterns = [
    /\bX%/gi,
    /\$X[MK]?/gi,
    /\[Value\]/gi,
    /\[Industry\]/gi,
    /\[Name\]/gi,
    /\[Specific\]/gi,
    /X-X%/gi,
    /\$X-X/gi,
    /XX-XX%/gi,
    /\bX\b(?=\s*(months?|years?|days?|hours?|employees?|locations?))/gi,
  ];
  
  let placeholderCount = 0;
  for (const pattern of placeholderPatterns) {
    const matches = content.match(pattern) || [];
    placeholderCount += matches.length;
  }
  
  // Count industry name mentions
  const industryRegex = new RegExp(industryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const industryMentions = (content.match(industryRegex) || []).length;
  
  const requiredElements = [
    "NAICS",
    "EBITDA",
    "KPI",
    "SIZE CRITERIA",
    "SERVICE CRITERIA", 
    "GEOGRAPHY CRITERIA",
    "BUYER TYPES",
    "SCORECARD",
    "BENCHMARK",
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
    "EVALUATION FRAMEWORK",
    "BUYER MATCHING",
    "VALUATION BENCHMARK"
  ];
  
  const contentUpper = content.toUpperCase();
  const sectionsFound = sectionsToCheck.filter(s => contentUpper.includes(s));
  const missingElements = requiredElements.filter(e => !contentUpper.includes(e));
  
  const issues: string[] = [];
  
  if (wordCount < 30000) {
    issues.push(`Word count ${wordCount.toLocaleString()} below target 30,000`);
  }
  if (tableCount < 15) {
    issues.push(`Table count ${tableCount} below target 15`);
  }
  if (sectionsFound.length < 10) {
    issues.push(`Only ${sectionsFound.length}/14 key sections found`);
  }
  if (missingElements.length > 0) {
    issues.push(`Missing: ${missingElements.join(", ")}`);
  }
  if (placeholderCount > 10) {
    issues.push(`${placeholderCount} placeholders detected (target <10)`);
  }
  if (industryMentions < 30) {
    issues.push(`Industry mentioned only ${industryMentions} times (target 30+)`);
  }
  if (dataRowCount < 50) {
    issues.push(`Only ${dataRowCount} data rows with numbers (target 50+)`);
  }
  
  // Calculate score
  let score = 0;
  score += Math.min(25, (wordCount / 40000) * 25);
  score += Math.min(20, (sectionsFound.length / 14) * 20);
  score += Math.min(15, (tableCount / 20) * 15);
  score += Math.min(10, ((requiredElements.length - missingElements.length) / requiredElements.length) * 10);
  score += Math.min(10, Math.max(0, (20 - placeholderCount) / 20) * 10);
  score += Math.min(10, (industryMentions / 50) * 10);
  score += Math.min(10, (dataRowCount / 100) * 10);
  
  return {
    passed: score >= 70 && missingElements.length <= 2 && placeholderCount < 20,
    score: Math.round(score),
    wordCount,
    sectionsFound,
    missingElements,
    tableCount,
    placeholderCount,
    industryMentions,
    dataRowCount,
    issues
  };
}

// Enhanced gap filling with context
async function fillGaps(
  content: string,
  missingElements: string[],
  issues: string[],
  industryName: string,
  attempt: number = 1
): Promise<string> {
  if (missingElements.length === 0 && issues.length === 0) return "";
  
  // Use last 8000 chars of content as context
  const contextSnippet = content.slice(-8000);
  
  const gapPrompt = `You are improving an M&A guide for the "${industryName}" industry.

CURRENT ISSUES TO FIX:
${issues.map(i => `- ${i}`).join('\n')}

MISSING ELEMENTS: ${missingElements.join(', ') || 'None'}

CONTEXT (Last section of guide):
${contextSnippet.slice(0, 2000)}...

GENERATE COMPREHENSIVE CONTENT to address these issues:
1. If missing sections, create them with full detail
2. Replace any remaining placeholders with actual numbers
3. Add more industry-specific examples and data
4. Include at least 3 new data tables with real numbers

REQUIREMENTS:
- Use ACTUAL numbers, not placeholders like X% or $XM
- Be SPECIFIC to ${industryName}
- Include data tables with benchmarks
- Minimum 2,000 words per major missing element

${attempt > 1 ? `This is attempt ${attempt}. Be more specific with numbers and examples.` : ''}`;

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
          { 
            role: 'system', 
            content: `${EXECUTION_WRAPPER}\n\nYou are filling gaps in an M&A guide. Be extremely specific with numbers and examples. NO PLACEHOLDERS.` 
          },
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
  } catch (error) {
    console.error('Gap fill error:', error);
    return "";
  }
}

// Extract buyer fit criteria
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

  // Try to find the summary section first
  const summaryMatch = content.match(/BUYER FIT CRITERIA SUMMARY([\s\S]*?)(?:---|\n##\s[^#]|\n#\s|$)/i);
  if (summaryMatch) {
    const summaryText = summaryMatch[1];

    const sizeMatch = summaryText.match(/\*?\*?SIZE CRITERIA:?\*?\*?\s*([\s\S]*?)(?:\*?\*?SERVICE CRITERIA|\*?\*?GEOGRAPHY CRITERIA|\*?\*?BUYER TYPES|$)/i);
    if (sizeMatch) {
      criteria.sizeCriteria = sizeMatch[1].trim().replace(/^[-*•]\s*/gm, '').substring(0, 2000);
    }

    const serviceMatch = summaryText.match(/\*?\*?SERVICE CRITERIA:?\*?\*?\s*([\s\S]*?)(?:\*?\*?SIZE CRITERIA|\*?\*?GEOGRAPHY CRITERIA|\*?\*?BUYER TYPES|$)/i);
    if (serviceMatch) {
      criteria.serviceCriteria = serviceMatch[1].trim().replace(/^[-*•]\s*/gm, '').substring(0, 2000);
    }

    const geoMatch = summaryText.match(/\*?\*?GEOGRAPHY CRITERIA:?\*?\*?\s*([\s\S]*?)(?:\*?\*?SIZE CRITERIA|\*?\*?SERVICE CRITERIA|\*?\*?BUYER TYPES|$)/i);
    if (geoMatch) {
      criteria.geographyCriteria = geoMatch[1].trim().replace(/^[-*•]\s*/gm, '').substring(0, 2000);
    }

    const buyerMatch = summaryText.match(/\*?\*?BUYER TYPES:?\*?\*?\s*([\s\S]*?)(?:\*?\*?SIZE CRITERIA|\*?\*?SERVICE CRITERIA|\*?\*?GEOGRAPHY CRITERIA|$)/i);
    if (buyerMatch) {
      criteria.buyerTypesCriteria = buyerMatch[1].trim().replace(/^[-*•]\s*/gm, '').substring(0, 2000);
    }
  }

  // Fallback extraction from sections
  if (!criteria.sizeCriteria) {
    const sizeMatch = content.match(/###?\s*\*?\*?SIZE CRITERIA\*?\*?([\s\S]*?)(?:\n###|\n##|SERVICE CRITERIA|$)/i);
    if (sizeMatch) criteria.sizeCriteria = sizeMatch[1].trim().substring(0, 2000);
  }

  if (!criteria.serviceCriteria) {
    const serviceMatch = content.match(/###?\s*\*?\*?SERVICE CRITERIA\*?\*?([\s\S]*?)(?:\n###|\n##|GEOGRAPHY CRITERIA|$)/i);
    if (serviceMatch) criteria.serviceCriteria = serviceMatch[1].trim().substring(0, 2000);
  }

  if (!criteria.geographyCriteria) {
    const geoMatch = content.match(/###?\s*\*?\*?GEOGRAPHY CRITERIA\*?\*?([\s\S]*?)(?:\n###|\n##|BUYER TYPES|$)/i);
    if (geoMatch) criteria.geographyCriteria = geoMatch[1].trim().substring(0, 2000);
  }

  if (!criteria.buyerTypesCriteria) {
    const buyerMatch = content.match(/###?\s*\*?\*?BUYER TYPES\*?\*?([\s\S]*?)(?:\n###|\n##|$)/i);
    if (buyerMatch) criteria.buyerTypesCriteria = buyerMatch[1].trim().substring(0, 2000);
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

            const userPrompt = `Generate a COMPREHENSIVE M&A guide for the "${industryName}" industry.

${phase.instruction}

REMEMBER: 
- NO PLACEHOLDERS - Use actual numbers (research if needed)
- SPECIFIC to ${industryName} - not generic advice
- TABLES with real data - at minimum 5 tables per section
- This is used by professional M&A advisors - be thorough`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                  { role: 'system', content: EXECUTION_WRAPPER },
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
                    
                    const phaseProgress = Math.min(100, (phaseContent.length / 50000) * 100);
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

            // Add separator between phases
            if (i < phases.length - 1) {
              fullContent += "\n\n---\n\n";
            }
          }

          // Quality check
          console.log('Running quality validation...');
          sendEvent({ type: 'quality_check_start' });
          
          let quality = validateQuality(fullContent, industryName);
          console.log('Initial quality result:', quality);
          
          sendEvent({
            type: 'quality_check_result',
            ...quality
          });

          // Improvement loop - up to 2 attempts
          let attempt = 1;
          while (!quality.passed && attempt <= 2 && (quality.missingElements.length > 0 || quality.issues.length > 0)) {
            console.log(`Gap filling attempt ${attempt}...`);
            sendEvent({ 
              type: 'gap_fill_start',
              attempt,
              missingElements: quality.missingElements,
              issues: quality.issues
            });
            
            const gapContent = await fillGaps(
              fullContent,
              quality.missingElements,
              quality.issues.filter(i => !i.includes('Word count')), // Don't try to fix word count directly
              industryName,
              attempt
            );
            
            if (gapContent) {
              fullContent += "\n\n---\n\n# SUPPLEMENTAL CONTENT\n\n" + gapContent;
              
              sendEvent({
                type: 'gap_fill_content',
                content: gapContent,
                attempt
              });
              
              // Re-validate
              quality = validateQuality(fullContent, industryName);
              console.log(`Quality after attempt ${attempt}:`, quality);
              
              sendEvent({
                type: 'quality_check_result',
                ...quality,
                afterGapFill: true,
                attempt
              });
            }
            
            attempt++;
          }

          // Final quality report
          sendEvent({
            type: 'final_quality',
            ...quality
          });

          // Extract criteria
          const criteria = extractCriteria(fullContent);
          console.log('Extracted criteria:', Object.keys(criteria).filter(k => criteria[k as keyof typeof criteria]));
          
          sendEvent({
            type: 'criteria',
            criteria
          });

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
