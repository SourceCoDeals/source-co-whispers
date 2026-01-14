# Requirements Document

## Overview

This document specifies the functional and non-functional requirements for the SourceCo M&A Intelligence Platform.

---

## Functional Requirements

### FR1: Tracker Management

#### FR1.1: Create Tracker
- **Description:** Users can create a new industry tracker to organize buyers and deals for a specific vertical.
- **Inputs:** Industry name, optional template selection
- **Outputs:** New tracker record with default weights
- **Acceptance Criteria:**
  - Tracker created with unique ID
  - Default scoring weights applied (25/25/25/25)
  - User redirected to tracker detail page

#### FR1.2: Edit Tracker
- **Description:** Users can modify tracker details including name, criteria, and weights.
- **Inputs:** Updated tracker fields
- **Outputs:** Updated tracker record
- **Acceptance Criteria:**
  - Changes saved to database
  - Validation trigger checks criteria completeness
  - Warning displayed if critical criteria missing

#### FR1.3: Archive Tracker
- **Description:** Users can archive trackers to hide from active view.
- **Inputs:** Tracker ID
- **Outputs:** Tracker marked as archived
- **Acceptance Criteria:**
  - Archived trackers hidden from main list
  - Can be restored from archive view
  - Associated data preserved

#### FR1.4: Upload Documents
- **Description:** Users can upload M&A guide documents for AI parsing.
- **Inputs:** PDF/DOCX files
- **Outputs:** Extracted criteria populated
- **Acceptance Criteria:**
  - Files stored in tracker-documents bucket
  - AI extracts size, service, geography criteria
  - User can review and edit extractions

#### FR1.5: Configure Scoring Weights
- **Description:** Users can adjust relative importance of scoring categories.
- **Inputs:** Weight values (0-100) for each category
- **Outputs:** Updated tracker weights
- **Acceptance Criteria:**
  - Weights saved to tracker record
  - Total weights don't need to sum to 100 (normalized in scoring)
  - Changes affect future scoring calculations

---

### FR2: Buyer Management

#### FR2.1: Add Buyer Manually
- **Description:** Users can manually add a buyer to a tracker.
- **Inputs:** PE firm name (required), PE firm website, platform name, platform website
- **Outputs:** New buyer record
- **Acceptance Criteria:**
  - Buyer created with provided fields
  - Associated with specified tracker
  - Marked as not enriched

#### FR2.2: Import Buyers from CSV
- **Description:** Users can bulk import buyers from spreadsheet files.
- **Inputs:** CSV file with buyer data
- **Outputs:** Multiple buyer records
- **Acceptance Criteria:**
  - AI maps columns to database fields
  - User can review and adjust mappings
  - Duplicate detection by domain
  - Options: skip, merge, or create new for duplicates

#### FR2.3: Enrich Buyer
- **Description:** AI enriches buyer profile by scraping websites.
- **Inputs:** Buyer ID with PE firm and/or platform website
- **Outputs:** Enriched buyer fields
- **Acceptance Criteria:**
  - Firecrawl scrapes provided websites
  - AI extracts 6 data categories
  - Geography normalized to state abbreviations
  - Source priority respected (transcript > notes > website)

#### FR2.4: Bulk Enrich Buyers
- **Description:** Users can enrich multiple buyers at once.
- **Inputs:** List of buyer IDs or "all unenriched"
- **Outputs:** Enriched buyer records
- **Acceptance Criteria:**
  - Progress bar shows current/total
  - Interrupted sessions can be resumed
  - Errors for individual buyers don't stop batch

#### FR2.5: Process Buyer Transcript
- **Description:** AI extracts structured data from call transcripts.
- **Inputs:** Buyer ID, transcript text or URL
- **Outputs:** Enriched buyer with transcript data
- **Acceptance Criteria:**
  - Transcript stored in buyer_transcripts table
  - AI extracts thesis, criteria, quotes
  - Transcript data overwrites website data (priority)
  - Evidence linked to extractions

#### FR2.6: Deduplicate Buyers
- **Description:** System identifies and helps merge duplicate buyers.
- **Inputs:** Tracker ID
- **Outputs:** List of duplicate groups
- **Acceptance Criteria:**
  - Duplicates identified by normalized domain
  - User selects which record to keep
  - Merged data combined (most complete wins)

