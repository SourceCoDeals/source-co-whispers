import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ENHANCED SYSTEM PROMPT - Forces deep research and specific data
const SYSTEM_PROMPT = `You are an elite M&A industry research analyst creating THE DEFINITIVE intelligence guide that investment bankers and PE professionals will reference for years.

## YOUR MISSION
Generate COMPREHENSIVE, ACTIONABLE M&A intelligence that enables:
1. Deal sourcing teams to identify attractive targets
2. Investment committees to evaluate opportunities
3. Operating partners to assess integration feasibility
4. Lenders to underwrite financing

## ABSOLUTE REQUIREMENTS

### CONTENT DEPTH
- MINIMUM 8,000 words per phase (24,000+ total)
- Every section must be substantive with 500+ words
- Tables must have 6+ rows with real data
- Every metric needs specific benchmark numbers

### NO PLACEHOLDERS - REAL DATA ONLY
You are FORBIDDEN from using:
- "X%" or "$XM" or "XX-XX" 
- "[Value]" or "[Industry]" or "[Specific]"
- "Typically" without specific numbers
- Ranges without endpoints (use "15-25%" not "varies")

### RESEARCH STANDARDS
For every claim, you must provide:
- Specific numbers (e.g., "EBITDA margins of 18-25%" not "healthy margins")
- Industry context (why this number matters)
- Buyer implications (how PE/strategics view this)

### TABLES MUST CONTAIN
- Actual dollar amounts (e.g., "$2.5M", "$500K")
- Actual percentages (e.g., "22%", "3-5%")
- Named examples where applicable
- At least 6-8 rows per table

## OUTPUT STRUCTURE
Your output will be used to:
1. Populate scoring criteria for deal evaluation
2. Match deals with appropriate buyers
3. Train analysts on industry dynamics

Write as if this will be the ONLY resource someone has to evaluate a deal in this industry.`;

