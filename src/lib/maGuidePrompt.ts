// Complete M&A Industry Intelligence Guide - Master Prompt
// This is the full training guide for AI to generate comprehensive M&A guides

export const MA_GUIDE_MASTER_PROMPT = `# COMPLETE AI TRAINING GUIDE: INDUSTRY M&A INTELLIGENCE
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

This complete framework allows you to research any industry and assess any seller's attractiveness to buyers.`;

// Phase definitions for multi-phase generation
export const PHASE_PROMPTS = {
  phase1: {
    name: "Industry Fundamentals",
    instruction: `Generate PART 1 of the M&A Industry Guide for this industry. This is the INDUSTRY FUNDAMENTALS section.

You MUST include ALL of the following sections with DEEP, RESEARCHED content:

## 1. INDUSTRY DEFINITION & SCOPE
- NAICS Code (look up the actual 6-digit code)
- Official and common industry names
- What's included and what's excluded from this industry
- Where this industry ends and adjacent industries begin
- Key subsegments with their characteristics

## 2. INDUSTRY TERMINOLOGY & LANGUAGE
- Business types within the industry (with examples and why each matters)
- Revenue and business model terms specific to this industry
- Key operational metrics (KPIs) with SPECIFIC BENCHMARKS
- Create a glossary with: Term | Definition | Why It Matters | Benchmark (good/average/poor)

## 3. BUSINESS MODELS & HOW COMPANIES MAKE MONEY
- Service delivery models (fixed location, mobile, hybrid)
- Revenue models (transaction, recurring, hybrid) with valuation impact
- Customer segment models (B2C, B2B, B2G) with pros/cons

## 4. INDUSTRY ECOSYSTEM & STAKEHOLDERS
- Customers (end users) - who they are
- Payers (if different from customers) - critical relationships
- Suppliers & vendors - concentration risks
- Referral sources - who sends business
- Regulators & industry bodies - compliance requirements

## 5. INDUSTRY ECONOMICS & UNIT ECONOMICS
- Revenue drivers (volume × price formulas)
- Cost structure with SPECIFIC PERCENTAGES (COGS, labor, occupancy, marketing, G&A)
- Unit economics framework with example calculations
- Economies of scale opportunities

## 6. MARKET SEGMENTS & COMPETITIVE LANDSCAPE
- Consolidation status (early/mid/late stage with market share data)
- Barriers to entry (what protects existing businesses)
- Competitive dynamics
- Geographic considerations (high-value vs lower-value markets)

USE TABLES where appropriate. Be SPECIFIC with numbers, benchmarks, and examples.
Target: 8,000-12,000 words for this section.`,
    expectedSections: [
      "INDUSTRY DEFINITION & SCOPE",
      "INDUSTRY TERMINOLOGY & LANGUAGE", 
      "BUSINESS MODELS",
      "INDUSTRY ECOSYSTEM",
      "INDUSTRY ECONOMICS",
      "MARKET SEGMENTS"
    ],
    targetWordCount: 8000
  },
  
  phase2: {
    name: "Acquisition Attractiveness",
    instruction: `Generate PART 2 of the M&A Industry Guide for this industry. This is the ACQUISITION ATTRACTIVENESS section.

You MUST include ALL of the following sections with DEEP, RESEARCHED content:

## 7. FINANCIAL ATTRACTIVENESS
- EBITDA size categories with SPECIFIC thresholds for this industry
  - What's minimum EBITDA for PE interest?
  - What's the sweet spot for add-on acquisitions?
  - What multiples apply at each size tier?
- EBITDA margin benchmarks (top quartile, median, bottom quartile with SPECIFIC PERCENTAGES)
- Revenue concentration risk thresholds
- Revenue growth expectations vs industry growth rate
- Quality of earnings standards (what add-backs are accepted/rejected)

## 8. OPERATIONAL ATTRACTIVENESS
- TOP 5-7 KPIs buyers evaluate in this industry with SPECIFIC BENCHMARKS
  - Create a table: KPI | Excellent | Average | Poor | Why It Matters
- Operational strengths that create value (systems, tech, management, customers, facilities, brand)
- Operational weaknesses that destroy value (owner dependency, turnover, tech, capacity, performance)
- Management depth expectations

## 9. STRATEGIC ATTRACTIVENESS
- Geographic factors (high-value markets for this industry)
- Clustering premium opportunities
- Competitive advantages/moats specific to this industry
  - Regulatory/licensing moats
  - Customer switching costs
  - Exclusive relationships
  - Brand/reputation
- Key certifications and licenses that add value

## 10. DEAL KILLERS & RED FLAGS
- Financial red flags with specific thresholds
- Operational red flags
- Legal/regulatory red flags
- Market/strategic red flags
- Create a "Deal Killer Checklist" for this industry

USE TABLES where appropriate. Be SPECIFIC with numbers, benchmarks, and examples.
Target: 10,000-14,000 words for this section.`,
    expectedSections: [
      "FINANCIAL ATTRACTIVENESS",
      "OPERATIONAL ATTRACTIVENESS",
      "STRATEGIC ATTRACTIVENESS", 
      "DEAL KILLERS & RED FLAGS"
    ],
    targetWordCount: 10000
  },
  
  phase3: {
    name: "Application & Buyer Fit",
    instruction: `Generate PART 3 of the M&A Industry Guide for this industry. This is the APPLICATION section.

You MUST include ALL of the following:

## 11. SELLER EVALUATION FRAMEWORK
Create a complete scoring template for evaluating sellers in this industry:

### Financial Assessment Scorecard
| Metric | Excellent (5) | Good (4) | Average (3) | Below Avg (2) | Poor (1) |
|--------|---------------|----------|-------------|---------------|----------|
| EBITDA Size | [specific threshold] | ... | ... | ... | [threshold] |
| EBITDA Margin | [%] | [%] | [%] | [%] | [%] |
| Revenue Growth | [%] | [%] | [%] | [%] | [%] |
| Customer Concentration | [%] | [%] | [%] | [%] | [%] |

### Operational Assessment Scorecard
| KPI | Excellent (5) | Good (4) | Average (3) | Below Avg (2) | Poor (1) |
|-----|---------------|----------|-------------|---------------|----------|
| [Industry KPI 1] | [value] | [value] | [value] | [value] | [value] |
| [Industry KPI 2] | [value] | [value] | [value] | [value] | [value] |
... (include all 5-7 key KPIs)

### Strategic Assessment Scorecard
- Geographic market quality
- Certifications/licenses held
- Competitive advantages/moats
- Management depth
- Technology level

## 12. BUYER MATCHING CRITERIA
Create specific buyer fit criteria for this industry:

### SIZE CRITERIA
- Minimum revenue: $[X]M
- Minimum EBITDA: $[X]M  
- Preferred EBITDA range: $[X]M - $[X]M
- Location count preferences
- Employee count preferences

### SERVICE CRITERIA
- Required service lines
- Preferred specializations
- Service exclusions (what buyers avoid)
- Revenue mix preferences (recurring vs transaction)

### GEOGRAPHY CRITERIA
- Target regions for PE activity
- High-priority markets
- Markets to avoid
- Clustering opportunities

### BUYER TYPES
- PE platform profiles (name actual active firms if known)
- Strategic buyer profiles
- Ideal buyer characteristics
- Recent notable transactions in this space

## 13. VALUATION BENCHMARKS
- Multiple ranges by quality tier
- Premium factors (what adds to multiple)
- Discount factors (what reduces multiple)
- Deal structure norms (earnouts, seller notes, rollover)

## 14. EXAMPLE SELLER EVALUATION
Provide a hypothetical example of evaluating a seller in this industry:
- Sample seller profile
- How to score them on each dimension
- Whether they're a strong/acceptable/poor fit
- What the conclusion would be

## BUYER FIT CRITERIA SUMMARY
Consolidate all criteria into a clear summary:
- SIZE CRITERIA: [consolidated requirements]
- SERVICE CRITERIA: [consolidated requirements]  
- GEOGRAPHY CRITERIA: [consolidated requirements]
- BUYER TYPES: [consolidated buyer profiles]

Target: 8,000-10,000 words for this section.`,
    expectedSections: [
      "SELLER EVALUATION FRAMEWORK",
      "BUYER MATCHING CRITERIA",
      "VALUATION BENCHMARKS",
      "EXAMPLE SELLER EVALUATION",
      "BUYER FIT CRITERIA SUMMARY"
    ],
    targetWordCount: 8000
  }
};

