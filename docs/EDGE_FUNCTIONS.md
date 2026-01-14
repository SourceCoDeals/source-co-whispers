# Edge Functions

## Overview

SourceCo uses 30 Supabase Edge Functions (Deno runtime) for AI-powered processing, data enrichment, and complex business logic. All functions are located in `supabase/functions/`.

---

## Function Categories

| Category | Count | Purpose |
|----------|-------|---------|
| Enrichment | 3 | AI-powered data extraction from websites |
| Transcript Extraction | 3 | Extract structured data from call transcripts |
| Scoring | 5 | Buyer-deal compatibility scoring |
| Criteria Parsing | 4 | Parse natural language to structured criteria |
| Document Processing | 2 | Process uploaded documents |
| AI Chat | 3 | Natural language query interfaces |
| Contact Functions | 2 | Contact discovery and management |
| CSV Import | 3 | AI-powered column mapping |
| Utility | 5 | Deduplication, migration, verification |

---

## Enrichment Functions

### enrich-buyer

**Purpose:** Enriches buyer profiles by scraping PE firm and platform websites.

**Endpoint:** `POST /functions/v1/enrich-buyer`

**Input:**
```json
{
  "buyerId": "uuid",
  "peFirmWebsite": "https://example-pe.com",
  "platformWebsite": "https://example-platform.com"
}
```

**Process:**
1. Scrape PE firm website via Firecrawl
2. Extract 6 data categories using Claude:
   - Business Overview
   - Customer Profile
   - Geographic Footprint
   - Acquisition History
   - Investment Thesis
   - Target Criteria
3. Scrape platform website via Firecrawl
4. Extract platform-specific data
5. Normalize geography to state abbreviations
6. Merge with existing data respecting source priority
7. Update buyer record

**Output:**
```json
{
  "success": true,
  "buyerId": "uuid",
  "enrichedFields": ["business_summary", "target_geographies", "thesis_summary"],
  "sources": {
    "pe_firm": "https://example-pe.com",
    "platform": "https://example-platform.com"
  }
}
```

**AI Prompts Used:**
- Business overview extraction
- Customer and market analysis
- Geographic presence mapping
- Acquisition history parsing
- Investment thesis synthesis
- Target criteria extraction

---

### enrich-deal

**Purpose:** Enriches deal profiles by scraping company websites.

**Endpoint:** `POST /functions/v1/enrich-deal`

**Input:**
```json
{
  "dealId": "uuid",
  "companyWebsite": "https://target-company.com"
}
```

**Process:**
1. Scrape company website via Firecrawl
2. Extract company overview, services, geography
3. Normalize geography to state abbreviations
4. Update deal record with source tracking

**Output:**
```json
{
  "success": true,
  "dealId": "uuid",
  "enrichedFields": ["company_overview", "service_mix", "geography"]
}
```

---

### firecrawl-scrape

**Purpose:** Generic website scraping wrapper.

**Endpoint:** `POST /functions/v1/firecrawl-scrape`

**Input:**
```json
{
  "url": "https://example.com",
  "formats": ["markdown", "html"]
}
```

**Output:**
```json
{
  "success": true,
  "markdown": "# Page Content...",
  "html": "<html>..."
}
```

---

## Transcript Extraction Functions

### extract-deal-transcript

**Purpose:** Extracts structured deal data from call transcripts.

**Endpoint:** `POST /functions/v1/extract-deal-transcript`

**Input:**
```json
{
  "dealId": "uuid",
  "transcriptId": "uuid",
  "transcriptText": "Full transcript text..."
}
```

**Extraction Categories:**

1. **Financial Profile**
   - Revenue with confidence level
   - EBITDA with inference method
   - Source quotes for each figure
   - Follow-up questions for unclear data

2. **Company Profile**
   - Business overview
   - Service mix
   - Competitive position
   - Growth trajectory

3. **Geography**
   - Headquarters location
   - Operating geographies
   - Customer geography
   - Location count

4. **Owner Goals**
   - Exit timeline
   - Equity roll interest
   - Transition preferences
   - Special requirements

5. **Risks**
   - Identified key risks
   - Customer concentration
   - Technology gaps

**EBITDA Inference Rules:**
- Only infer from: operating profit, cash flow, owner earnings, stated margins
- Never infer from: post-tax income, personal distributions
- Always flag inferred values with source

**Output:**
```json
{
  "success": true,
  "extractedData": {
    "revenue": 5000000,
    "revenue_confidence": "high",
    "revenue_source_quote": "We did about five million last year",
    "ebitda_amount": 750000,
    "ebitda_is_inferred": true,
    "ebitda_confidence": "medium",
    "geography": ["TX", "OK"],
    "service_mix": "Collision repair, paintless dent repair"
  },
  "followUpQuestions": [
    "Can you confirm the EBITDA margin?"
  ]
}
```

