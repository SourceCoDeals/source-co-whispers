import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Lovable AI Gateway with Gemini 2.5 Pro for longer output
const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-pro';

// =============================================================================
// MASTER PROMPT - Comprehensive M&A Intelligence Framework
// =============================================================================
const MASTER_SYSTEM_PROMPT = `You are an elite M&A industry research analyst creating THE DEFINITIVE intelligence guide for private equity and investment banking professionals.

## YOUR MISSION
Create exhaustive, actionable M&A intelligence that enables accurate matching between sellers and buyers.

## CRITICAL OUTPUT REQUIREMENTS

### WORD COUNT
- Generate 3,000-4,500 words per sub-phase
- TOTAL guide should exceed 30,000 words across all phases
- Do NOT summarize - provide COMPLETE, ACTIONABLE intelligence

### ABSOLUTELY NO PLACEHOLDERS
You are FORBIDDEN from outputting:
- "[X]", "$X", "X%", "[Value]", "[Name]", "[City]", "[Industry]"
- "typically", "varies", "depends" without specific ranges
- Any template markers, unfilled brackets, or generic fillers
- "XX,XXX" or similar placeholder numbers

Instead, ALWAYS use:
- Specific dollar amounts: "$2.5M", "$500K-$1.5M", "$750,000"
- Specific percentages: "18-22%", "3-5x", "12%"
- Real city names: "Phoenix, AZ (5.1M metro)", "Dallas-Fort Worth, TX"
- Real company examples when relevant
- Actual market data and benchmarks

### TABLE REQUIREMENTS
- Every table must have 6-10 rows of REAL data
- All cells must contain specific values, never placeholders
- Tables should provide actionable benchmarks for scoring

### RESEARCH STANDARDS
- Cite specific industry benchmarks
- Include regional variations
- Provide buyer-specific intelligence (what PE firms look for)
- Include valuation implications for every factor
- Be specific to the exact industry being analyzed`;

