import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  fetchTrackerExportData,
  exportBuyersToCSV,
  exportDealsToCSV,
  exportContactsToCSV,
  exportScoresToCSV,
  type TrackerExportData,
} from "./exportTracker";

// Helper to save files
function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Types for platform export
export interface PlatformExportData {
  exportVersion: string;
  exportedAt: string;
  trackers: TrackerExportData[];
  companies: Tables<"companies">[];
  peFirms: Tables<"pe_firms">[];
  platforms: Tables<"platforms">[];
  peFirmContacts: Tables<"pe_firm_contacts">[];
  platformContacts: Tables<"platform_contacts">[];
  trackerBuyers: Tables<"tracker_buyers">[];
  buyerLearningHistory: Tables<"buyer_learning_history">[];
  callIntelligence: Tables<"call_intelligence">[];
  intelligenceValues: Tables<"intelligence_values">[];
  industryTemplates: Tables<"industry_intelligence_templates">[];
  outreachRecords: Tables<"outreach_records">[];
  stats: PlatformExportStats;
}

interface PlatformExportStats {
  trackerCount: number;
  totalBuyers: number;
  totalDeals: number;
  totalContacts: number;
  companyCount: number;
  peFirmCount: number;
  platformCount: number;
}

/**
 * Fetch ALL platform data for export
 */
export async function fetchPlatformExportData(): Promise<PlatformExportData> {
  // Step 1: Fetch all trackers (not archived)
  const { data: trackers, error: trackersError } = await supabase
    .from("industry_trackers")
    .select("*")
    .eq("archived", false);

  if (trackersError) throw new Error(trackersError.message);

  // Step 2: Fetch all global/shared tables in parallel
  const [
    companiesRes,
    peFirmsRes,
    platformsRes,
    peFirmContactsRes,
    platformContactsRes,
    trackerBuyersRes,
    buyerLearningHistoryRes,
    callIntelligenceRes,
    intelligenceValuesRes,
    industryTemplatesRes,
    outreachRecordsRes,
  ] = await Promise.all([
    supabase.from("companies").select("*"),
    supabase.from("pe_firms").select("*"),
    supabase.from("platforms").select("*"),
    supabase.from("pe_firm_contacts").select("*"),
    supabase.from("platform_contacts").select("*"),
    supabase.from("tracker_buyers").select("*"),
    supabase.from("buyer_learning_history").select("*"),
    supabase.from("call_intelligence").select("*"),
    supabase.from("intelligence_values").select("*"),
    supabase.from("industry_intelligence_templates").select("*"),
    supabase.from("outreach_records").select("*"),
  ]);

  // Step 3: Fetch detailed data for each tracker
  const trackerExports: TrackerExportData[] = [];
  let totalBuyers = 0;
  let totalDeals = 0;
  let totalContacts = 0;

  for (const tracker of trackers || []) {
    const trackerData = await fetchTrackerExportData(tracker.id);
    trackerExports.push(trackerData);
    totalBuyers += trackerData.stats.buyerCount;
    totalDeals += trackerData.stats.dealCount;
    totalContacts += trackerData.stats.contactCount;
  }

  return {
    exportVersion: "2.0.0",
    exportedAt: new Date().toISOString(),
    trackers: trackerExports,
    companies: companiesRes.data || [],
    peFirms: peFirmsRes.data || [],
    platforms: platformsRes.data || [],
    peFirmContacts: peFirmContactsRes.data || [],
    platformContacts: platformContactsRes.data || [],
    trackerBuyers: trackerBuyersRes.data || [],
    buyerLearningHistory: buyerLearningHistoryRes.data || [],
    callIntelligence: callIntelligenceRes.data || [],
    intelligenceValues: intelligenceValuesRes.data || [],
    industryTemplates: industryTemplatesRes.data || [],
    outreachRecords: outreachRecordsRes.data || [],
    stats: {
      trackerCount: trackerExports.length,
      totalBuyers,
      totalDeals,
      totalContacts,
      companyCount: companiesRes.data?.length || 0,
      peFirmCount: peFirmsRes.data?.length || 0,
      platformCount: platformsRes.data?.length || 0,
    },
  };
}

/**
 * Generate comprehensive system architecture documentation
 */