---

### extract-transcript

**Purpose:** Extracts structured buyer data from call transcripts.

**Endpoint:** `POST /functions/v1/extract-transcript`

**Input:**
```json
{
  "buyerId": "uuid",
  "transcriptId": "uuid",
  "transcriptText": "Full transcript text..."
}
```

**Extraction Categories:**
- Investment thesis
- Target criteria (size, geography, services)
- Acquisition history and appetite
- Deal breakers and exclusions
- Key quotes

---

### analyze-deal-notes / analyze-tracker-notes

**Purpose:** Extract structured data from free-form notes.

**Endpoint:** `POST /functions/v1/analyze-deal-notes`

**Input:**
```json
{
  "dealId": "uuid",
  "notes": "Free-form notes text..."
}
```

---

## Scoring Functions

### score-buyer-deal

**Purpose:** Main buyer-deal compatibility scoring algorithm.

**Endpoint:** `POST /functions/v1/score-buyer-deal`

**Input:**
```json
{
  "dealId": "uuid",
  "buyerIds": ["uuid1", "uuid2"],
  "includeExplanation": true
}
```

**Process:**
1. Fetch deal and tracker data
2. Fetch buyer data for all buyer IDs
3. For each buyer:
   - Calculate size score (0-100)
   - Calculate geography score (0-100)
   - Calculate services score (0-100)
   - Calculate owner goals score (0-100)
   - Apply weights and multipliers
   - Add thesis bonus
   - Add engagement bonus
   - Subtract learning penalty
   - Apply custom rules
4. Return sorted scores

**Output:**
```json
{
  "scores": [
    {
      "buyerId": "uuid1",
      "compositeScore": 85,
      "categoryScores": {
        "size": 90,
        "geography": 80,
        "services": 85,
        "ownerGoals": 75
      },
      "thesisBonus": 10,
      "engagementBonus": 5,
      "learningPenalty": 0,
      "tier": "Excellent",
      "explanation": "Strong fit across all categories...",
      "dataQuality": "high",
      "needsReview": false
    }
  ]
}
```

---

### score-buyer-geography

**Purpose:** Dedicated geography scoring with weighted matching.

**Endpoint:** `POST /functions/v1/score-buyer-geography`

**Input:**
```json
{
  "dealGeography": ["TX", "OK"],
  "buyerData": {
    "target_geographies": ["TX", "LA"],
    "geographic_footprint": ["TX", "OK", "NM"],
    "hq_state": "TX"
  }
}
```

---

### score-service-fit

**Purpose:** Service alignment scoring.

**Endpoint:** `POST /functions/v1/score-service-fit`

---

### recalculate-deal-weights

**Purpose:** Adjust scoring weights based on user decisions.

**Endpoint:** `POST /functions/v1/recalculate-deal-weights`

**Input:**
```json
{
  "dealId": "uuid"
}
```

**Process:**
1. Fetch all buyer_deal_scores for deal
2. Separate approved vs rejected buyers
3. Analyze category score patterns
4. Calculate optimal multipliers
5. Save to deal_scoring_adjustments

---

### parse-scoring-instructions

**Purpose:** Parse natural language scoring rules.

**Endpoint:** `POST /functions/v1/parse-scoring-instructions`

**Input:**
```json
{
  "instructions": "No DRP relationships. Prioritize Texas buyers.",
  "dealId": "uuid"
}
```

**Output:**
```json
{
  "parsed": {
    "bonuses": [
      { "condition": "geography includes TX", "points": 10 }
    ],
    "penalties": [
      { "condition": "has_drp = true", "points": -20 }
    ],
    "disqualifiers": []
  }
}
```

---

## Criteria Parsing Functions

### parse-fit-criteria

**Purpose:** Convert natural language fit criteria to structured JSONB.

**Endpoint:** `POST /functions/v1/parse-fit-criteria`

**Input:**
```json
{
  "trackerId": "uuid",
  "criteriaText": "Looking for collision repair shops with $2-10M revenue in Texas and Southeast. Must have paint booth. No heavy truck work."
}
```

**Output:**
```json
{
  "size_criteria": {
    "min_revenue": 2,
    "max_revenue": 10
  },
  "geography_criteria": {
    "required_regions": ["TX"],
    "preferred_regions": ["Southeast"]
  },
  "service_criteria": {
    "primary_focus": ["collision repair"],
    "required_services": ["paint booth"],
    "excluded_services": ["heavy truck"]
  }
}
```