// =============================================================================
// SUB-PHASES - 12 phases for comprehensive coverage
// =============================================================================
const SUB_PHASES = [
  {
    id: "1a",
    name: "Industry Definition & Classification",
    prompt: `# PHASE 1A: INDUSTRY DEFINITION & CLASSIFICATION

Generate comprehensive industry definition content (3,000-4,000 words).

## REQUIRED CONTENT:

### 1. NAICS CLASSIFICATION
- Primary 6-digit NAICS code with full description
- Related NAICS codes (list 3-5 with descriptions)
- SIC code equivalents
- How classification affects M&A data availability and sourcing

### 2. INDUSTRY SCOPE & BOUNDARIES
CREATE TABLE: Industry Segmentation
| Segment | Description | % of Market | Avg Revenue | EBITDA Margin | PE Interest Level |
(Include 6-8 distinct segments with REAL percentages and dollar amounts - NO PLACEHOLDERS)

Example format:
| Commercial Services | B2B focus, larger contracts | 35% | $4.2M | 18-22% | Very High |

### 3. MARKET SIZE & GROWTH
- Total addressable market (specific $ amount, e.g., "$47.3 billion")
- Number of businesses in the industry (specific count)
- 5-year historical CAGR (specific %)
- Projected 5-year growth rate (specific %)
- Key growth drivers (list 4-5 specific factors with data)

### 4. INDUSTRY EVOLUTION
- Major consolidation waves (specific dates and impacts)
- Technology disruptions (specific examples)
- Regulatory changes affecting M&A
- Current M&A activity level (estimated deals per year)

REMEMBER: NO PLACEHOLDERS. Use real numbers for this specific industry.`
  },
  {
    id: "1b",
    name: "Terminology & Business Models",
    prompt: `# PHASE 1B: TERMINOLOGY & BUSINESS MODELS

Generate comprehensive terminology and business model analysis (3,000-4,000 words).

## REQUIRED CONTENT:

### 1. INDUSTRY TERMINOLOGY GLOSSARY
CREATE TABLE: Essential Industry Terms (25+ terms minimum)
| Term | Definition | M&A Relevance | Typical Benchmark |

Include:
- Financial metrics specific to this industry
- Operational KPIs
- Service-specific terminology
- Regulatory terms
- Customer-facing terms

### 2. BUSINESS MODEL DEEP DIVE
CREATE TABLE: Business Model Comparison
| Model | Revenue Structure | Gross Margin | EBITDA Margin | Scalability | PE Preference | Multiple Impact |

Include 4-6 business models with:
- Specific margin percentages (e.g., "22-28%", not "varies")
- Clear PE preference ratings
- Concrete multiple impacts (+0.5x, -1.0x, etc.)

### 3. REVENUE MODEL ANALYSIS
CREATE TABLE: Revenue Model Impact on Valuation
| Revenue Type | % Recurring | Predictability | Typical Contract | Multiple Premium/Discount |
| Subscription | 85-95% | Very High | 12-24 months | +1.5-2.5x |
| Service Contracts | 60-80% | High | 6-12 months | +1.0-1.5x |
(Continue with 5-6 revenue types)

### 4. CUSTOMER SEGMENT MODELS
- B2C dynamics with specific CAC/LTV metrics
- B2B dynamics with specific contract values
- B2G dynamics if applicable
- Concentration patterns typical for each

NO PLACEHOLDERS - use real numbers throughout.`
  },
  {
    id: "1c",
    name: "Industry Economics & Cost Structure",
    prompt: `# PHASE 1C: INDUSTRY ECONOMICS & COST STRUCTURE

Generate comprehensive economics analysis (3,000-4,000 words).

## REQUIRED CONTENT:

### 1. DETAILED P&L BENCHMARKS
CREATE TABLE: P&L Benchmarks by Percentile
| Line Item | Bottom Quartile | Median | Top Quartile | Top Decile | Key Drivers |
| Revenue | 100% | 100% | 100% | 100% | - |
| COGS | 45% | 38% | 32% | 28% | Materials, subcontractors |
| Labor | 35% | 30% | 26% | 22% | Utilization, efficiency |
| Occupancy | 8% | 6% | 5% | 4% | Real estate strategy |
| Marketing | 5% | 4% | 3% | 2% | Referral vs paid |
| Insurance | 3% | 2.5% | 2% | 1.5% | Claims history |
| G&A | 10% | 8% | 6% | 5% | Scale efficiencies |
| Owner Comp | 15% | 10% | 8% | 5% | Market replacement |
| EBITDA | 8% | 15% | 22% | 28% | Target for buyers |

CRITICAL: Use actual percentages based on this industry - NOT placeholders!

### 2. UNIT ECONOMICS BY SCALE
CREATE TABLE: Unit Economics Analysis
| Revenue Level | Revenue/Employee | Revenue/Location | EBITDA % | Owner Hours | Management Depth |
| <$1M | $85K | $750K | 8-12% | 60+ | None |
| $1-2M | $95K | $900K | 12-16% | 50 | Minimal |
| $2-5M | $110K | $1.2M | 15-20% | 40 | 1-2 managers |
| $5-10M | $125K | $1.5M | 18-24% | 30 | Department heads |
| $10-25M | $140K | $2M | 20-28% | 20 | Full team |
| $25M+ | $160K+ | $2.5M+ | 22-30% | <20 | Professional CEO |

### 3. ECONOMIES OF SCALE
Specific cost savings at scale:
- Procurement leverage (specific % savings by tier)
- Back-office efficiency (specific examples)
- Marketing leverage (CAC by company size)
- Technology cost per location

### 4. CAPITAL REQUIREMENTS
- Startup costs (specific $$ ranges)
- Working capital needs (as % of revenue)
- CapEx cycles (frequency and cost)
- Maintenance vs growth CapEx breakdown`
  },
  {
    id: "1d",
    name: "Ecosystem & Competitive Landscape",
    prompt: `# PHASE 1D: ECOSYSTEM & COMPETITIVE LANDSCAPE

Generate comprehensive ecosystem and competitive analysis (3,000-4,000 words).

## REQUIRED CONTENT:

### 1. CUSTOMER ANALYSIS
CREATE TABLE: Customer Segmentation
| Customer Type | % of Revenue | Avg LTV | Typical CAC | Switching Cost | Concentration Risk |
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
| Buyer Name/Type | PE Sponsor Example | Platform Example | Target EBITDA | Geographic Focus | Est. Acquisitions/Year |
| Large PE Platform | TSG Consumer Partners | [Platform Name] | $2M+ | National | 8-12 |
| Regional PE | Shore Capital | [Platform Name] | $750K-2M | Southeast | 4-6 |
(Continue for 10+ buyer types - use real or realistic examples)

### 5. RECENT TRANSACTION TRENDS
CREATE TABLE: Transaction Activity
| EBITDA Range | Buyer Type | Typical Multiple | Deal Structure | Timeline |
(5-6 rows with specific data)

### 6. BARRIERS TO ENTRY
CREATE TABLE: Competitive Moat Analysis
| Moat Type | Strength (1-10) | How It Works | Value Impact |
(Include 6+ moat types with specific valuations)`
  },
  {
    id: "2a",
    name: "Financial Attractiveness Criteria",
    prompt: `# PHASE 2A: FINANCIAL ATTRACTIVENESS CRITERIA

Generate comprehensive financial evaluation criteria (3,500-4,500 words).

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
| >28% | Top 5% | Exceptional | +1.5-2.0x | Aggressive pursuit |
| 22-28% | Top Quartile | Strong | +0.5-1.0x | Strong interest |
| 16-22% | Above Median | Good | Baseline | Active interest |
| 12-16% | Median | Average | -0.25x | Cautious |
| 8-12% | Below Median | Concerns | -0.5-1.0x | Needs story |
| <8% | Bottom Quartile | Distressed | -1.0-2.0x | Turnaround only |

### 3. REVENUE QUALITY FACTORS
CREATE TABLE: Revenue Quality Assessment
| Factor | Premium Indicator | Baseline | Discount Indicator | Value Impact |
| Recurring % | >70% | 30-50% | <20% | +/- 1.0x |
| Growth Rate | >20% YoY | 5-10% | Declining | +/- 1.5x |
| Concentration | <5% top customer | 10-15% | >30% | +/- 0.5x |
| Seasonality | <20% variance | 30-40% | >60% | +/- 0.25x |
| Contract Length | >24 months avg | 6-12 months | Month-to-month | +/- 0.5x |

### 4. CUSTOMER CONCENTRATION MATRIX
CREATE TABLE: Concentration Risk Assessment
| Top Customer % | Top 5 % | Top 10 % | Risk Level | Multiple Impact |
| <5% | <15% | <25% | Minimal | None |
| 5-10% | 15-25% | 25-40% | Low | None |
| 10-15% | 25-35% | 40-55% | Moderate | -0.25x |
| 15-25% | 35-50% | 55-70% | Elevated | -0.5x |
| 25-35% | 50-65% | 70-85% | High | -0.75-1.0x |
| >35% | >65% | >85% | Severe | -1.0-1.5x or DQ |`
  },
  {
    id: "2b",
    name: "Operational Attractiveness Criteria",
    prompt: `# PHASE 2B: OPERATIONAL ATTRACTIVENESS CRITERIA

Generate comprehensive operational evaluation criteria (3,500-4,500 words).

## REQUIRED CONTENT:

### 1. INDUSTRY-SPECIFIC KPIs
CREATE TABLE: Critical KPIs for This Industry (10+ KPIs)
| KPI | Definition | Bottom Quartile | Median | Top Quartile | Top Decile | Weight in Scoring |

CRITICAL: Include 10+ KPIs specific to THIS industry with real benchmarks.
Examples of KPI types to include:
- Revenue efficiency metrics
- Customer metrics (retention, acquisition, LTV)
- Operational metrics (utilization, capacity, throughput)
- Quality metrics (NPS, satisfaction, ratings)
- Employee metrics (productivity, turnover, tenure)

### 2. MANAGEMENT TEAM EVALUATION
CREATE TABLE: Management Assessment Framework
| Factor | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
| Depth | Full C-suite | Most filled | Key roles only | Major gaps | Owner-only |
| Tenure | 10+ years avg | 5-10 years | 3-5 years | 1-3 years | <1 year |
| Succession | Ready now | 6-month plan | Identified | Early stage | None |
| Expertise | Deep industry | Strong | Relevant | Some | Limited |
| Autonomy | Fully autonomous | Mostly | Moderate | Some | Dependent |

### 3. TECHNOLOGY MATURITY
CREATE TABLE: Technology Assessment
| System Area | Modern (5) | Current (4) | Adequate (3) | Dated (2) | Legacy (1) |
| ERP/Accounting | Cloud-based, integrated | Current version | Functional | Old version | Paper/basic |
| CRM/Sales | Advanced automation | Standard CRM | Basic tracking | Spreadsheets | None |
| Operations | Industry-specific | Scheduling system | Basic | Manual | Paper |
| Customer Portal | Full self-service | Some features | Basic | None | None |
| Analytics | Real-time dashboards | Regular reports | Ad-hoc | Minimal | None |

### 4. OWNER DEPENDENCY
CREATE TABLE: Owner Dependency Impact
| Dependency Level | Hours/Week | Critical Functions | Transition Time | Value Impact |
| Minimal | <20 | Strategic only | 3-6 months | None |
| Low | 20-30 | Key relationships | 6-12 months | None |
| Moderate | 30-40 | Operations + sales | 12-18 months | -0.5x |
| High | 40-50 | Most functions | 18-24 months | -1.0x |
| Severe | 50+ | Everything | 24+ months | -1.5x or DQ |

### 5. EMPLOYEE METRICS
CREATE TABLE: Workforce Quality Indicators
| Metric | Excellent | Good | Acceptable | Concerning | Red Flag |
| Turnover Rate | <15% | 15-25% | 25-35% | 35-45% | >45% |
| Tenure Average | >5 years | 3-5 years | 2-3 years | 1-2 years | <1 year |
| Training Programs | Formal, ongoing | Regular | Some | Minimal | None |
| Certification % | >80% | 60-80% | 40-60% | 20-40% | <20% |`
  },
  {
    id: "2c",
    name: "Strategic & Geographic Criteria",
    prompt: `# PHASE 2C: STRATEGIC & GEOGRAPHIC CRITERIA

Generate comprehensive strategic and geographic analysis (3,500-4,500 words).

## REQUIRED CONTENT:

### 1. GEOGRAPHIC MARKET TIERS
CREATE TABLE: Market Tier Classification
| Tier | Population Range | Characteristics | PE Interest | Multiple Premium |
| Tier 1 | 2M+ metro | Major metros, deep talent pool | Very High | +0.5-1.0x |
| Tier 2 | 500K-2M | Strong secondary markets | High | +0.25-0.5x |
| Tier 3 | 200K-500K | Solid regional markets | Moderate | Baseline |
| Tier 4 | <200K | Small markets | Lower | -0.25-0.5x |

### 2. PRIORITY MARKETS FOR THIS INDUSTRY
CREATE TABLE: Top Markets (15+ metros)
| Metro Area | State | Population | Growth Rate | Industry Density | PE Activity | Why Priority |

Use REAL city names with ACTUAL population figures. Example format:
| Dallas-Fort Worth | TX | 7.9M | 1.8% | High | Very Active | Fast growth, PE HQs, business-friendly |
| Phoenix-Mesa | AZ | 5.1M | 2.3% | High | Active | Sun Belt growth, lower costs |
(Continue for 15+ cities with real data)

### 3. REGIONAL VARIATIONS
Provide detailed analysis for each region:
- **Southeast** (FL, GA, NC, SC, TN, AL): Characteristics, buyer activity, typical multiples
- **Texas**: Unique dynamics, active buyers, typical deal flow
- **Southwest** (AZ, NV, CO): Market conditions, growth trends
- **Northeast** (NY, NJ, PA, MA, CT): Market dynamics, buyer profiles
- **Midwest** (IL, OH, MI, MN): Characteristics, consolidation status
- **West Coast** (CA, WA, OR): Premium markets, unique factors

### 4. SUSTAINABLE COMPETITIVE ADVANTAGES
CREATE TABLE: Competitive Moat Value
| Moat Type | Industry Example | Durability | Value Impact |
| Licenses/Certs | [Specific to this industry] | High | +0.5-1.0x |
| Long-term Contracts | [Specific example] | Medium-High | +0.5-1.5x |
| Brand Recognition | [Specific example] | Medium | +0.25-0.5x |
| Geographic Density | Route density, market share | High | +0.5-1.0x |
| Proprietary Systems | [Specific to industry] | Medium-High | +0.5-1.0x |
| Supplier Relationships | [Specific example] | Medium | +0.25x |

### 5. DEAL KILLERS & RED FLAGS
CREATE TABLE: Absolute Deal Killers
| Issue | Threshold | Why It Kills Deals | Frequency |
(Include 8+ deal killers with specific thresholds)

CREATE TABLE: Yellow vs Red Flags
| Issue | Yellow Flag (Concern) | Red Flag (Serious) | Deal Killer |
(Include 8+ issues with escalation thresholds)`
  },
  {
    id: "3a",
    name: "Seller Evaluation Scorecards",
    prompt: `# PHASE 3A: SELLER EVALUATION SCORECARDS

Generate comprehensive scoring frameworks (3,500-4,500 words).

## REQUIRED CONTENT:

### 1. FINANCIAL SCORECARD
CREATE TABLE: Financial Scoring Matrix
| Metric | Weight | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
| EBITDA Amount | 25% | >$3M | $1.5-3M | $750K-1.5M | $350-750K | <$350K |
| EBITDA Margin | 20% | >25% | 20-25% | 15-20% | 10-15% | <10% |
| Revenue Growth | 15% | >15% | 10-15% | 5-10% | 0-5% | Declining |
| Recurring % | 15% | >70% | 50-70% | 30-50% | 15-30% | <15% |
| Concentration | 15% | <5% top | 5-10% | 10-15% | 15-25% | >25% |
| Revenue Amount | 10% | >$15M | $8-15M | $3-8M | $1.5-3M | <$1.5M |

### 2. OPERATIONAL SCORECARD
CREATE TABLE: Operational Scoring Matrix
| KPI | Weight | Score 5 | Score 4 | Score 3 | Score 2 | Score 1 |
(Include 6-8 industry-specific KPIs with weight and threshold values)

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
| Quality Tier | Score Range | EBITDA Multiple | Revenue Multiple | Characteristics |
| Premium | 4.5-5.0 | 7.0-10.0x | 1.5-2.5x | Top quartile everything |
| Above Average | 4.0-4.4 | 5.5-7.0x | 1.0-1.5x | Strong metrics, growing |
| Average | 3.0-3.9 | 4.0-5.5x | 0.7-1.0x | Median metrics, stable |
| Below Average | 2.0-2.9 | 3.0-4.0x | 0.5-0.7x | Some concerns |
| Distressed | <2.0 | 2.0-3.0x | 0.3-0.5x | Turnaround needed |

CREATE TABLE: Multiple Adjustment Factors
| Factor | Typical Premium | Typical Discount | Notes |
(Include 10+ adjustment factors with specific impacts)`
  },
  {
    id: "3b",
    name: "Buyer Fit Criteria - CRITICAL",
    prompt: `# PHASE 3B: BUYER FIT CRITERIA - CRITICAL FOR SCORING SYSTEM

THIS IS THE MOST CRITICAL SECTION. Follow the EXACT format below for automated parsing.

## BUYER FIT CRITERIA SUMMARY

### SIZE CRITERIA
**Revenue Thresholds:**
- Minimum revenue for PE interest: $[SPECIFIC NUMBER, e.g., "$2.5M"]
- Preferred revenue range: $[X]M to $[Y]M
- Optimal revenue sweet spot: $[X]M to $[Y]M
- Maximum revenue before strategic-only: $[X]M+

**EBITDA Thresholds:**
- Minimum EBITDA for PE interest: $[SPECIFIC, e.g., "$350,000"]
- Preferred EBITDA range: $[X]K to $[Y]M
- Optimal EBITDA sweet spot: $[X]M to $[Y]M
- Add-on minimum EBITDA: $[SPECIFIC]

**Other Size Metrics:**
- Minimum employees: [SPECIFIC NUMBER]
- Preferred employee range: [X] to [Y]
- Minimum locations: [SPECIFIC]
- Preferred location count: [X] to [Y]
- Revenue per location minimum: $[SPECIFIC]

### SERVICE CRITERIA
**Primary Focus Services (deals MUST have these):**
OUTPUT THIS EXACT FORMAT:
- [Service 1 name] - Why core to buyer thesis
- [Service 2 name] - Why it matters for margins  
- [Service 3 name] - Why it drives recurring revenue

**Preferred Services (bonus points):**
- [Service 1] - How it adds value
- [Service 2] - How it complements core
- [Service 3] - Growth opportunity

**Services to Avoid (EXCLUDED - negative indicators):**
- [Service 1] - Specific reason to avoid
- [Service 2] - Specific issue
- [Service 3] - Why problematic for buyers

**Business Model Requirements:**
- Preferred model: B2B / B2C / Mixed [choose one]
- Recurring revenue minimum: [X]%
- Contract preference: Long-term / Annual / Project-based

### GEOGRAPHY CRITERIA
**Priority Regions (Highest Buyer Density):**
1. [Region with specific states] - Why attractive
2. [Region with specific states] - Why attractive
3. [Region with specific states] - Why attractive
4. [Region with specific states] - Why attractive
5. [Region with specific states] - Why attractive

**Priority Metros (Top 15):**
CREATE TABLE:
| Metro | State | Population | Growth Rate | Why Priority |
| [City 1] | [ST] | [X.X]M | [X]% | [Specific reason] |
(Continue for 15 cities with REAL data)

**Geographic Rules:**
- Minimum market population: [SPECIFIC]
- Density preference: Dense single-market / Regional / National
- Multi-location geographic rule: Adjacent states / Same region / National OK

**Regions to Avoid:**
- [Region 1] - Specific reason
- [Region 2] - Specific reason

### BUYER TYPES
**Active Buyer Categories (in priority order):**

**1. Large National Platforms (Priority 1)**
- Ownership: Large PE-backed ($500M+ fund)
- Target EBITDA: $1.5M+
- Target Locations: 3+ preferred
- Geographic scope: National footprint
- Acquisition style: Multi-location preferred
- Estimated count: [X] active platforms

**2. Regional Platforms (Priority 2)**
- Ownership: Mid-market PE ($100-500M fund)
- Target EBITDA: $500K-$2M
- Target Locations: 2+
- Geographic scope: Regional (2-5 state area)
- Acquisition style: Tuck-ins within footprint
- Estimated count: [X] active platforms

**3. Emerging Platforms (Priority 3)**
- Ownership: Lower-mid PE, family offices
- Target EBITDA: $300K-$1M
- Target Locations: Single OK
- Geographic scope: State/metro level
- Acquisition style: Platform formation
- Estimated count: [X] active

**4. Strategic Acquirers (Priority 4)**
- Ownership: Corporate, family-owned
- Target: Varies by strategic fit
- Geographic scope: Regional
- Acquisition style: Horizontal/vertical integration

**5. Individual/Search Funds (Priority 5)**
- Ownership: Individual operators, ETA
- Target EBITDA: $250K-$750K
- Target Locations: Single
- Geographic scope: Local metro
- Acquisition style: First acquisition

CRITICAL: All values must be SPECIFIC to this industry. NO PLACEHOLDERS.`
  },
  {
    id: "3c",
    name: "Example Evaluation & Application",
    prompt: `# PHASE 3C: EXAMPLE EVALUATION & APPLICATION

Generate a complete worked example (3,000-4,000 words).

## SAMPLE COMPANY EVALUATION

### Company Profile
Create a REALISTIC example company with specific details:
- Company Name: [Create a realistic but fictional name]
- Industry Segment: [Specific segment within this industry]
- Revenue: $[SPECIFIC, e.g., $4.7M]
- EBITDA: $[SPECIFIC, e.g., $890K] ([X]% margin)
- Locations: [SPECIFIC NUMBER]
- Employees: [SPECIFIC NUMBER]
- Geography: [Specific metro area, e.g., "Tampa, FL"]
- Years in Business: [SPECIFIC]
- Ownership: [Specific structure]
- Service Mix: [Detailed breakdown with percentages]
- Key Differentiators: [3-4 specific points]

### Financial Score Walkthrough
Apply the financial scorecard step-by-step:
| Metric | Company Value | Score (1-5) | Weight | Weighted Score | Notes |
| EBITDA Amount | $890K | 3 | 25% | 0.75 | Middle of range |
(Complete all metrics)
**Total Financial Score: X.XX/5.00**

### Operational Score Walkthrough
Apply operational scorecard with industry KPIs:
| KPI | Company Value | Benchmark | Score | Weight | Weighted |
(Complete with specific KPIs for this industry)
**Total Operational Score: X.XX/5.00**

### Strategic Score Walkthrough
| Factor | Assessment | Score | Weight | Weighted |
(Complete all strategic factors)
**Total Strategic Score: X.XX/5.00**

### Composite Rating
- Overall Composite Score: X.XX/5.00
- Rating: [Premium / Above Average / Average / Below Average]
- Expected Multiple Range: X.X-X.Xx EBITDA
- Enterprise Value Range: $X.XM - $X.XM

### Buyer Matching
Based on this company profile:
1. **Most Likely Buyer Type:** [From buyer types] - Specific reasons
2. **Secondary Buyer Type:** [Alternative] - Why
3. **Unlikely Fits:** [Which buyers won't be interested] - Why
4. **Recommended Process:** Targeted / Broad / Auction
5. **Expected Timeline:** X-X months
6. **Key Selling Points:** [List 4-5 specific points]
7. **Concerns to Address:** [List 3-4 specific issues]

### Value Enhancement Recommendations
Specific improvements with quantified impact:
1. [Improvement] - Expected impact: +$[X]K or +[X]x multiple
2. [Improvement] - Expected impact
(Continue with 5-6 recommendations)`
  },
  {
    id: "4",
    name: "Structured Criteria Output - CRITICAL",
    prompt: `# PHASE 4: STRUCTURED CRITERIA OUTPUT

This final phase must output buyer fit criteria in a PRECISE, PARSEABLE format.
This section is CRITICAL for the scoring system.

## PRIMARY_FOCUS_SERVICES

Based on all analysis in this guide, identify the PRIMARY services that buyers in this industry target.
These should be the core services that define "on-thesis" vs "off-thesis" deals.

OUTPUT THE FOLLOWING STRUCTURED DATA:

### PRIMARY FOCUS SERVICES (ARRAY FORMAT)
List the 3-5 PRIMARY services buyers require. These will be used for deal scoring.
Format as a simple bulleted list that can be parsed:

PRIMARY_FOCUS_SERVICES:
- [Service 1 - the single most important service]
- [Service 2 - second most important]
- [Service 3 - third most important]
- [Service 4 - if applicable]
- [Service 5 - if applicable]

### EXCLUDED SERVICES (ARRAY FORMAT)
List services that are RED FLAGS or would exclude a deal:

EXCLUDED_SERVICES:
- [Excluded service 1]
- [Excluded service 2]
- [Excluded service 3]

### SIZE THRESHOLDS (NUMBERS)
MINIMUM_REVENUE: $[X.X]M
PREFERRED_REVENUE_MIN: $[X.X]M
PREFERRED_REVENUE_MAX: $[X.X]M
MINIMUM_EBITDA: $[X.X]M
PREFERRED_EBITDA_MIN: $[X.X]M
PREFERRED_EBITDA_MAX: $[X.X]M
MINIMUM_LOCATIONS: [X]
PREFERRED_LOCATIONS_MIN: [X]
PREFERRED_LOCATIONS_MAX: [X]

### PRIORITY REGIONS (ARRAY FORMAT)
PRIORITY_REGIONS:
- Southeast (FL, GA, NC, SC, TN)
- Texas
- Southwest (AZ, NV, CO)
- [Add appropriate regions for this industry]

### BUYER TYPES SUMMARY
For each buyer type, provide key metrics:

BUYER_TYPE_1:
- Name: [Large National Platforms]
- Priority: 1
- Min_EBITDA: $[X.X]M
- Min_Locations: [X]
- Geographic_Scope: National

BUYER_TYPE_2:
- Name: [Regional Platforms]
- Priority: 2
- Min_EBITDA: $[X]K
- Min_Locations: [X]
- Geographic_Scope: Regional

(Continue for all buyer types)

IMPORTANT: This structured output is parsed by the scoring system.
Use exact formatting. No placeholders. All values must be specific.`
  }
];