export function generateSystemArchitectureMD(): string {
  return `# SourceCo Platform - Complete System Architecture

## Overview

SourceCo is an M&A deal management platform that helps investment bankers and PE firms track industry-specific buyer universes, score buyer-deal fit, and manage outreach campaigns.

---

## 1. Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 18.x |
| **Vite** | Build tool | 5.x |
| **TypeScript** | Type safety | 5.x |
| **Tailwind CSS** | Styling | 3.x |
| **shadcn/ui** | Component library | Latest |
| **TanStack Query** | Data fetching/caching | 5.x |
| **React Router** | Routing | 6.x |
| **Recharts** | Charting | 2.x |

### Backend (Supabase)
| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Database |
| **Supabase Auth** | Authentication |
| **Supabase Edge Functions** | Serverless backend (Deno) |
| **Supabase Storage** | File storage (transcripts, documents) |
| **Row Level Security (RLS)** | Data access control |

### External APIs
| Service | Purpose | Required Secret |
|---------|---------|-----------------|
| **Anthropic Claude** | AI extraction, scoring, analysis | ANTHROPIC_API_KEY |
| **Firecrawl** | Website scraping | FIRECRAWL_API_KEY |
| **OpenAI** (optional) | Alternative AI provider | OPENAI_API_KEY |

---

## 2. Environment Variables

### Required for Frontend (.env)
\`\`\`env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
VITE_SUPABASE_PROJECT_ID=your-project-id
\`\`\`

### Required for Edge Functions (Supabase Secrets)
\`\`\`env
# Core
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...        # Claude AI for extraction/scoring
FIRECRAWL_API_KEY=fc-...            # Website scraping
OPENAI_API_KEY=sk-...               # Optional fallback

# Internal
LOVABLE_API_KEY=...                  # Lovable AI integration
\`\`\`

---

## 3. Database Setup Steps

### Step 1: Create Supabase Project
1. Go to supabase.com and create a new project
2. Note down the project URL and anon key

### Step 2: Run Schema Migration
\`\`\`bash
# Option A: Using psql
psql -h db.your-project.supabase.co -U postgres -d postgres -f schema.sql

# Option B: Supabase SQL Editor
# Copy schema.sql contents and execute
\`\`\`

### Step 3: Configure Authentication
1. Enable Email/Password authentication
2. Enable Auto-confirm for email signups (for development)
3. Set Site URL to your frontend URL

### Step 4: Create Storage Buckets
\`\`\`sql
-- Create required buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('call-transcripts', 'call-transcripts', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('tracker-documents', 'tracker-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-transcripts', 'deal-transcripts', false);

-- Add storage policies
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('call-transcripts', 'tracker-documents', 'deal-transcripts'));

CREATE POLICY "Users can view own uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('call-transcripts', 'tracker-documents', 'deal-transcripts'));
\`\`\`

### Step 5: Set Secrets
In Supabase Dashboard → Settings → Edge Functions → Secrets:
- Add ANTHROPIC_API_KEY
- Add FIRECRAWL_API_KEY
- Add OPENAI_API_KEY (optional)

---

## 4. Edge Functions Reference

### Criteria & Parsing Functions
| Function | Purpose | Endpoint | Required Secrets |
|----------|---------|----------|------------------|
| \`parse-fit-criteria\` | Convert natural language criteria to structured JSONB | POST /parse-fit-criteria | ANTHROPIC_API_KEY |
| \`validate-criteria\` | Validate criteria structure and completeness | POST /validate-criteria | ANTHROPIC_API_KEY |
| \`parse-scoring-instructions\` | Parse custom scoring rules to structured format | POST /parse-scoring-instructions | ANTHROPIC_API_KEY |
| \`parse-tracker-documents\` | Extract criteria from uploaded documents | POST /parse-tracker-documents | ANTHROPIC_API_KEY |
| \`update-fit-criteria-chat\` | Update criteria via natural language chat | POST /update-fit-criteria-chat | ANTHROPIC_API_KEY |

### Enrichment Functions
| Function | Purpose | Endpoint | Required Secrets |
|----------|---------|----------|------------------|
| \`enrich-buyer\` | Scrape website and extract buyer profile data | POST /enrich-buyer | ANTHROPIC_API_KEY, FIRECRAWL_API_KEY |
| \`enrich-deal\` | Scrape deal company website for enrichment | POST /enrich-deal | ANTHROPIC_API_KEY, FIRECRAWL_API_KEY |
| \`find-buyer-contacts\` | Find contacts for a buyer from web sources | POST /find-buyer-contacts | ANTHROPIC_API_KEY, FIRECRAWL_API_KEY |
| \`firecrawl-scrape\` | Raw website scraping proxy | POST /firecrawl-scrape | FIRECRAWL_API_KEY |
| \`verify-platform-website\` | Classify website as platform vs PE firm | POST /verify-platform-website | ANTHROPIC_API_KEY, FIRECRAWL_API_KEY |

### Scoring Functions
| Function | Purpose | Endpoint | Required Secrets |
|----------|---------|----------|------------------|
| \`score-buyer-deal\` | Calculate composite buyer-deal match score | POST /score-buyer-deal | ANTHROPIC_API_KEY |
| \`score-buyer-geography\` | Score geographic fit for buyer | POST /score-buyer-geography | ANTHROPIC_API_KEY |
| \`score-service-fit\` | Score service offering alignment | POST /score-service-fit | ANTHROPIC_API_KEY |
| \`score-deal\` | Generate overall deal quality score | POST /score-deal | ANTHROPIC_API_KEY |
| \`recalculate-deal-weights\` | Adjust scoring weights based on feedback | POST /recalculate-deal-weights | - |

### Transcript Extraction Functions
| Function | Purpose | Endpoint | Required Secrets |
|----------|---------|----------|------------------|
| \`extract-transcript\` | Extract buyer data from call transcripts | POST /extract-transcript | ANTHROPIC_API_KEY |
| \`extract-deal-transcript\` | Extract deal data from call transcripts | POST /extract-deal-transcript | ANTHROPIC_API_KEY |

### Query & Research Functions
| Function | Purpose | Endpoint | Required Secrets |
|----------|---------|----------|------------------|
| \`query-buyer-universe\` | Natural language query over buyer data | POST /query-buyer-universe | ANTHROPIC_API_KEY |
| \`query-tracker-universe\` | Natural language query for tracker insights | POST /query-tracker-universe | ANTHROPIC_API_KEY |
| \`generate-research-questions\` | Generate M&A research questions for industry | POST /generate-research-questions | ANTHROPIC_API_KEY |
| \`generate-ma-guide\` | Generate comprehensive M&A industry guide | POST /generate-ma-guide | ANTHROPIC_API_KEY |
| \`analyze-deal-notes\` | Analyze deal notes for insights | POST /analyze-deal-notes | ANTHROPIC_API_KEY |
| \`analyze-tracker-notes\` | Analyze tracker notes for patterns | POST /analyze-tracker-notes | ANTHROPIC_API_KEY |

### Migration & Utility Functions
| Function | Purpose | Endpoint | Required Secrets |
|----------|---------|----------|------------------|
| \`map-csv-columns\` | AI-assisted CSV column mapping for buyer import | POST /map-csv-columns | ANTHROPIC_API_KEY |
| \`map-deal-csv-columns\` | AI-assisted CSV column mapping for deal import | POST /map-deal-csv-columns | ANTHROPIC_API_KEY |
| \`map-contact-columns\` | AI-assisted CSV column mapping for contacts | POST /map-contact-columns | ANTHROPIC_API_KEY |
| \`dedupe-buyers\` | Identify and merge duplicate buyers | POST /dedupe-buyers | ANTHROPIC_API_KEY |
| \`migrate-buyers-to-hierarchy\` | Migrate flat buyers to PE firm hierarchy | POST /migrate-buyers-to-hierarchy | - |
| \`migrate-deals-to-companies\` | Link deals to global companies table | POST /migrate-deals-to-companies | - |

---

## 5. Core Business Logic

### 5.1 Tracker Criteria System

Trackers store buyer fit criteria in two formats:

1. **Text Criteria** (human-readable):
   - \`fit_criteria\` - General criteria text
   - \`fit_criteria_size\` - Size requirements
   - \`fit_criteria_service\` - Service preferences
   - \`fit_criteria_geography\` - Geographic requirements
   - \`fit_criteria_buyer_types\` - Buyer type preferences

2. **Structured Criteria** (JSONB for scoring):
   \`\`\`json
   // size_criteria
   {
     "min_revenue": 1000000,
     "max_revenue": 50000000,
     "min_ebitda": 250000,
     "preferred_revenue": 10000000,
     "min_locations": 2
   }
   
   // service_criteria
   {
     "primary_focus": ["HVAC", "Plumbing"],
     "secondary_acceptable": ["Electrical"],
     "excluded": ["Solar"]
   }
   
   // geography_criteria
   {
     "preferred_regions": ["Southeast", "Texas"],
     "preferred_states": ["TX", "FL", "GA"],
     "excluded_states": ["CA", "NY"],
     "headquarters_required": false
   }
   \`\`\`

**Flow**: User enters text criteria → \`parse-fit-criteria\` edge function → AI extracts structured JSONB → Stored for scoring

### 5.2 Buyer-Deal Scoring Algorithm

The scoring system calculates a **composite score** (0-100) based on weighted dimensions:

\`\`\`
Composite Score = 
  (Geography Score × geography_weight) +
  (Service Score × service_mix_weight) +
  (Size Score × size_weight) +
  (Thesis Bonus)
  / Total Weights
\`\`\`

**Score Components**:

| Component | Measures | Range |
|-----------|----------|-------|
| Geography Score | HQ location, operating regions, acquisition geography | 0-100 |
| Service Score | Service mix alignment with target services | 0-100 |
| Size Score | Revenue/EBITDA fit within buyer's ranges | 0-100 |
| Portfolio Score | Similar companies in portfolio | 0-100 |
| Acquisition Score | Active acquisition appetite | 0-100 |
| Business Model Score | Model compatibility | 0-100 |
| Thesis Bonus | Strategic alignment boost | 0-20 |

**Stored in**: \`buyer_deal_scores\` table

### 5.3 Extraction Source Priority System

Data extraction tracks provenance with priority hierarchy:

| Source | Priority | Can Overwrite |
|--------|----------|---------------|
| Transcript | 100 | All |
| Notes | 80 | Website, CSV, Manual |
| Website | 60 | CSV, Manual |
| CSV Import | 40 | Manual |
| Manual Entry | 20 | None |

**Implementation**: Higher priority sources can overwrite lower priority. Tracked in \`extraction_sources\` JSONB column on buyers/deals.

### 5.4 PE Firm Hierarchy

The system supports two buyer models:

1. **Legacy Model** (\`buyers\` table):
   - Flat structure, tracker-specific
   - Contains both PE firm and platform data
   - Used for backwards compatibility

2. **Hierarchy Model** (recommended):
   - \`pe_firms\` → parent level (investment firm)
   - \`platforms\` → portfolio companies under PE firms
   - \`tracker_buyers\` → links PE firms/platforms to trackers
   - Enables cross-tracker buyer reuse

---

## 6. Key File Locations

\`\`\`
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── tracker/               # Tracker-specific components
│   ├── layout/                # AppLayout, navigation
│   ├── dashboard/             # Dashboard widgets/charts
│   └── skeletons/             # Loading skeletons
│
├── features/
│   ├── trackers/              # Tracker feature module
│   │   ├── components/        # TrackerHeader, TrackerCriteriaSection
│   │   ├── hooks/             # useTrackerState, useTrackerActions
│   │   └── types.ts           # TrackerState, TrackerActions
│   ├── buyers/                # Buyer feature module
│   ├── deals/                 # Deal feature module
│   └── matching/              # Buyer-deal matching
│
├── hooks/
│   ├── queries/               # TanStack Query hooks
│   │   ├── queryKeys.ts       # Centralized query key factory
│   │   └── index.ts           # Query hook exports
│   ├── useTrackerData.ts      # Main tracker data hook
│   ├── useBulkEnrichment.ts   # Bulk operations
│   └── useSortableTable.ts    # Table sorting logic
│
├── lib/
│   ├── types.ts               # Core TypeScript interfaces
│   ├── exportPlatform.ts      # Platform export functions
│   ├── exportTracker.ts       # Tracker export functions
│   ├── criteriaSchema.ts      # Criteria type definitions
│   ├── criteriaValidation.ts  # Criteria validation
│   ├── normalizeDomain.ts     # URL/domain normalization
│   ├── normalizeGeography.ts  # Geography standardization
│   └── industryTemplates.ts   # Industry-specific templates
│
├── pages/
│   ├── Index.tsx              # Dashboard
│   ├── Trackers.tsx           # Tracker list
│   ├── TrackerDetail.tsx      # Single tracker view
│   ├── BuyerDetail.tsx        # Single buyer view
│   ├── DealDetail.tsx         # Single deal view
│   ├── DealMatching.tsx       # Deal-buyer matching view
│   └── Auth.tsx               # Authentication
│
└── integrations/
    └── supabase/
        ├── client.ts          # Supabase client (auto-generated)
        └── types.ts           # Database types (auto-generated)

supabase/
├── functions/                 # Edge functions (Deno)
│   ├── _shared/               # Shared utilities
│   ├── parse-fit-criteria/    # Criteria parsing
│   ├── enrich-buyer/          # Buyer enrichment
│   ├── score-buyer-deal/      # Scoring logic
│   └── [25+ more functions]
│
├── migrations/                # Database migrations
└── config.toml                # Supabase config
\`\`\`

---

## 7. Data Flow Diagrams

### 7.1 Tracker Creation Flow
\`\`\`
User creates tracker → Enter industry name
  → Enter text criteria (size, service, geography)
  → Call parse-fit-criteria edge function
  → AI extracts structured JSONB
  → Save tracker with both text and structured criteria
  → Optionally upload documents
  → Call parse-tracker-documents to extract additional criteria
\`\`\`

### 7.2 Buyer Enrichment Flow
\`\`\`
User adds buyer (PE firm name + website)
  → Call enrich-buyer edge function
  → firecrawl-scrape fetches website content
  → Claude AI extracts buyer profile data
  → Data merged with existing (respecting source priority)
  → Buyer record updated
  → Optional: find-buyer-contacts for contact enrichment
\`\`\`

### 7.3 Deal Scoring Flow
\`\`\`
User creates/updates deal
  → For each buyer in tracker:
    → Call score-buyer-deal edge function
    → Calculate geography match (HQ, operating regions)
    → Calculate service match (services vs target_services)
    → Calculate size match (revenue/EBITDA vs ranges)
    → Calculate portfolio match (similar acquisitions)
    → Apply tracker weights
    → Generate fit_reasoning text
    → Save score to buyer_deal_scores
  → Sort buyers by composite score
  → Display ranked buyer list
\`\`\`

### 7.4 Transcript Extraction Flow
\`\`\`
User uploads transcript (Fireflies link or paste)
  → Create transcript record
  → Call extract-transcript edge function
  → AI identifies all data points with quotes
  → Return extracted_data and extraction_evidence
  → User reviews/approves extractions
  → Approved data merged to buyer (with 100 priority)
  → extraction_sources updated with transcript reference
\`\`\`

---

## 8. Deployment Instructions

### Deploy Edge Functions
\`\`\`bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-id

# Deploy all functions
supabase functions deploy

# Or deploy individual function
supabase functions deploy parse-fit-criteria
\`\`\`

### Deploy Frontend
\`\`\`bash
# Build
npm run build

# Deploy to Lovable (automatic on push)
# Or deploy to Vercel/Netlify with these settings:
# Build command: npm run build
# Output directory: dist
# Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
\`\`\`

---

## 9. Security Considerations

### Row Level Security (RLS)
All tables have RLS enabled. Users can only access:
- Trackers they own (user_id = auth.uid())
- Buyers/deals in their trackers
- Contacts under their buyers

### API Key Security
- Never expose service role key in frontend
- Edge functions use service role for admin operations
- Frontend uses anon key with RLS

### Data Validation
- All edge functions validate input
- Criteria parsing has validation triggers
- Scores are always recalculated, never trusted from import

---

*Generated by SourceCo Platform Export*
*For questions, refer to the codebase or contact the development team*
`;
}

