import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Lovable AI Gateway with Gemini 2.5 Pro for longer output
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-pro';

const SYSTEM_PROMPT = `You are an elite M&A industry research analyst creating THE DEFINITIVE intelligence guide for private equity and investment banking professionals.

## CRITICAL OUTPUT REQUIREMENTS

### WORD COUNT
- Each sub-phase must generate 4,000-6,000 words minimum
- Use extensive detail, specific examples, and real data
- Do NOT summarize - provide COMPLETE, ACTIONABLE intelligence

### NO PLACEHOLDERS ALLOWED
You are FORBIDDEN from outputting:
- "[X]", "$X", "X%", "[Value]", "[Name]", "[City]", "[Industry]"
- "typically", "varies", "depends" without specific ranges
- Any template markers or unfilled brackets

Instead, ALWAYS use:
- Specific dollar amounts: "$2.5M", "$500K-$1.5M"
- Specific percentages: "18-22%", "3-5x"
- Real city names: "Phoenix, AZ (5.1M metro)", "Dallas-Fort Worth, TX"
- Named examples where applicable

### TABLE REQUIREMENTS
- Every table must have 6-10 rows of real data
- Include actual numbers, not placeholders
- Tables are critical for scoring system integration

### RESEARCH STANDARDS
- Cite specific industry benchmarks
- Include regional variations where relevant
- Provide buyer-specific intelligence (what PE firms look for)
- Include valuation implications for every factor`;

