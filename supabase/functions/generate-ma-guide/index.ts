import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Complete M&A Industry Intelligence Guide - Master Prompt (Full Version)
const MASTER_PROMPT = `# COMPLETE AI TRAINING GUIDE: INDUSTRY M&A INTELLIGENCE
## From Industry Fundamentals to Acquisition Attractiveness Assessment

---

# YOUR MISSION

When given an industry name, you will become an expert on that industry's M&A landscape. You need to understand:

**PART 1: THE INDUSTRY** (High-level fundamentals)
- How the industry is structured
- What types of businesses exist
- How businesses make money
- Industry terminology and language

**PART 2: WHAT MAKES COMPANIES ATTRACTIVE** (Acquisition criteria)
- What financial metrics matter
- What operational factors buyers evaluate
- What strategic advantages create value
- What red flags kill deals

**END GOAL:** Match sellers with buyers by understanding if a seller has what buyers want in this industry.

---

# PART 1: UNDERSTANDING THE INDUSTRY FUNDAMENTALS

Before you can evaluate any specific company, you must deeply understand the industry itself.

---

## 1. INDUSTRY DEFINITION & SCOPE

### A. Define the Industry Precisely

**What You Need:**
- **NAICS Code:** The official 6-digit government classification
- **Industry Name:** Official and common names
- **Scope:** What's included and what's excluded
- **Boundaries:** Where this industry ends and another begins

**How to Research:**
- Search: "[Industry] NAICS code"
- Search: "[Industry] definition"
- Search: "What is included in [Industry]"
- Visit: census.gov/naics

**Why This Matters:**
- Ensures you research the RIGHT industry
- Prevents confusion with adjacent but different industries
- Helps find accurate data and statistics
- Defines the competitive set properly

---

### B. Identify Subsegments

Most industries have distinct subsegments with different characteristics.

**How to Research:**
- Search: "[Industry] subsegments"
- Search: "[Industry] market segments"
- Search: "Types of [Industry] businesses"

**Why This Matters:**
- Different subsegments = different economics
- Different subsegments = different buyer interest
- You need to know which subsegment the seller operates in

---

## 2. INDUSTRY TERMINOLOGY & LANGUAGE

Every industry has its own language. You must learn it.

### A. Business Types Within the Industry

**What You Need to Know:**
Different types of businesses operate within the same industry with different models.

**How to Research:**
- Search: "Types of [Industry] businesses"
- Search: "[Industry] business models"
- Search: "Difference between [Type A] and [Type B] in [Industry]"

### B. Revenue & Business Model Terms

**Common Terms Across Industries:**

**Revenue Types:**
- **Recurring Revenue:** Automatic, repeating (subscriptions, maintenance contracts)
- **Repeat Revenue:** Customers return but not automatic
- **One-Time Revenue:** Single transaction
- **Project-Based:** Large individual projects
- **Transaction-Based:** Many small transactions

**Pricing Models:**
- **Fixed Price:** Set price per service
- **Hourly Rate:** Bill by time
- **Retainer:** Ongoing fee
- **Subscription:** Monthly/annual recurring fee
- **Performance-Based:** Tied to results

### C. Key Operational Metrics (KPIs)

**Universal Metrics:**
- **Revenue:** Total sales
- **EBITDA:** Earnings Before Interest, Taxes, Depreciation, Amortization
- **Gross Margin %:** (Revenue - COGS) ÷ Revenue
- **EBITDA Margin %:** EBITDA ÷ Revenue
- **Customer Acquisition Cost (CAC):** Cost to acquire new customer
- **Customer Lifetime Value (LTV):** Total revenue from customer over relationship
- **Churn Rate:** % of customers lost per period

**Create a glossary as you research:**
- Term: Definition - Why it matters - Benchmark (good/average/poor)

---

## 3. BUSINESS MODELS & HOW COMPANIES MAKE MONEY

### A. Service Delivery Models

**1. Fixed Location/Retail Model**
- **How It Works:** Customers come to business location
- **Economics:** High fixed costs (rent, facility), Limited by local market size, Location and brand critical
- **Scalability:** Add more locations

**2. Mobile/Field Service Model**
- **How It Works:** Technicians go to customer
- **Economics:** Vehicle fleet costs, Territory-based operations, Technician utilization key metric
- **Scalability:** Add more trucks/technicians

**3. Hybrid Model**
- **How It Works:** Both fixed location and mobile
- **Economics:** Higher fixed costs (facility + fleet), Broader customer reach
- **Scalability:** Complex but diversified

### B. Revenue Models

**1. Transaction-Based (One-Time Sales)**
- Revenue varies with volume
- Constant customer acquisition needed
- **Buyer Perspective:** Less valuable (discount of 20-30% vs. recurring)

**2. Subscription/Recurring Revenue**
- Predictable monthly/annual revenue
- High customer lifetime value
- **Buyer Perspective:** Highly valuable (premium of 50-100%+ vs. transaction)

**3. Hybrid (Transaction + Recurring)**
- Base of recurring + transaction upsells
- **Buyer Perspective:** Very attractive, best of both models

### C. Customer Segment Models

**B2C (Business to Consumer):**
- Serve individual consumers
- Many small customers (diversified)
- Marketing-intensive

**B2B (Business to Business):**
- Serve other businesses
- Fewer, larger customers (concentration risk)
- Sales-driven, longer cycles

**B2G (Business to Government):**
- Government contracts
- Stable but compliance-heavy
- Payment delays common

---

## 4. INDUSTRY ECOSYSTEM & STAKEHOLDERS

You must understand WHO affects the business and how.

### A. Map the Stakeholders

**Customers (End Users):**
- Who actually uses the service?
- Consumers, businesses, government?

**Payers (If Different from Customer):**
- **Critical:** Customer ≠ always the payer

**Suppliers & Vendors:**
- Who provides parts, materials, products?
- How many suppliers available?
- Is business dependent on specific suppliers?

**Key Question:** What % of purchases from single supplier?
- <50%: Acceptable
- 50-70%: Concern
- >70%: Red flag (supplier concentration risk)

**Referral Sources:**
- Who sends customers to the business?

**Regulators & Industry Bodies:**
- Who governs the industry?
- What licenses/permits required?
- What compliance obligations exist?

---

## 5. INDUSTRY ECONOMICS & UNIT ECONOMICS

### A. How Businesses Make Money (Revenue Drivers)

**Volume-Based Industries:**
- Revenue = # of units × price per unit

### B. Cost Structure

**Every business has these cost categories:**

**1. Cost of Goods Sold (COGS):**
- Direct costs of delivering service
- Parts, materials, direct labor
- **Typical Ranges:** Service industries: 20-40% COGS (60-80% gross margin)

**2. Labor Costs:**
- Wages, benefits, payroll taxes
- Often largest expense (25-45% of revenue)

**3. Occupancy Costs:**
- Rent, utilities, insurance, maintenance
- Typically 5-10% of revenue

**4. Marketing & Sales:**
- B2C high-volume: 8-15%
- B2B sales-driven: 10-20%
- Referral-based: 2-5%

**5. General & Administrative (G&A):**
- Back-office, technology, professional fees
- Typically 8-15% of revenue

### C. Unit Economics (Critical Concept)

**Unit Economics Framework:**
1. **Revenue per Unit:** How much does one unit generate?
2. **Variable Cost per Unit:** Direct costs only
3. **Contribution Margin:** Revenue - Variable costs
4. **Fixed Costs:** Rent, salaries, overhead (don't vary with volume)
5. **EBITDA:** Total contribution - Fixed costs

### D. Economies of Scale

**Why size matters:** Larger businesses often more profitable than smaller ones.

**Where scale creates value:**
1. **Procurement (10-20% savings):** Volume discounts from suppliers
2. **Back-Office Efficiency:** Accounting, HR, IT spread across more locations
3. **Marketing Leverage:** Regional campaigns cover multiple locations
4. **Technology Leverage:** Software costs same for 1 or 50 locations

---

## 6. MARKET SEGMENTS & COMPETITIVE LANDSCAPE

### A. Industry Consolidation Status

**Critical Question:** How consolidated is this industry?

**Consolidation Stages:**

**Early-Stage (<20% market share by top players):**
- Highly fragmented, many mom-and-pops
- PE platforms just forming
- Multiples rising as PE enters
- **Best for sellers:** Good time to sell, buyers hungry

**Mid-Stage (20-40% consolidated):**
- Clear leaders emerging
- Multiple platforms competing
- Peak multiples, very competitive
- **Best for sellers:** BEST time to sell, maximum competition

**Late-Stage (>40% consolidated):**
- Industry mature, fewer targets
- M&A slowing
- Multiples stable or declining
- **For sellers:** Window closing

### B. Competitive Dynamics

**Barriers to Entry:**
What protects existing businesses from new competition?

**Types of Barriers:**
- **Capital Requirements:** Expensive equipment, facilities
- **Regulatory:** Licenses, certifications required
- **Expertise:** Specialized skills, training
- **Relationships:** Customer contracts, referral networks
- **Brand:** Established reputation
- **Economies of Scale:** Large players have cost advantages

**High Barriers = Good (protects value)**
**Low Barriers = Risk (easy for competitors to enter)**

### C. Geographic Considerations

**High-Value Markets:**
- Large population (500K+ MSA)
- Growing population
- High income
- Business-friendly

**Lower-Value Markets:**
- Small population (<200K)
- Declining population
- Low income
- Single-industry dependent

**Clustering Premium:**
When buyer already has locations near seller:
- **Same market:** +10-20% premium (operational synergies)
- **Adjacent market:** +5-10% premium
- **New market:** No premium

---

# PART 2: WHAT MAKES COMPANIES ATTRACTIVE FOR ACQUISITION

Now that you understand the industry, you can evaluate specific companies.

---

## 7. FINANCIAL ATTRACTIVENESS

### A. EBITDA Size (Is the business big enough?)

**Size Categories:**

**<$500K EBITDA:**
- **Buyers:** Individual buyers, very small PE
- **Multiple:** 2-3x SDE (Seller's Discretionary Earnings)
- **Characteristic:** Owner-operator market

**$500K-$1M EBITDA:**
- **Buyers:** Independent sponsors, small PE
- **Multiple:** 3-4x EBITDA
- **Characteristic:** Transitional size

**$1M-$3M EBITDA:**
- **Buyers:** Regional PE platforms, independent sponsors
- **Multiple:** 4-6x EBITDA
- **Characteristic:** Lower middle market - SWEET SPOT for add-on acquisitions

**$3M-$10M EBITDA:**
- **Buyers:** National platforms, large PE
- **Multiple:** 5-7x EBITDA
- **Characteristic:** Platform-quality businesses

**$10M+ EBITDA:**
- **Buyers:** Large PE, strategic buyers
- **Multiple:** 6-10x+ EBITDA
- **Characteristic:** Can be platform itself

### B. EBITDA Margin Quality (Is the business profitable enough?)

**Margin Categories:**

**Premium Margins (Top Quartile):**
- Best-in-class operations
- Strong pricing power
- **Impact:** Premium multiples

**Strong Margins (Above Average):**
- Well-managed
- Good cost controls
- **Impact:** Market-rate multiples

**Average Margins (Median):**
- Industry-standard
- Opportunity for improvement
- **Impact:** Market multiples with scrutiny

**Below-Average Margins (Bottom Quartile):**
- Operational inefficiencies
- Cost structure problems
- **Impact:** Discount or deal-killer

### C. Revenue Concentration Risk

**Concentration Thresholds:**

**Minimal Risk (<10% from top customer):** No discount
**Acceptable Risk (10-20%):** Minor discount (0-10% off value)
**Elevated Risk (20-30%):** Moderate discount (10-20% off value)
**High Risk (30-50%):** Heavy discount (20-30%+ off) or no buyer interest
**Deal-Killer (>50%):** Often unsellable

### D. Revenue Growth Trends

**Growth Categories:**

**High Growth (>15% YoY):** Premium multiples (+0.5-1.0x above baseline)
**Moderate Growth (5-15% YoY):** Market-rate multiples, attractive
**Flat/Slow Growth (0-5% YoY):** Market multiples
**Declining Revenue (Negative Growth):** Significant discount or deal-killer

### E. Quality of Earnings

**Add-Back Acceptability:**

**Universally Accepted:**
- Owner compensation above market rate
- Personal expenses run through business (with documentation)
- One-time professional fees
- One-time repairs

**Scrutinized/Partially Accepted:**
- Family member payroll above market
- Excess rent if owner owns building
- Corporate vehicles (personal use portion only)

**Rarely Accepted:**
- "Growth" expenses
- Customer acquisition costs
- Deferred maintenance

**Red Flags:**
- Add-backs >25% of reported EBITDA
- Declining gross margins
- Revenue timing manipulation
- Missing documentation

---

## 8. OPERATIONAL ATTRACTIVENESS

### A. Identifying Critical KPIs

**Every industry has 5-7 KPIs that matter most.**

**Create KPI Table:**
| KPI | Top Quartile | Median | Bottom Quartile | Why It Matters |
|-----|--------------|--------|-----------------|----------------|
| [Metric 1] | [Value] | [Value] | [Value] | [Explanation] |

### B. Operational Strengths (What creates value?)

**1. Systems & Processes:**
- **Best:** Documented SOPs, training manuals, process flows
- **Poor:** "It's all in my head"
- **Impact:** Documented = +10-15% value, undocumented = -10-20%

**2. Technology & Software:**
- **Best:** Modern, cloud-based, integrated systems
- **Poor:** Paper-based, Excel, outdated software
- **Impact:** Modern tech = +5-10%, outdated = -10-20%

**3. Management Depth:**
- **Best:** Professional GM, strong #2, can run without owner
- **Poor:** Owner does everything, no depth
- **Impact:** Professional team = +15-25%, owner-dependent = -20-30%

**4. Customer Diversification:**
- **Best:** Retention >80%, long tenure, no concentration
- **Impact:** Strong metrics = +10-20%

**5. Facility & Equipment:**
- **Best:** Modern, well-maintained, expansion capacity
- **Poor:** Outdated, deferred maintenance, at capacity
- **Impact:** Excellent = +5-10%, poor = -10-20%

**6. Brand & Reputation:**
- **Best:** 4.5+ stars, 500+ reviews, strong local brand
- **Poor:** <3.5 stars, few reviews, poor reputation
- **Impact:** Strong brand = +5-15%, poor = -10-20%

### C. Operational Weaknesses (What destroys value?)

**Critical Red Flags:**

**1. Owner-Operator Dependency:**
- Owner works 50+ hours on essential tasks
- **Impact:** -20-30% value or unsellable to PE

**2. High Employee Turnover:**
- >40% annual turnover = major red flag
- **Impact:** High turnover = -15-25%

**3. Outdated Technology:**
- Paper processes, manual data entry
- **Impact:** Discount for upgrade costs (-10-20%)

**4. Capacity Constraints:**
- At 95-100% capacity, turning away work
- **Impact:** May subtract CapEx from price

**5. Inconsistent Performance:**
- Wide revenue swings, volatile margins
- **Impact:** -10-20% risk discount

**6. Weak Financial Controls:**
- Infrequent financials, cash-basis accounting
- **Impact:** -15-25% discount, larger escrow

---

## 9. STRATEGIC ATTRACTIVENESS

### A. Geographic Factors

**High-Value Locations:**
- Population >500K, growing
- High income
- Diverse economy

**Clustering Value:**
- Buyer has locations nearby = +10-20% premium
- Same market = operational synergies

### B. Competitive Advantages (Moats)

**1. Regulatory/Licensing Moats:**
- Required licenses that are limited or hard to obtain
- **Impact:** Creates barriers, adds value

**2. Customer Switching Cost Moats:**
- High cost/disruption to switch providers
- **Impact:** 90%+ retention rates, pricing power

**3. Exclusive Relationships:**
- Exclusive territory, sole-source provider
- **Impact:** Guaranteed revenue, protected from competition

**4. Brand/Reputation Moats:**
- Well-known local/regional brand
- **Impact:** Customer acquisition easier, pricing power

### C. Certifications & Licenses

**Types:**

**Industry-Standard (Required):**
- Everyone must have
- No premium but lacking = disqualifying

**OEM/Specialty (Competitive Advantage):**
- Costly to obtain ($25K-$100K)
- Creates differentiation
- **Impact:** +10-20% value if in-demand

---

## 10. DEAL KILLERS & RED FLAGS

### A. Financial Red Flags

**Major Deal Killers:**

**❌ Declining Revenue >10% YoY:**
- Multi-year decline with no explanation
- **Impact:** Often deal-killer unless clear turnaround

**❌ Revenue Concentration >30%:**
- Single customer too dominant
- **Impact:** Heavy discount (20-30%) or deal-killer

**❌ Excessive Add-Backs >25% of EBITDA:**
- Indicates financials not reflective of true business
- **Impact:** Discount multiples, reject add-backs, may walk

**❌ Inconsistent/Unreliable Records:**
- Missing documentation
- **Impact:** -10-20% discount, large escrow, QoE required

### B. Operational Red Flags

**❌ Owner-Operator Dependency:**
- Business can't run without owner
- **Impact:** THE #1 deal-killer for PE

**❌ High Turnover (>40%):**
- Indicates culture/compensation problems
- **Impact:** -15-25% discount or deal-killer

**❌ At 100% Capacity:**
- No growth room without CapEx
- **Impact:** Subtract CapEx from value

**❌ Poor Online Reputation (<3.5 stars):**
- Service quality issues
- **Impact:** -10-20% discount

### C. Legal/Regulatory Red Flags

**❌ Regulatory Non-Compliance:**
- License violations, permit issues
- **Impact:** Often deal-killer

**❌ Pending Litigation:**
- Customer lawsuits, employee claims
- **Impact:** Escrow to cover OR deal-killer if large

**❌ Environmental Liabilities:**
- Contamination, Phase II issues
- **Impact:** Subtract cleanup cost or walk away

**❌ Lease Issues:**
- <2 years remaining, non-assignable
- **Impact:** May kill deal, need extension/renegotiation

### D. Market/Strategic Red Flags

**❌ Declining Industry:**
- Market shrinking, disruption imminent
- **Impact:** Reduced buyer interest, discount

**❌ Market Oversaturation:**
- Too many competitors, pricing pressure
- **Impact:** Lower buyer interest

**❌ Single Vendor Dependency (>70%):**
- Supplier could raise prices or terminate
- **Impact:** Risk discount, need diversification

---

# PART 3: APPLYING THE KNOWLEDGE - MATCHING SELLERS TO BUYERS

## How to Use This Intelligence

### STEP 1: Evaluate the Seller

**Financial Assessment:**
- EBITDA: $[X]M → Score: Is this above minimum threshold for PE?
- EBITDA Margin: [X]% → Score: How does this compare to benchmarks?
- Revenue Growth: [X]% → Score: Growing, flat, or declining?
- Customer Concentration: [X]% from top customer → Score: Acceptable risk level?

**Operational Assessment:**
- [KPI 1]: [Value] → Score vs. benchmark (top quartile, average, poor)
- Management depth → Score (professional team vs. owner-dependent)
- Technology level → Score (modern vs. outdated)

**Strategic Assessment:**
- Geographic market → Score (attractive market vs. not)
- Certifications/licenses → Score (valuable vs. standard)
- Competitive advantages → Score (strong moats vs. none)

**Red Flags:**
- Identify any deal-killers present
- Note concerns requiring due diligence

**Overall Seller Quality: [Score out of 100]**

### STEP 2: Determine Buyer Fit

**YES - Strong Fit When:**
- ✅ EBITDA well above minimum threshold
- ✅ Margins at or above industry median
- ✅ Revenue growing
- ✅ KPIs in top quartile or above average
- ✅ Low customer concentration (<20%)
- ✅ Professional management team
- ✅ Attractive geographic market
- ✅ Valuable certifications/moats
- ✅ Clean financials
- ✅ No major red flags

**MAYBE - Acceptable Fit When:**
- ⚠️ EBITDA at minimum threshold
- ⚠️ Margins average but not exceptional
- ⚠️ Revenue stable (not growing but not declining)
- ⚠️ KPIs average for industry
- ⚠️ Moderate customer concentration (20-30%)
- ⚠️ Some operational weaknesses but fixable
- ⚠️ Few red flags, all addressable

**NO - Poor Fit When:**
- ❌ EBITDA below minimum threshold
- ❌ Margins significantly below industry average
- ❌ Revenue declining
- ❌ KPIs in bottom quartile
- ❌ High customer concentration (>30%)
- ❌ Owner-operator dependent
- ❌ Major red flags present
- ❌ Weak market or declining industry

---

## RESEARCH CHECKLIST

Before assessing any seller, complete this research on their industry:

### Industry Fundamentals:
- [ ] NAICS code identified
- [ ] Industry scope defined (what's included/excluded)
- [ ] Subsegments identified
- [ ] Glossary of key terms created
- [ ] Business types within industry documented
- [ ] Business models understood (how companies make money)

### Ecosystem & Structure:
- [ ] Stakeholders mapped (customers, payers, suppliers, referral sources, regulators)
- [ ] Power dynamics understood
- [ ] Value chain mapped
- [ ] Competitive landscape assessed (fragmentation, barriers)
- [ ] Consolidation stage determined

### Economics:
- [ ] Revenue drivers identified
- [ ] Cost structure understood (COGS %, labor %, margins)
- [ ] Unit economics calculated
- [ ] Economies of scale documented

### Acquisition Criteria:
- [ ] Minimum EBITDA threshold for PE identified
- [ ] EBITDA margin benchmarks (top quartile, median, bottom quartile)
- [ ] Customer concentration acceptable limits
- [ ] Growth rate expectations
- [ ] Top 5-7 KPIs identified with benchmarks
- [ ] Quality of earnings standards (acceptable add-backs)
- [ ] Key certifications/licenses that add value
- [ ] Common red flags and deal-killers
- [ ] Valuation multiple ranges by quality tier

### Output Created:
- [ ] Industry Fundamentals Summary
- [ ] Acquisition Attractiveness Criteria
- [ ] KPI Benchmark Table
- [ ] Red Flags Checklist
- [ ] Buyer Fit Criteria Summary

---

This complete framework allows you to research any industry and assess any seller's attractiveness to buyers.

CRITICAL INSTRUCTIONS FOR OUTPUT QUALITY:
1. Be SPECIFIC - include actual numbers, percentages, dollar amounts, not ranges or "varies"
2. Use TABLES - create comparison tables, benchmark tables, scorecards
3. Name REAL COMPANIES - mention actual PE firms, platforms, and recent transactions when relevant
4. Include INDUSTRY-SPECIFIC details - not generic advice that applies to any industry
5. Write in DEPTH - each section should be comprehensive, not surface-level
6. Provide ACTIONABLE criteria - specific thresholds buyers use to make decisions`;