// =============================================================================
// QUALITY VALIDATION
// =============================================================================
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
  afterGapFill?: boolean;
  attempt?: number;
}

function validateQuality(content: string, industryName: string): QualityResult {
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  
  // Count tables
  const tableLines = (content.match(/\|.*\|/g) || []);
  const tableCount = Math.floor(tableLines.length / 3);
  const dataRowCount = tableLines.filter(line => /\d+[%$KM]?/.test(line)).length;
  
  // Count placeholders - be thorough
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
    /\[ST\]/gi,
    /\[Platform Name\]/gi,
    /\[Specific to/gi,
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
  const hasCriteria = /## BUYER FIT CRITERIA SUMMARY/i.test(content);
  const hasBuyerTypes = /### BUYER TYPES/i.test(content) && /Priority \d/i.test(content);
  const hasPrimaryFocus = /PRIMARY_FOCUS_SERVICES:|Primary Focus Services/i.test(content);
  
  // Check for required sections
  const requiredSections = ["NAICS", "EBITDA", "SIZE CRITERIA", "SERVICE CRITERIA", "GEOGRAPHY CRITERIA", "BUYER TYPES", "SCORECARD", "PRIMARY_FOCUS"];
  const sectionsToFind = [
    "INDUSTRY DEFINITION", "TERMINOLOGY", "BUSINESS MODEL", "ECONOMICS",
    "COMPETITIVE LANDSCAPE", "FINANCIAL ATTRACTIVENESS", "OPERATIONAL ATTRACTIVENESS",
    "DEAL KILLER", "SELLER EVALUATION", "BUYER FIT CRITERIA", "EXAMPLE"
  ];
  
  const contentUpper = content.toUpperCase();
  const sectionsFound = sectionsToFind.filter(s => contentUpper.includes(s));
  const missingElements = requiredSections.filter(e => !contentUpper.includes(e));
  
  // Compile issues
  const issues: string[] = [];
  
  if (wordCount < 25000) issues.push(`Word count ${wordCount.toLocaleString()} below target 25,000`);
  if (tableCount < 20) issues.push(`Table count ${tableCount} below target 20`);
  if (placeholderCount > 10) issues.push(`${placeholderCount} placeholders detected - too many!`);
  if (industryMentions < 30) issues.push(`Industry "${industryName}" mentioned only ${industryMentions} times`);
  if (!hasCriteria) issues.push("MISSING: BUYER FIT CRITERIA SUMMARY section");
  if (!hasBuyerTypes) issues.push("MISSING: BUYER TYPES with priority ordering");
  if (!hasPrimaryFocus) issues.push("MISSING: PRIMARY_FOCUS_SERVICES section");
  if (dataRowCount < 80) issues.push(`Only ${dataRowCount} data rows (target 80+)`);
  if (missingElements.length > 0) issues.push(`Missing sections: ${missingElements.join(', ')}`);
  
  // Calculate score
  let score = 0;
  score += Math.min(25, (wordCount / 30000) * 25);
  score += Math.min(15, (sectionsFound.length / 11) * 15);
  score += Math.min(15, (tableCount / 25) * 15);
  score += Math.min(10, ((requiredSections.length - missingElements.length) / requiredSections.length) * 10);
  score += Math.min(10, Math.max(0, (15 - placeholderCount) / 15) * 10);
  score += Math.min(10, (industryMentions / 40) * 10);
  score += Math.min(5, (dataRowCount / 100) * 5);
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

// =============================================================================
// GAP FILLING
// =============================================================================
async function generateGapFillContent(
  content: string,
  missingElements: string[],
  industryName: string,
  apiKey: string
): Promise<string> {
  console.log(`[generate-ma-guide] Gap filling for: ${missingElements.join(', ')}`);
  
  const gapPrompt = `You are filling gaps in an M&A guide for the ${industryName} industry.

The following sections are MISSING or INCOMPLETE: ${missingElements.join(', ')}

Generate ONLY the missing content. Be specific with real numbers, no placeholders.

If PRIMARY_FOCUS_SERVICES is missing, generate:
PRIMARY_FOCUS_SERVICES:
- [List 3-5 primary services for ${industryName} industry]

EXCLUDED_SERVICES:
- [List 2-4 services buyers avoid]

If SIZE CRITERIA is missing, generate complete size thresholds with specific numbers.
If GEOGRAPHY CRITERIA is missing, list specific regions and cities.
If BUYER TYPES is missing, list 5 buyer categories with priority order.

Generate ONLY the missing sections, formatted consistently with an M&A guide.
NO PLACEHOLDERS - use real, specific values.`;

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Use faster model for gap fill
        messages: [
          { role: 'system', content: MASTER_SYSTEM_PROMPT },
          { role: 'user', content: gapPrompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error('[generate-ma-guide] Gap fill request failed:', response.status);
      return "";
    }

    const data = await response.json();
    const gapContent = data.choices?.[0]?.message?.content || "";
    
    console.log(`[generate-ma-guide] Gap fill generated ${gapContent.split(/\s+/).length} words`);
    return "\n\n" + gapContent;
  } catch (error) {
    console.error('[generate-ma-guide] Gap fill error:', error);
    return "";
  }
}

// =============================================================================
// CRITERIA EXTRACTION
// =============================================================================
async function extractCriteriaWithAI(content: string, apiKey: string): Promise<{
  sizeCriteria?: string;
  serviceCriteria?: string;
  geographyCriteria?: string;
  buyerTypesCriteria?: string;
  primaryFocusServices?: string[];
  excludedServices?: string[];
}> {
  // First try regex extraction
  const regexCriteria = extractCriteriaWithRegex(content);
  
  // Check if regex found substantial content
  const hasSubstantialContent = 
    (regexCriteria.sizeCriteria?.length || 0) > 200 &&
    (regexCriteria.serviceCriteria?.length || 0) > 200 &&
    (regexCriteria.buyerTypesCriteria?.length || 0) > 400;
  
  if (hasSubstantialContent && regexCriteria.primaryFocusServices && regexCriteria.primaryFocusServices.length > 0) {
    console.log('[generate-ma-guide] Regex extraction successful with primary_focus');
    return regexCriteria;
  }
  
  // Fall back to AI extraction
  console.log('[generate-ma-guide] Using AI extraction for structured criteria');
  
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
            content: `Extract buyer fit criteria from M&A guides into structured data. Return EXACT text for each section, plus arrays for primary_focus_services and excluded_services.`
          },
          {
            role: 'user',
            content: `Extract the buyer fit criteria sections from this M&A guide:\n\n${content.slice(-40000)}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_all_criteria',
            description: 'Extract all buyer fit criteria sections',
            parameters: {
              type: 'object',
              properties: {
                sizeCriteria: { type: 'string', description: 'Complete SIZE CRITERIA section text' },
                serviceCriteria: { type: 'string', description: 'Complete SERVICE CRITERIA section text' },
                geographyCriteria: { type: 'string', description: 'Complete GEOGRAPHY CRITERIA section text' },
                buyerTypesCriteria: { type: 'string', description: 'Complete BUYER TYPES section text' },
                primaryFocusServices: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Array of 3-5 primary focus service names that buyers require'
                },
                excludedServices: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of services that are red flags/excluded'
                }
              },
              required: ['sizeCriteria', 'serviceCriteria', 'geographyCriteria', 'buyerTypesCriteria', 'primaryFocusServices']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_all_criteria' } }
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
      console.log('[generate-ma-guide] AI extracted primary_focus_services:', extracted.primaryFocusServices);
      
      return {
        sizeCriteria: extracted.sizeCriteria || regexCriteria.sizeCriteria,
        serviceCriteria: extracted.serviceCriteria || regexCriteria.serviceCriteria,
        geographyCriteria: extracted.geographyCriteria || regexCriteria.geographyCriteria,
        buyerTypesCriteria: extracted.buyerTypesCriteria || regexCriteria.buyerTypesCriteria,
        primaryFocusServices: extracted.primaryFocusServices || regexCriteria.primaryFocusServices,
        excludedServices: extracted.excludedServices || regexCriteria.excludedServices
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
  primaryFocusServices?: string[];
  excludedServices?: string[];
} {
  const criteria: {
    sizeCriteria?: string;
    serviceCriteria?: string;
    geographyCriteria?: string;
    buyerTypesCriteria?: string;
    primaryFocusServices?: string[];
    excludedServices?: string[];
  } = {};

  // Find the BUYER FIT CRITERIA SUMMARY section
  const summaryMatch = content.match(/## BUYER FIT CRITERIA SUMMARY([\s\S]*?)(?=## [A-Z]|# PHASE|$)/i);
  const searchText = summaryMatch ? summaryMatch[1] : content;

  // Extract each section
  const sizeMatch = searchText.match(/### SIZE CRITERIA([\s\S]*?)(?=### SERVICE|### GEOGRAPHY|### BUYER|## )/i);
  if (sizeMatch) criteria.sizeCriteria = sizeMatch[1].trim().substring(0, 5000);

  const serviceMatch = searchText.match(/### SERVICE CRITERIA([\s\S]*?)(?=### SIZE|### GEOGRAPHY|### BUYER|## )/i);
  if (serviceMatch) criteria.serviceCriteria = serviceMatch[1].trim().substring(0, 5000);

  const geoMatch = searchText.match(/### GEOGRAPHY CRITERIA([\s\S]*?)(?=### SIZE|### SERVICE|### BUYER|## )/i);
  if (geoMatch) criteria.geographyCriteria = geoMatch[1].trim().substring(0, 5000);

  const buyerMatch = searchText.match(/### BUYER TYPES([\s\S]*?)(?=### SIZE|### SERVICE|### GEOGRAPHY|## [A-Z]|# PHASE)/i);
  if (buyerMatch) criteria.buyerTypesCriteria = buyerMatch[1].trim().substring(0, 8000);

  // Extract PRIMARY_FOCUS_SERVICES as array
  const primaryFocusMatch = content.match(/PRIMARY_FOCUS_SERVICES:\s*((?:[-•]\s*.+\n?)+)/i);
  if (primaryFocusMatch) {
    const lines = primaryFocusMatch[1].split('\n')
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('['))
      .map(line => line.split(' - ')[0].trim()); // Get just the service name
    
    if (lines.length > 0) {
      criteria.primaryFocusServices = lines;
      console.log('[generate-ma-guide] Extracted primary_focus via regex:', lines);
    }
  }
  
  // Fallback: try to extract from "Primary Focus Services" section
  if (!criteria.primaryFocusServices || criteria.primaryFocusServices.length === 0) {
    const altMatch = content.match(/\*\*Primary Focus Services[^*]*\*\*[:\s]*((?:[-•]\s*.+\n?)+)/i);
    if (altMatch) {
      const lines = altMatch[1].split('\n')
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(line => line.length > 0 && !line.startsWith('['))
        .map(line => line.split(' - ')[0].trim());
      
      if (lines.length > 0) {
        criteria.primaryFocusServices = lines;
        console.log('[generate-ma-guide] Extracted primary_focus from alt section:', lines);
      }
    }
  }

  // Extract EXCLUDED_SERVICES as array
  const excludedMatch = content.match(/EXCLUDED_SERVICES:\s*((?:[-•]\s*.+\n?)+)/i);
  if (excludedMatch) {
    const lines = excludedMatch[1].split('\n')
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('['))
      .map(line => line.split(' - ')[0].trim());
    
    if (lines.length > 0) {
      criteria.excludedServices = lines;
    }
  }
  
  // Fallback for excluded services
  if (!criteria.excludedServices || criteria.excludedServices.length === 0) {
    const altExcluded = content.match(/\*\*Services to Avoid[^*]*\*\*[:\s]*((?:[-•]\s*.+\n?)+)/i);
    if (altExcluded) {
      const lines = altExcluded[1].split('\n')
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(line => line.length > 0 && !line.startsWith('['))
        .map(line => line.split(' - ')[0].trim());
      
      if (lines.length > 0) {
        criteria.excludedServices = lines;
      }
    }
  }

  return criteria;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================
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

    console.log(`[generate-ma-guide] Starting for: "${industryName}" with ${SUB_PHASES.length} sub-phases`);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        let fullContent = "";
        
        try {
          // Process each sub-phase
          for (let i = 0; i < SUB_PHASES.length; i++) {
            const subPhase = SUB_PHASES[i];
            const phaseNum = Math.ceil((i + 1) / 4); // 4 sub-phases per major phase
            
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
- Generate 3,000-4,500 words for this section
- NO PLACEHOLDERS - use real numbers, city names, and benchmarks
- Every table must have 6+ rows of real data
- Be specific to the ${industryName} industry throughout
- This is for professional M&A advisors - be thorough and accurate

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
                      { role: 'system', content: MASTER_SYSTEM_PROMPT },
                      { role: 'user', content: userPrompt }
                    ],
                    stream: true,
                  }),
                });

                if (response.status === 429) {
                  console.log(`[generate-ma-guide] Rate limited, waiting ${5 * (retryCount + 1)} seconds...`);
                  await new Promise(r => setTimeout(r, 5000 * (retryCount + 1)));
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
                  await new Promise(r => setTimeout(r, 2000));
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
                        
                        const subPhaseProgress = Math.min(100, (phaseContent.length / 20000) * 100);
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

                break; // Success - exit retry loop
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

            // Small delay between phases to avoid rate limits
            if (i < SUB_PHASES.length - 1) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }

          // Quality check
          console.log('[generate-ma-guide] Running quality check...');
          sendEvent({ type: 'quality_check_start' });
          
          let quality = validateQuality(fullContent, industryName);
          sendEvent({ 
            type: 'quality_check_result', 
            ...quality 
          });

          // Gap filling if needed (up to 2 attempts)
          let gapAttempt = 0;
          while (!quality.passed && gapAttempt < 2 && quality.missingElements.length > 0) {
            gapAttempt++;
            console.log(`[generate-ma-guide] Gap fill attempt ${gapAttempt}`);
            
            sendEvent({ type: 'gap_fill_start', attempt: gapAttempt });
            
            const gapContent = await generateGapFillContent(
              fullContent,
              quality.missingElements,
              industryName,
              LOVABLE_API_KEY
            );
            
            if (gapContent) {
              fullContent += gapContent;
              sendEvent({ type: 'gap_fill_content', content: gapContent });
            }
            
            quality = validateQuality(fullContent, industryName);
            quality.afterGapFill = true;
            quality.attempt = gapAttempt;
            
            sendEvent({ type: 'final_quality', ...quality });
          }

          // Extract criteria
          console.log('[generate-ma-guide] Extracting criteria...');
          const extractedCriteria = await extractCriteriaWithAI(fullContent, LOVABLE_API_KEY);
          
          console.log('[generate-ma-guide] Extracted criteria:', {
            sizeCriteria: (extractedCriteria.sizeCriteria?.length || 0) + ' chars',
            serviceCriteria: (extractedCriteria.serviceCriteria?.length || 0) + ' chars',
            geographyCriteria: (extractedCriteria.geographyCriteria?.length || 0) + ' chars',
            buyerTypesCriteria: (extractedCriteria.buyerTypesCriteria?.length || 0) + ' chars',
            primaryFocusServices: extractedCriteria.primaryFocusServices,
            excludedServices: extractedCriteria.excludedServices
          });
          
          sendEvent({
            type: 'criteria',
            criteria: extractedCriteria
          });

          // Complete
          const finalWordCount = fullContent.split(/\s+/).length;
          console.log(`[generate-ma-guide] Complete. Total: ${finalWordCount} words, Quality: ${quality.score}`);
          
          sendEvent({
            type: 'complete',
            wordCount: finalWordCount,
            quality
          });

          sendEvent({ type: '[DONE]' });
          controller.close();

        } catch (error) {
          console.error('[generate-ma-guide] Stream error:', error);
          sendEvent({ 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error' 
          });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });

  } catch (error) {
    console.error('[generate-ma-guide] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
