# Database Schema

## Overview

The SourceCo database consists of 20+ PostgreSQL tables organized into logical groups. All tables use UUID primary keys and include created_at/updated_at timestamps.

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│ industry_       │       │     deals       │
│ trackers        │◄──────│                 │
│                 │       │                 │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ 1:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│     buyers      │◄──────│ buyer_deal_     │
│                 │───────►│ scores          │
└────────┬────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│ buyer_contacts  │
│ buyer_transcripts│
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│   pe_firms      │◄──────│   platforms     │
│                 │ 1:N   │                 │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ 1:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│ pe_firm_contacts│       │platform_contacts│
└─────────────────┘       └─────────────────┘
```

---

## Core Entity Tables

### industry_trackers

The primary container for a buyer universe focused on an industry vertical.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner user ID |
| industry_name | TEXT | Display name (e.g., "Collision Repair") |
| archived | BOOLEAN | Soft delete flag |
| fit_criteria | TEXT | Legacy free-form criteria |
| fit_criteria_size | TEXT | Legacy size criteria |
| fit_criteria_service | TEXT | Legacy service criteria |
| fit_criteria_geography | TEXT | Legacy geography criteria |
| fit_criteria_buyer_types | TEXT | Legacy buyer types criteria |
| **size_criteria** | JSONB | Structured size criteria |
| **service_criteria** | JSONB | Structured service criteria |
| **geography_criteria** | JSONB | Structured geography criteria |
| **buyer_types_criteria** | JSONB | Structured buyer type definitions |
| size_weight | INTEGER | Weight for size scoring (default: 25) |
| geography_weight | INTEGER | Weight for geography scoring (default: 25) |
| service_mix_weight | INTEGER | Weight for service scoring (default: 25) |
| owner_goals_weight | INTEGER | Weight for owner goals scoring (default: 25) |
| scoring_behavior | JSONB | Custom scoring configuration |
| kpi_scoring_config | JSONB | Industry-specific KPI weights |
| ma_guide_content | TEXT | Generated M&A guide text |
| ma_guide_generated_at | TIMESTAMP | When guide was generated |
| ma_guide_qa_context | JSONB | Q&A context for guide |
| documents | JSONB | Uploaded document metadata |
| documents_analyzed_at | TIMESTAMP | When documents were parsed |
| industry_template | TEXT | Template name for KPIs |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes:**
- `industry_trackers_user_id_idx` on user_id

---

### buyers

Represents a PE firm + platform company combination actively acquiring in the tracked industry.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tracker_id | UUID | FK to industry_trackers |
| pe_firm_name | TEXT | PE firm name (required) |
| pe_firm_website | TEXT | PE firm website URL |
| pe_firm_linkedin | TEXT | PE firm LinkedIn URL |
| platform_company_name | TEXT | Platform company name |
| platform_website | TEXT | Platform company website |
| buyer_linkedin | TEXT | General LinkedIn URL |
| **Business Profile** | | |
| business_summary | TEXT | AI-extracted business overview |
| business_type | TEXT | Type classification |
| business_model | TEXT | Business model description |
| industry_vertical | TEXT | Industry focus |
| services_offered | TEXT | Services provided |
| specialized_focus | TEXT | Niche specialization |
| go_to_market_strategy | TEXT | GTM approach |
| revenue_model | TEXT | How they generate revenue |
| **Geographic Data** | | |
| hq_city | TEXT | Headquarters city |
| hq_state | TEXT | Headquarters state |
| hq_region | TEXT | Headquarters region |
| hq_country | TEXT | Headquarters country |
| geographic_footprint | TEXT[] | States/regions of presence |
| service_regions | TEXT[] | Service coverage areas |
| operating_locations | JSONB | Detailed location data |
| other_office_locations | TEXT[] | Additional office locations |
| **Target Criteria** | | |
| target_geographies | TEXT[] | Preferred acquisition geographies |
| target_industries | TEXT[] | Target industries |
| target_services | TEXT[] | Target service types |
| acquisition_geography | TEXT[] | Where they will acquire |
| geographic_exclusions | TEXT[] | Excluded geographies |
| industry_exclusions | TEXT[] | Excluded industries |
| **Size Criteria** | | |
| min_revenue | NUMERIC | Minimum target revenue |
| max_revenue | NUMERIC | Maximum target revenue |
| revenue_sweet_spot | NUMERIC | Ideal target revenue |
| min_ebitda | NUMERIC | Minimum target EBITDA |
| max_ebitda | NUMERIC | Maximum target EBITDA |
| ebitda_sweet_spot | NUMERIC | Ideal target EBITDA |
| preferred_ebitda | NUMERIC | Preferred EBITDA |
| **Acquisition Profile** | | |
| acquisition_appetite | TEXT | Active/passive/not acquiring |
| acquisition_frequency | TEXT | How often they acquire |
| acquisition_timeline | TEXT | Near-term acquisition plans |
| total_acquisitions | INTEGER | Historical acquisition count |
| last_acquisition_date | DATE | Most recent acquisition |
| recent_acquisitions | JSONB | Structured acquisition history |
| portfolio_companies | TEXT[] | Current portfolio |
| num_platforms | INTEGER | Number of platforms |
| **Thesis & Strategy** | | |
| thesis_summary | TEXT | Investment thesis |
| thesis_confidence | TEXT | Confidence in thesis data |
| strategic_priorities | TEXT | Current strategic focus |
| required_capabilities | TEXT[] | Must-have capabilities |
| deal_breakers | TEXT[] | Automatic disqualifiers |
| **Customer Profile** | | |
| customer_industries | TEXT[] | End customer industries |
| target_customer_industries | TEXT[] | Preferred customer industries |
| customer_geographic_reach | TEXT | Customer geography |
| target_customer_geography | TEXT | Preferred customer geography |
| target_customer_size | TEXT | Preferred customer size |
| target_customer_profile | TEXT | Ideal customer description |
| primary_customer_size | TEXT | Current customer size focus |
| **Owner Preferences** | | |
| owner_roll_requirement | TEXT | Equity roll expectations |
| owner_transition_goals | TEXT | Transition preferences |
| employee_owner | TEXT | Employee ownership stance |
| **Business Model Preferences** | | |
| target_business_model | TEXT | Preferred business model |
| business_model_prefs | TEXT | Model preferences |
| business_model_exclusions | TEXT[] | Excluded models |
| service_mix_prefs | TEXT | Service mix preferences |
| addon_only | BOOLEAN | Only seeking add-ons |
| platform_only | BOOLEAN | Only seeking platforms |
| **Engagement Data** | | |
| has_fee_agreement | BOOLEAN | Fee agreement in place |
| fee_agreement_status | TEXT | Fee agreement details |
| last_call_date | DATE | Most recent call |
| call_history | JSONB | Call history records |
| key_quotes | TEXT[] | Notable quotes from calls |
| **Metadata** | | |
| extraction_sources | JSONB | Source tracking per field |
| extraction_evidence | JSONB | Evidence for extractions |
| geo_preferences | JSONB | Structured geo preferences |
| data_last_updated | TIMESTAMP | Last data refresh |
| created_at | TIMESTAMP | Creation timestamp |

**Indexes:**
- `buyers_tracker_id_idx` on tracker_id

---

### deals

Represents an acquisition opportunity being marketed to buyers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tracker_id | UUID | FK to industry_trackers |
| company_id | UUID | FK to companies (optional) |
| deal_name | TEXT | Company/deal name (required) |
| company_website | TEXT | Company website |
| company_address | TEXT | Physical address |
| status | TEXT | Active/Archived |
| **Financials** | | |
| revenue | NUMERIC | Annual revenue |
| revenue_confidence | TEXT | high/medium/low |
| revenue_is_inferred | BOOLEAN | Was revenue inferred |
| revenue_source_quote | TEXT | Source quote for revenue |
| ebitda_amount | NUMERIC | EBITDA value |
| ebitda_percentage | NUMERIC | EBITDA margin % |
| ebitda_confidence | TEXT | high/medium/low |
| ebitda_is_inferred | BOOLEAN | Was EBITDA inferred |
| ebitda_source_quote | TEXT | Source quote for EBITDA |
| financial_notes | TEXT | Additional financial context |
| financial_followup_questions | TEXT[] | Questions to clarify |
| **Company Profile** | | |
| company_overview | TEXT | Business description |
| business_model | TEXT | Business model |
| industry_type | TEXT | Industry classification |
| service_mix | TEXT | Services offered |
| competitive_position | TEXT | Market position |
| growth_trajectory | TEXT | Growth stage/trend |
| **Geography** | | |
| headquarters | TEXT | HQ location |
| geography | TEXT[] | Operating geography |
| customer_geography | TEXT | Customer locations |
| location_count | INTEGER | Number of locations |
| **Operations** | | |
| employee_count | INTEGER | Number of employees |
| founded_year | INTEGER | Year founded |
| ownership_structure | TEXT | Current ownership |
| technology_systems | TEXT | Tech infrastructure |
| real_estate | TEXT | Real estate situation |
| **Customers** | | |
| customer_concentration | TEXT | Customer concentration |
| end_market_customers | TEXT | End customer description |
| **Owner Data** | | |
| owner_goals | TEXT | Owner objectives |
| special_requirements | TEXT | Special deal requirements |
| **Risks** | | |
| key_risks | TEXT[] | Identified risks |
| **Contacts** | | |
| contact_name | TEXT | Primary contact |
| contact_title | TEXT | Contact title |
| contact_email | TEXT | Contact email |
| contact_phone | TEXT | Contact phone |
| contact_linkedin | TEXT | Contact LinkedIn |
| **Scoring** | | |
| deal_score | NUMERIC | Overall deal quality score |
| **Industry KPIs** | | |
| industry_kpis | JSONB | Industry-specific metrics |
| **Metadata** | | |
| extraction_sources | JSONB | Source tracking |
| transcript_link | TEXT | Fireflies link |
| additional_info | TEXT | Additional notes |
| last_enriched_at | TIMESTAMP | Last enrichment |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

---

### buyer_deal_scores

Junction table storing buyer-deal compatibility scores and actions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| buyer_id | UUID | FK to buyers |
| deal_id | UUID | FK to deals |
| **Category Scores** | | |
| geography_score | NUMERIC | Geography fit (0-100) |
| service_score | NUMERIC | Service fit (0-100) |
| acquisition_score | NUMERIC | Acquisition fit (0-100) |
| portfolio_score | NUMERIC | Portfolio fit (0-100) |
| business_model_score | NUMERIC | Business model fit (0-100) |
| composite_score | NUMERIC | Weighted composite (0-100) |
| thesis_bonus | NUMERIC | Bonus from thesis match |
| **Explanations** | | |
| fit_reasoning | TEXT | AI-generated explanation |
| data_completeness | TEXT | Data quality indicator |
| **Actions** | | |
| selected_for_outreach | BOOLEAN | Selected for outreach |
| passed_on_deal | BOOLEAN | User passed on buyer |
| passed_at | TIMESTAMP | When passed |
| pass_reason | TEXT | Pass reason |
| pass_category | TEXT | Pass category |
| pass_notes | TEXT | Pass notes |
| interested | BOOLEAN | Buyer expressed interest |
| interested_at | TIMESTAMP | When interested |
| hidden_from_deal | BOOLEAN | Hidden from view |
| **Rejection Data** | | |
| rejected_at | TIMESTAMP | When rejected |
| rejection_reason | TEXT | Rejection reason |
| rejection_category | TEXT | Rejection category |
| rejection_notes | TEXT | Rejection notes |
| **Override** | | |
| human_override_score | NUMERIC | Manual score override |
| **Metadata** | | |
| scored_at | TIMESTAMP | When scored |

**Unique Constraint:** (buyer_id, deal_id)

---

## Contact Tables

### buyer_contacts

Contacts linked to buyer records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| buyer_id | UUID | FK to buyers |
| name | TEXT | Contact name (required) |
| title | TEXT | Job title |
| email | TEXT | Email address |
| email_confidence | TEXT | Email confidence level |
| phone | TEXT | Phone number |
| linkedin_url | TEXT | LinkedIn profile |
| role_category | TEXT | Role classification |
| company_type | TEXT | PE firm or platform |
| is_primary_contact | BOOLEAN | Primary contact flag |
| is_deal_team | BOOLEAN | On deal team |
| priority_level | INTEGER | Contact priority (1-5) |
| source | TEXT | How contact was found |
| source_url | TEXT | Source URL |
| salesforce_id | TEXT | Salesforce integration |
| fee_agreement_status | TEXT | Fee agreement status |
| last_contacted_date | DATE | Last contact date |
| created_at | TIMESTAMP | Creation timestamp |

### pe_firm_contacts

Contacts for PE firm entities (normalized hierarchy).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| pe_firm_id | UUID | FK to pe_firms |
| name | TEXT | Contact name |
| title | TEXT | Job title |
| email | TEXT | Email address |
| email_confidence | TEXT | Confidence level |
| phone | TEXT | Phone number |
| linkedin_url | TEXT | LinkedIn profile |
| role_category | TEXT | Role classification |
| is_primary_contact | BOOLEAN | Primary flag |
| priority_level | INTEGER | Priority (1-5) |
| source | TEXT | Discovery source |
| source_url | TEXT | Source URL |
| created_at | TIMESTAMP | Creation timestamp |

### platform_contacts

Contacts for platform company entities.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| platform_id | UUID | FK to platforms |
| name | TEXT | Contact name |
| title | TEXT | Job title |
| email | TEXT | Email address |
| email_confidence | TEXT | Confidence level |
| phone | TEXT | Phone number |
| linkedin_url | TEXT | LinkedIn profile |
| role_category | TEXT | Role classification |
| is_primary_contact | BOOLEAN | Primary flag |
| priority_level | INTEGER | Priority (1-5) |
| source | TEXT | Discovery source |
| source_url | TEXT | Source URL |
| created_at | TIMESTAMP | Creation timestamp |

---

## Intelligence Tables

### call_intelligence

Extracted intelligence from calls.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| buyer_id | UUID | FK to buyers (optional) |
| deal_id | UUID | FK to deals (optional) |
| call_type | TEXT | Type of call |
| call_date | DATE | Date of call |
| call_summary | TEXT | Summary of call |
| key_takeaways | TEXT[] | Key points |
| follow_up_questions | TEXT[] | Questions to follow up |
| extracted_data | JSONB | Structured extracted data |
| extraction_version | TEXT | Extraction algorithm version |
| transcript_url | TEXT | Link to transcript |
| processed_at | TIMESTAMP | When processed |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

### intelligence_values

Normalized extracted values with metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| call_intelligence_id | UUID | FK to call_intelligence |
| template_field_id | UUID | FK to templates (optional) |
| category | TEXT | Value category |
| field_name | TEXT | Field identifier |
| text_value | TEXT | Text value |
| numeric_value | NUMERIC | Numeric value |
| boolean_value | BOOLEAN | Boolean value |
| array_value | TEXT[] | Array value |
| confidence | TEXT | Confidence level |
| source_quote | TEXT | Source quote |
| is_inferred | BOOLEAN | Was value inferred |
| created_at | TIMESTAMP | Creation timestamp |

### industry_intelligence_templates

Configurable extraction fields per industry.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tracker_id | UUID | FK to industry_trackers |
| category | TEXT | Field category |
| field_name | TEXT | Technical field name |
| field_label | TEXT | Display label |
| field_type | TEXT | Data type |
| extraction_hint | TEXT | AI extraction guidance |
| example_values | TEXT[] | Example values |
| is_required | BOOLEAN | Required field |
| display_order | INTEGER | Display order |
| applies_to | TEXT | buyer/deal/both |
| created_at | TIMESTAMP | Creation timestamp |

### buyer_transcripts

Raw transcript storage for buyers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| buyer_id | UUID | FK to buyers |
| title | TEXT | Transcript title |
| transcript_type | TEXT | Type (call, meeting, etc.) |
| url | TEXT | Transcript URL |
| call_date | DATE | Date of call |
| notes | TEXT | Additional notes |
| extracted_data | JSONB | Extracted structured data |
| extraction_evidence | JSONB | Evidence for extraction |
| processed_at | TIMESTAMP | When processed |
| created_at | TIMESTAMP | Creation timestamp |

### deal_transcripts

Raw transcript storage for deals.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| deal_id | UUID | FK to deals |
| title | TEXT | Transcript title |
| transcript_type | TEXT | Type (call, meeting, etc.) |
| url | TEXT | Transcript URL |
| call_date | DATE | Date of call |
| notes | TEXT | Additional notes |
| extracted_data | JSONB | Extracted structured data |
| extraction_evidence | JSONB | Evidence for extraction |
| processed_at | TIMESTAMP | When processed |
| created_at | TIMESTAMP | Creation timestamp |

---

## Hierarchy Tables

### pe_firms

Master PE firm records (unique by domain).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner user ID |
| name | TEXT | Firm name |
| domain | TEXT | Unique domain |
| website | TEXT | Full website URL |
| linkedin | TEXT | LinkedIn URL |
| hq_city | TEXT | Headquarters city |
| hq_state | TEXT | Headquarters state |
| hq_region | TEXT | Headquarters region |
| hq_country | TEXT | Headquarters country |
| num_platforms | INTEGER | Platform count |
| portfolio_companies | TEXT[] | Portfolio company names |
| has_fee_agreement | BOOLEAN | Fee agreement status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

**Unique Constraint:** (domain, user_id)

### platforms

Platform companies linked to PE firms.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| pe_firm_id | UUID | FK to pe_firms |
| name | TEXT | Platform name |
| domain | TEXT | Platform domain |
| website | TEXT | Full website URL |
| linkedin | TEXT | LinkedIn URL |
| *[Same profile fields as buyers]* | | |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

### companies

Target companies (potential deals).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner user ID |
| company_name | TEXT | Company name |
| domain | TEXT | Unique domain |
| company_website | TEXT | Full website URL |
| *[Same profile fields as deals]* | | |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

---

## Learning & Scoring Tables

### buyer_learning_history

Tracks rejection decisions for algorithm learning.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| buyer_id | UUID | FK to buyers |
| deal_id | UUID | FK to deals |
| action_type | TEXT | Type of action (rejection) |
| rejection_reason | TEXT | Primary rejection reason |
| rejection_categories | TEXT[] | Multi-select categories |
| rejection_notes | TEXT | Additional notes |
| deal_context | JSONB | Snapshot of deal at time of rejection |
| created_by | UUID | User who made decision |
| created_at | TIMESTAMP | Creation timestamp |

### deal_scoring_adjustments

Per-deal scoring weight adjustments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| deal_id | UUID | FK to deals (unique) |
| size_weight_mult | NUMERIC | Size weight multiplier |
| geography_weight_mult | NUMERIC | Geography weight multiplier |
| services_weight_mult | NUMERIC | Services weight multiplier |
| custom_instructions | TEXT | Natural language rules |
| parsed_instructions | JSONB | Parsed rule structure |
| approved_count | INTEGER | Approval count for learning |
| rejected_count | INTEGER | Rejection count for learning |
| passed_size | INTEGER | Passed for size reasons |
| passed_geography | INTEGER | Passed for geo reasons |
| passed_services | INTEGER | Passed for service reasons |
| last_calculated_at | TIMESTAMP | Last recalculation |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

---

## Supporting Tables

### outreach_records

Tracks buyer outreach for deals.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| buyer_id | UUID | FK to buyers |
| deal_id | UUID | FK to deals |
| contact_id | UUID | FK to buyer_contacts (optional) |
| outreach_channel | TEXT | Email/call/meeting |
| outreach_date | DATE | Date of outreach |
| custom_message | TEXT | Outreach message |
| response_received | BOOLEAN | Got response |
| response_date | DATE | Response date |
| response_sentiment | TEXT | Positive/neutral/negative |
| meeting_scheduled | BOOLEAN | Meeting scheduled |
| meeting_date | DATE | Meeting date |
| outcome | TEXT | Final outcome |
| deal_stage | TEXT | Current deal stage |
| pass_reason | TEXT | If passed, why |
| notes | TEXT | Additional notes |
| last_activity_date | DATE | Last activity |
| created_at | TIMESTAMP | Creation timestamp |

### profiles

User profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users (unique) |
| full_name | TEXT | Display name |
| avatar_url | TEXT | Avatar URL |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update |

### user_roles

Role assignments for users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| role | app_role | admin or member |
| created_at | TIMESTAMP | Creation timestamp |

---

## Database Functions

### has_role(user_id, role)
Checks if a user has a specific role.

### handle_new_user()
Trigger function to create profile and assign role on user signup.

### update_updated_at_column()
Trigger function to automatically update updated_at timestamp.

### validate_tracker_criteria()
Trigger function to validate tracker criteria completeness.

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| call-transcripts | No | Buyer call recordings |
| tracker-documents | No | M&A guides and uploads |
| deal-transcripts | No | Deal call recordings |