/**
 * Generate database functions and triggers SQL
 */
function generateDatabaseFunctionsSQL(): string {
  return `
-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- Function: Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: Validate tracker criteria (non-blocking warnings)
CREATE OR REPLACE FUNCTION public.validate_tracker_criteria()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  has_primary_focus boolean := false;
  has_size_criteria boolean := false;
  service_criteria jsonb;
  size_criteria jsonb;
BEGIN
  service_criteria := NEW.service_criteria;
  IF service_criteria IS NOT NULL AND service_criteria ? 'primary_focus' THEN
    IF jsonb_typeof(service_criteria->'primary_focus') = 'array' AND 
       jsonb_array_length(service_criteria->'primary_focus') > 0 THEN
      has_primary_focus := true;
    END IF;
  END IF;
  
  size_criteria := NEW.size_criteria;
  IF size_criteria IS NOT NULL THEN
    IF (size_criteria->>'min_revenue' IS NOT NULL) OR
       (size_criteria->>'min_ebitda' IS NOT NULL) OR
       (size_criteria->>'min_locations' IS NOT NULL) THEN
      has_size_criteria := true;
    END IF;
  END IF;
  
  IF NOT has_primary_focus THEN
    RAISE WARNING 'Tracker % missing primary_focus', NEW.id;
  END IF;
  
  IF NOT has_size_criteria THEN
    RAISE WARNING 'Tracker % missing size thresholds', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_industry_trackers_updated_at
  BEFORE UPDATE ON industry_trackers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pe_firms_updated_at
  BEFORE UPDATE ON pe_firms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platforms_updated_at
  BEFORE UPDATE ON platforms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER validate_tracker_criteria_trigger
  BEFORE INSERT OR UPDATE ON industry_trackers
  FOR EACH ROW EXECUTE FUNCTION validate_tracker_criteria();

-- NOTE: Auth user trigger must be created via Supabase Dashboard
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`;
}