// Phase-specific prompts with detailed requirements
const PHASE_PROMPTS = {
  phase1: {
    name: "Industry Fundamentals",
    instruction: `You are generating PART 1: INDUSTRY FUNDAMENTALS for the M&A guide.

CRITICAL: This must be DEEPLY RESEARCHED and HIGHLY SPECIFIC to this industry. No generic content.

## REQUIRED SECTIONS (All must be included):

### 1. INDUSTRY DEFINITION & SCOPE (1,500+ words)
- **NAICS Code**: Research and provide the actual 6-digit code(s)
- **Official Name**: The formal industry name used in government statistics
- **Common Names**: What practitioners call it
- **Scope Definition**: 
  - What IS included (be specific with service types)
  - What is NOT included (adjacent industries to exclude)
  - Boundary cases (where this industry ends)
- **Subsegments**: Identify 4-6 distinct subsegments with:
  - Name and description
  - Typical company size
  - Revenue model differences
  - Buyer interest level

### 2. INDUSTRY TERMINOLOGY & LANGUAGE (2,000+ words)
Create a comprehensive glossary TABLE:
| Term | Definition | Why It Matters for M&A | Benchmark (if applicable) |

Include AT LEAST 25 terms covering:
- Revenue/pricing terms specific to this industry
- Operational metrics and KPIs
- Business model terminology
- Customer segment language
- Regulatory/compliance terms

### 3. BUSINESS MODELS & HOW COMPANIES MAKE MONEY (2,000+ words)
For THIS industry specifically:

**Service Delivery Models:**
| Model | How It Works | Typical Revenue | Margin Profile | Buyer Preference |
(Include 3-5 models common in this industry)

**Revenue Models:**
- Transaction-based: Specific examples in this industry
- Recurring/subscription: How it works here, what % is typical
- Project-based: Average project sizes, cycle times
- Valuation impact: Exact multiple adjustments for each model type

**Customer Segments:**
- B2C characteristics in this industry
- B2B characteristics in this industry
- B2G if applicable
- Concentration patterns typical in each

### 4. INDUSTRY ECOSYSTEM & STAKEHOLDERS (1,500+ words)
Map the entire ecosystem:

**Customer Analysis:**
- Who are the end customers? Demographics, psychographics
- Decision-makers vs. users
- Buying patterns and frequency
- Price sensitivity

**Payer Dynamics** (if different from customer):
- Who actually pays? Insurance, government, corporations?
- Payment terms and cycles
- Reimbursement rates if applicable

**Supplier Landscape:**
- Key supplier categories
- Concentration risks (what % from top suppliers is normal?)
- Pricing power dynamics

**Referral Network:**
- Who sends business? Quantify importance
- Referral fees or arrangements common?

**Regulatory Environment:**
- Governing bodies
- Required licenses with costs and timelines
- Compliance obligations
- Pending regulatory changes

### 5. INDUSTRY ECONOMICS & UNIT ECONOMICS (2,000+ words)
**Revenue Drivers:**
Specific formula for this industry: Revenue = [specific drivers]

**Cost Structure TABLE:**
| Cost Category | % of Revenue | Industry Range | Notes |
| COGS | X% | X-X% | [specifics] |
| Labor | X% | X-X% | [specifics] |
| Occupancy | X% | X-X% | [specifics] |
| Marketing | X% | X-X% | [specifics] |
| G&A | X% | X-X% | [specifics] |
| EBITDA | X% | X-X% | [specifics] |

**Unit Economics Example:**
Walk through a specific example:
- Revenue per [unit] = $X
- Variable costs = $X
- Contribution margin = $X
- Breakeven volume = X units

**Economies of Scale:**
Specific to this industry - where does size create advantage?
- Procurement savings: X% at X volume
- G&A leverage: cost per location at 1, 5, 10, 20 locations
- Marketing efficiency: CAC reduction curve
- Technology: cost per user/location

### 6. MARKET SEGMENTS & COMPETITIVE LANDSCAPE (2,000+ words)
**Consolidation Analysis:**
- Current stage: Early/Mid/Late
- Top 10 players and their market share (if known)
- Number of companies in the industry
- Fragmentation metrics

**PE Activity:**
- Active PE platforms (name them)
- Recent notable transactions (last 2-3 years)
- Multiples paid in recent deals
- Typical platform size and strategy

**Barriers to Entry TABLE:**
| Barrier Type | Strength (High/Med/Low) | Description | Buyer Implication |

**Geographic Analysis:**
- Hot markets (where is PE focusing?)
- Underserved markets
- Market characteristics that drive value

---

TARGET: 12,000-15,000 words with deep, researched, industry-specific content.
USE TABLES extensively.
Be SPECIFIC - actual numbers, actual companies, actual benchmarks.`
  },
  
  phase2: {
    name: "Acquisition Attractiveness",
    instruction: `You are generating PART 2: ACQUISITION ATTRACTIVENESS for the M&A guide.

CRITICAL: Provide SPECIFIC thresholds, benchmarks, and criteria that buyers actually use.

## REQUIRED SECTIONS (All must be included):

### 7. FINANCIAL ATTRACTIVENESS (3,000+ words)

**EBITDA Size Requirements TABLE:**
| EBITDA Range | Buyer Type | Typical Multiple | Deal Type | Notes |
| <$500K | | | | |
| $500K-$1M | | | | |
| $1M-$3M | | | | |
| $3M-$5M | | | | |
| $5M-$10M | | | | |
| $10M+ | | | | |

For THIS industry specifically:
- What is the MINIMUM EBITDA for PE interest? Why?
- What's the sweet spot for add-ons?
- At what size do you become a potential platform?

**EBITDA Margin Benchmarks TABLE:**
| Quartile | EBITDA Margin | What It Indicates | Multiple Impact |
| Top 10% | X%+ | | +X.Xx |
| Top Quartile | X-X% | | +X.Xx |
| Median | X-X% | | Baseline |
| Bottom Quartile | X-X% | | -X.Xx |
| Bottom 10% | <X% | | Often deal-killer |

**Revenue Concentration Matrix:**
| % from Top Customer | Risk Level | Multiple Impact | Buyer Reaction |
| <5% | Minimal | None | Very attractive |
| 5-10% | Low | None | Attractive |
| 10-15% | Acceptable | -0.25x | Proceed with caution |
| 15-20% | Elevated | -0.5x | Concern, need details |
| 20-30% | High | -1.0x | Significant issue |
| 30-50% | Very High | -1.5x+ | May pass |
| >50% | Deal-Killer | N/A | Will not proceed |

**Growth Rate Expectations:**
- Industry growth rate: X%
- Outperformers: X%+ (premium)
- Underperformers: <X% (discount)
- Declining: Deal-breaker threshold

**Quality of Earnings:**
- Acceptable add-backs in this industry
- Red flag add-backs
- Documentation requirements
- Add-back ceiling (% of EBITDA)

### 8. OPERATIONAL ATTRACTIVENESS (3,000+ words)

**KPI Benchmark TABLE (This is CRITICAL):**
| KPI | Excellent (Top 10%) | Good (Top 25%) | Average (Median) | Below Avg (25th) | Poor (Bottom 10%) | Why Buyers Care |
| [Industry KPI 1] | | | | | | |
| [Industry KPI 2] | | | | | | |
| [Industry KPI 3] | | | | | | |
| [Industry KPI 4] | | | | | | |
| [Industry KPI 5] | | | | | | |
| [Industry KPI 6] | | | | | | |
| [Industry KPI 7] | | | | | | |

Include the TOP 7 MOST IMPORTANT KPIs for this industry with specific benchmarks.

**Operational Value Drivers TABLE:**
| Factor | Excellent | Good | Average | Poor | Value Impact |
| Systems/SOPs | Fully documented | Mostly documented | Some documented | "In owner's head" | +15% to -20% |
| Technology | Cloud/modern | Current | Functional | Outdated/paper | +10% to -20% |
| Management | Professional GM | Strong #2 | Some depth | Owner-dependent | +25% to -30% |
| Customer Base | Diversified, long tenure | Good retention | Average churn | High concentration | +20% to -25% |
| Facilities | Modern, capacity | Good condition | Adequate | Deferred maintenance | +10% to -15% |
| Reputation | 4.5+ stars, 500+ reviews | 4.0+ stars | 3.5-4.0 | <3.5 stars | +15% to -20% |

**Owner Dependency Assessment:**
- What constitutes owner-dependency in this industry?
- How to measure it (hours, relationships, skills)
- Impact on value and buyer interest
- Remediation timeline expectations

### 9. STRATEGIC ATTRACTIVENESS (2,000+ words)

**Geographic Value Matrix:**
| Market Type | Characteristics | PE Interest | Multiple Premium |
| Tier 1 (Premium) | 1M+ pop, growing, high income | Very High | +0.5-1.0x |
| Tier 2 (Attractive) | 500K-1M pop, stable | High | +0.25-0.5x |
| Tier 3 (Standard) | 200K-500K pop | Moderate | Baseline |
| Tier 4 (Limited) | <200K, rural, declining | Low | -0.5-1.0x |

Name specific markets that are hot for this industry.

**Competitive Moats TABLE:**
| Moat Type | Example in This Industry | Value Impact | Sustainability |
| Regulatory/License | | | |
| Customer Lock-in | | | |
| Exclusive Relationships | | | |
| Brand/Reputation | | | |
| Scale Advantages | | | |
| Technology/IP | | | |

**Certifications & Licenses:**
| Certification | Required vs. Optional | Cost to Obtain | Time to Obtain | Value Impact |
(List all relevant for this industry)

### 10. DEAL KILLERS & RED FLAGS (2,000+ words)

**Financial Red Flags CHECKLIST:**
| Red Flag | Threshold | Impact | Can It Be Overcome? |
| Revenue Decline | >X% YoY | Deal-killer if sustained | Rarely |
| Customer Concentration | >X% | Heavy discount | Sometimes |
| Excessive Add-backs | >X% of EBITDA | Credibility issue | Depends |
| (Continue for all financial red flags)

**Operational Red Flags CHECKLIST:**
| Red Flag | How to Identify | Impact | Can It Be Overcome? |
| Owner Dependency | >X hrs/week on critical tasks | #1 deal-killer for PE | Takes 12-24 months |
| Employee Turnover | >X% annual | Culture/comp issue | 12 months to fix |
| (Continue for all operational red flags)

**Legal/Regulatory Red Flags CHECKLIST:**
(Complete table)

**Market/Strategic Red Flags CHECKLIST:**
(Complete table)

**THE DEAL-KILLER SUMMARY:**
Create a final checklist of absolute deal-killers for this industry:
❌ [Specific item 1 with threshold]
❌ [Specific item 2 with threshold]
... (at least 10 items)

---

TARGET: 12,000-15,000 words with specific, actionable benchmarks.
Every metric needs a NUMBER, not a range.
USE TABLES extensively - they're easier for buyers to reference.`
  },
  
  phase3: {
    name: "Application & Buyer Fit",
    instruction: `You are generating PART 3: APPLICATION & BUYER FIT CRITERIA for the M&A guide.

CRITICAL: Create ACTIONABLE frameworks that can be immediately used to evaluate sellers.

## REQUIRED SECTIONS (All must be included):

### 11. SELLER EVALUATION FRAMEWORK (3,000+ words)

**FINANCIAL ASSESSMENT SCORECARD:**
| Metric | 5 (Excellent) | 4 (Good) | 3 (Average) | 2 (Below Avg) | 1 (Poor) | Weight |
|--------|--------------|----------|-------------|---------------|----------|--------|
| EBITDA Size | >$XM | $X-XM | $X-XM | $X-XM | <$XM | 25% |
| EBITDA Margin | >X% | X-X% | X-X% | X-X% | <X% | 20% |
| Revenue Growth | >X% | X-X% | X-X% | X-X% | Declining | 15% |
| Revenue Concentration | <X% | X-X% | X-X% | X-X% | >X% | 20% |
| Revenue Quality (Recurring %) | >X% | X-X% | X-X% | X-X% | <X% | 20% |

**OPERATIONAL ASSESSMENT SCORECARD:**
| KPI | 5 (Excellent) | 4 (Good) | 3 (Average) | 2 (Below Avg) | 1 (Poor) | Weight |
|-----|--------------|----------|-------------|---------------|----------|--------|
| [KPI 1 for this industry] | [value] | [value] | [value] | [value] | [value] | X% |
| [KPI 2] | | | | | | X% |
| [KPI 3] | | | | | | X% |
| [KPI 4] | | | | | | X% |
| [KPI 5] | | | | | | X% |
| Management Depth | Prof. GM + team | Strong #2 | Some depth | Minimal | Owner-only | X% |
| Technology Level | Best-in-class | Modern | Current | Dated | Manual/paper | X% |

**STRATEGIC ASSESSMENT SCORECARD:**
| Factor | 5 (Excellent) | 4 (Good) | 3 (Average) | 2 (Below Avg) | 1 (Poor) | Weight |
|--------|--------------|----------|-------------|---------------|----------|--------|
| Market Quality | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Declining | X% |
| Competitive Moat | Multiple strong | 1-2 strong | Some barriers | Weak | None | X% |
| Certifications | Premium + required | Premium | Required | Some gaps | Missing critical | X% |
| Growth Runway | Significant | Good | Moderate | Limited | Saturated | X% |

**HOW TO SCORE:**
1. Rate each metric 1-5
2. Multiply by weight
3. Sum for each category
4. Create overall score

**INTERPRETATION:**
| Overall Score | Buyer Fit | Recommendation |
| 4.0-5.0 | Excellent | Priority pursuit, competitive process likely |
| 3.5-4.0 | Good | Solid opportunity, proceed with interest |
| 3.0-3.5 | Acceptable | Proceed with caution, negotiate on issues |
| 2.5-3.0 | Marginal | Only if strategic fit is compelling |
| <2.5 | Poor | Pass or significant restructuring needed |

### 12. BUYER MATCHING CRITERIA (3,000+ words)

**SIZE CRITERIA:**
For this industry specifically:

| Criteria | Minimum | Preferred | Optimal | Maximum |
|----------|---------|-----------|---------|---------|
| Annual Revenue | $XM | $X-XM | $X-XM | $XM+ (platform) |
| EBITDA | $XK | $X-XM | $X-XM | $XM+ (platform) |
| Location Count | X | X-X | X-X | X+ |
| Employee Count | X | X-X | X-X | X+ |
| Years in Business | X | X+ | X+ | N/A |

**SERVICE CRITERIA:**
| Criteria | Required | Preferred | Neutral | Avoided |
|----------|----------|-----------|---------|---------|
| Service Line 1 | ✓ | | | |
| Service Line 2 | | ✓ | | |
| Service Line 3 | | | ✓ | |
| [Specific service type] | | | | ✓ |

Service Mix Preferences:
- Ideal revenue mix by service type
- Recurring vs. transactional preferences
- Specializations that command premium
- Services that are turn-offs

**GEOGRAPHY CRITERIA:**
| Region | PE Activity Level | Notable Buyers | Notes |
| [Specific region 1] | Very High | [Name platforms] | [Why] |
| [Specific region 2] | High | [Name platforms] | [Why] |
| [Specific region 3] | Moderate | | |
| [Specific region 4] | Low | | |

Target Markets: [Name specific MSAs that are priority]
Avoid Markets: [Name specific markets to avoid and why]

**BUYER TYPES:**

**PE Platform Profiles:**
| Platform Name | Strategy | Typical Target Size | Geographic Focus | Service Focus |
| [Real firm 1] | Roll-up | $X-XM EBITDA | [Regions] | [Services] |
| [Real firm 2] | | | | |
| [Real firm 3] | | | | |
| [Real firm 4] | | | | |
| [Real firm 5] | | | | |

If you don't know specific firms, describe the buyer archetype.

**Strategic Buyer Profiles:**
| Buyer Type | What They're Looking For | Typical Multiple | Integration Approach |
| National strategic | | | |
| Regional strategic | | | |
| Adjacent industry | | | |

**Recent Transactions:**
| Date | Acquirer | Target | Size (if known) | Multiple (if known) |
| [Year] | [Buyer] | [Target] | | |
(Include 5-10 recent transactions if known)

### 13. VALUATION BENCHMARKS (2,000+ words)

**Multiple Ranges by Quality:**
| Quality Tier | EBITDA Multiple Range | SDE Multiple Range | Characteristics |
| Premium (Top 10%) | X.X-X.Xx | | [What makes them premium] |
| Above Average | X.X-X.Xx | | |
| Average | X.X-X.Xx | | |
| Below Average | X.X-X.Xx | | |
| Distressed | X.X-X.Xx | | [What puts them here] |

**Premium Factors (What adds to multiple):**
| Factor | Premium Impact | Required Evidence |
| High recurring revenue (>X%) | +0.5-1.0x | Contracts, history |
| Professional management | +0.5x | Org chart, tenure |
| Strong growth (>X%) | +0.5-1.0x | Financials |
| Clustering opportunity | +0.5x | Location analysis |
| Premium certifications | +0.25-0.5x | Documentation |

**Discount Factors (What reduces multiple):**
| Factor | Discount Impact | Mitigation Possible? |
| Customer concentration | -0.5-1.5x | Customer diversification plan |
| Owner dependency | -1.0-2.0x | Transition period, earnout |
| Below-average margins | -0.5x | Improvement plan |
| Declining revenue | -1.0x+ | Turnaround evidence |

**Deal Structure Norms:**
- Typical cash at close: X%
- Seller note expectations: X%, X-year term, X% interest
- Earnout frequency: X%
- Earnout structure: X% of deal, X-year, tied to [metric]
- Equity rollover: X-X% typical for PE

### 14. EXAMPLE SELLER EVALUATION (1,500+ words)

Create a COMPLETE example:

**SAMPLE COMPANY PROFILE:**
- Industry: [This industry]
- Revenue: $XM
- EBITDA: $XM (X% margin)
- Growth: X% YoY
- Employees: X
- Locations: X
- Top customer: X% of revenue
- Recurring revenue: X%
- Years in business: X
- Owner hours/week: X
- Management: [Description]
- Technology: [Description]
- Market: [Specific MSA]

**SCORING:**
[Walk through each scorecard with this example]

**FINANCIAL SCORE:**
| Metric | Value | Score | Weighted |
| EBITDA | $XM | X | X |
| EBITDA Margin | X% | X | X |
| ... | | | |
| **Subtotal** | | | X.X |

**OPERATIONAL SCORE:**
[Same format]

**STRATEGIC SCORE:**
[Same format]

**OVERALL SCORE: X.X**

**BUYER FIT CONCLUSION:**
[Strong/Acceptable/Poor] fit because:
- [Key positive 1]
- [Key positive 2]
- [Key concern 1]
- [Key concern 2]

**LIKELY BUYERS:**
- [Type 1] because [reason]
- [Type 2] because [reason]

**EXPECTED VALUATION:**
- Base multiple: X.Xx
- Adjustments: [list with impact]
- Expected range: $X.X-X.XM

---

## BUYER FIT CRITERIA SUMMARY

Consolidate everything into clear, extractable criteria:

**SIZE CRITERIA:**
- Minimum revenue: $XM
- Minimum EBITDA: $XK
- Preferred EBITDA: $X-XM
- Location requirements: X+
- Employee count: X+

**SERVICE CRITERIA:**
- Required services: [list]
- Preferred services: [list]
- Avoided services: [list]
- Revenue mix: X% recurring minimum

**GEOGRAPHY CRITERIA:**
- Target regions: [list specific regions]
- Priority markets: [list specific MSAs]
- Avoid markets: [list]

**BUYER TYPES:**
- Active PE platforms: [list names or archetypes]
- Strategic buyers: [describe profiles]
- Ideal buyer: [describe]

---

TARGET: 10,000-12,000 words with complete, usable frameworks.
Every scorecard must have SPECIFIC thresholds.
The example evaluation should be detailed enough to serve as a template.`
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
  const tableCount = (content.match(/\|.*\|/g) || []).length / 3;
  
  const requiredElements = [
    "NAICS",
    "EBITDA",
    "KPI",
    "VALUATION",
    "SIZE CRITERIA",
    "SERVICE CRITERIA",
    "GEOGRAPHY CRITERIA",
    "BUYER TYPES",
    "SCORECARD",
    "BENCHMARK"
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
    "EVALUATION FRAMEWORK",
    "BUYER MATCHING",
    "EXAMPLE"
  ];
  
  const contentUpper = content.toUpperCase();
  const sectionsFound = sectionsToCheck.filter(s => contentUpper.includes(s));
  const missingElements = requiredElements.filter(e => !contentUpper.includes(e));
  
  const issues: string[] = [];
  
  if (wordCount < 30000) {
    issues.push(`Word count (${wordCount.toLocaleString()}) below target (30,000)`);
  }
  if (tableCount < 10) {
    issues.push(`Table count (${Math.round(tableCount)}) below target (10)`);
  }
  if (sectionsFound.length < 10) {
    issues.push(`Only ${sectionsFound.length}/14 key sections found`);
  }
  if (missingElements.length > 0) {
    issues.push(`Missing required elements: ${missingElements.join(", ")}`);
  }
  
  let score = 0;
  score += Math.min(40, (wordCount / 40000) * 40);
  score += Math.min(25, (sectionsFound.length / 14) * 25);
  score += Math.min(20, (tableCount / 15) * 20);
  score += Math.min(15, ((requiredElements.length - missingElements.length) / requiredElements.length) * 15);
  
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

// Gap fill function
async function fillGaps(
  missingElements: string[],
  industryName: string
): Promise<string> {
  if (missingElements.length === 0) return "";
  
  const gapPrompt = `The M&A guide for "${industryName}" is missing content about: ${missingElements.join(", ")}.

Generate COMPREHENSIVE content for these missing elements. Be specific with:
- Actual numbers and benchmarks
- Tables where appropriate
- Industry-specific details
- Actionable criteria

Each missing element needs 500-1000 words of detailed content.`;

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
      max_tokens: 10000,
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

  const summaryMatch = content.match(/BUYER FIT CRITERIA SUMMARY([\s\S]*?)(?:---|\n##\s[^#]|\n#\s|$)/i);
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

  // Fallback extraction from sections
  if (!criteria.sizeCriteria) {
    const sizeMatch = content.match(/###?\s*SIZE CRITERIA([\s\S]*?)(?:\n###|\n##|$)/i);
    if (sizeMatch) criteria.sizeCriteria = sizeMatch[1].trim().substring(0, 2000);
  }

  if (!criteria.serviceCriteria) {
    const serviceMatch = content.match(/###?\s*SERVICE CRITERIA([\s\S]*?)(?:\n###|\n##|$)/i);
    if (serviceMatch) criteria.serviceCriteria = serviceMatch[1].trim().substring(0, 2000);
  }

  if (!criteria.geographyCriteria) {
    const geoMatch = content.match(/###?\s*GEOGRAPHY CRITERIA([\s\S]*?)(?:\n###|\n##|$)/i);
    if (geoMatch) criteria.geographyCriteria = geoMatch[1].trim().substring(0, 2000);
  }

  if (!criteria.buyerTypesCriteria) {
    const buyerMatch = content.match(/###?\s*BUYER TYPES([\s\S]*?)(?:\n###|\n##|$)/i);
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

    console.log(`Starting comprehensive M&A guide generation for: ${industryName}`);

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

            const userPrompt = `Generate a COMPREHENSIVE, IN-DEPTH M&A guide for the "${industryName}" industry.

${phase.instruction}

CRITICAL QUALITY REQUIREMENTS:
1. Be SPECIFIC - use actual numbers, percentages, dollar amounts
2. Create TABLES for benchmarks, scorecards, comparisons
3. Include INDUSTRY-SPECIFIC details, not generic advice
4. Write DEEPLY - each section should be thoroughly researched
5. Name REAL examples - companies, transactions, PE firms where possible
6. Make it ACTIONABLE - specific thresholds, not vague ranges

This guide will be used by professional M&A advisors. It must be comprehensive enough to serve as the definitive reference for this industry.`;

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

            console.log(`Phase ${phaseNum} complete: ${phaseContent.split(/\s+/).length} words`);
            
            sendEvent({
              type: 'phase_complete',
              phase: phaseNum,
              phaseName: phase.name,
              wordCount: phaseContent.split(/\s+/).length
            });

            // Add separator between phases
            if (i < phases.length - 1) {
              fullContent += "\n\n---\n\n";
            }
          }

          // Quality check
          console.log('Running quality validation...');
          sendEvent({ type: 'quality_check_start' });
          
          const quality = validateQuality(fullContent);
          console.log('Quality result:', quality);
          
          sendEvent({
            type: 'quality_check',
            ...quality
          });

          // Gap filling if needed
          if (!quality.passed && quality.missingElements.length > 0) {
            console.log(`Filling gaps: ${quality.missingElements.join(', ')}`);
            sendEvent({ 
              type: 'gap_fill_start',
              missingElements: quality.missingElements 
            });
            
            const gapContent = await fillGaps(quality.missingElements, industryName);
            
            if (gapContent) {
              fullContent += "\n\n---\n\n# ADDITIONAL CONTENT\n\n" + gapContent;
              
              sendEvent({
                type: 'gap_fill_content',
                content: gapContent
              });
              
              // Re-validate
              const updatedQuality = validateQuality(fullContent);
              sendEvent({
                type: 'quality_check',
                ...updatedQuality,
                afterGapFill: true
              });
            }
          }

          // Extract criteria
          const criteria = extractCriteria(fullContent);
          console.log('Extracted criteria:', Object.keys(criteria).filter(k => criteria[k as keyof typeof criteria]));
          
          sendEvent({
            type: 'criteria',
            ...criteria
          });

          sendEvent({
            type: 'complete',
            content: fullContent,
            wordCount: fullContent.split(/\s+/).length,
            criteria
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