// ENHANCED PHASE PROMPTS - Each drives toward scoring criteria output
const PHASE_PROMPTS = {
  phase1: {
    name: "Industry Fundamentals & Economics",
    minWords: 10000,
    instruction: `# PHASE 1: INDUSTRY FUNDAMENTALS & ECONOMICS

Generate comprehensive industry fundamentals that will enable deal evaluation.

## REQUIRED SECTIONS (complete ALL with extensive detail)

### 1. INDUSTRY DEFINITION (800+ words)
**NAICS Classification:**
- Primary 6-digit NAICS code: [ACTUAL CODE]
- Related NAICS codes: [LIST ACTUAL CODES]
- SIC code equivalents: [ACTUAL CODES]

**Industry Scope:**
CREATE TABLE: Industry Segmentation
| Segment | Description | % of Market | Avg Revenue | EBITDA Margin | PE Interest Level |
(Include 6-8 distinct segments with real data)

**Market Size & Growth:**
- Total addressable market: $[X]B (cite source)
- Number of businesses: [X],000
- 5-year CAGR: [X]%
- Key growth drivers: [list with specifics]

### 2. TERMINOLOGY GLOSSARY (1,000+ words)
CREATE TABLE: Industry Terminology (30+ terms minimum)
| Term | Definition | M&A Relevance | Typical Range/Benchmark |
| Example Term | What it means | Why buyers care | Industry standard value |

Include terms for:
- Financial metrics unique to this industry
- Operational KPIs buyers analyze
- Customer/service terminology
- Regulatory/licensing terms
- Technology/systems used

### 3. BUSINESS MODELS DEEP DIVE (1,500+ words)
For EACH business model in this industry:

CREATE TABLE: Business Model Comparison
| Model | Revenue Structure | Gross Margin | EBITDA Margin | Scalability | Buyer Preference | Multiple Impact |
(Include 4-6 models with specific margins)

**Revenue Model Analysis:**
CREATE TABLE: Revenue Model Impact on Valuation
| Revenue Type | % Recurring | Predictability Score | Multiple Premium/Discount |
| Recurring/Subscription | [X]% | High | +1.5-2.0x |
| Repeat Customer | [X]% | Medium | +0.5-1.0x |
| Project-Based | [X]% | Low | -0.5-1.0x |
| One-Time | [X]% | Very Low | -1.0-2.0x |

### 4. INDUSTRY ECOSYSTEM (1,200+ words)
**Customer Analysis:**
CREATE TABLE: Customer Segmentation
| Customer Type | % of Revenue | LTV | Acquisition Cost | Switching Cost | Concentration Risk |

**Supplier Dynamics:**
CREATE TABLE: Key Supplier Categories
| Category | Concentration | Switching Cost | Margin Impact | DD Focus Areas |

**Regulatory Environment:**
CREATE TABLE: Licensing & Compliance Requirements
| Requirement | Type | Cost | Timeline | Renewal | Risk Level |
(List ALL licenses, certifications, compliance requirements)

### 5. INDUSTRY ECONOMICS (2,000+ words)

**Cost Structure Analysis:**
CREATE TABLE: Detailed P&L Benchmarks
| Line Item | Bottom Quartile | Median | Top Quartile | Top Decile | Notes |
| Revenue | 100% | 100% | 100% | 100% | - |
| COGS | [X]% | [X]% | [X]% | [X]% | [Key drivers] |
| Labor | [X]% | [X]% | [X]% | [X]% | [Includes X] |
| Occupancy | [X]% | [X]% | [X]% | [X]% | [Notes] |
| Marketing | [X]% | [X]% | [X]% | [X]% | [Channels] |
| Insurance | [X]% | [X]% | [X]% | [X]% | [Types] |
| G&A | [X]% | [X]% | [X]% | [X]% | [Components] |
| Owner Comp | [X]% | [X]% | [X]% | [X]% | [Market rate] |
| EBITDA | [X]% | [X]% | [X]% | [X]% | [Target] |

**Unit Economics:**
CREATE TABLE: Unit Economics by Scale
| Revenue Level | Revenue/Employee | Revenue/Location | EBITDA % | Owner Involvement |
| <$1M | $[X]K | $[X]K | [X]% | [Description] |
| $1-2M | $[X]K | $[X]K | [X]% | [Description] |
| $2-5M | $[X]K | $[X]K | [X]% | [Description] |
| $5-10M | $[X]K | $[X]K | [X]% | [Description] |
| $10-25M | $[X]K | $[X]K | [X]% | [Description] |
| $25M+ | $[X]K | $[X]K | [X]% | [Description] |

### 6. COMPETITIVE LANDSCAPE (1,500+ words)

**Market Structure:**
- Fragmentation level: [Highly fragmented / Moderately / Consolidated]
- Top 10 market share: [X]%
- Number of PE-backed platforms: [X]+
- Consolidation trend: [Accelerating / Stable / Slowing]

CREATE TABLE: Active Acquirers (10+ entries)
| Acquirer Name | Type | Sponsor (if PE) | Target Size | Geographic Focus | Est. # Acquisitions |
| [Name] | [PE Platform/Strategic/Independent] | [Sponsor] | $[X]-[X]M Rev | [Region] | [X]+ |

CREATE TABLE: Recent Notable Transactions (5+ entries)
| Date | Acquirer | Target | Revenue | Multiple (if known) | Deal Notes |

**Barriers to Entry:**
CREATE TABLE: Competitive Moat Analysis
| Moat Type | Strength (1-10) | Description | Value Impact |

REMEMBER: This phase must be AT LEAST 10,000 words with real, specific data.`
  },

  phase2: {
    name: "Acquisition Attractiveness Factors",
    minWords: 10000,
    instruction: `# PHASE 2: ACQUISITION ATTRACTIVENESS FACTORS

Generate comprehensive criteria for evaluating deal attractiveness.

## REQUIRED SECTIONS

### 7. FINANCIAL ATTRACTIVENESS (2,500+ words)

**EBITDA Size & Buyer Mapping:**
CREATE TABLE: EBITDA-to-Buyer Matrix
| EBITDA Range | Primary Buyer Type | Typical Multiple | Deal Structure | Competition Level |
| <$250K | Individual operators, search funds | 2.0-3.0x | 100% cash, SBA | Low |
| $250-500K | Small PE, family offices | 3.0-4.0x | 70% cash, 30% seller note | Moderate |
| $500K-1M | Lower-mid PE, platforms | 4.0-5.0x | 60% cash, earnout | Moderate |
| $1-2M | Mid-market PE, strategics | 5.0-6.0x | Mix of structures | High |
| $2-3M | Mid-market PE platforms | 5.5-7.0x | Equity rollover common | High |
| $3-5M | Upper-mid PE, large strategics | 6.0-8.0x | Structured deals | Very High |
| $5-10M | Large PE, public strategics | 7.0-10.0x | Competitive processes | Very High |
| $10M+ | Mega-cap PE, Fortune 500 | 8.0-12.0x | Full auction | Extremely High |

**EBITDA Margin Benchmarks:**
CREATE TABLE: Margin Quality Assessment
| EBITDA Margin | Percentile | Quality Signal | Multiple Impact | Buyer Reaction |
| <10% | Bottom 25% | Operational issues or growth investment | -1.0-1.5x | Due diligence concerns |
| 10-15% | 25-50% | Below average, room for improvement | -0.5x | Platform opportunity |
| 15-20% | 50-75% | Solid performance | Baseline | Standard interest |
| 20-25% | 75-90% | Above average | +0.5-1.0x | Competitive interest |
| 25-30% | 90-95% | Excellent | +1.0-1.5x | Premium pricing |
| 30%+ | Top 5% | Exceptional | +1.5-2.0x | Auction candidate |

**Revenue Quality:**
CREATE TABLE: Revenue Quality Assessment
| Factor | Premium Indicator | Baseline | Discount Indicator |
| Recurring % | >70% recurring | 30-70% recurring | <30% recurring |
| Growth Rate | >15% YoY | 5-15% YoY | <5% or declining |
| Concentration | Top customer <10% | Top customer 10-20% | Top customer >20% |
| Seasonality | <20% variation | 20-40% variation | >40% variation |

**Customer Concentration Impact:**
CREATE TABLE: Concentration Risk Matrix
| Top Customer % | Top 5 Customers % | Risk Level | Multiple Impact | Mitigation Options |
| <5% | <20% | Minimal | None | N/A |
| 5-10% | 20-35% | Low | -0.25x | Customer contracts |
| 10-15% | 35-50% | Moderate | -0.5x | Diversification plan |
| 15-20% | 50-65% | Elevated | -0.75x | Earnout protection |
| 20-30% | 65-80% | High | -1.0x | Customer retention agreement |
| >30% | >80% | Severe | -1.5x+ or deal killer | May require customer co-investment |

### 8. OPERATIONAL ATTRACTIVENESS (2,500+ words)

**Industry-Specific KPIs:**
CREATE TABLE: Critical KPIs for This Industry (10+ KPIs)
| KPI | Definition | Bottom Quartile | Median | Top Quartile | Top Decile | Weight in Scoring |
| [Metric 1] | [Definition] | [Value] | [Value] | [Value] | [Value] | [X]% |
| [Metric 2] | [Definition] | [Value] | [Value] | [Value] | [Value] | [X]% |
(Continue for 10+ industry-specific KPIs)

**Management Assessment:**
CREATE TABLE: Management Team Evaluation
| Factor | Score 5 (Excellent) | Score 4 | Score 3 (Adequate) | Score 2 | Score 1 (Weak) |
| Depth | Full C-suite + directors | Most roles filled | Key roles filled | Gaps exist | Owner-only |
| Tenure | 10+ years average | 5-10 years | 3-5 years | 1-3 years | <1 year |
| Succession | Ready successor | Plan in place | Identified candidates | Early planning | No plan |
| Industry Expertise | Deep specialists | Strong background | Relevant experience | Some experience | Limited |

**Technology & Systems:**
CREATE TABLE: Technology Maturity Assessment
| System Area | Modern (5) | Current (4) | Adequate (3) | Dated (2) | Legacy (1) |
| ERP/Accounting | Cloud-native | Modern cloud | Desktop software | Spreadsheets | Paper |
| CRM/Sales | Enterprise CRM | Mid-market CRM | Basic CRM | Contact lists | None |
| Operations | Integrated platform | Specialized tools | Basic tools | Manual processes | Paper |
| Marketing | Full stack | Core tools | Basic presence | Minimal | None |

**Owner Dependency:**
CREATE TABLE: Owner Dependency Assessment
| Dependency Level | Owner Hours/Week | Critical Functions | Transition Timeline | Value Impact |
| Minimal | <20 | Strategic only | 3-6 months | None |
| Low | 20-30 | Sales relationships | 6-12 months | None |
| Moderate | 30-40 | Key accounts, operations | 12-18 months | -0.5x |
| High | 40-50 | Most customer relationships | 18-24 months | -1.0x |
| Severe | 50+ | Everything | 24+ months | -1.5x or deal killer |

### 9. STRATEGIC ATTRACTIVENESS (2,500+ words)

**Geographic Market Value:**
CREATE TABLE: Market Tier Classification
| Tier | Population Range | Characteristics | PE Interest | Multiple Premium |
| Tier 1 | 2M+ metro | Major markets, deep labor pools | Very High | +0.5-1.0x |
| Tier 2 | 500K-2M | Strong secondary markets | High | +0.25-0.5x |
| Tier 3 | 200K-500K | Solid regional markets | Moderate | Baseline |
| Tier 4 | <200K | Small markets, limited scale | Lower | -0.25-0.5x |

CREATE TABLE: Priority Markets for This Industry (15+ metros)
| Metro Area | State | Population | Growth Rate | Industry Density | Buyer Activity |
| [City] | [State] | [X.X]M | [X]% | High/Medium/Low | [Description] |

**Competitive Moats:**
CREATE TABLE: Sustainable Competitive Advantages
| Moat Type | Example in This Industry | Durability | Value Multiple Impact |
| Licenses/Certifications | [Specific examples] | High | +0.5-1.0x |
| Long-term Contracts | [Specific examples] | Medium-High | +0.5-1.5x |
| Brand Recognition | [Specific examples] | Medium | +0.25-0.5x |
| Geographic Density | [Specific examples] | High | +0.5-1.0x |
| Proprietary Systems | [Specific examples] | Medium-High | +0.5-1.0x |
| Supplier Relationships | [Specific examples] | Medium | +0.25x |

### 10. DEAL KILLERS & RED FLAGS (2,000+ words)

CREATE TABLE: Absolute Deal Killers
| Issue | Threshold | Why It Kills Deals | Frequency |
| Revenue Decline | >15% YoY decline | Unclear recovery path | [X]% of deals |
| Regulatory Violation | Active enforcement | Liability exposure | [X]% of deals |
| Key Customer Loss | >25% revenue at risk | Value destruction | [X]% of deals |
| Litigation | Material pending claims | Uncertainty | [X]% of deals |
| Environmental | Contamination issues | Unlimited liability | [X]% of deals |

CREATE TABLE: Yellow Flags vs Red Flags
| Issue | Yellow Flag Threshold | Red Flag Threshold | Deal Killer |
| Owner Dependency | Moderate involvement | Critical involvement | Owner is the business |
| Margin Trend | Flat | Declining | Accelerating decline |
| Employee Turnover | Above average | High | Key person departures |
| AR Quality | Aging | Significant write-offs | Collectability issues |
| Deferred Maintenance | Minor | Significant | Safety/compliance risk |

REMEMBER: This phase must be AT LEAST 10,000 words with real, specific data.`
  },

  phase3: {
    name: "Buyer Matching & Scoring Criteria",
    minWords: 10000,
    instruction: `# PHASE 3: BUYER MATCHING & SCORING CRITERIA

THIS PHASE IS CRITICAL - It generates the criteria used for automated deal scoring and buyer matching.

## REQUIRED SECTIONS

### 11. SELLER EVALUATION SCORECARDS (2,000+ words)

CREATE TABLE: Financial Scorecard
| Metric | Weight | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
| EBITDA Amount | 25% | >$3M | $1.5-3M | $750K-1.5M | $350-750K | <$350K |
| EBITDA Margin | 20% | >25% | 20-25% | 15-20% | 10-15% | <10% |
| Revenue Growth | 15% | >15% | 10-15% | 5-10% | 0-5% | Declining |
| Recurring % | 15% | >70% | 50-70% | 30-50% | 15-30% | <15% |
| Concentration | 15% | <5% top | 5-10% | 10-15% | 15-25% | >25% |
| Revenue Amount | 10% | >$15M | $8-15M | $3-8M | $1.5-3M | <$1.5M |

CREATE TABLE: Operational Scorecard (Use industry-specific KPIs from Phase 2)
| KPI | Weight | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
| [Industry KPI 1] | [X]% | [Excellent] | [Good] | [Adequate] | [Below Avg] | [Poor] |
(Include 6-8 industry-specific operational KPIs with specific thresholds)

CREATE TABLE: Strategic Scorecard
| Factor | Weight | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
| Market Quality | 25% | Tier 1 metro | Tier 2 metro | Tier 3 | Tier 4 | Rural |
| Competitive Moats | 25% | Multiple strong | 1-2 strong | Some moats | Weak moats | None |
| Growth Runway | 20% | Significant | Good | Moderate | Limited | Saturated |
| Management Depth | 15% | Full team | Most roles | Key roles | Gaps | Owner-only |
| Technology | 15% | Modern | Current | Adequate | Dated | Legacy |

### 12. BUYER MATCHING CRITERIA - CRITICAL SECTION

**THIS SECTION MUST FOLLOW THIS EXACT FORMAT FOR SYSTEM PARSING**

---

## BUYER FIT CRITERIA SUMMARY

### SIZE CRITERIA
**Revenue Thresholds:**
- Minimum revenue for PE interest: $[X.X]M
- Preferred revenue range: $[X]M to $[XX]M
- Optimal revenue sweet spot: $[X]M to $[X]M
- Maximum revenue before strategic-only: $[XX]M+

**EBITDA Thresholds:**
- Minimum EBITDA for PE interest: $[XXX]K
- Preferred EBITDA range: $[XXX]K to $[X.X]M
- Optimal EBITDA sweet spot: $[X.X]M to $[X]M
- Add-on minimum EBITDA: $[XXX]K

**Other Size Metrics:**
- Minimum employees: [XX]
- Preferred employee range: [XX] to [XXX]
- Minimum locations: [X]
- Preferred location count: [X] to [XX]
- Revenue per location minimum: $[X.X]M
- Square footage per location: [X,XXX] sq ft minimum

### SERVICE CRITERIA
**Primary Focus Services (REQUIRED - deals must have these):**
- [Service Category 1] - Core to industry thesis
- [Service Category 2] - High margin contributor
- [Service Category 3] - Recurring revenue driver

**Preferred Services (bonus points):**
- [Service 1] - Adds value because [reason]
- [Service 2] - Complements core because [reason]
- [Service 3] - Growth opportunity

**Services to Avoid (EXCLUDED - red flags):**
- [Service 1] - Avoid because [specific reason]
- [Service 2] - Problematic due to [specific issue]

**Business Model Requirements:**
- Preferred model: [B2B / B2C / Mixed]
- Recurring revenue minimum: [XX]%
- Customer contract preference: [Long-term / Annual / As-needed]

### GEOGRAPHY CRITERIA
**Priority Regions (Highest Buyer Density):**
1. [Region 1 - e.g., "Southeast (FL, GA, TX, NC)"] - [why attractive]
2. [Region 2] - [why attractive]
3. [Region 3] - [why attractive]
4. [Region 4] - [why attractive]
5. [Region 5] - [why attractive]

**Priority Metros (Top 15):**
| Metro | State | Population | Growth Rate | Why Priority |
| [City 1] | [ST] | [X.X]M | [X]% | [Reason] |
| [City 2] | [ST] | [X.X]M | [X]% | [Reason] |
(Continue for 15 cities minimum)

**Geographic Preferences:**
- Minimum market population: [XXX],000
- Preferred density: [Dense single-market / Regional multi-market / National]
- Single location rule: [Same state as buyer / Adjacent states OK / Regional OK]
- Multi-location rule: [Adjacent states / Same region / National OK]

**Regions to Avoid:**
- [Region 1] - [specific reason]
- [Region 2] - [specific reason]

### BUYER TYPES
**Active Buyer Categories (in priority order):**

**1. Large National Platforms (Priority 1)**
- Ownership: Large PE-backed ($500M+ fund)
- Target: $1.5M+ EBITDA, 3+ locations, $2M+ per location
- Geographic scope: National footprint
- Acquisition style: Multi-location preferred, will consider single if exceptional
- Examples: [List 3-5 actual or archetypal platform names]

**2. Regional Platforms (Priority 2)**
- Ownership: Mid-market PE-backed ($100-500M fund)
- Target: $500K-2M EBITDA, 2+ locations
- Geographic scope: Regional (adjacent states)
- Acquisition style: Tuck-ins within existing footprint
- Examples: [List 3-5 names]

**3. Emerging Platforms (Priority 3)**
- Ownership: Lower-mid PE, family offices
- Target: $300K-1M EBITDA, can be single location
- Geographic scope: State or metro level
- Acquisition style: Platform formation or early add-ons
- Examples: [List 3-5 names]

**4. Strategic Acquirers (Priority 4)**
- Ownership: Corporate, private, family-owned
- Target: Varies widely, often smaller
- Geographic scope: Typically regional
- Acquisition style: Horizontal or vertical integration
- Categories: [List specific strategic buyer types]

**5. Individual/Search Funds (Priority 5)**
- Ownership: Individual operators, ETA
- Target: $250K-750K EBITDA, single location OK
- Geographic scope: Local (specific metro)
- Acquisition style: First acquisition, owner-operator model
- Fit notes: Strong for smaller deals with clean operations

---

### 13. VALUATION BENCHMARKS (2,000+ words)

CREATE TABLE: Multiple Ranges by Quality
| Quality Tier | EBITDA Multiple Range | Revenue Multiple | Characteristics |
| Premium | 7.0-10.0x | 1.5-2.5x | Top quartile all metrics, recurring, growth |
| Above Average | 5.5-7.0x | 1.0-1.5x | Strong metrics, some recurring, growing |
| Average | 4.0-5.5x | 0.7-1.0x | Median metrics, stable |
| Below Average | 3.0-4.0x | 0.5-0.7x | Some concerns, flat or slow growth |
| Distressed | 2.0-3.0x | 0.3-0.5x | Turnaround needed, declining |

CREATE TABLE: Multiple Adjustments
| Factor | Premium | Discount | Notes |
| Recurring Revenue >50% | +0.5-1.0x | N/A | Predictability premium |
| Owner Highly Involved | N/A | -0.5-1.0x | Transition risk |
| Growth >15% | +0.5-1.0x | N/A | Momentum value |
| Decline | N/A | -1.0-2.0x | Must explain trajectory |
| Customer Concentration >20% | N/A | -0.5-1.0x | Retention risk |
| Modern Systems | +0.25-0.5x | N/A | Integration ease |
| Real Estate Included | +0.5-1.5x | N/A | Asset value |

### 14. COMPLETE EVALUATION EXAMPLE (2,000+ words)

**SAMPLE COMPANY PROFILE:**
Create a realistic example company in this industry with:
- Company name: [Fictional but realistic]
- Revenue: $[X.X]M
- EBITDA: $[X.X]M ([XX]% margin)
- Locations: [X]
- Employees: [XX]
- Geography: [Specific metro]
- Years in business: [XX]
- Ownership: [Description]
- Services: [Specific mix]
- Key differentiators: [List]

**SCORECARD APPLICATION:**
Walk through each scorecard:
1. Financial Score: [X.X]/5.0 because...
2. Operational Score: [X.X]/5.0 because...
3. Strategic Score: [X.X]/5.0 because...

**COMPOSITE RATING:**
- Overall Score: [X.X]/5.0
- Rating: [Premium / Above Average / Average / Below Average]
- Expected Multiple: [X.X]-[X.X]x EBITDA
- Enterprise Value: $[X.X]M - $[X.X]M

**LIKELY BUYER MATCH:**
Based on this profile:
1. Most likely buyer type: [From Buyer Types above]
2. Secondary buyer type: [Alternative]
3. Recommended process: [Targeted / Broad / Auction]

REMEMBER: This phase must be AT LEAST 10,000 words. The BUYER FIT CRITERIA SUMMARY section is CRITICAL for the scoring system to work.`
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
  hasBuyerTypes: boolean;
  hasPrimaryFocus: boolean;
}

function validateQuality(content: string, industryName: string): QualityResult {
  const wordCount = content.split(/\s+/).length;
  
  // Count tables (rows with | delimiters)
  const tableLines = (content.match(/\|.*\|/g) || []);
  const tableCount = Math.floor(tableLines.length / 3);
  const dataRowCount = tableLines.filter(line => /\d+[%$]?/.test(line)).length;
  
  // Detect placeholders - strict patterns
  const placeholderPatterns = [
    /\[X+\]/gi,
    /\$X+[MKB]?\b/gi,
    /\bX+%/gi,
    /\bX+-X+%/gi,
    /\[Value\]/gi,
    /\[Industry\]/gi,
    /\[Specific\]/gi,
    /\[Name\]/gi,
    /\[City\]/gi,
    /\[Region\]/gi,
    /\[Service\]/gi,
    /\bXX+,XXX\b/g,
  ];
  
  let placeholderCount = 0;
  for (const pattern of placeholderPatterns) {
    const matches = content.match(pattern) || [];
    placeholderCount += matches.length;
  }
  
  // Count industry mentions
  const industryRegex = new RegExp(industryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const industryMentions = (content.match(industryRegex) || []).length;
  
  // Check for critical sections
  const hasCriteria = /BUYER FIT CRITERIA SUMMARY/i.test(content);
  const hasBuyerTypes = /BUYER TYPES/i.test(content) && /Priority \d/i.test(content);
  const hasPrimaryFocus = /Primary Focus Services/i.test(content) || /REQUIRED.*deals must have/i.test(content);
  
  const requiredSections = [
    "NAICS",
    "EBITDA",
    "SIZE CRITERIA",
    "SERVICE CRITERIA", 
    "GEOGRAPHY CRITERIA",
    "BUYER TYPES",
    "SCORECARD",
    "VALUATION"
  ];
  
  const sectionsToFind = [
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
  const sectionsFound = sectionsToFind.filter(s => contentUpper.includes(s));
  const missingElements = requiredSections.filter(e => !contentUpper.includes(e));
  
  const issues: string[] = [];
  
  if (wordCount < 20000) {
    issues.push(`Word count ${wordCount.toLocaleString()} below target 20,000`);
  }
  if (tableCount < 20) {
    issues.push(`Table count ${tableCount} below target 20`);
  }
  if (placeholderCount > 20) {
    issues.push(`${placeholderCount} placeholders detected (must reduce)`);
  }
  if (industryMentions < 30) {
    issues.push(`Industry mentioned only ${industryMentions} times (target 30+)`);
  }
  if (!hasCriteria) {
    issues.push("MISSING: BUYER FIT CRITERIA SUMMARY section");
  }
  if (!hasBuyerTypes) {
    issues.push("MISSING: Detailed BUYER TYPES with priority ordering");
  }
  if (!hasPrimaryFocus) {
    issues.push("MISSING: Primary Focus Services definition");
  }
  if (dataRowCount < 80) {
    issues.push(`Only ${dataRowCount} table rows with data (target 80+)`);
  }
  
  // Calculate score
  let score = 0;
  score += Math.min(20, (wordCount / 25000) * 20);
  score += Math.min(15, (sectionsFound.length / 14) * 15);
  score += Math.min(15, (tableCount / 25) * 15);
  score += Math.min(10, ((requiredSections.length - missingElements.length) / requiredSections.length) * 10);
  score += Math.min(10, Math.max(0, (30 - placeholderCount) / 30) * 10);
  score += Math.min(10, (industryMentions / 40) * 10);
  score += Math.min(10, (dataRowCount / 100) * 10);
  score += hasCriteria ? 3 : 0;
  score += hasBuyerTypes ? 4 : 0;
  score += hasPrimaryFocus ? 3 : 0;
  
  const passed = score >= 65 && hasCriteria && hasBuyerTypes && missingElements.length <= 2;
  
  return {
    passed,
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

// Extract criteria in a format that matches what parse-fit-criteria expects
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

  // Look for the BUYER FIT CRITERIA SUMMARY section first
  const summaryMatch = content.match(/## BUYER FIT CRITERIA SUMMARY([\s\S]*?)(?=### \d+\.|## [A-Z]|---|\n#\s[^#]|$)/i);
  const searchText = summaryMatch ? summaryMatch[1] : content;

  // SIZE CRITERIA - Look for the structured section
  const sizePatterns = [
    /### SIZE CRITERIA([\s\S]*?)(?=### SERVICE|### GEOGRAPHY|### BUYER|## \d|---)/i,
    /\*\*SIZE CRITERIA:?\*\*([\s\S]*?)(?=\*\*SERVICE|\*\*GEOGRAPHY|\*\*BUYER|## |---)/i,
    /SIZE CRITERIA\s*\n([\s\S]*?)(?=SERVICE CRITERIA|GEOGRAPHY|BUYER TYPE|## |---)/i
  ];
  
  for (const pattern of sizePatterns) {
    const match = searchText.match(pattern);
    if (match && match[1].trim().length > 100) {
      criteria.sizeCriteria = match[1].trim().substring(0, 4000);
      break;
    }
  }

  // SERVICE CRITERIA
  const servicePatterns = [
    /### SERVICE CRITERIA([\s\S]*?)(?=### SIZE|### GEOGRAPHY|### BUYER|## \d|---)/i,
    /\*\*SERVICE CRITERIA:?\*\*([\s\S]*?)(?=\*\*SIZE|\*\*GEOGRAPHY|\*\*BUYER|## |---)/i,
    /SERVICE CRITERIA\s*\n([\s\S]*?)(?=SIZE CRITERIA|GEOGRAPHY|BUYER TYPE|## |---)/i
  ];
  
  for (const pattern of servicePatterns) {
    const match = searchText.match(pattern);
    if (match && match[1].trim().length > 100) {
      criteria.serviceCriteria = match[1].trim().substring(0, 4000);
      break;
    }
  }

  // GEOGRAPHY CRITERIA
  const geoPatterns = [
    /### GEOGRAPHY CRITERIA([\s\S]*?)(?=### SIZE|### SERVICE|### BUYER|## \d|---)/i,
    /\*\*GEOGRAPHY CRITERIA:?\*\*([\s\S]*?)(?=\*\*SIZE|\*\*SERVICE|\*\*BUYER|## |---)/i,
    /GEOGRAPHY CRITERIA\s*\n([\s\S]*?)(?=SIZE CRITERIA|SERVICE|BUYER TYPE|## |---)/i
  ];
  
  for (const pattern of geoPatterns) {
    const match = searchText.match(pattern);
    if (match && match[1].trim().length > 100) {
      criteria.geographyCriteria = match[1].trim().substring(0, 4000);
      break;
    }
  }

  // BUYER TYPES - This is critical for scoring
  const buyerPatterns = [
    /### BUYER TYPES([\s\S]*?)(?=### SIZE|### SERVICE|### GEOGRAPHY|## \d+\.|---)/i,
    /\*\*BUYER TYPES:?\*\*([\s\S]*?)(?=\*\*SIZE|\*\*SERVICE|\*\*GEOGRAPHY|## |---)/i,
    /BUYER TYPES\s*\n([\s\S]*?)(?=SIZE CRITERIA|SERVICE|GEOGRAPHY|## \d|---)/i,
    /Active Buyer Categories([\s\S]*?)(?=## \d+\.|### \d+|---)/i
  ];
  
  for (const pattern of buyerPatterns) {
    const match = searchText.match(pattern);
    if (match && match[1].trim().length > 200) {
      criteria.buyerTypesCriteria = match[1].trim().substring(0, 6000);
      break;
    }
  }

  return criteria;
}

// Generate supplemental content for missing sections
async function generateSupplementalContent(
  existingContent: string,
  issues: string[],
  industryName: string
): Promise<string> {
  const needsBuyerCriteria = issues.some(i => i.includes('BUYER FIT CRITERIA') || i.includes('BUYER TYPES') || i.includes('Primary Focus'));
  
  const supplementPrompt = `You are adding CRITICAL supplemental content to an M&A guide for the "${industryName}" industry.

ISSUES TO ADDRESS:
${issues.map(i => `- ${i}`).join('\n')}

EXISTING CONTENT LENGTH: ${existingContent.split(/\s+/).length} words

${needsBuyerCriteria ? `
## BUYER FIT CRITERIA SUMMARY

Generate the COMPLETE buyer criteria section in this EXACT format:

### SIZE CRITERIA
**Revenue Thresholds:**
- Minimum revenue for PE interest: $[SPECIFIC AMOUNT]M
- Preferred revenue range: $[X]M to $[Y]M
- Optimal revenue sweet spot: $[X]M to $[Y]M

**EBITDA Thresholds:**
- Minimum EBITDA for PE interest: $[XXX]K
- Preferred EBITDA range: $[X]K to $[Y]M

**Other Size Metrics:**
- Minimum employees: [NUMBER]
- Minimum locations: [NUMBER]
- Revenue per location minimum: $[X.X]M

### SERVICE CRITERIA
**Primary Focus Services (REQUIRED):**
- [Specific service 1 for ${industryName}]
- [Specific service 2]
- [Specific service 3]

**Preferred Services (bonus):**
- [Service 1]
- [Service 2]

**Services to Avoid (EXCLUDED):**
- [Service 1] - [specific reason]
- [Service 2] - [specific reason]

### GEOGRAPHY CRITERIA
**Priority Regions:**
1. [Specific region] - [why attractive]
2. [Specific region] - [why attractive]
(List 5 regions)

**Priority Metros:**
| Metro | State | Population | Why Priority |
(List 15 specific cities with real population data)

**Geographic Rules:**
- Minimum market population: [NUMBER]
- Single location rule: [Specific rule]
- Multi-location rule: [Specific rule]

### BUYER TYPES
**Active Buyer Categories (in priority order):**

**1. Large National Platforms (Priority 1)**
- Ownership: Large PE-backed
- Target: $[X]M+ EBITDA, [X]+ locations
- Geographic scope: National
- Examples: [List 3-5 real or archetypal names]

**2. Regional Platforms (Priority 2)**
- Ownership: Mid-market PE
- Target: $[X]K-[Y]M EBITDA
- Geographic scope: Regional
- Examples: [List 3-5 names]

**3. Emerging Platforms (Priority 3)**
- Ownership: Lower-mid PE, family offices
- Target: $[X]K-[Y]M EBITDA
- Geographic scope: State/metro
- Examples: [List names]

**4. Strategic Acquirers (Priority 4)**
- Types: [List specific types for this industry]

**5. Individual/Search Funds (Priority 5)**
- Target: $[X]K-[Y]K EBITDA
` : ''}

REQUIREMENTS:
- Use SPECIFIC dollar amounts and percentages - NO PLACEHOLDERS
- Be specific to ${industryName}
- Write at least 3,000 words
- Include real city names with populations`;

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
        max_tokens: 12000,
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

    console.log(`[generate-ma-guide] Starting for: ${industryName}`);

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
            
            console.log(`[generate-ma-guide] Phase ${phaseNum}: ${phase.name}`);
            
            sendEvent({
              type: 'phase_start',
              phase: phaseNum,
              totalPhases: 3,
              phaseName: phase.name
            });

            const userPrompt = `Generate comprehensive M&A intelligence for: ${industryName}

${phase.instruction}

CRITICAL REMINDERS FOR THIS PHASE:
- You MUST write at least ${phase.minWords.toLocaleString()} words
- NO PLACEHOLDERS - replace every [X] with actual numbers
- Use specific ${industryName} terminology and benchmarks
- Every table needs 6+ rows of real data
- This is for professional M&A advisors who need actionable intelligence

Industry being researched: ${industryName}`;

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
                temperature: 0.75,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`[generate-ma-guide] Phase ${phaseNum} error:`, response.status, errorText);
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
            console.log(`[generate-ma-guide] Phase ${phaseNum} complete: ${phaseWordCount} words`);
            
            sendEvent({
              type: 'phase_complete',
              phase: phaseNum,
              phaseName: phase.name,
              phaseWordCount
            });

            if (i < phases.length - 1) {
              fullContent += "\n\n---\n\n";
            }
          }

          // Quality validation
          console.log('[generate-ma-guide] Running quality validation...');
          sendEvent({ type: 'quality_check_start' });
          
          let quality = validateQuality(fullContent, industryName);
          console.log('[generate-ma-guide] Initial quality:', JSON.stringify({
            score: quality.score,
            wordCount: quality.wordCount,
            hasCriteria: quality.hasCriteria,
            hasBuyerTypes: quality.hasBuyerTypes,
            issues: quality.issues.length
          }));
          
          sendEvent({
            type: 'quality_check_result',
            ...quality
          });

          // Generate supplemental content if needed
          let gapFillAttempts = 0;
          const maxGapFills = 2;
          
          while ((!quality.hasCriteria || !quality.hasBuyerTypes || quality.issues.length > 3) && gapFillAttempts < maxGapFills) {
            gapFillAttempts++;
            console.log(`[generate-ma-guide] Gap fill attempt ${gapFillAttempts}...`);
            
            sendEvent({ 
              type: 'gap_fill_start',
              attempt: gapFillAttempts,
              issues: quality.issues
            });
            
            const supplemental = await generateSupplementalContent(
              fullContent.slice(-10000), // Pass recent context
              quality.issues,
              industryName
            );
            
            if (supplemental && supplemental.length > 500) {
              fullContent += "\n\n---\n\n" + supplemental;
              
              sendEvent({
                type: 'gap_fill_content',
                content: supplemental,
                attempt: gapFillAttempts
              });
              
              quality = validateQuality(fullContent, industryName);
              console.log(`[generate-ma-guide] Quality after gap fill ${gapFillAttempts}:`, quality.score);
              
              sendEvent({
                type: 'quality_check_result',
                ...quality,
                afterGapFill: true,
                attempt: gapFillAttempts
              });
            } else {
              break;
            }
          }

          // Extract criteria
          const criteria = extractCriteria(fullContent);
          const criteriaKeys = Object.keys(criteria).filter(k => criteria[k as keyof typeof criteria]);
          console.log('[generate-ma-guide] Extracted criteria sections:', criteriaKeys);
          
          sendEvent({
            type: 'criteria',
            criteria,
            criteriaKeys
          });

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