/**
 * Generate complete SQL schema for all tables
 */
export function generateSchemaSQL(): string {
  const schemaSQL = `-- ============================================================
-- COMPLETE DATABASE SCHEMA FOR SOURCECO PLATFORM
-- Generated: ${new Date().toISOString()}
-- ============================================================

-- IMPORTANT: Run these statements in order due to foreign key dependencies

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE app_role AS ENUM ('admin', 'member', 'viewer');

-- ============================================================
-- TABLE 1: profiles (user profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 2: user_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 3: companies (global company records)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_overview TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_linkedin TEXT,
  revenue NUMERIC,
  revenue_confidence TEXT,
  revenue_is_inferred BOOLEAN,
  revenue_source_quote TEXT,
  ebitda_amount NUMERIC,
  ebitda_percentage NUMERIC,
  ebitda_confidence TEXT,
  ebitda_is_inferred BOOLEAN,
  ebitda_source_quote TEXT,
  employee_count INTEGER,
  location_count INTEGER,
  founded_year INTEGER,
  headquarters TEXT,
  geography TEXT[],
  industry_type TEXT,
  service_mix TEXT,
  business_model TEXT,
  ownership_structure TEXT,
  owner_goals TEXT,
  special_requirements TEXT,
  additional_info TEXT,
  transcript_link TEXT,
  financial_notes TEXT,
  financial_followup_questions TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 4: industry_trackers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.industry_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  industry_name TEXT NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  fit_criteria TEXT,
  fit_criteria_size TEXT,
  fit_criteria_service TEXT,
  fit_criteria_geography TEXT,
  fit_criteria_buyer_types TEXT,
  size_criteria JSONB,
  service_criteria JSONB,
  geography_criteria JSONB,
  buyer_types_criteria JSONB,
  geography_weight NUMERIC NOT NULL DEFAULT 1,
  service_mix_weight NUMERIC NOT NULL DEFAULT 1,
  size_weight NUMERIC NOT NULL DEFAULT 1,
  owner_goals_weight NUMERIC NOT NULL DEFAULT 1,
  scoring_behavior JSONB,
  kpi_scoring_config JSONB,
  industry_template TEXT,
  documents JSONB,
  documents_analyzed_at TIMESTAMPTZ,
  ma_guide_content TEXT,
  ma_guide_generated_at TIMESTAMPTZ,
  ma_guide_qa_context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 5: pe_firms (PE firm hierarchy - parent level)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pe_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  website TEXT,
  linkedin TEXT,
  hq_city TEXT,
  hq_state TEXT,
  hq_country TEXT,
  hq_region TEXT,
  has_fee_agreement BOOLEAN,
  num_platforms INTEGER,
  portfolio_companies TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 6: platforms (portfolio companies under PE firms)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pe_firm_id UUID NOT NULL REFERENCES pe_firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  website TEXT,
  linkedin TEXT,
  hq_city TEXT,
  hq_state TEXT,
  hq_country TEXT,
  has_fee_agreement BOOLEAN,
  addon_only BOOLEAN,
  platform_only BOOLEAN,
  
  -- Size preferences
  min_revenue INTEGER,
  max_revenue INTEGER,
  min_ebitda INTEGER,
  max_ebitda INTEGER,
  revenue_sweet_spot INTEGER,
  ebitda_sweet_spot INTEGER,
  preferred_ebitda INTEGER,
  
  -- Targeting
  services_offered TEXT,
  target_services TEXT[],
  target_industries TEXT[],
  target_geographies TEXT[],
  geographic_footprint TEXT[],
  service_regions TEXT[],
  other_office_locations TEXT[],
  
  -- Strategy
  business_summary TEXT,
  thesis_summary TEXT,
  thesis_confidence TEXT,
  strategic_priorities TEXT,
  acquisition_appetite TEXT,
  acquisition_timeline TEXT,
  acquisition_frequency TEXT,
  acquisition_geography TEXT[],
  
  -- Business profile
  industry_vertical TEXT,
  business_model TEXT,
  business_model_prefs TEXT,
  business_model_exclusions TEXT[],
  industry_exclusions TEXT[],
  geographic_exclusions TEXT[],
  deal_breakers TEXT[],
  required_capabilities TEXT[],
  
  -- Customer targeting
  target_customer_profile TEXT,
  target_customer_size TEXT,
  target_customer_geography TEXT,
  target_customer_industries TEXT[],
  target_business_model TEXT,
  customer_industries TEXT[],
  customer_geographic_reach TEXT,
  primary_customer_size TEXT,
  go_to_market_strategy TEXT,
  revenue_model TEXT,
  specialized_focus TEXT,
  service_mix_prefs TEXT,
  
  -- Owner requirements
  owner_roll_requirement TEXT,
  owner_transition_goals TEXT,
  employee_owner TEXT,
  
  -- Track record
  portfolio_companies TEXT[],
  recent_acquisitions JSONB,
  total_acquisitions INTEGER,
  last_acquisition_date DATE,
  num_platforms INTEGER,
  
  -- Intelligence
  key_quotes TEXT[],
  call_history JSONB,
  last_call_date DATE,
  geo_preferences JSONB,
  operating_locations JSONB,
  extraction_evidence JSONB,
  extraction_sources JSONB,
  
  data_last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 7: buyers (tracker-specific buyer instances)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES industry_trackers(id) ON DELETE CASCADE,
  pe_firm_name TEXT NOT NULL,
  platform_company_name TEXT,
  platform_website TEXT,
  pe_firm_website TEXT,
  buyer_linkedin TEXT,
  pe_firm_linkedin TEXT,
  
  -- Location
  hq_city TEXT,
  hq_state TEXT,
  hq_country TEXT,
  hq_region TEXT,
  
  -- Size preferences
  min_revenue INTEGER,
  max_revenue INTEGER,
  min_ebitda INTEGER,
  max_ebitda INTEGER,
  revenue_sweet_spot INTEGER,
  ebitda_sweet_spot INTEGER,
  preferred_ebitda INTEGER,
  
  -- Targeting
  services_offered TEXT,
  target_services TEXT[],
  target_industries TEXT[],
  target_geographies TEXT[],
  geographic_footprint TEXT[],
  service_regions TEXT[],
  other_office_locations TEXT[],
  
  -- Strategy
  business_summary TEXT,
  thesis_summary TEXT,
  thesis_confidence TEXT,
  strategic_priorities TEXT,
  acquisition_appetite TEXT,
  acquisition_timeline TEXT,
  acquisition_frequency TEXT,
  acquisition_geography TEXT[],
  
  -- Business profile
  industry_vertical TEXT,
  business_type TEXT,
  business_model TEXT,
  business_model_prefs TEXT,
  business_model_exclusions TEXT[],
  industry_exclusions TEXT[],
  geographic_exclusions TEXT[],
  deal_breakers TEXT[],
  required_capabilities TEXT[],
  
  -- Customer targeting
  target_customer_profile TEXT,
  target_customer_size TEXT,
  target_customer_geography TEXT,
  target_customer_industries TEXT[],
  target_business_model TEXT,
  customer_industries TEXT[],
  customer_geographic_reach TEXT,
  primary_customer_size TEXT,
  go_to_market_strategy TEXT,
  revenue_model TEXT,
  specialized_focus TEXT,
  service_mix_prefs TEXT,
  
  -- Owner requirements
  owner_roll_requirement TEXT,
  owner_transition_goals TEXT,
  employee_owner TEXT,
  
  -- Track record
  portfolio_companies TEXT[],
  recent_acquisitions JSONB,
  total_acquisitions INTEGER,
  last_acquisition_date DATE,
  num_platforms INTEGER,
  
  -- Fee status
  has_fee_agreement BOOLEAN,
  fee_agreement_status TEXT,
  addon_only BOOLEAN,
  platform_only BOOLEAN,
  
  -- Intelligence
  key_quotes TEXT[],
  call_history JSONB,
  last_call_date DATE,
  geo_preferences JSONB,
  operating_locations JSONB,
  extraction_evidence JSONB,
  extraction_sources JSONB,
  
  data_last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 8: deals (tracker-specific deals)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES industry_trackers(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  deal_name TEXT NOT NULL,
  company_website TEXT,
  company_address TEXT,
  transcript_link TEXT,
  additional_info TEXT,
  company_overview TEXT,
  
  -- Contact info
  contact_name TEXT,
  contact_title TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_linkedin TEXT,
  
  -- Financials
  revenue NUMERIC,
  revenue_confidence TEXT,
  revenue_is_inferred BOOLEAN,
  revenue_source_quote TEXT,
  ebitda_amount NUMERIC,
  ebitda_percentage NUMERIC,
  ebitda_confidence TEXT,
  ebitda_is_inferred BOOLEAN,
  ebitda_source_quote TEXT,
  financial_notes TEXT,
  financial_followup_questions TEXT[],
  
  -- Company profile
  geography TEXT[],
  headquarters TEXT,
  service_mix TEXT,
  business_model TEXT,
  industry_type TEXT,
  employee_count INTEGER,
  location_count INTEGER,
  founded_year INTEGER,
  ownership_structure TEXT,
  
  -- Status & scoring
  status TEXT,
  deal_score NUMERIC,
  industry_kpis JSONB,
  extraction_sources JSONB,
  last_enriched_at TIMESTAMPTZ,
  
  -- Additional fields
  owner_goals TEXT,
  special_requirements TEXT,
  growth_trajectory TEXT,
  customer_concentration TEXT,
  customer_geography TEXT,
  end_market_customers TEXT,
  competitive_position TEXT,
  real_estate TEXT,
  technology_systems TEXT,
  key_risks TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 9: buyer_contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buyer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  role_category TEXT,
  company_type TEXT,
  is_primary_contact BOOLEAN,
  is_deal_team BOOLEAN,
  priority_level INTEGER,
  source TEXT,
  source_url TEXT,
  email_confidence TEXT,
  fee_agreement_status TEXT,
  last_contacted_date DATE,
  salesforce_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 10: pe_firm_contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pe_firm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pe_firm_id UUID NOT NULL REFERENCES pe_firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  role_category TEXT,
  is_primary_contact BOOLEAN,
  priority_level INTEGER,
  source TEXT,
  source_url TEXT,
  email_confidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 11: platform_contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  role_category TEXT,
  is_primary_contact BOOLEAN,
  priority_level INTEGER,
  source TEXT,
  source_url TEXT,
  email_confidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 12: tracker_buyers (PE firm hierarchy <-> tracker links)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tracker_buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES industry_trackers(id) ON DELETE CASCADE,
  pe_firm_id UUID NOT NULL REFERENCES pe_firms(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,
  fee_agreement_status TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tracker_id, pe_firm_id, platform_id)
);

-- ============================================================
-- TABLE 13: buyer_transcripts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buyer_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  transcript_type TEXT NOT NULL DEFAULT 'call',
  call_date DATE,
  notes TEXT,
  extracted_data JSONB,
  extraction_evidence JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 14: deal_transcripts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deal_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  transcript_type TEXT NOT NULL DEFAULT 'call',
  call_date DATE,
  notes TEXT,
  extracted_data JSONB,
  extraction_evidence JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 15: buyer_deal_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buyer_deal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  composite_score NUMERIC,
  geography_score NUMERIC,
  service_score NUMERIC,
  portfolio_score NUMERIC,
  acquisition_score NUMERIC,
  business_model_score NUMERIC,
  thesis_bonus NUMERIC,
  human_override_score NUMERIC,
  fit_reasoning TEXT,
  data_completeness TEXT,
  selected_for_outreach BOOLEAN,
  interested BOOLEAN,
  interested_at TIMESTAMPTZ,
  passed_on_deal BOOLEAN,
  pass_reason TEXT,
  pass_category TEXT,
  pass_notes TEXT,
  passed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejection_category TEXT,
  rejection_notes TEXT,
  rejected_at TIMESTAMPTZ,
  hidden_from_deal BOOLEAN,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, deal_id)
);

-- ============================================================
-- TABLE 16: buyer_learning_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.buyer_learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'feedback',
  rejection_reason TEXT,
  rejection_categories TEXT[],
  rejection_notes TEXT,
  deal_context JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE 17: deal_scoring_adjustments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deal_scoring_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID UNIQUE REFERENCES deals(id) ON DELETE CASCADE,
  custom_instructions TEXT,
  parsed_instructions JSONB,
  geography_weight_mult NUMERIC,
  services_weight_mult NUMERIC,
  size_weight_mult NUMERIC,
  approved_count INTEGER,
  rejected_count INTEGER,
  passed_geography INTEGER,
  passed_services INTEGER,
  passed_size INTEGER,
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE 18: call_intelligence
-- ============================================================
CREATE TABLE IF NOT EXISTS public.call_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL DEFAULT 'general',
  call_date DATE,
  transcript_url TEXT,
  call_summary TEXT,
  key_takeaways TEXT[],
  follow_up_questions TEXT[],
  extracted_data JSONB,
  extraction_version TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE 19: industry_intelligence_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.industry_intelligence_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES industry_trackers(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT DEFAULT 'text',
  applies_to TEXT,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER,
  example_values TEXT[],
  extraction_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE 20: intelligence_values
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intelligence_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_intelligence_id UUID NOT NULL REFERENCES call_intelligence(id) ON DELETE CASCADE,
  template_field_id UUID REFERENCES industry_intelligence_templates(id),
  category TEXT NOT NULL,
  field_name TEXT NOT NULL,
  text_value TEXT,
  numeric_value NUMERIC,
  boolean_value BOOLEAN,
  array_value TEXT[],
  confidence TEXT,
  is_inferred BOOLEAN,
  source_quote TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE 21: outreach_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outreach_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES buyer_contacts(id) ON DELETE SET NULL,
  outreach_channel TEXT,
  outreach_date DATE,
  custom_message TEXT,
  response_received BOOLEAN,
  response_date DATE,
  response_sentiment TEXT,
  meeting_scheduled BOOLEAN,
  meeting_date DATE,
  outcome TEXT,
  deal_stage TEXT,
  pass_reason TEXT,
  notes TEXT,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_buyers_tracker_id ON buyers(tracker_id);
CREATE INDEX IF NOT EXISTS idx_buyers_platform_website ON buyers(platform_website);
CREATE INDEX IF NOT EXISTS idx_deals_tracker_id ON deals(tracker_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_website ON deals(company_website);
CREATE INDEX IF NOT EXISTS idx_buyer_contacts_buyer_id ON buyer_contacts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_deal_scores_buyer_id ON buyer_deal_scores(buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_deal_scores_deal_id ON buyer_deal_scores(deal_id);
CREATE INDEX IF NOT EXISTS idx_platforms_pe_firm_id ON platforms(pe_firm_id);
CREATE INDEX IF NOT EXISTS idx_tracker_buyers_tracker_id ON tracker_buyers(tracker_id);

-- ============================================================
-- RLS POLICIES (template - adjust for your auth setup)
-- ============================================================
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pe_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pe_firm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_deal_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_learning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_scoring_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_intelligence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_records ENABLE ROW LEVEL SECURITY;

-- Example policy for industry_trackers (apply similar pattern to all tables)
CREATE POLICY "Users can manage own trackers" ON industry_trackers
  FOR ALL USING (auth.uid() = user_id);

-- Example policy for buyers (via tracker ownership)
CREATE POLICY "Users can manage buyers in own trackers" ON buyers
  FOR ALL USING (
    tracker_id IN (SELECT id FROM industry_trackers WHERE user_id = auth.uid())
  );

-- ============================================================
-- END OF SCHEMA
-- ============================================================
`;

  return schemaSQL + generateDatabaseFunctionsSQL();
}