#### FR2.7: Delete Buyer
- **Description:** Users can remove buyers from tracker.
- **Inputs:** Buyer ID(s)
- **Outputs:** Deleted buyer records
- **Acceptance Criteria:**
  - Confirmation dialog shown
  - Related data (contacts, transcripts, scores) deleted
  - Bulk delete supported

---

### FR3: Deal Management

#### FR3.1: Create Deal
- **Description:** Users can add a new deal opportunity to a tracker.
- **Inputs:** Deal name (required), website, contact info, financials
- **Outputs:** New deal record
- **Acceptance Criteria:**
  - Deal created with Active status
  - Associated with specified tracker
  - Contact information stored

#### FR3.2: Import Deals from CSV
- **Description:** Users can bulk import deals from spreadsheet files.
- **Inputs:** CSV file with deal data
- **Outputs:** Multiple deal records
- **Acceptance Criteria:**
  - AI maps columns including contact fields
  - Duplicate detection by normalized domain
  - Source marked as 'csv'

#### FR3.3: Enrich Deal
- **Description:** AI enriches deal profile by scraping company website.
- **Inputs:** Deal ID with company website
- **Outputs:** Enriched deal fields
- **Acceptance Criteria:**
  - Company website scraped
  - Overview, services, geography extracted
  - Source priority respected

#### FR3.4: Extract Deal Transcript
- **Description:** AI extracts structured financial and profile data from call transcripts.
- **Inputs:** Deal ID, transcript text
- **Outputs:** Enriched deal with financials
- **Acceptance Criteria:**
  - Revenue extracted with confidence level
  - EBITDA inferred only from valid sources
  - Source quotes captured
  - Follow-up questions generated for unclear data

#### FR3.5: Archive Deal
- **Description:** Users can archive deals no longer active.
- **Inputs:** Deal ID
- **Outputs:** Deal status set to Archived
- **Acceptance Criteria:**
  - Archived deals hidden from active list
  - Can be restored
  - Scores and outreach data preserved

---

### FR4: Buyer-Deal Scoring

#### FR4.1: Score Buyers for Deal
- **Description:** System calculates compatibility scores for all buyers against a deal.
- **Inputs:** Deal ID
- **Outputs:** Scored buyer list
- **Acceptance Criteria:**
  - All active buyers in tracker scored
  - Category scores calculated (0-100 each)
  - Composite score with weights and bonuses
  - Results sorted by composite score

#### FR4.2: View Score Details
- **Description:** Users can see detailed score breakdown for a buyer-deal pair.
- **Inputs:** Buyer ID, Deal ID
- **Outputs:** Score explanation
- **Acceptance Criteria:**
  - Category scores displayed
  - Human-readable explanation generated
  - Data quality indicators shown
  - Bonuses and penalties itemized

#### FR4.3: Customize Scoring Rules
- **Description:** Users can add natural language scoring adjustments.
- **Inputs:** Free-text instructions (e.g., "No DRP relationships")
- **Outputs:** Adjusted scores
- **Acceptance Criteria:**
  - AI parses instructions to rules
  - Rules applied to all buyers
  - Scores recalculated

#### FR4.4: Learn from Decisions
- **Description:** System adjusts scoring based on user approvals/rejections.
- **Inputs:** User actions (select, pass, remove)
- **Outputs:** Updated weight multipliers
- **Acceptance Criteria:**
  - Patterns detected in decisions
  - Category multipliers adjusted
  - Rejection reasons stored in learning history

---

### FR5: Outreach Workflow

#### FR5.1: Select Buyer for Outreach
- **Description:** Users can mark buyers as selected for outreach.
- **Inputs:** Buyer-deal pair
- **Outputs:** Selection recorded
- **Acceptance Criteria:**
  - selected_for_outreach set to true
  - Buyer appears in selected list
  - Selection timestamp recorded

#### FR5.2: Pass on Buyer
- **Description:** Users can pass on a buyer with categorized reason.
- **Inputs:** Buyer-deal pair, pass category, optional notes
- **Outputs:** Pass recorded
- **Acceptance Criteria:**
  - passed_on_deal set to true
  - Reason and notes stored
  - Buyer hidden from active list
  - Learning history updated