// SUB-PHASE PROMPTS - Each generates focused, high-quality content
const SUB_PHASES = [
  {
    id: "1a",
    name: "Industry Definition & Classification",
    prompt: `# PHASE 1A: INDUSTRY DEFINITION & CLASSIFICATION

Generate comprehensive industry definition content (4,000+ words).

## REQUIRED CONTENT:

### 1. NAICS CLASSIFICATION
- Primary 6-digit NAICS code with description
- Related NAICS codes (list 3-5)
- SIC code equivalents
- How classification affects M&A data availability

### 2. INDUSTRY SCOPE & BOUNDARIES
CREATE TABLE: Industry Segmentation
| Segment | Description | % of Market | Avg Revenue | EBITDA Margin | PE Interest |
(Include 6-8 distinct segments with REAL percentages and dollar amounts)

### 3. MARKET SIZE & GROWTH
- Total addressable market (specific $ amount)
- Number of businesses in the industry
- 5-year historical CAGR with source
- Projected 5-year growth rate
- Key growth drivers (list 4-5 specific factors)

### 4. INDUSTRY EVOLUTION
- Major consolidation waves (dates and impacts)
- Technology disruptions
- Regulatory changes affecting M&A
- Current M&A activity level (deals per year estimate)`
  },
  {
    id: "1b",
    name: "Terminology & Business Models",
    prompt: `# PHASE 1B: TERMINOLOGY & BUSINESS MODELS

Generate comprehensive terminology and business model analysis (4,000+ words).

## REQUIRED CONTENT:

### 1. INDUSTRY TERMINOLOGY GLOSSARY
CREATE TABLE: Essential Industry Terms (25+ terms)
| Term | Definition | M&A Relevance | Typical Benchmark |
(Include financial metrics, operational KPIs, service terms, regulatory terms)

### 2. BUSINESS MODEL DEEP DIVE
For each major business model in this industry:

CREATE TABLE: Business Model Comparison
| Model | Revenue Structure | Gross Margin | EBITDA Margin | Scalability | PE Preference | Multiple Impact |
(Include 4-6 models with specific margin percentages)

### 3. REVENUE MODEL ANALYSIS
CREATE TABLE: Revenue Model Impact on Valuation
| Revenue Type | % Recurring | Predictability | Contract Length | Multiple Premium/Discount |
- Subscription/Recurring
- Repeat Customer
- Project-Based
- Transaction-Based
- Hybrid

### 4. CUSTOMER SEGMENT MODELS
- B2C vs B2B vs B2G dynamics
- Customer acquisition costs by segment
- Lifetime value by segment
- Concentration patterns`
  },
  {
    id: "1c",
    name: "Industry Economics & Cost Structure",
    prompt: `# PHASE 1C: INDUSTRY ECONOMICS & COST STRUCTURE

Generate comprehensive economics analysis (4,000+ words).

## REQUIRED CONTENT:

### 1. DETAILED P&L BENCHMARKS
CREATE TABLE: P&L Benchmarks by Percentile
| Line Item | Bottom Quartile | Median | Top Quartile | Top Decile | Key Drivers |
| Revenue | 100% | 100% | 100% | 100% | - |
| COGS | ?% | ?% | ?% | ?% | [Specific drivers] |
| Labor | ?% | ?% | ?% | ?% | [Components included] |
| Occupancy | ?% | ?% | ?% | ?% | [Rent, utilities, etc.] |
| Marketing | ?% | ?% | ?% | ?% | [Channels used] |
| Insurance | ?% | ?% | ?% | ?% | [Coverage types] |
| G&A | ?% | ?% | ?% | ?% | [Components] |
| Owner Comp | ?% | ?% | ?% | ?% | [Market replacement] |
| EBITDA | ?% | ?% | ?% | ?% | [Target for buyers] |

### 2. UNIT ECONOMICS BY SCALE
CREATE TABLE: Unit Economics Analysis
| Revenue Level | Revenue/Employee | Revenue/Location | EBITDA % | Owner Hours | Management Depth |
| <$1M | | | | | |
| $1-2M | | | | | |
| $2-5M | | | | | |
| $5-10M | | | | | |
| $10-25M | | | | | |
| $25M+ | | | | | |

### 3. ECONOMIES OF SCALE
Specific cost savings at scale:
- Procurement leverage (% savings by size tier)
- Back-office efficiency (fixed cost absorption)
- Marketing leverage (CAC by company size)
- Technology cost per location

### 4. CAPITAL REQUIREMENTS
- Startup costs
- Working capital needs
- CapEx cycles
- Maintenance vs growth CapEx`
  },
  {
    id: "1d",
    name: "Ecosystem & Competitive Landscape",
    prompt: `# PHASE 1D: ECOSYSTEM & COMPETITIVE LANDSCAPE

Generate comprehensive ecosystem and competitive analysis (4,000+ words).

## REQUIRED CONTENT:

### 1. CUSTOMER ANALYSIS
CREATE TABLE: Customer Segmentation
| Customer Type | % of Revenue | LTV | CAC | Switching Cost | Concentration Risk |
(Include 5-6 customer types with specific values)

### 2. SUPPLIER DYNAMICS
CREATE TABLE: Key Supplier Categories
| Category | # of Suppliers | Concentration | Margin Impact | Switching Cost |
(Include 4-5 supplier categories)

### 3. REGULATORY ENVIRONMENT
CREATE TABLE: Licensing & Compliance Requirements
| Requirement | Type | Cost to Obtain | Timeline | Renewal | Risk Level |
(List ALL licenses, certifications, compliance requirements - 8+ items)

### 4. ACTIVE ACQUIRERS
CREATE TABLE: Known Active Buyers (10+ entries)
| Buyer Name | Type | PE Sponsor | Platform Name | Target Size | Geographic Focus | Est. Acquisitions |
(Include real or archetypal buyer names)

### 5. RECENT TRANSACTIONS
CREATE TABLE: Notable Transactions (5+ entries)
| Date | Acquirer | Target | Est. Revenue | Multiple (if known) | Strategic Rationale |

### 6. BARRIERS TO ENTRY
CREATE TABLE: Competitive Moat Analysis
| Moat Type | Strength (1-10) | How It Works | Value Impact |
(Include 6+ moat types)`
  },
  {
    id: "2a",
    name: "Financial Attractiveness Criteria",
    prompt: `# PHASE 2A: FINANCIAL ATTRACTIVENESS CRITERIA

Generate comprehensive financial evaluation criteria (4,000+ words).

## REQUIRED CONTENT:

### 1. EBITDA SIZE & BUYER MAPPING
CREATE TABLE: EBITDA-to-Buyer Matrix
| EBITDA Range | Primary Buyer Type | Typical Multiple | Deal Structure | Competition Level |
| <$250K | Individual operators | 2.0-3.0x SDE | 100% cash, SBA | Low |
| $250-500K | Small PE, family offices | 3.0-4.0x | 70% cash, 30% note | Moderate |
| $500K-1M | Lower-mid PE | 4.0-5.0x | 60% cash, earnout | Moderate |
| $1-2M | Mid-market PE | 5.0-6.5x | Mix of structures | High |
| $2-3M | Mid-market platforms | 5.5-7.5x | Equity rollover | High |
| $3-5M | Upper-mid PE | 6.0-8.5x | Structured deals | Very High |
| $5-10M | Large PE | 7.0-10.0x | Competitive process | Very High |
| $10M+ | Mega PE, strategics | 8.0-12.0x+ | Full auction | Extremely High |

### 2. EBITDA MARGIN BENCHMARKS
CREATE TABLE: Margin Quality Assessment
| EBITDA Margin | Percentile | Quality Signal | Multiple Impact | Buyer Reaction |
(Include 6+ margin tiers with specific impacts)

### 3. REVENUE QUALITY FACTORS
CREATE TABLE: Revenue Quality Assessment
| Factor | Premium Indicator | Baseline | Discount Indicator | Value Impact |
| Recurring % | | | | |
| Growth Rate | | | | |
| Concentration | | | | |
| Seasonality | | | | |
| Contract Length | | | | |

### 4. CUSTOMER CONCENTRATION MATRIX
CREATE TABLE: Concentration Risk Assessment
| Top Customer % | Top 5 % | Risk Level | Multiple Impact | Mitigation Options |
(Include 6 concentration tiers)`
  },
  {
    id: "2b",
    name: "Operational Attractiveness Criteria",
    prompt: `# PHASE 2B: OPERATIONAL ATTRACTIVENESS CRITERIA

Generate comprehensive operational evaluation criteria (4,000+ words).

## REQUIRED CONTENT:

### 1. INDUSTRY-SPECIFIC KPIs
CREATE TABLE: Critical KPIs for This Industry (10+ KPIs)
| KPI | Definition | Bottom Quartile | Median | Top Quartile | Top Decile | Weight in Scoring |
(Include KPIs specific to this industry with real benchmarks)

### 2. MANAGEMENT TEAM EVALUATION
CREATE TABLE: Management Assessment Framework
| Factor | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
| Depth | Full C-suite | Most filled | Key roles | Gaps | Owner-only |
| Tenure | 10+ years | 5-10 years | 3-5 years | 1-3 years | <1 year |
| Succession | Ready | Planned | Identified | Early | None |
| Expertise | Deep | Strong | Relevant | Some | Limited |

### 3. TECHNOLOGY MATURITY
CREATE TABLE: Technology Assessment
| System Area | Modern (5) | Current (4) | Adequate (3) | Dated (2) | Legacy (1) |
| ERP/Accounting | | | | | |
| CRM/Sales | | | | | |
| Operations | | | | | |
| Scheduling | | | | | |
| Customer Portal | | | | | |

### 4. OWNER DEPENDENCY
CREATE TABLE: Owner Dependency Impact
| Dependency Level | Hours/Week | Critical Functions | Transition Time | Value Impact |
| Minimal | <20 | Strategic only | 3-6 months | None |
| Low | 20-30 | Key relationships | 6-12 months | None |
| Moderate | 30-40 | Operations, sales | 12-18 months | -0.5x |
| High | 40-50 | Most functions | 18-24 months | -1.0x |
| Severe | 50+ | Everything | 24+ months | -1.5x or killer |

### 5. EMPLOYEE METRICS
CREATE TABLE: Workforce Quality Indicators
| Metric | Excellent | Good | Acceptable | Concerning | Red Flag |
| Turnover Rate | | | | | |
| Tenure Average | | | | | |
| Training Programs | | | | | |
| Certification % | | | | | |`
  },
  {
    id: "2c",
    name: "Strategic & Geographic Criteria",
    prompt: `# PHASE 2C: STRATEGIC & GEOGRAPHIC CRITERIA

Generate comprehensive strategic and geographic analysis (4,000+ words).

## REQUIRED CONTENT:

### 1. GEOGRAPHIC MARKET TIERS
CREATE TABLE: Market Tier Classification
| Tier | Population Range | Characteristics | PE Interest | Multiple Premium |
| Tier 1 | 2M+ metro | Major markets, deep talent | Very High | +0.5-1.0x |
| Tier 2 | 500K-2M | Strong secondary markets | High | +0.25-0.5x |
| Tier 3 | 200K-500K | Solid regional markets | Moderate | Baseline |
| Tier 4 | <200K | Small markets | Lower | -0.25-0.5x |

### 2. PRIORITY MARKETS FOR THIS INDUSTRY
CREATE TABLE: Top Markets (15+ metros)
| Metro Area | State | Population | Growth Rate | Industry Density | Active Buyers | Why Priority |
(Use REAL city names with actual population figures)

### 3. REGIONAL VARIATIONS
- Northeast characteristics and buyer activity
- Southeast characteristics and buyer activity
- Midwest characteristics and buyer activity
- Southwest characteristics and buyer activity
- West Coast characteristics and buyer activity

### 4. SUSTAINABLE COMPETITIVE ADVANTAGES
CREATE TABLE: Competitive Moat Value
| Moat Type | Industry Example | Durability | Value Impact |
| Licenses/Certs | [Specific] | High | +0.5-1.0x |
| Long-term Contracts | [Specific] | Medium-High | +0.5-1.5x |
| Brand Recognition | [Specific] | Medium | +0.25-0.5x |
| Geographic Density | [Specific] | High | +0.5-1.0x |
| Proprietary Systems | [Specific] | Medium-High | +0.5-1.0x |
| Supplier Relationships | [Specific] | Medium | +0.25x |

### 5. DEAL KILLERS & RED FLAGS
CREATE TABLE: Absolute Deal Killers
| Issue | Threshold | Why It Kills Deals | Frequency |
(Include 8+ deal killers with specific thresholds)

CREATE TABLE: Yellow vs Red Flags
| Issue | Yellow Flag | Red Flag | Deal Killer |
(Include 8+ issues with escalation thresholds)`
  },
  {
    id: "3a",
    name: "Seller Evaluation Scorecards",
    prompt: `# PHASE 3A: SELLER EVALUATION SCORECARDS

Generate comprehensive scoring frameworks (4,000+ words).

## REQUIRED CONTENT:

### 1. FINANCIAL SCORECARD
CREATE TABLE: Financial Scoring Matrix
| Metric | Weight | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
| EBITDA Amount | 25% | >$3M | $1.5-3M | $750K-1.5M | $350-750K | <$350K |
| EBITDA Margin | 20% | >25% | 20-25% | 15-20% | 10-15% | <10% |
| Revenue Growth | 15% | >15% | 10-15% | 5-10% | 0-5% | Declining |
| Recurring % | 15% | >70% | 50-70% | 30-50% | 15-30% | <15% |
| Concentration | 15% | <5% | 5-10% | 10-15% | 15-25% | >25% |
| Revenue Amount | 10% | >$15M | $8-15M | $3-8M | $1.5-3M | <$1.5M |

### 2. OPERATIONAL SCORECARD
CREATE TABLE: Operational Scoring Matrix (use industry-specific KPIs)
| KPI | Weight | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
(Include 6-8 industry-specific KPIs with thresholds)

### 3. STRATEGIC SCORECARD
CREATE TABLE: Strategic Scoring Matrix
| Factor | Weight | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
| Market Quality | 25% | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Rural |
| Competitive Moats | 25% | Multiple strong | 1-2 strong | Some | Weak | None |
| Growth Runway | 20% | Significant | Good | Moderate | Limited | Saturated |
| Management | 15% | Full team | Most roles | Key roles | Gaps | Owner-only |
| Technology | 15% | Modern | Current | Adequate | Dated | Legacy |

### 4. VALUATION BENCHMARKS
CREATE TABLE: Multiple Ranges by Quality Tier
| Quality Tier | EBITDA Multiple | Revenue Multiple | Characteristics |
| Premium | 7.0-10.0x | 1.5-2.5x | Top quartile, recurring, growth |
| Above Average | 5.5-7.0x | 1.0-1.5x | Strong metrics, growing |
| Average | 4.0-5.5x | 0.7-1.0x | Median metrics, stable |
| Below Average | 3.0-4.0x | 0.5-0.7x | Some concerns |
| Distressed | 2.0-3.0x | 0.3-0.5x | Turnaround needed |

CREATE TABLE: Multiple Adjustment Factors
| Factor | Premium | Discount | Notes |
(Include 10+ adjustment factors with specific impacts)`
  },
  {
    id: "3b",
    name: "Buyer Fit Criteria - CRITICAL",
    prompt: `# PHASE 3B: BUYER FIT CRITERIA - CRITICAL FOR SCORING SYSTEM

This section MUST follow EXACT formatting for automated parsing. This is the most important phase.

## BUYER FIT CRITERIA SUMMARY

### SIZE CRITERIA
**Revenue Thresholds:**
- Minimum revenue for PE interest: $X.XM (provide specific number)
- Preferred revenue range: $XM to $XXM
- Optimal revenue sweet spot: $XM to $XM
- Maximum revenue before strategic-only: $XXM+

**EBITDA Thresholds:**
- Minimum EBITDA for PE interest: $XXXK (specific amount)
- Preferred EBITDA range: $XXXK to $X.XM
- Optimal EBITDA sweet spot: $X.XM to $XM
- Add-on minimum EBITDA: $XXXK

**Other Size Metrics:**
- Minimum employees: XX (specific number)
- Preferred employee range: XX to XXX
- Minimum locations: X
- Preferred location count: X to XX
- Revenue per location minimum: $X.XM
- Square footage per location: X,XXX sq ft minimum

### SERVICE CRITERIA
**Primary Focus Services (REQUIRED - deals must have these):**
- [Service 1] - Why it's core to buyer thesis
- [Service 2] - Why it matters for margins
- [Service 3] - Why it drives recurring revenue

**Preferred Services (bonus points):**
- [Service 1] - Why it adds value
- [Service 2] - How it complements core
- [Service 3] - Growth opportunity

**Services to Avoid (EXCLUDED - red flags):**
- [Service 1] - Specific reason to avoid
- [Service 2] - Specific issue
- [Service 3] - Why problematic

**Business Model Requirements:**
- Preferred model: B2B / B2C / Mixed (choose one)
- Recurring revenue minimum: XX%
- Contract preference: Long-term / Annual / As-needed

### GEOGRAPHY CRITERIA
**Priority Regions (Highest Buyer Density):**
1. [Region with specific states] - Why attractive for buyers
2. [Region with specific states] - Why attractive
3. [Region with specific states] - Why attractive
4. [Region with specific states] - Why attractive
5. [Region with specific states] - Why attractive

**Priority Metros (Top 15):**
| Metro | State | Population | Growth Rate | Why Priority |
| [City 1] | [ST] | [X.X]M | [X]% | [Reason] |
| [City 2] | [ST] | [X.X]M | [X]% | [Reason] |
(Continue for 15 cities minimum with REAL data)

**Geographic Rules:**
- Minimum market population: XXX,000
- Density preference: Dense single-market / Regional / National
- Single location rule: Same state / Adjacent states / Regional
- Multi-location rule: Adjacent states / Same region / National OK

**Regions to Avoid:**
- [Region 1] - Specific reason
- [Region 2] - Specific reason

### BUYER TYPES
**Active Buyer Categories (in priority order):**

**1. Large National Platforms (Priority 1)**
- Ownership: Large PE-backed ($500M+ fund)
- Target EBITDA: $1.5M+ 
- Target Locations: 3+
- Revenue per Location: $2M+
- Geographic scope: National footprint
- Acquisition style: Multi-location preferred, single if exceptional
- Examples: [List 3-5 real or archetypal platform names for this industry]

**2. Regional Platforms (Priority 2)**
- Ownership: Mid-market PE ($100-500M fund)
- Target EBITDA: $500K-$2M
- Target Locations: 2+
- Geographic scope: Regional (adjacent states)
- Acquisition style: Tuck-ins within footprint
- Examples: [List 3-5 names]

**3. Emerging Platforms (Priority 3)**
- Ownership: Lower-mid PE, family offices
- Target EBITDA: $300K-$1M
- Target Locations: Can be single
- Geographic scope: State or metro level
- Acquisition style: Platform formation or early add-ons
- Examples: [List 3-5 names]

**4. Strategic Acquirers (Priority 4)**
- Ownership: Corporate, private, family-owned
- Target EBITDA: Varies, often smaller
- Geographic scope: Typically regional
- Acquisition style: Horizontal or vertical integration
- Categories: [List specific strategic buyer types for this industry]

**5. Individual/Search Funds (Priority 5)**
- Ownership: Individual operators, ETA
- Target EBITDA: $250K-$750K
- Target Locations: Single OK
- Geographic scope: Local (specific metro)
- Acquisition style: First acquisition, owner-operator
- Best fit: Smaller deals with clean operations and strong cash flow`
  },
  {
    id: "3c",
    name: "Example Evaluation & Application",
    prompt: `# PHASE 3C: EXAMPLE EVALUATION & APPLICATION

Generate a complete worked example (4,000+ words).

## SAMPLE COMPANY EVALUATION

### Company Profile
Create a realistic example company:
- Company Name: [Fictional but realistic name]
- Industry Segment: [Specific segment]
- Revenue: $X.XM (specific amount)
- EBITDA: $X.XM (XX% margin)
- Locations: X
- Employees: XX
- Geography: [Specific metro]
- Years in Business: XX
- Ownership: [Current structure]
- Service Mix: [Detailed breakdown]
- Key Differentiators: [3-4 specific points]

### Financial Score Walkthrough
Apply the financial scorecard:
| Metric | Company Value | Score | Notes |
| EBITDA Amount | | /5 | |
| EBITDA Margin | | /5 | |
| Revenue Growth | | /5 | |
| Recurring % | | /5 | |
| Concentration | | /5 | |
| Revenue | | /5 | |
**Weighted Financial Score: X.X/5.0**

### Operational Score Walkthrough
Apply operational scorecard:
(Score each operational KPI with specific reasoning)
**Weighted Operational Score: X.X/5.0**

### Strategic Score Walkthrough
Apply strategic scorecard:
(Score each strategic factor with specific reasoning)
**Weighted Strategic Score: X.X/5.0**

### Composite Rating
- Overall Score: X.X/5.0
- Rating: Premium / Above Average / Average / Below Average
- Expected Multiple: X.X-X.Xx EBITDA
- Enterprise Value Range: $X.XM - $X.XM

### Buyer Matching
Based on this company profile:
1. **Most Likely Buyer Type:** [From buyer types] - Why
2. **Secondary Buyer Type:** [Alternative] - Why
3. **Unlikely Fits:** [Which buyers won't be interested] - Why
4. **Recommended Process:** Targeted / Broad / Full Auction
5. **Expected Timeline:** X-X months
6. **Key Selling Points:** [List 4-5]
7. **Potential Concerns to Address:** [List 3-4]

### Value Enhancement Recommendations
What could increase value:
1. [Specific improvement] - Expected impact: +$XK-$XK
2. [Specific improvement] - Expected impact: +X.X multiple
(Continue with 5-6 specific recommendations)`
  }
];

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
  hasBuyerTypes: boolean;
  hasPrimaryFocus: boolean;
}