/**
 * Generate comprehensive import instructions
 */
export function generateImportInstructionsMD(data: PlatformExportData): string {
  return `# SourceCo Platform Export - Complete Import Guide

## Export Information

| Property | Value |
|----------|-------|
| **Export Version** | ${data.exportVersion} |
| **Exported At** | ${new Date(data.exportedAt).toLocaleString()} |
| **Total Trackers** | ${data.stats.trackerCount} |
| **Total Buyers** | ${data.stats.totalBuyers} |
| **Total Deals** | ${data.stats.totalDeals} |
| **Total Contacts** | ${data.stats.totalContacts} |
| **PE Firms** | ${data.stats.peFirmCount} |
| **Platforms** | ${data.stats.platformCount} |

---

## Pre-Import Checklist

Before importing, ensure you have:

- [ ] A fresh database OR backup of existing data
- [ ] Supabase project set up with auth enabled
- [ ] Admin access to run SQL migrations
- [ ] Environment variables configured (SUPABASE_URL, SUPABASE_ANON_KEY)

---

## Step 1: Create Database Schema

Run the \`schema.sql\` file in your database to create all required tables:

\`\`\`bash
# Using psql
psql -h your-db-host -U postgres -d postgres -f schema.sql

# Or in Supabase SQL Editor
# Copy contents of schema.sql and execute
\`\`\`

---

## Step 2: Import Order (CRITICAL)

**Tables MUST be imported in this order due to foreign key constraints:**

1. **profiles** & **user_roles** - Create users first
2. **companies** - No dependencies
3. **industry_trackers** - Depends on user_id
4. **pe_firms** - Depends on user_id
5. **platforms** - Depends on pe_firms
6. **buyers** - Depends on industry_trackers
7. **deals** - Depends on industry_trackers, optionally companies
8. **tracker_buyers** - Depends on industry_trackers, pe_firms, platforms
9. **buyer_contacts** - Depends on buyers
10. **pe_firm_contacts** - Depends on pe_firms
11. **platform_contacts** - Depends on platforms
12. **buyer_transcripts** - Depends on buyers
13. **deal_transcripts** - Depends on deals
14. **industry_intelligence_templates** - Depends on industry_trackers
15. **buyer_deal_scores** - Depends on buyers, deals
16. **buyer_learning_history** - Depends on buyers, deals
17. **deal_scoring_adjustments** - Depends on deals
18. **call_intelligence** - Depends on buyers, deals
19. **intelligence_values** - Depends on call_intelligence, industry_intelligence_templates
20. **outreach_records** - Depends on buyers, deals, buyer_contacts

---

## Step 3: Field Type Reference

### Array Fields (TEXT[])
In CSV, arrays are semicolon-separated. Convert on import:

| Field | CSV Format | PostgreSQL Format |
|-------|------------|-------------------|
| target_services | \`Plumbing; HVAC; Electrical\` | \`{"Plumbing","HVAC","Electrical"}\` |
| geography | \`Texas; California\` | \`{"Texas","California"}\` |
| key_quotes | \`"Quote 1"; "Quote 2"\` | \`{"Quote 1","Quote 2"}\` |

### Boolean Fields
| CSV Value | PostgreSQL Value |
|-----------|------------------|
| \`true\` | \`TRUE\` |
| \`false\` | \`FALSE\` |
| (empty) | \`NULL\` |

### Numeric Fields
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| revenue | NUMERIC | \`5000000\` | Dollars, no commas |
| ebitda_amount | NUMERIC | \`750000\` | Dollars, no commas |
| ebitda_percentage | NUMERIC | \`0.15\` | Decimal (15% = 0.15) |
| employee_count | INTEGER | \`50\` | Whole number |
| geography_weight | NUMERIC | \`1.0\` | Scoring weight |

### JSONB Fields
Store as valid JSON strings:

\`\`\`json
// size_criteria example
{
  "min_revenue": 1000000,
  "max_revenue": 50000000,
  "min_ebitda": 250000,
  "revenue_sweet_spot": 10000000
}

// geo_preferences example
{
  "preferred_regions": ["Southeast", "Texas"],
  "excluded_states": ["California"],
  "max_distance_miles": 500
}
\`\`\`

---

## Step 4: CSV Import Commands

### Using psql COPY

\`\`\`bash
# Import trackers
\\copy industry_trackers(id,user_id,industry_name,archived,fit_criteria,size_criteria,service_criteria,geography_criteria,buyer_types_criteria,geography_weight,service_mix_weight,size_weight,owner_goals_weight,scoring_behavior,industry_template,created_at,updated_at) FROM 'trackers/tracker_config.csv' WITH (FORMAT csv, HEADER true);

# Import buyers
\\copy buyers FROM 'trackers/tracker_name/buyers.csv' WITH (FORMAT csv, HEADER true);

# Import deals  
\\copy deals FROM 'trackers/tracker_name/deals.csv' WITH (FORMAT csv, HEADER true);

# Import contacts
\\copy buyer_contacts FROM 'trackers/tracker_name/buyer_contacts.csv' WITH (FORMAT csv, HEADER true);
\`\`\`

---

## Step 5: JSON Import (Recommended for Complex Data)

Using the \`full_backup.json\` preserves all relationships and nested data:

\`\`\`javascript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const data = JSON.parse(fs.readFileSync('full_backup.json', 'utf8'));

// ID remapping to handle new UUIDs
const idMap = {
  trackers: new Map(),
  buyers: new Map(),
  deals: new Map(),
  contacts: new Map(),
};

// Step 1: Import trackers
for (const trackerExport of data.trackers) {
  const oldId = trackerExport.tracker.id;
  
  const { data: newTracker } = await supabase
    .from('industry_trackers')
    .insert({
      ...trackerExport.tracker,
      id: undefined, // Let DB generate new UUID
      user_id: YOUR_USER_ID, // Set to importing user
    })
    .select()
    .single();
  
  idMap.trackers.set(oldId, newTracker.id);
  
  // Step 2: Import buyers with new tracker_id
  for (const buyer of trackerExport.buyers) {
    const oldBuyerId = buyer.id;
    const { contacts, transcripts, ...buyerData } = buyer;
    
    const { data: newBuyer } = await supabase
      .from('buyers')
      .insert({
        ...buyerData,
        id: undefined,
        tracker_id: newTracker.id,
      })
      .select()
      .single();
    
    idMap.buyers.set(oldBuyerId, newBuyer.id);
    
    // Step 3: Import contacts with new buyer_id
    for (const contact of contacts) {
      await supabase.from('buyer_contacts').insert({
        ...contact,
        id: undefined,
        buyer_id: newBuyer.id,
      });
    }
  }
  
  // Step 4: Import deals with new tracker_id
  for (const deal of trackerExport.deals) {
    const oldDealId = deal.id;
    const { transcripts, scoringAdjustments, ...dealData } = deal;
    
    const { data: newDeal } = await supabase
      .from('deals')
      .insert({
        ...dealData,
        id: undefined,
        tracker_id: newTracker.id,
        company_id: null, // Will need separate mapping if used
      })
      .select()
      .single();
    
    idMap.deals.set(oldDealId, newDeal.id);
  }
}

console.log('Import complete!');
console.log('Trackers:', idMap.trackers.size);
console.log('Buyers:', idMap.buyers.size);
console.log('Deals:', idMap.deals.size);
\`\`\`

---

## Step 6: Post-Import Tasks

### Regenerate Scores
Buyer-deal scores are NOT imported (they're regenerated). After import:

1. Navigate to each tracker
2. Click "Score All" or "Enrich All" on Deals tab
3. Scores will be recalculated based on current criteria

### Verify Relationships
Run these queries to verify data integrity:

\`\`\`sql
-- Count records per table
SELECT 'trackers' as table_name, count(*) FROM industry_trackers
UNION ALL SELECT 'buyers', count(*) FROM buyers
UNION ALL SELECT 'deals', count(*) FROM deals
UNION ALL SELECT 'contacts', count(*) FROM buyer_contacts
UNION ALL SELECT 'scores', count(*) FROM buyer_deal_scores;

-- Verify buyer-tracker relationships
SELECT 
  t.industry_name,
  count(b.id) as buyer_count
FROM industry_trackers t
LEFT JOIN buyers b ON b.tracker_id = t.id
GROUP BY t.id, t.industry_name;

-- Verify deal-tracker relationships  
SELECT 
  t.industry_name,
  count(d.id) as deal_count
FROM industry_trackers t
LEFT JOIN deals d ON d.tracker_id = t.id
GROUP BY t.id, t.industry_name;

-- Find orphaned records (should return 0)
SELECT count(*) as orphaned_buyers FROM buyers 
WHERE tracker_id NOT IN (SELECT id FROM industry_trackers);

SELECT count(*) as orphaned_deals FROM deals
WHERE tracker_id NOT IN (SELECT id FROM industry_trackers);
\`\`\`

---

## What's NOT Imported

The following data is intentionally excluded or regenerated:

| Data Type | Reason |
|-----------|--------|
| **UUIDs** | Regenerated to prevent conflicts |
| **user_id** | Set to importing user's ID |
| **Timestamps** | created_at/updated_at are new |
| **buyer_deal_scores** | Regenerated during scoring |
| **Storage files** | Documents/transcripts files not exported |
| **Auth users** | Must exist before import |

---

## Troubleshooting

### "Foreign key constraint violation"
- Import tables in the correct order (see Step 2)
- Ensure referenced records exist before importing dependent tables

### "Duplicate key value violates unique constraint"
- UUIDs may conflict with existing data
- Use the JSON import method which generates new UUIDs

### "Invalid input syntax for type uuid"
- Check that ID fields contain valid UUIDs or are empty for auto-generation
- Remove quotes around UUID values in CSV

### Buyer/Deal counts don't match
- Check for filtering during export (archived trackers are excluded)
- Verify all CSVs were imported successfully

---

## File Manifest

| File | Description | Import Priority |
|------|-------------|-----------------|
| \`schema.sql\` | Complete DDL for all tables | Run first |
| \`IMPORT_INSTRUCTIONS.md\` | This file | Reference |
| \`full_backup.json\` | Complete nested JSON backup | Primary source |
| \`metadata.json\` | Export stats and version info | Reference |
| \`shared/companies.csv\` | Global companies table | After schema |
| \`shared/pe_firms.csv\` | PE firm hierarchy | After schema |
| \`shared/platforms.csv\` | Platform companies | After pe_firms |
| \`trackers/*/buyers.csv\` | Per-tracker buyers | After trackers |
| \`trackers/*/deals.csv\` | Per-tracker deals | After trackers |
| \`trackers/*/buyer_contacts.csv\` | Buyer contacts | After buyers |

---

*Generated by SourceCo Platform Export v${data.exportVersion}*
`;
}