// Expected sections for quality validation
export const EXPECTED_SECTIONS = [
  // Part 1 - Industry Fundamentals
  "INDUSTRY DEFINITION",
  "NAICS",
  "SUBSEGMENT",
  "TERMINOLOGY",
  "BUSINESS MODEL",
  "REVENUE MODEL",
  "ECOSYSTEM",
  "STAKEHOLDER",
  "ECONOMICS",
  "UNIT ECONOMICS",
  "CONSOLIDATION",
  "COMPETITIVE",
  
  // Part 2 - Acquisition Attractiveness  
  "FINANCIAL ATTRACTIVENESS",
  "EBITDA",
  "MARGIN",
  "CONCENTRATION",
  "OPERATIONAL ATTRACTIVENESS",
  "KPI",
  "STRATEGIC ATTRACTIVENESS",
  "CERTIFICATION",
  "LICENSE",
  "DEAL KILLER",
  "RED FLAG",
  
  // Part 3 - Application
  "EVALUATION",
  "SCORECARD",
  "BUYER MATCHING",
  "SIZE CRITERIA",
  "SERVICE CRITERIA",
  "GEOGRAPHY CRITERIA",
  "BUYER TYPES",
  "VALUATION",
  "MULTIPLE"
];

// Quality validation thresholds
export const QUALITY_THRESHOLDS = {
  minWordCount: 25000,
  minTables: 5,
  minSectionsFound: 20,
  requiredElements: [
    "NAICS",
    "EBITDA",
    "KPI",
    "VALUATION",
    "SIZE CRITERIA",
    "SERVICE CRITERIA", 
    "GEOGRAPHY CRITERIA",
    "BUYER TYPES"
  ]
};
