// Complete documentation content for SourceCo M&A Intelligence Platform
// This file contains all documentation in a single downloadable format

export const DOCUMENTATION_CONTENT = `# SourceCo M&A Intelligence Platform
## Complete Technical & Functional Documentation
### Version 1.0 | ${new Date().toISOString().split('T')[0]}

---

# TABLE OF CONTENTS

1. Executive Summary & Goals
2. Architecture Overview
3. Database Schema (20+ Tables)
4. Scoring Algorithm
5. Edge Functions (30 Functions)
6. User Workflows
7. Criteria Schema
8. Requirements Document
9. API Integrations
10. Component Architecture

---

# 1. EXECUTIVE SUMMARY & GOALS

## Purpose
SourceCo is an AI-powered M&A deal sourcing and buyer matching platform designed for buy-side M&A advisory firms.

## Core Capabilities
- **Buyer Universe Management**: Track PE firms and portfolio companies across industry verticals
- **Intelligence Capture**: Extract structured data from unstructured call transcripts using AI
- **Automated Scoring**: AI-powered buyer-deal compatibility scoring with 4 weighted categories
- **Human-in-the-Loop Learning**: Algorithm adapts based on user approvals/rejections
- **Deal Workflow Management**: End-to-end introduction tracking

## Value Proposition
- **Institutional Memory**: Every deal interaction improves future matching
- **Intelligence Capture**: Extract structured data from unstructured sources
- **Time Savings**: Automate manual buyer research and scoring
- **Decision Quality**: Data-driven buyer prioritization

---

# 2. ARCHITECTURE OVERVIEW

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- React Router v6 for navigation
- TanStack Query for data fetching

### Backend
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- 30 Edge Functions for AI processing
- Row Level Security (RLS) policies

### AI Providers
- Claude (Anthropic) - Primary AI for extraction and scoring
- Lovable AI Gateway - For chat and criteria parsing

### External Services
- Firecrawl - Website scraping with markdown extraction

## Data Flow Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │
│  │Dashboard│  │Trackers │  │  Deals  │  │  Deal Matching  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │
└───────┼────────────┼───────────┼─────────────────┼──────────┘
        │            │           │                 │
        ▼            ▼           ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE CLIENT                            │
│              (Real-time subscriptions + RPC)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐
│   PostgreSQL  │  │ Edge Functions│  │      Storage          │
│   (20+ tables)│  │  (30 funcs)   │  │   (Documents)         │
└───────────────┘  └───────┬───────┘  └───────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  External APIs  │
                  │ Claude/Firecrawl│
                  └─────────────────┘
\`\`\`

---

# 3. DATABASE SCHEMA

## Core Entity Tables

### industry_trackers
Primary container for buyer universes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| industry_name | TEXT | Display name (e.g., "Collision Repair") |
| user_id | UUID | Owner reference |
| fit_criteria | TEXT | Natural language criteria |
| size_criteria | JSONB | Structured size requirements |
| service_criteria | JSONB | Service/capability requirements |
| geography_criteria | JSONB | Geographic requirements |
| buyer_types_criteria | JSONB | Buyer segmentation rules |
| geography_weight | INTEGER | Scoring weight (default: 35) |
| size_weight | INTEGER | Scoring weight (default: 25) |
| service_mix_weight | INTEGER | Scoring weight (default: 25) |
| owner_goals_weight | INTEGER | Scoring weight (default: 15) |
| scoring_behavior | JSONB | Algorithm configuration |
| documents | JSONB | Uploaded M&A guides |
| ma_guide_content | TEXT | Generated guide content |
| archived | BOOLEAN | Soft delete flag |

### buyers
PE firm + platform combination with 70+ intelligence fields.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tracker_id | UUID | Parent tracker |
| pe_firm_name | TEXT | PE firm name (required) |
| platform_company_name | TEXT | Platform company name |
| pe_firm_website | TEXT | PE firm website URL |
| platform_website | TEXT | Platform website URL |
| thesis_summary | TEXT | AI-extracted investment thesis |
| thesis_confidence | TEXT | Confidence level |
| target_geographies | TEXT[] | Target acquisition regions |
| target_services | TEXT[] | Target service capabilities |
| target_industries | TEXT[] | Target industry verticals |
| min_revenue | NUMERIC | Minimum revenue target |
| max_revenue | NUMERIC | Maximum revenue target |
| min_ebitda | NUMERIC | Minimum EBITDA target |
| max_ebitda | NUMERIC | Maximum EBITDA target |
| acquisition_appetite | TEXT | Active/Moderate/Limited |
| recent_acquisitions | JSONB | Recent acquisition history |
| geographic_footprint | TEXT[] | Current operating locations |
| extraction_sources | JSONB | Data source tracking |
| data_last_updated | TIMESTAMP | Last enrichment date |

### deals
Represents acquisition opportunities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tracker_id | UUID | Parent tracker |
| deal_name | TEXT | Company name (required) |
| company_website | TEXT | Company website URL |
| revenue | NUMERIC | Annual revenue |
| revenue_confidence | TEXT | High/Medium/Low |
| ebitda_amount | NUMERIC | EBITDA value |
| ebitda_percentage | NUMERIC | EBITDA margin |
| ebitda_confidence | TEXT | Confidence level |
| geography | TEXT[] | Operating locations |
| service_mix | TEXT | Services description |
| headquarters | TEXT | HQ location |
| owner_goals | TEXT | Seller objectives |
| deal_score | NUMERIC | Composite score |
| industry_kpis | JSONB | Industry-specific KPIs |
| status | TEXT | active/archived |

### buyer_deal_scores
Junction table for buyer-deal matching with full scoring breakdown.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| buyer_id | UUID | Reference to buyer |
| deal_id | UUID | Reference to deal |
| composite_score | NUMERIC | Final weighted score (0-100) |
| geography_score | NUMERIC | Geography category score |
| service_score | NUMERIC | Services category score |
| acquisition_score | NUMERIC | Size/acquisition score |
| portfolio_score | NUMERIC | Portfolio fit score |
| business_model_score | NUMERIC | Business model score |
| thesis_bonus | NUMERIC | Thesis alignment bonus |
| data_completeness | TEXT | Data quality indicator |
| fit_reasoning | TEXT | AI-generated explanation |
| selected_for_outreach | BOOLEAN | User approved |
| passed_on_deal | BOOLEAN | User passed |
| pass_reason | TEXT | Pass reason |
| pass_category | TEXT | Pass category |
| hidden_from_deal | BOOLEAN | User removed |
| rejection_reason | TEXT | Removal reason |
| human_override_score | NUMERIC | Manual score override |

## Contact Management Tables

### buyer_contacts
Contacts linked to legacy buyer records.

### pe_firm_contacts
Contacts for PE firms (normalized hierarchy).

### platform_contacts
Contacts for platform companies.

| Common Columns | Type | Description |
|---------------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Contact name (required) |
| title | TEXT | Job title |
| email | TEXT | Email address |
| email_confidence | TEXT | Confidence level |
| phone | TEXT | Phone number |
| linkedin_url | TEXT | LinkedIn profile |
| role_category | TEXT | Role type |
| is_primary_contact | BOOLEAN | Primary flag |
| priority_level | INTEGER | Outreach priority |
| source | TEXT | Data source |

## Intelligence Tables

### call_intelligence
Extracted call data with summaries.

### intelligence_values
Normalized extracted values with confidence levels.

### buyer_transcripts / deal_transcripts
Raw transcript storage with extraction results.

## Hierarchy Tables

### pe_firms
Master PE firm records (unique by domain).

### platforms
Platform companies linked to PE firms.

### companies
Target companies (potential deals).

## Learning Tables

### buyer_learning_history
Tracks rejection reasons for algorithm learning.

### deal_scoring_adjustments
Per-deal weight multipliers and custom instructions.

## Supporting Tables

### outreach_records
Track buyer outreach activities and outcomes.

### profiles / user_roles
User management and permissions.

---

# 4. SCORING ALGORITHM

## Overview
The scoring algorithm evaluates buyer-deal fit across 4 weighted categories, applies bonuses/penalties, and learns from user decisions.

## Category Scores (0-100 each)

### Size Score (Default Weight: 25%)
Evaluates financial and scale fit.

**Scoring Logic:**
1. Compare deal revenue against buyer min/max range
2. Compare deal EBITDA against buyer targets
3. Compare location count against requirements
4. Apply buyer type constraints from tracker criteria

**Hard Disqualification Rules:**
- Deal revenue < 70% of buyer minimum → Score = 0
- Deal EBITDA < buyer minimum → Score = 0
- Single location when buyer requires 3+ → Score = 15

**Scoring Formula:**
\`\`\`
If in sweet spot: 100
If in range but not sweet spot: 70-90
If slightly outside range: 40-60
If significantly outside: 0-30
\`\`\`

### Geography Score (Default Weight: 35%)
Evaluates geographic alignment with weighted matching.

**Scoring Weights:**
- Target Geographies: 1.0 (full match)
- Geographic Footprint: 0.7 (current operations)
- Service Regions: 0.5 (service area)
- HQ Location: 0.3 (headquarters only)

**State Adjacency:**
Adjacent states score 70% of direct match.

**Regional Definitions:**
- Southeast: FL, GA, AL, MS, LA, SC, NC, TN, KY, AR
- Northeast: ME, NH, VT, MA, RI, CT, NY, NJ, PA
- Midwest: OH, IN, IL, MI, WI, MN, IA, MO, ND, SD, NE, KS
- Southwest: TX, OK, NM, AZ
- West: CA, OR, WA, NV, UT, CO, ID, MT, WY
- Mid-Atlantic: DE, MD, DC, VA, WV

**Hard Constraints:**
Extracted from buyer thesis (e.g., "Only Texas" → non-TX = 0).

### Services Score (Default Weight: 25%)
Evaluates service/capability alignment.

**Scoring Logic:**
1. Check deal services against buyer's excluded services (dealbreaker)
2. Match against required services (must have)
3. Match against preferred services (bonus)
4. Primary focus alignment (highest weight)

**Score Calculation:**
\`\`\`
If excluded service present: 0
If missing required service: max 40
Full primary focus match: 100
Partial match: proportional
\`\`\`

### Owner Goals Score (Default Weight: 15%)
Evaluates seller objective alignment.

**Matching Criteria:**
- Roll equity preferences
- Transition timeline
- Deal structure preferences
- Management continuity expectations

## Composite Score Calculation

\`\`\`javascript
compositeScore = (
  sizeScore * sizeWeight * sizeMult +
  geoScore * geoWeight * geoMult +
  serviceScore * serviceWeight * servicesMult +
  ownerGoalsScore * ownerGoalsWeight
) / totalWeight

// Add bonuses
+ thesisBonus (0-15 points)
+ engagementBonus (0-20 points)
+ customBonus (from parsed instructions)

// Apply penalties
- learningPenalty (0-25 points from rejection history)
\`\`\`

## Score Tiers

| Tier | Range | Description |
|------|-------|-------------|
| Excellent | 85-100 | Strong fit across all categories |
| Strong | 70-84 | Good fit with minor gaps |
| Moderate | 55-69 | Reasonable fit, review recommended |
| Weak | 40-54 | Poor fit, likely pass |
| Poor | 0-39 | Disqualified or major mismatches |

## Thesis Bonus (0-15 points)
Applied when deal characteristics align with buyer's stated thesis.

**Triggers:**
- Deal matches thesis keywords
- Deal in buyer's priority markets
- Deal fits stated acquisition strategy

## Engagement Bonus (0-20 points)
Applied based on buyer activity signals.

**Signals:**
- Recent call activity (+5)
- Active acquisition pipeline (+5)
- Fee agreement in place (+5)
- Expressed interest in similar deals (+5)

## Learning Penalty (0-25 points)
Applied based on historical rejection patterns.

**Calculation:**
- Track rejections in buyer_learning_history
- Group by rejection category
- Apply penalty for repeated patterns
- Maximum penalty: 25 points

## Weight Adjustment (recalculate-deal-weights)

**Trigger:** After user makes approval/pass/rejection decisions.

**Logic:**
1. Analyze patterns in approved vs passed buyers
2. If approved buyers have low geo scores → reduce geo weight
3. If passes are primarily for size → increase size weight
4. Store multipliers in deal_scoring_adjustments

---

# 5. EDGE FUNCTIONS (30 Functions)

## Enrichment Functions

### enrich-buyer (~1,400 lines)
Scrapes and enriches buyer profiles from websites.

**Process:**
1. Receive buyer ID and website URLs
2. Scrape PE firm website via Firecrawl
3. Extract with Claude: Business Overview, Thesis, Portfolio, Target Criteria
4. Scrape platform website (if different)
5. Extract: Geography, Customers, Acquisitions, Services
6. Normalize geography to state abbreviations
7. Merge with existing data (respect source priority)
8. Update buyer record

**Source Priority:** transcript > notes > website > csv

### enrich-deal (~540 lines)
Enriches deal profiles from company websites.

**Extracts:**
- Company overview
- Geographic presence
- Services offered
- Headquarters location

## Transcript Extraction

### extract-deal-transcript (~890 lines)
Extracts structured data from deal call transcripts.

**M&A Analyst Persona:**
- Revenue with confidence levels
- EBITDA (only from operating profit)
- Source quotes for each data point
- Follow-up questions for unclear data

### extract-transcript
Extracts buyer intelligence from call transcripts.

## Scoring Functions

### score-buyer-deal (~2,500 lines)
Main scoring algorithm implementation.

### score-buyer-geography
Dedicated geography scoring.

### score-service-fit
Service alignment scoring.

### recalculate-deal-weights
Adjusts scoring weights based on user decisions.

## Criteria Parsing

### parse-fit-criteria
Converts natural language to structured criteria.

### parse-scoring-instructions
Parses custom scoring rules.

### validate-criteria
Validates criteria completeness.

## Document Processing

### parse-tracker-documents
Extracts criteria from M&A guides.

### generate-ma-guide
Generates M&A guide content.

## AI Chat Functions

### query-buyer-universe
Conversational buyer search.

### query-tracker-universe
Tracker-level queries.

### update-fit-criteria-chat
Conversational criteria editing.

## Contact Functions

### find-buyer-contacts
Discovers buyer contacts.

### map-contact-columns
AI-powered CSV column mapping.

## CSV Import

### map-csv-columns
Buyer CSV column mapping.

### map-deal-csv-columns
Deal CSV column mapping.

## Other Functions

### dedupe-buyers
Buyer deduplication by domain.

### firecrawl-scrape
Generic web scraping.

### verify-platform-website
Website verification.

### analyze-tracker-notes / analyze-deal-notes
Notes analysis.

### generate-research-questions
AI research question generation.

---

# 6. USER WORKFLOWS

## Workflow 1: Creating a Buyer Universe

**Goal:** Set up a new industry vertical for buyer tracking.

**Steps:**
1. Navigate to Dashboard → Click "New Buyer Universe"
2. Enter industry name (e.g., "Commercial HVAC Services")
3. (Optional) Upload M&A Guide documents
   - AI extracts fit criteria automatically
4. Review/edit structured criteria:
   - Size: Revenue/EBITDA ranges, location counts
   - Geography: Target regions, exclusions
   - Services: Required capabilities, exclusions
   - Buyer Types: Segmentation rules
5. Configure scoring weights (or use defaults)
6. Save tracker

## Workflow 2: Adding and Enriching Buyers

**Goal:** Build buyer database with intelligence.

**Methods:**

**A. CSV Import:**
1. Prepare CSV with buyer data
2. Navigate to tracker → Buyers tab → Import CSV
3. AI maps columns automatically
4. Review mapping, confirm import
5. Select buyers → Bulk Enrich

**B. Manual Entry:**
1. Click "Add Buyer"
2. Enter PE firm name and website
3. (Optional) Enter platform details
4. Click "Enrich" to scrape intelligence

**C. Transcript Processing:**
1. Select buyer → Transcripts section
2. Paste call transcript
3. AI extracts: thesis, preferences, acquisition history
4. Review and confirm extracted data

## Workflow 3: Deal Intake and Scoring

**Goal:** Process a new deal and score against buyers.

**Steps:**
1. Navigate to tracker → Deals tab → Add Deal
2. Enter basic info:
   - Company name, website
   - Revenue, EBITDA (if known)
   - Geography, services
3. (Optional) Paste call transcript for AI extraction
4. Click "Enrich" to scrape website
5. Navigate to Deal Matching

## Workflow 4: Buyer-Deal Matching

**Goal:** Identify and prioritize buyers for a deal.

**Steps:**
1. Open Deal Matching page
2. View scored buyer list with category breakdowns
3. For each buyer:
   - Expand card to view details and contacts
   - **Approve:** Add to outreach list
   - **Pass:** Record reason, learn from decision
   - **Remove:** Hide with explanation (strongest signal)
4. (Optional) Add custom scoring instructions
5. (Optional) Use AI chat to query buyers

## Workflow 5: Outreach Management

**Goal:** Track buyer engagement.

**Steps:**
1. View approved buyers in outreach list
2. Select contacts for outreach
3. Record outreach activities
4. Update outcome (meeting scheduled, passed, etc.)
5. Track through deal stages

---

# 7. CRITERIA SCHEMA

## Size Criteria
\`\`\`typescript
interface SizeCriteria {
  min_revenue?: number;        // In millions
  max_revenue?: number;
  preferred_revenue?: number;
  min_ebitda?: number;
  max_ebitda?: number;
  preferred_ebitda?: number;
  min_locations?: number;
  max_locations?: number;
  ebitda_multiple_min?: string;  // "3x"
  ebitda_multiple_max?: string;  // "8x"
}
\`\`\`

## Service Criteria
\`\`\`typescript
interface ServiceCriteria {
  primary_focus: string[];       // REQUIRED - main services
  required_services: string[];   // Must have
  preferred_services: string[];  // Nice to have
  excluded_services: string[];   // Dealbreakers
  business_model?: string;       // e.g., "recurring revenue"
  customer_types?: string[];     // B2B, B2C, Government
  certifications?: string[];     // Required certifications
}
\`\`\`

## Geography Criteria
\`\`\`typescript
interface GeographyCriteria {
  required_regions: string[];    // Must operate in
  preferred_regions: string[];   // Bonus for presence
  excluded_regions: string[];    // Cannot operate in
  priority_metros: string[];     // Priority MSAs
  coverage_type?: 'national' | 'regional' | 'local';
  hq_preferences?: string[];     // Preferred HQ locations
}
\`\`\`

## Buyer Types Criteria
\`\`\`typescript
interface BuyerTypeCriteria {
  types: BuyerType[];
}

interface BuyerType {
  type_name: string;           // "National Platform"
  priority_order: number;      // 1 = highest priority
  min_ebitda?: number;
  max_ebitda?: number;
  min_locations?: number;
  geographic_scope?: string;   // "National", "Regional"
  acquisition_style?: string;  // "Aggressive", "Selective"
  description?: string;
}
\`\`\`

---

# 8. REQUIREMENTS DOCUMENT

## Functional Requirements

### FR1: Tracker Management
- FR1.1: Create, edit, archive industry trackers
- FR1.2: Upload M&A guide documents for criteria extraction
- FR1.3: Manually edit structured criteria
- FR1.4: Configure scoring weights and behavior
- FR1.5: Generate M&A guide from criteria

### FR2: Buyer Management
- FR2.1: Add buyers manually or via CSV import
- FR2.2: AI-powered CSV column mapping
- FR2.3: Enrich buyers from PE firm/platform websites
- FR2.4: Process call transcripts for intelligence
- FR2.5: Deduplicate buyers by domain
- FR2.6: Bulk operations (enrich, delete)
- FR2.7: Contact management per buyer

### FR3: Deal Management
- FR3.1: Create deals manually or via CSV
- FR3.2: Enrich deals from company websites
- FR3.3: Extract deal data from transcripts
- FR3.4: Confidence level tracking for financials
- FR3.5: Industry KPI configuration
- FR3.6: Deal status management

### FR4: Buyer-Deal Scoring
- FR4.1: Score all buyers against a deal
- FR4.2: Display category scores with breakdown
- FR4.3: Show data completeness indicators
- FR4.4: Support custom scoring instructions
- FR4.5: Learn from user decisions
- FR4.6: Manual score override capability

### FR5: Outreach Workflow
- FR5.1: Select buyers for outreach
- FR5.2: View contacts per buyer
- FR5.3: Pass on buyers with categorized reasons
- FR5.4: Remove buyers with learning capture
- FR5.5: Track outreach outcomes

### FR6: AI Chat
- FR6.1: Query buyer universe in natural language
- FR6.2: Clickable buyer names in responses
- FR6.3: Stack highlights from multiple queries
- FR6.4: Context-aware responses

### FR7: Dashboard
- FR7.1: Aggregate stats across trackers
- FR7.2: Pipeline funnel visualization
- FR7.3: Activity feed with timeframe filter
- FR7.4: Score distribution charts
- FR7.5: Conversion metrics

## Non-Functional Requirements

### NFR1: Performance
- Scoring 100+ buyers: < 10 seconds
- Dashboard load: < 3 seconds
- Enrichment per buyer: < 30 seconds

### NFR2: Security
- Row-level security on all tables
- User authentication required
- API key protection

### NFR3: Scalability
- Support 1000+ buyers per tracker
- Support 100+ deals per tracker
- Support concurrent users

### NFR4: AI Reliability
- Retry logic with exponential backoff
- Graceful degradation when AI unavailable
- Confidence levels on extracted data

### NFR5: Data Quality
- Source tracking for all data points
- Confidence indicators on financials
- Data completeness scoring

---

# 9. API INTEGRATIONS

## Anthropic Claude
- **Model:** claude-sonnet-4-20250514
- **Use Cases:** Extraction, scoring, analysis
- **API Key:** ANTHROPIC_API_KEY

## Firecrawl
- **Use Case:** Website scraping with markdown
- **API Key:** FIRECRAWL_API_KEY

## Lovable AI Gateway
- **Use Cases:** Chat, criteria parsing
- **API Key:** LOVABLE_API_KEY (auto-provisioned)

---

# 10. COMPONENT ARCHITECTURE

## Feature-Based Organization
\`\`\`
src/
├── features/
│   ├── trackers/
│   │   ├── components/
│   │   │   ├── TrackerHeader.tsx
│   │   │   ├── TrackerCriteriaSection.tsx
│   │   │   └── TrackerTabsContainer.tsx
│   │   ├── hooks/
│   │   │   ├── useTrackerState.ts
│   │   │   └── useTrackerActions.ts
│   │   └── types.ts
│   ├── buyers/
│   │   ├── components/
│   │   │   ├── BuyerHeader.tsx
│   │   │   ├── BuyerContactsTab.tsx
│   │   │   └── BuyerTranscriptsSection.tsx
│   │   └── types.ts
│   ├── deals/
│   │   └── types.ts
│   └── matching/
│       └── types.ts
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # AppLayout, NavLink
│   ├── tracker/         # Tracker-specific shared
│   ├── dashboard/       # Dashboard widgets
│   └── skeletons/       # Loading states
├── hooks/
│   ├── queries/         # TanStack Query hooks
│   └── *.ts             # General hooks
├── lib/
│   ├── types.ts         # Shared TypeScript types
│   ├── errors.ts        # Error utilities
│   ├── utils.ts         # General utilities
│   └── *.ts             # Domain utilities
└── pages/               # Route components
\`\`\`

## Key Pages

### Dashboard (Index.tsx)
- Stats cards with sparklines
- Pipeline funnel
- Buyer universe cards
- Activity feed

### TrackerDetail.tsx
- Header with actions
- Criteria section (collapsible)
- Tabs: Buyers, Deals
- AI chat sidebar

### DealMatching.tsx
- Deal summary
- Scored buyer list
- Category breakdowns
- Pass/Remove dialogs
- Custom instructions panel

### BuyerDetail.tsx
- Header with edit
- Tabs: Contacts, Deal History
- Transcript processing

### DealDetail.tsx
- Comprehensive deal info
- Financial data with confidence
- Industry KPIs

---

# END OF DOCUMENTATION

This document provides complete specifications to recreate the SourceCo M&A Intelligence Platform.

Generated: ${new Date().toISOString()}
`;

export function downloadDocumentation() {
  const blob = new Blob([DOCUMENTATION_CONTENT], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'SourceCo_Complete_Documentation.md';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