/**
 * Export global tables to CSV
 */
function exportCompaniesToCSV(companies: Tables<"companies">[]): string {
  const headers = [
    "id", "domain", "company_name", "company_website", "company_overview",
    "contact_name", "contact_email", "contact_phone", "contact_linkedin",
    "revenue", "ebitda_amount", "ebitda_percentage", "employee_count",
    "location_count", "founded_year", "headquarters", "geography",
    "industry_type", "service_mix", "business_model", "ownership_structure",
    "owner_goals", "special_requirements", "created_at", "updated_at"
  ];

  const rows = companies.map(c => [
    c.id,
    c.domain,
    c.company_name,
    c.company_website || "",
    c.company_overview || "",
    c.contact_name || "",
    c.contact_email || "",
    c.contact_phone || "",
    c.contact_linkedin || "",
    c.revenue?.toString() || "",
    c.ebitda_amount?.toString() || "",
    c.ebitda_percentage?.toString() || "",
    c.employee_count?.toString() || "",
    c.location_count?.toString() || "",
    c.founded_year?.toString() || "",
    c.headquarters || "",
    (c.geography || []).join("; "),
    c.industry_type || "",
    c.service_mix || "",
    c.business_model || "",
    c.ownership_structure || "",
    c.owner_goals || "",
    c.special_requirements || "",
    c.created_at,
    c.updated_at,
  ]);

  return generateCSV(headers, rows);
}

