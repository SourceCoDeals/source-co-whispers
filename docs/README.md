# SourceCo M&A Intelligence Platform

## Executive Summary

SourceCo is an AI-powered M&A deal sourcing and buyer matching platform designed for buy-side M&A advisory firms. The platform transforms how investment bankers identify, evaluate, and engage potential buyers for acquisition opportunities.

## Core Value Proposition

### 1. Institutional Memory
Every deal interaction—approvals, passes, rejections—improves future matching accuracy. The system learns from human decisions to refine scoring algorithms over time.

### 2. Intelligence Capture
Extract structured, actionable data from unstructured sources like call transcripts, websites, and documents. AI parses natural language into normalized fields with confidence levels.

### 3. Automated Scoring
Multi-dimensional buyer-deal compatibility scoring using weighted algorithms across size, geography, services, and owner goals categories.

### 4. Human-in-the-Loop Learning
The scoring algorithm adapts based on user approvals and rejections, automatically adjusting category weights and applying learning penalties for repeated mismatches.

---

## Quick Start Guide

### Prerequisites
- Node.js 18+
- Supabase account (or Lovable Cloud)
- API Keys: ANTHROPIC_API_KEY, FIRECRAWL_API_KEY

### Installation

```bash
# Clone repository
git clone <repository-url>
cd sourceco

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### First Steps

1. **Create an Industry Tracker**
   - Navigate to "New Tracker"
   - Enter industry name (e.g., "Collision Repair")
   - Optionally upload M&A Guide documents

2. **Add Buyers**
   - Go to Tracker Detail → Buyers tab
   - Click "Add Buyer" or "Import CSV"
   - Provide PE firm name and website
   - Optionally add platform company details

3. **Enrich Buyers**
   - Click "Enrich All" to AI-scrape websites
   - Review extracted intelligence
   - Add call transcripts for deeper insights

4. **Create a Deal**
   - Navigate to Tracker Detail → Deals tab
   - Enter deal name, website, and basic info
   - Upload/paste call transcripts for extraction

5. **Match Buyers to Deals**
   - Click on a deal to open Deal Matching
   - View AI-scored buyer list
   - Approve, pass, or remove buyers
   - Use AI chat for custom queries

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System architecture and technology stack |
| [Database Schema](./DATABASE_SCHEMA.md) | Complete database table documentation |
| [Scoring Algorithm](./SCORING_ALGORITHM.md) | Detailed scoring logic and formulas |
| [Edge Functions](./EDGE_FUNCTIONS.md) | All 30 backend functions documented |
| [User Workflows](./USER_WORKFLOWS.md) | Step-by-step user journeys |
| [Criteria Schema](./CRITERIA_SCHEMA.md) | Structured criteria reference |
| [Requirements](./REQUIREMENTS.md) | Functional and non-functional requirements |
| [API Integrations](./API_INTEGRATIONS.md) | External API documentation |
| [Component Architecture](./COMPONENT_ARCHITECTURE.md) | Frontend component structure |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query, React Context |
| Backend | Supabase (Postgres, Edge Functions, Auth) |
| AI | Claude (Anthropic), Lovable AI Gateway |
| Scraping | Firecrawl |

---

## Key Concepts

### Industry Tracker
A container for a buyer universe focused on a specific industry vertical (e.g., "Collision Repair", "HVAC Services"). Contains structured fit criteria and scoring configuration.

### Buyer
A PE firm + platform company combination actively acquiring in the tracked industry. Contains 70+ fields including thesis, target criteria, acquisition history, and geographic preferences.

### Deal
An acquisition opportunity (target company) being marketed to buyers. Contains financial data, geography, services, owner goals, and extracted intelligence.

### Buyer-Deal Score
A composite score (0-100) representing how well a buyer matches a specific deal, broken down by category (Size, Geography, Services, Owner Goals).

### Score Tiers
| Tier | Score Range | Meaning |
|------|-------------|---------|
| Excellent | 85-100 | Strong fit across all categories |
| Strong | 70-84 | Good fit with minor gaps |
| Moderate | 55-69 | Reasonable fit, review recommended |
| Weak | 40-54 | Poor fit, likely pass |
| Poor | 0-39 | Disqualified or major mismatches |

---

## Support

For questions or issues, contact the development team or refer to the detailed documentation linked above.