#### FR5.3: Remove Buyer from Deal
- **Description:** Users can permanently remove a buyer from deal consideration.
- **Inputs:** Buyer-deal pair, multi-select rejection reasons, notes
- **Outputs:** Removal recorded
- **Acceptance Criteria:**
  - hidden_from_deal set to true
  - Rejection reasons captured in learning history
  - Deal context snapshot stored
  - Future scoring affected by pattern

#### FR5.4: Record Outreach
- **Description:** Users can log outreach activities.
- **Inputs:** Channel, date, message, contact
- **Outputs:** Outreach record created
- **Acceptance Criteria:**
  - Record stored in outreach_records table
  - Linked to buyer, deal, and contact
  - Timestamp recorded

#### FR5.5: Track Response
- **Description:** Users can update outreach with response data.
- **Inputs:** Response date, sentiment, outcome
- **Outputs:** Updated outreach record
- **Acceptance Criteria:**
  - Response details stored
  - Meeting scheduling tracked
  - Deal stage updated if applicable

---

### FR6: AI Chat Interface

#### FR6.1: Query Buyer Universe
- **Description:** Users can ask natural language questions about buyers.
- **Inputs:** Free-text question
- **Outputs:** AI-generated response with buyer references
- **Acceptance Criteria:**
  - Streaming response displayed
  - Buyer names are clickable
  - Clicked buyers expand card
  - Multiple queries stack highlights

#### FR6.2: Query by Geography
- **Description:** AI can analyze geographic proximity in queries.
- **Inputs:** Question with geographic context
- **Outputs:** Buyers filtered by geography
- **Acceptance Criteria:**
  - "Within X miles" queries supported
  - State/region matching
  - Results include geographic reasoning

#### FR6.3: Edit Criteria via Chat
- **Description:** Users can modify tracker criteria conversationally.
- **Inputs:** Modification request (e.g., "Add California to targets")
- **Outputs:** Updated criteria
- **Acceptance Criteria:**
  - Current criteria shown
  - AI proposes changes
  - User confirms before applying

---

### FR7: Dashboard

#### FR7.1: View Aggregate Stats
- **Description:** Dashboard shows summary metrics across all trackers.
- **Inputs:** None (or timeframe filter)
- **Outputs:** Stats cards with trends
- **Acceptance Criteria:**
  - Total trackers, buyers, deals, outreach counts
  - Sparkline trends shown
  - Cards link to detail views

#### FR7.2: View Pipeline Funnel
- **Description:** Visual funnel shows conversion through stages.
- **Inputs:** Tracker filter (optional)
- **Outputs:** Funnel visualization
- **Acceptance Criteria:**
  - Stages: Total → Enriched → Selected → Interested → Closed
  - Click to filter by stage
  - Percentages calculated

#### FR7.3: View Activity Feed
- **Description:** Recent actions displayed chronologically.
- **Inputs:** None
- **Outputs:** Activity list
- **Acceptance Criteria:**
  - Shows last N activities
  - Grouped by type
  - Links to relevant records

#### FR7.4: Filter by Timeframe
- **Description:** Users can filter dashboard by date range.
- **Inputs:** Timeframe selection (7d, 30d, 90d, all)
- **Outputs:** Filtered metrics
- **Acceptance Criteria:**
  - All stats respect filter
  - Trends adjust to timeframe
  - Filter persists during session

---

## Non-Functional Requirements

### NFR1: Performance

#### NFR1.1: Scoring Speed
- **Requirement:** Score 100+ buyers against a deal in <10 seconds
- **Measurement:** Time from request to complete response
- **Acceptance:** 95th percentile under threshold

#### NFR1.2: Page Load
- **Requirement:** Initial page load <3 seconds on broadband
- **Measurement:** Time to interactive
- **Acceptance:** Lighthouse performance score >80

#### NFR1.3: Search Responsiveness
- **Requirement:** Search results appear within 300ms of typing
- **Measurement:** Debounce + query time
- **Acceptance:** No perceptible lag

---

### NFR2: Security