function exportPEFirmsToCSV(peFirms: Tables<"pe_firms">[]): string {
  const headers = [
    "id", "name", "domain", "website", "linkedin",
    "hq_city", "hq_state", "hq_country", "hq_region",
    "has_fee_agreement", "num_platforms", "portfolio_companies",
    "created_at", "updated_at"
  ];

  const rows = peFirms.map(f => [
    f.id,
    f.name,
    f.domain,
    f.website || "",
    f.linkedin || "",
    f.hq_city || "",
    f.hq_state || "",
    f.hq_country || "",
    f.hq_region || "",
    f.has_fee_agreement ? "true" : "false",
    f.num_platforms?.toString() || "",
    (f.portfolio_companies || []).join("; "),
    f.created_at,
    f.updated_at,
  ]);

  return generateCSV(headers, rows);
}

// Helper to generate CSV
function generateCSV(headers: string[], rows: string[][]): string {
  const escapeCSV = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map(row => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Export complete platform as ZIP file
 */
export async function exportPlatformToZIP(): Promise<void> {
  const JSZip = (await import("jszip")).default;
  
  const data = await fetchPlatformExportData();
  const zip = new JSZip();

  // Add schema SQL
  zip.file("schema.sql", generateSchemaSQL());

  // Add system architecture documentation
  zip.file("SYSTEM_ARCHITECTURE.md", generateSystemArchitectureMD());

  // Add import instructions
  zip.file("IMPORT_INSTRUCTIONS.md", generateImportInstructionsMD(data));

  // Add full JSON backup
  zip.file("full_backup.json", JSON.stringify(data, null, 2));

  // Add metadata
  zip.file("metadata.json", JSON.stringify({
    exportVersion: data.exportVersion,
    exportedAt: data.exportedAt,
    stats: data.stats,
  }, null, 2));

  // Add shared tables
  const shared = zip.folder("shared");
  if (shared) {
    shared.file("companies.csv", exportCompaniesToCSV(data.companies));
    shared.file("pe_firms.csv", exportPEFirmsToCSV(data.peFirms));
  }

  // Add per-tracker folders
  const trackersFolder = zip.folder("trackers");
  if (trackersFolder) {
    for (const trackerData of data.trackers) {
      const folderName = sanitizeFilename(trackerData.tracker.industry_name);
      const folder = trackersFolder.folder(folderName);
      if (folder) {
        // Tracker config
        folder.file("tracker_config.json", JSON.stringify({
          industry_name: trackerData.tracker.industry_name,
          fit_criteria: trackerData.tracker.fit_criteria,
          fit_criteria_size: trackerData.tracker.fit_criteria_size,
          fit_criteria_service: trackerData.tracker.fit_criteria_service,
          fit_criteria_geography: trackerData.tracker.fit_criteria_geography,
          fit_criteria_buyer_types: trackerData.tracker.fit_criteria_buyer_types,
          size_criteria: trackerData.tracker.size_criteria,
          service_criteria: trackerData.tracker.service_criteria,
          geography_criteria: trackerData.tracker.geography_criteria,
          buyer_types_criteria: trackerData.tracker.buyer_types_criteria,
          geography_weight: trackerData.tracker.geography_weight,
          service_mix_weight: trackerData.tracker.service_mix_weight,
          size_weight: trackerData.tracker.size_weight,
          owner_goals_weight: trackerData.tracker.owner_goals_weight,
          scoring_behavior: trackerData.tracker.scoring_behavior,
          kpi_scoring_config: trackerData.tracker.kpi_scoring_config,
          industry_template: trackerData.tracker.industry_template,
          ma_guide_content: trackerData.tracker.ma_guide_content,
        }, null, 2));

        // CSVs
        folder.file("buyers.csv", exportBuyersToCSV(trackerData.buyers));
        folder.file("deals.csv", exportDealsToCSV(trackerData.deals));
        folder.file("buyer_contacts.csv", exportContactsToCSV(trackerData.buyers));
        
        // Scores
        const scoresCSV = await exportScoresToCSV(trackerData.tracker.id);
        folder.file("buyer_deal_scores.csv", scoresCSV);
      }
    }
  }

  // Generate and download ZIP
  const content = await zip.generateAsync({ type: "blob" });
  const filename = `sourceco_platform_export_${formatDate(new Date())}.zip`;
  saveFile(content, filename);
}