**Features:**
- Tool-calling for structured extraction
- Placeholder detection and cleanup
- Retry logic with exponential backoff
- Post-processing validation

---

### update-fit-criteria-chat

**Purpose:** Conversational criteria editing.

**Endpoint:** `POST /functions/v1/update-fit-criteria-chat`

**Input:**
```json
{
  "trackerId": "uuid",
  "message": "Add California to the target regions",
  "currentCriteria": { ... }
}
```

---

### validate-criteria

**Purpose:** Validate criteria completeness.

**Endpoint:** `POST /functions/v1/validate-criteria`

---

### generate-research-questions

**Purpose:** Generate research questions for incomplete data.

**Endpoint:** `POST /functions/v1/generate-research-questions`

---

## Document Processing Functions

### parse-tracker-documents

**Purpose:** Extract criteria from uploaded M&A guide documents.

**Endpoint:** `POST /functions/v1/parse-tracker-documents`

**Input:**
```json
{
  "trackerId": "uuid",
  "documentUrls": ["https://storage.../doc1.pdf"]
}
```

---

### generate-ma-guide

**Purpose:** Generate M&A guide content from criteria.

**Endpoint:** `POST /functions/v1/generate-ma-guide`

**Input:**
```json
{
  "trackerId": "uuid",
  "industryName": "Collision Repair"
}
```

**Output:**
Generates comprehensive M&A guide with:
- Industry fundamentals
- Acquisition attractiveness factors
- Buyer fit analysis
- Deal-killers
- Valuation drivers

---

## AI Chat Functions

### query-buyer-universe

**Purpose:** Natural language queries about buyers.

**Endpoint:** `POST /functions/v1/query-buyer-universe`

**Input:**
```json
{
  "dealId": "uuid",
  "message": "Show me buyers actively acquiring in Texas with revenue requirements under $5M"
}
```

**Features:**
- Streaming response
- Clickable buyer names
- Geographic proximity analysis
- Criteria matching

---

### query-tracker-universe

**Purpose:** Natural language queries at tracker level.

**Endpoint:** `POST /functions/v1/query-tracker-universe`

---

## Contact Functions

### find-buyer-contacts

**Purpose:** Discover contacts for buyers.

**Endpoint:** `POST /functions/v1/find-buyer-contacts`

**Input:**
```json
{
  "buyerId": "uuid"
}
```

---

### map-contact-columns

**Purpose:** AI-powered CSV column mapping for contacts.

**Endpoint:** `POST /functions/v1/map-contact-columns`

---

## CSV Import Functions

### map-csv-columns

**Purpose:** Map buyer CSV columns to database fields.

**Endpoint:** `POST /functions/v1/map-csv-columns`

**Input:**
```json
{
  "headers": ["Company", "PE Sponsor", "Website", "HQ"],
  "sampleRows": [
    ["Acme Corp", "ABC Capital", "acme.com", "Dallas, TX"]
  ]
}
```

**Output:**
```json
{
  "mappings": {
    "Company": "platform_company_name",
    "PE Sponsor": "pe_firm_name",
    "Website": "platform_website",
    "HQ": "hq_city"
  },
  "confidence": "high"
}
```

---

### map-deal-csv-columns

**Purpose:** Map deal CSV columns to database fields.

---

## Utility Functions

### dedupe-buyers

**Purpose:** Identify and merge duplicate buyers.

**Endpoint:** `POST /functions/v1/dedupe-buyers`

**Input:**
```json
{
  "trackerId": "uuid"
}
```

**Process:**
1. Normalize all buyer domains
2. Identify duplicates by domain
3. Return duplicate groups for user review
4. Optionally merge selected duplicates

---

### verify-platform-website

**Purpose:** Verify platform website accessibility.

**Endpoint:** `POST /functions/v1/verify-platform-website`

---

### migrate-buyers-to-hierarchy

**Purpose:** Migrate legacy buyers to PE firm/platform hierarchy.

---

### migrate-deals-to-companies

**Purpose:** Migrate legacy deals to company records.

---

## Error Handling

All functions implement:

1. **Retry Logic**
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, i));
    }
  }
}
```

2. **CORS Headers**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
```

3. **Error Response Format**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional context"
}
```

---

## Configuration

### supabase/config.toml

```toml
[functions.enrich-buyer]
verify_jwt = false

[functions.score-buyer-deal]
verify_jwt = false

# ... all functions
```

### Required Secrets

| Secret | Used By |
|--------|---------|
| ANTHROPIC_API_KEY | All AI functions |
| FIRECRAWL_API_KEY | Enrichment functions |
| LOVABLE_API_KEY | Chat functions |