#### NFR2.1: Row-Level Security
- **Requirement:** All tables have RLS policies ensuring user data isolation
- **Implementation:** Supabase RLS with auth.uid() checks
- **Verification:** Security audit, penetration testing

#### NFR2.2: API Key Protection
- **Requirement:** All API keys stored in Supabase Vault, never exposed to frontend
- **Implementation:** Edge functions access via Deno.env.get()
- **Verification:** Code review, secret scanning

#### NFR2.3: Authentication
- **Requirement:** All data access requires authenticated session
- **Implementation:** Supabase Auth with session tokens
- **Verification:** Unauthenticated access returns 401

---

### NFR3: Scalability

#### NFR3.1: Buyer Capacity
- **Requirement:** Support 1000+ buyers per tracker without degradation
- **Measurement:** Query time, UI responsiveness
- **Implementation:** Pagination, virtual scrolling

#### NFR3.2: Deal Capacity
- **Requirement:** Support 100+ active deals per tracker
- **Measurement:** List render time
- **Implementation:** Lazy loading, indexing

#### NFR3.3: Concurrent Users
- **Requirement:** Support 50 concurrent users per organization
- **Measurement:** Response time under load
- **Implementation:** Connection pooling, caching

---

### NFR4: AI Reliability

#### NFR4.1: Retry Logic
- **Requirement:** AI functions retry on transient failures
- **Implementation:** Exponential backoff, max 3 retries
- **Verification:** Simulated failures recover

#### NFR4.2: Graceful Degradation
- **Requirement:** App remains usable if AI unavailable
- **Implementation:** Fallback to manual workflows
- **Verification:** Disable AI, verify core functions work

#### NFR4.3: Extraction Accuracy
- **Requirement:** Financial extraction accuracy >90%
- **Measurement:** Sample audit of extracted vs actual
- **Mitigation:** Confidence levels, follow-up questions

---

### NFR5: Usability

#### NFR5.1: Mobile Responsiveness
- **Requirement:** Core functions accessible on tablet devices
- **Implementation:** Responsive Tailwind layouts
- **Verification:** Test on iPad, Android tablets

#### NFR5.2: Accessibility
- **Requirement:** WCAG 2.1 AA compliance
- **Implementation:** Semantic HTML, ARIA labels, keyboard nav
- **Verification:** Lighthouse accessibility audit

#### NFR5.3: Error Messaging
- **Requirement:** All errors display user-friendly messages
- **Implementation:** Error boundaries, toast notifications
- **Verification:** Error scenarios produce helpful guidance

---

### NFR6: Data Integrity

#### NFR6.1: Source Tracking
- **Requirement:** All extracted data tracks its source
- **Implementation:** extraction_sources JSONB column
- **Verification:** Audit trail for any field

#### NFR6.2: Source Priority
- **Requirement:** Higher-priority sources never overwritten by lower
- **Implementation:** canOverwriteField utility in edge functions
- **Hierarchy:** transcript > notes > website > csv > manual

#### NFR6.3: Backup/Recovery
- **Requirement:** Point-in-time recovery within 7 days
- **Implementation:** Supabase automated backups
- **Verification:** Restore test quarterly

---

## Constraints

### C1: Technology Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Supabase (PostgreSQL, Edge Functions, Auth, Storage)
- AI: Claude (Anthropic), Lovable AI Gateway
- Scraping: Firecrawl

### C2: Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### C3: API Rate Limits
- Claude API: 1000 requests/minute
- Firecrawl: 100 requests/minute
- Lovable AI Gateway: Per-workspace limits

---

## Glossary

| Term | Definition |
|------|------------|
| Tracker | A buyer universe for a specific industry vertical |
| Buyer | PE firm + platform combination actively acquiring |
| Deal | An acquisition opportunity being marketed |
| Composite Score | Weighted combination of category scores |
| Score Tier | Qualitative label (Excellent/Strong/Moderate/Weak/Poor) |
| Enrichment | AI-powered data extraction from websites |
| Source Priority | Hierarchy determining which data source wins |
| Learning History | Record of user decisions for algorithm training |
| Pass | Soft rejection for current deal (can reconsider) |
| Remove | Hard rejection with learning capture |
