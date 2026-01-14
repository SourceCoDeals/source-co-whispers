# System Architecture

## Overview

SourceCo follows a modern serverless architecture with a React frontend, Supabase backend, and AI-powered edge functions for intelligent processing.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │Dashboard │ │ Tracker  │ │  Deal    │ │  Buyer   │            │
│  │  Index   │ │  Detail  │ │ Matching │ │  Detail  │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Client SDK                           │
│         (Auth, Realtime, Storage, Database, Functions)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Backend                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Edge Functions (30)                       ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        ││
│  │  │ enrich-  │ │ score-   │ │ extract- │ │ query-   │        ││
│  │  │  buyer   │ │buyer-deal│ │transcript│ │ universe │        ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL Database                       ││
│  │  20+ tables with RLS policies                               ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Storage Buckets                           ││
│  │  call-transcripts, tracker-documents, deal-transcripts      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │   Claude AI  │ │  Lovable AI  │ │  Firecrawl   │             │
│  │  (Anthropic) │ │   Gateway    │ │  (Scraping)  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework with hooks |
| TypeScript | Type safety |
| Vite | Build tooling and dev server |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| React Router v6 | Client-side routing |
| TanStack Query | Server state management |
| Recharts | Data visualization |

### Directory Structure

```
src/
├── components/           # Shared UI components
│   ├── ui/              # shadcn/ui base components
│   ├── layout/          # Layout components (AppLayout)
│   ├── tracker/         # Tracker-specific components
│   ├── dashboard/       # Dashboard widgets
│   └── skeletons/       # Loading states
├── features/            # Feature-based modules
│   ├── trackers/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── buyers/
│   ├── deals/
│   └── matching/
├── hooks/               # Shared hooks
│   └── queries/         # TanStack Query hooks
├── lib/                 # Utilities and constants
│   ├── types.ts         # Core TypeScript interfaces
│   ├── criteriaSchema.ts
│   └── utils.ts
├── pages/               # Route components
│   ├── Index.tsx        # Dashboard
│   ├── TrackerDetail.tsx
│   ├── DealMatching.tsx
│   ├── BuyerDetail.tsx
│   └── DealDetail.tsx
└── integrations/
    └── supabase/
        ├── client.ts    # Supabase client (auto-generated)
        └── types.ts     # Database types (auto-generated)
```

### State Management

1. **Server State (TanStack Query)**
   - Caches database queries
   - Automatic background refetching
   - Optimistic updates

2. **Local State (React useState/useReducer)**
   - UI state (modals, tabs, selections)
   - Form state

3. **URL State (React Router)**
   - Active tracker/deal IDs
   - Tab selections
   - Filter parameters

---

## Backend Architecture

### Supabase Components

#### Database (PostgreSQL)
- 20+ tables with relationships
- Row-Level Security (RLS) policies
- Database functions and triggers
- JSONB columns for flexible schema

#### Edge Functions (Deno Runtime)
- 30 serverless functions
- TypeScript with Deno APIs
- Direct database access via Supabase client
- External API integrations

#### Storage
- `call-transcripts`: Buyer call recordings
- `tracker-documents`: M&A guides and uploads
- `deal-transcripts`: Deal call recordings

#### Authentication
- Email/password authentication
- Session management
- Role-based access (admin, member)

---

## Data Flow Patterns

### Pattern 1: Read Flow
```
User Action → React Component → Supabase Client → PostgreSQL → Response → UI Update
```

### Pattern 2: AI Processing Flow
```
User Action → Edge Function → AI Provider → Process Response → Database Update → UI Refresh
```

### Pattern 3: Enrichment Flow
```
Trigger Enrich → Edge Function → Firecrawl Scrape → AI Extraction → Merge Data → Database Update
```

### Pattern 4: Scoring Flow
```
Open Deal Matching → Fetch Buyers → score-buyer-deal (per buyer) → Category Scores → Composite Score → Sort & Display
```

---

## Key Design Decisions

### 1. Feature-Based Organization
Components and hooks are organized by feature domain (trackers, buyers, deals) rather than by type, improving maintainability and discoverability.

### 2. Source Priority Hierarchy
Data extracted from different sources follows a strict priority:
1. **Call Transcripts** (highest) - Always overwrites
2. **Notes Analysis** (medium) - Overwrites website data
3. **Website Enrichment** (lowest) - Only fills empty fields

### 3. Confidence Tracking
Financial and extracted data includes confidence levels (high/medium/low) and source quotes, enabling users to assess data reliability.

### 4. Learning System
User decisions (approvals, rejections) are stored with context, enabling the scoring algorithm to improve over time without manual tuning.

### 5. Structured Criteria
Fit criteria are stored as structured JSONB (not free-form text), enabling programmatic comparison and validation.

---

## Security Architecture

### Row-Level Security (RLS)
All tables have RLS policies ensuring users can only access their own data:

```sql
CREATE POLICY "Users can view own trackers"
ON industry_trackers FOR SELECT
USING (user_id = auth.uid());
```

### API Key Management
- Secrets stored in Supabase Vault
- Never exposed to frontend
- Edge functions access via `Deno.env.get()`

### Authentication Flow
```
Login → Supabase Auth → Session Token → RLS Policy Check → Data Access
```

---

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns (tracker_id, user_id)
- JSONB indexes for criteria fields
- Connection pooling via Supabase

### Frontend Optimization
- React.memo for expensive components
- useMemo/useCallback for computed values
- Lazy loading for route components
- Skeleton loading states

### Edge Function Optimization
- Parallel API calls where possible
- Streaming responses for chat functions
- Retry logic with exponential backoff

---

## Deployment Architecture

### Development
```
Local Vite Dev Server → Supabase Cloud (shared)
```

### Production
```
Lovable CDN (Frontend) → Supabase Cloud (Backend)
```

### Environment Variables
| Variable | Purpose |
|----------|---------|
| VITE_SUPABASE_URL | Supabase project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Public API key |
| ANTHROPIC_API_KEY | Claude AI access |
| FIRECRAWL_API_KEY | Web scraping |
| LOVABLE_API_KEY | Lovable AI Gateway |