function validateQuality(content: string, industryName: string): QualityResult {
  const wordCount = content.split(/\s+/).length;
  
  const tableLines = (content.match(/\|.*\|/g) || []);
  const tableCount = Math.floor(tableLines.length / 3);
  const dataRowCount = tableLines.filter(line => /\d+[%$]?/.test(line)).length;
  
  const placeholderPatterns = [
    /\[X+\]/gi,
    /\$X+[MKB]?\b/gi,
    /\bX+%/gi,
    /\[Value\]/gi,
    /\[Industry\]/gi,
    /\[Specific\]/gi,
    /\[Name\]/gi,
    /\[City\]/gi,
    /\bXX+,XXX\b/g,
  ];
  
  let placeholderCount = 0;
  for (const pattern of placeholderPatterns) {
    placeholderCount += (content.match(pattern) || []).length;
  }
  
  const industryRegex = new RegExp(industryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const industryMentions = (content.match(industryRegex) || []).length;
  
  const hasCriteria = /BUYER FIT CRITERIA SUMMARY/i.test(content);
  const hasBuyerTypes = /### BUYER TYPES/i.test(content) && /Priority \d/i.test(content);
  const hasPrimaryFocus = /Primary Focus Services/i.test(content);
  
  const requiredSections = ["NAICS", "EBITDA", "SIZE CRITERIA", "SERVICE CRITERIA", "GEOGRAPHY CRITERIA", "BUYER TYPES", "SCORECARD"];
  const sectionsToFind = [
    "INDUSTRY DEFINITION", "TERMINOLOGY", "BUSINESS MODEL", "ECONOMICS",
    "COMPETITIVE LANDSCAPE", "FINANCIAL ATTRACTIVENESS", "OPERATIONAL ATTRACTIVENESS",
    "DEAL KILLER", "SELLER EVALUATION", "BUYER FIT CRITERIA"
  ];
  
  const contentUpper = content.toUpperCase();
  const sectionsFound = sectionsToFind.filter(s => contentUpper.includes(s));
  const missingElements = requiredSections.filter(e => !contentUpper.includes(e));
  
  const issues: string[] = [];
  
  if (wordCount < 25000) issues.push(`Word count ${wordCount.toLocaleString()} below target 25,000`);
  if (tableCount < 25) issues.push(`Table count ${tableCount} below target 25`);
  if (placeholderCount > 15) issues.push(`${placeholderCount} placeholders detected`);
  if (industryMentions < 40) issues.push(`Industry mentioned only ${industryMentions} times`);
  if (!hasCriteria) issues.push("MISSING: BUYER FIT CRITERIA SUMMARY section");
  if (!hasBuyerTypes) issues.push("MISSING: BUYER TYPES with priority ordering");
  if (!hasPrimaryFocus) issues.push("MISSING: Primary Focus Services");
  if (dataRowCount < 100) issues.push(`Only ${dataRowCount} data rows (target 100+)`);
  
  let score = 0;
  score += Math.min(25, (wordCount / 30000) * 25);
  score += Math.min(15, (sectionsFound.length / 10) * 15);
  score += Math.min(15, (tableCount / 30) * 15);
  score += Math.min(10, ((requiredSections.length - missingElements.length) / requiredSections.length) * 10);
  score += Math.min(10, Math.max(0, (20 - placeholderCount) / 20) * 10);
  score += Math.min(10, (industryMentions / 50) * 10);
  score += Math.min(5, (dataRowCount / 120) * 5);
  score += hasCriteria ? 4 : 0;
  score += hasBuyerTypes ? 4 : 0;
  score += hasPrimaryFocus ? 2 : 0;
  
  return {
    passed: score >= 70 && hasCriteria && hasBuyerTypes && missingElements.length <= 2,
    score: Math.round(score),
    wordCount,
    sectionsFound,
    missingElements,
    tableCount,
    placeholderCount,
    industryMentions,
    dataRowCount,
    issues,
    hasCriteria,
    hasBuyerTypes,
    hasPrimaryFocus
  };
}

// AI-based criteria extraction using tool calling
async function extractCriteriaWithAI(content: string, apiKey: string): Promise<{
  sizeCriteria?: string;
  serviceCriteria?: string;
  geographyCriteria?: string;
  buyerTypesCriteria?: string;
}> {
  // First try regex extraction
  const regexCriteria = extractCriteriaWithRegex(content);
  
  // Check if regex extraction found substantial content
  const hasSubstantialContent = 
    (regexCriteria.sizeCriteria?.length || 0) > 200 &&
    (regexCriteria.serviceCriteria?.length || 0) > 200 &&
    (regexCriteria.geographyCriteria?.length || 0) > 200 &&
    (regexCriteria.buyerTypesCriteria?.length || 0) > 500;
  
  if (hasSubstantialContent) {
    console.log('[generate-ma-guide] Regex extraction successful');
    return regexCriteria;
  }
  
  // Fall back to AI extraction
  console.log('[generate-ma-guide] Using AI extraction as fallback');
  
  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You extract buyer fit criteria from M&A guides. Return the EXACT text for each criteria section.`
          },
          {
            role: 'user',
            content: `Extract the buyer fit criteria sections from this M&A guide. Return the exact text for each section:\n\n${content.slice(-30000)}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_criteria_sections',
            description: 'Extract buyer fit criteria sections',
            parameters: {
              type: 'object',
              properties: {
                sizeCriteria: { type: 'string', description: 'Complete SIZE CRITERIA section text' },
                serviceCriteria: { type: 'string', description: 'Complete SERVICE CRITERIA section text' },
                geographyCriteria: { type: 'string', description: 'Complete GEOGRAPHY CRITERIA section text' },
                buyerTypesCriteria: { type: 'string', description: 'Complete BUYER TYPES section text' }
              },
              required: ['sizeCriteria', 'serviceCriteria', 'geographyCriteria', 'buyerTypesCriteria']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_criteria_sections' } }
      }),
    });

    if (!response.ok) {
      console.error('[generate-ma-guide] AI extraction failed:', response.status);
      return regexCriteria;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const extracted = JSON.parse(toolCall.function.arguments);
      return {
        sizeCriteria: extracted.sizeCriteria || regexCriteria.sizeCriteria,
        serviceCriteria: extracted.serviceCriteria || regexCriteria.serviceCriteria,
        geographyCriteria: extracted.geographyCriteria || regexCriteria.geographyCriteria,
        buyerTypesCriteria: extracted.buyerTypesCriteria || regexCriteria.buyerTypesCriteria
      };
    }
  } catch (error) {
    console.error('[generate-ma-guide] AI extraction error:', error);
  }
  
  return regexCriteria;
}

function extractCriteriaWithRegex(content: string): {
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

  const summaryMatch = content.match(/## BUYER FIT CRITERIA SUMMARY([\s\S]*?)(?=## [A-Z]|# PHASE|$)/i);
  const searchText = summaryMatch ? summaryMatch[1] : content;

  const sizeMatch = searchText.match(/### SIZE CRITERIA([\s\S]*?)(?=### SERVICE|### GEOGRAPHY|### BUYER|## )/i);
  if (sizeMatch) criteria.sizeCriteria = sizeMatch[1].trim().substring(0, 5000);

  const serviceMatch = searchText.match(/### SERVICE CRITERIA([\s\S]*?)(?=### SIZE|### GEOGRAPHY|### BUYER|## )/i);
  if (serviceMatch) criteria.serviceCriteria = serviceMatch[1].trim().substring(0, 5000);

  const geoMatch = searchText.match(/### GEOGRAPHY CRITERIA([\s\S]*?)(?=### SIZE|### SERVICE|### BUYER|## )/i);
  if (geoMatch) criteria.geographyCriteria = geoMatch[1].trim().substring(0, 5000);

  const buyerMatch = searchText.match(/### BUYER TYPES([\s\S]*?)(?=### SIZE|### SERVICE|### GEOGRAPHY|## [A-Z]|# PHASE)/i);
  if (buyerMatch) criteria.buyerTypesCriteria = buyerMatch[1].trim().substring(0, 8000);

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-ma-guide] Starting for: ${industryName} with ${SUB_PHASES.length} sub-phases`);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        let fullContent = "";
        
        try {
          for (let i = 0; i < SUB_PHASES.length; i++) {
            const subPhase = SUB_PHASES[i];
            const phaseNum = Math.floor(i / 4) + 1;
            
            console.log(`[generate-ma-guide] Sub-phase ${subPhase.id}: ${subPhase.name}`);
            
            sendEvent({
              type: 'phase_start',
              phase: phaseNum,
              subPhase: subPhase.id,
              totalPhases: 3,
              phaseName: subPhase.name
            });

            const userPrompt = `Generate comprehensive M&A intelligence for: ${industryName}

${subPhase.prompt}

CRITICAL REQUIREMENTS:
- Generate 4,000-6,000 words for this section
- NO PLACEHOLDERS - use real numbers and city names
- Every table must have 6+ rows of real data
- Be specific to the ${industryName} industry
- This is for professional M&A advisors

Industry: ${industryName}`;

            let retryCount = 0;
            const maxRetries = 2;
            let phaseContent = "";

            while (retryCount <= maxRetries) {
              try {
                const response = await fetch(LOVABLE_AI_URL, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: DEFAULT_MODEL,
                    messages: [
                      { role: 'system', content: SYSTEM_PROMPT },
                      { role: 'user', content: userPrompt }
                    ],
                    stream: true,
                  }),
                });

                if (response.status === 429) {
                  console.log(`[generate-ma-guide] Rate limited, waiting 5 seconds...`);
                  await new Promise(r => setTimeout(r, 5000));
                  retryCount++;
                  continue;
                }

                if (response.status === 402) {
                  sendEvent({ type: 'error', message: 'AI credits exhausted. Please add credits to continue.' });
                  controller.close();
                  return;
                }

                if (!response.ok) {
                  console.error(`[generate-ma-guide] Sub-phase ${subPhase.id} error:`, response.status);
                  retryCount++;
                  continue;
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('No response body');

                const decoder = new TextDecoder();
                let buffer = "";

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
                        
                        const subPhaseProgress = Math.min(100, (phaseContent.length / 25000) * 100);
                        const overallProgress = ((i * 100) + subPhaseProgress) / SUB_PHASES.length;
                        
                        sendEvent({
                          type: 'content',
                          content,
                          phase: phaseNum,
                          subPhase: subPhase.id,
                          phaseName: subPhase.name,
                          overallProgress: Math.round(overallProgress)
                        });
                      }
                    } catch {
                      // Skip malformed JSON
                    }
                  }
                }

                break; // Success, exit retry loop
              } catch (error) {
                console.error(`[generate-ma-guide] Sub-phase ${subPhase.id} error:`, error);
                retryCount++;
                if (retryCount > maxRetries) {
                  sendEvent({ type: 'error', message: `Sub-phase ${subPhase.id} failed after ${maxRetries} retries` });
                }
              }
            }

            const phaseWordCount = phaseContent.split(/\s+/).length;
            console.log(`[generate-ma-guide] Sub-phase ${subPhase.id} complete: ${phaseWordCount} words`);
            
            sendEvent({
              type: 'phase_complete',
              phase: phaseNum,
              subPhase: subPhase.id,
              phaseName: subPhase.name,
              phaseWordCount
            });

            fullContent += "\n\n---\n\n";
          }

          // Quality validation
          console.log('[generate-ma-guide] Running quality validation...');
          sendEvent({ type: 'quality_check_start' });
          
          const quality = validateQuality(fullContent, industryName);
          console.log('[generate-ma-guide] Quality:', JSON.stringify({
            score: quality.score,
            wordCount: quality.wordCount,
            hasCriteria: quality.hasCriteria,
            hasBuyerTypes: quality.hasBuyerTypes
          }));
          
          sendEvent({ type: 'quality_check_result', ...quality });

          // Extract criteria using AI-enhanced extraction
          console.log('[generate-ma-guide] Extracting criteria...');
          const criteria = await extractCriteriaWithAI(fullContent, LOVABLE_API_KEY);
          const criteriaKeys = Object.keys(criteria).filter(k => criteria[k as keyof typeof criteria]);
          console.log('[generate-ma-guide] Extracted criteria sections:', criteriaKeys);
          
          sendEvent({ type: 'criteria', criteria, criteriaKeys });

          // Final complete event
          const finalWordCount = fullContent.split(/\s+/).length;
          sendEvent({
            type: 'complete',
            content: fullContent,
            wordCount: finalWordCount,
            criteria,
            quality
          });

          console.log(`[generate-ma-guide] Complete. Words: ${finalWordCount}, Score: ${quality.score}`);

        } catch (error) {
          console.error('[generate-ma-guide] Error:', error);
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
    console.error('[generate-ma-guide] Request error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
