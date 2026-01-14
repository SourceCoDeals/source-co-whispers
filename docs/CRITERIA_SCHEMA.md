# Criteria Schema

## Overview

SourceCo uses structured JSONB criteria stored in the `industry_trackers` table. This document defines the schema for each criteria category.

---

## Storage Location

```sql
-- industry_trackers table columns
size_criteria       JSONB
service_criteria    JSONB
geography_criteria  JSONB
buyer_types_criteria JSONB
scoring_behavior    JSONB
```

---

## Size Criteria

### Schema

```typescript
interface SizeCriteria {
  // Revenue thresholds (in millions USD)
  min_revenue?: number;        // Minimum acceptable revenue
  max_revenue?: number;        // Maximum acceptable revenue
  target_revenue?: number;     // Ideal/sweet spot revenue
  
  // EBITDA thresholds (in millions USD)
  min_ebitda?: number;         // Minimum acceptable EBITDA
  max_ebitda?: number;         // Maximum acceptable EBITDA
  target_ebitda?: number;      // Ideal/sweet spot EBITDA
  
  // EBITDA multiples (for valuation context)
  ebitda_multiple_min?: string;  // e.g., "3x"
  ebitda_multiple_max?: string;  // e.g., "8x"
  
  // Location/scale metrics
  min_locations?: number;      // Minimum number of locations
  max_locations?: number;      // Maximum number of locations
  min_employees?: number;      // Minimum employee count
  
  // Special flags
  single_location_ok?: boolean;  // Accept single-location deals
  startup_ok?: boolean;          // Accept early-stage companies
}
```

### Example

```json
{
  "min_revenue": 2,
  "max_revenue": 15,
  "target_revenue": 5,
  "min_ebitda": 0.5,
  "max_ebitda": 3,
  "ebitda_multiple_min": "4x",
  "ebitda_multiple_max": "7x",
  "min_locations": 1,
  "single_location_ok": true
}
```

### Usage in Scoring

```typescript
function scoreSizeCategory(deal: Deal, criteria: SizeCriteria): number {
  // Hard disqualification if below 70% of minimum
  if (deal.revenue < (criteria.min_revenue || 0) * 0.7) {
    return 0;
  }
  
  // Score based on proximity to target
  if (deal.revenue >= criteria.target_revenue) {
    return 100;
  }
  
  // Linear interpolation between min and target
  const range = criteria.target_revenue - criteria.min_revenue;
  const position = deal.revenue - criteria.min_revenue;
  return 70 + (30 * position / range);
}
```

---

## Service Criteria

### Schema

```typescript
interface ServiceCriteria {
  // Primary focus (REQUIRED for scoring)
  primary_focus: string[];       // Core services buyers are seeking
  
  // Service requirements
  required_services?: string[];  // Must-have services
  preferred_services?: string[]; // Nice-to-have services
  excluded_services?: string[];  // Dealbreaker services
  
  // Business model
  business_model?: string;       // e.g., "B2B", "B2C", "Mixed"
  revenue_model?: string;        // e.g., "Recurring", "Project", "Hybrid"
  
  // Specialization
  specializations?: string[];    // Niche capabilities
  certifications?: string[];     // Required certifications
  
  // Matching mode
  semantic_matching?: boolean;   // Use AI for fuzzy matching
}
```

### Example (Collision Repair)

```json
{
  "primary_focus": [
    "collision repair",
    "auto body repair"
  ],
  "required_services": [
    "paint booth",
    "frame repair"
  ],
  "preferred_services": [
    "ADAS calibration",
    "aluminum repair",
    "OEM certification"
  ],
  "excluded_services": [
    "heavy truck repair",
    "fleet maintenance",
    "mechanical repair only"
  ],
  "certifications": [
    "I-CAR Gold Class",
    "OEM certified"
  ],
  "semantic_matching": true
}
```

### Service Hierarchy

```
Primary Focus (highest priority)
    └── Required Services (must have)
        └── Preferred Services (bonus points)
            └── Excluded Services (disqualifier)
```

### Usage in Scoring

```typescript
function scoreServicesCategory(deal: Deal, criteria: ServiceCriteria): number {
  const dealServices = parseServices(deal.service_mix);
  
  // Check excluded services first
  for (const excluded of criteria.excluded_services || []) {
    if (dealServices.includes(excluded)) {
      return 0; // Hard disqualification
    }
  }
  
  // Primary focus matching
  const primaryMatch = criteria.primary_focus.some(s => 
    dealServices.includes(s)
  );
  if (!primaryMatch) {
    return 30; // Low score if no primary focus match
  }
  
  // Required services check
  let requiredScore = 100;
  for (const required of criteria.required_services || []) {
    if (!dealServices.includes(required)) {
      requiredScore -= 15;
    }
  }
  
  // Preferred services bonus
  let preferredBonus = 0;
  for (const preferred of criteria.preferred_services || []) {
    if (dealServices.includes(preferred)) {
      preferredBonus += 5;
    }
  }
  
  return Math.min(100, requiredScore + preferredBonus);
}
```

---

## Geography Criteria

### Schema

```typescript
interface GeographyCriteria {
  // Required geographies (hard requirement)
  required_regions?: string[];    // Must be in these regions
  
  // Preferred geographies (bonus points)
  preferred_regions?: string[];   // Prefer these regions
  preferred_states?: string[];    // Prefer these states
  preferred_metros?: string[];    // Prefer these metro areas
  
  // Priority metros (highest value)
  priority_metros?: string[];     // Top-tier target markets
  
  // Excluded geographies (disqualifier)
  excluded_regions?: string[];    // Do not acquire in these regions
  excluded_states?: string[];     // Do not acquire in these states
  
  // Coverage type
  coverage_type?: 'national' | 'regional' | 'local';
  
  // Expansion preferences
  expansion_targets?: string[];   // Regions seeking to expand into
  density_preference?: 'clustered' | 'dispersed' | 'any';
}
```

### Example

```json
{
  "required_regions": [],
  "preferred_regions": ["Southeast", "Southwest"],
  "preferred_states": ["TX", "FL", "GA", "NC"],
  "priority_metros": [
    "Dallas-Fort Worth",
    "Houston",
    "Atlanta",
    "Miami"
  ],
  "excluded_states": ["CA", "NY"],
  "coverage_type": "regional",
  "expansion_targets": ["TN", "SC"],
  "density_preference": "clustered"
}
```

### Region Definitions

```typescript
const REGIONS = {
  "Northeast": ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA"],
  "Southeast": ["DE", "MD", "VA", "WV", "NC", "SC", "GA", "FL", "KY", "TN", "AL", "MS", "LA", "AR"],
  "Midwest": ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"],
  "Southwest": ["TX", "OK", "NM", "AZ"],
  "West": ["CO", "WY", "MT", "ID", "UT", "NV", "CA", "OR", "WA", "AK", "HI"]
};
```

### Usage in Scoring

```typescript
function scoreGeographyCategory(deal: Deal, criteria: GeographyCriteria): number {
  const dealGeos = normalizeGeographies(deal.geography);
  
  // Check exclusions first
  for (const excluded of criteria.excluded_states || []) {
    if (dealGeos.includes(excluded)) {
      return 0; // Hard disqualification
    }
  }
  
  // Check required regions
  if (criteria.required_regions?.length) {
    const inRequired = criteria.required_regions.some(region =>
      dealGeos.some(geo => REGIONS[region]?.includes(geo))
    );
    if (!inRequired) {
      return 20; // Low score if not in required region
    }
  }
  
  let score = 50; // Base score
  
  // Priority metro match
  if (criteria.priority_metros?.some(metro => 
    deal.headquarters?.includes(metro)
  )) {
    score += 30;
  }
  
  // Preferred state match
  if (criteria.preferred_states?.some(state => 
    dealGeos.includes(state)
  )) {
    score += 20;
  }
  
  return Math.min(100, score);
}
```

---

## Buyer Types Criteria

### Schema

```typescript
interface BuyerTypesCriteria {
  types: BuyerType[];
}

interface BuyerType {
  // Identity
  type_name: string;           // e.g., "Large MSO", "Regional Platform"
  priority_order: number;      // 1 = highest priority
  
  // Size constraints
  min_revenue?: number;        // Minimum revenue for this type
  max_revenue?: number;        // Maximum revenue for this type
  min_ebitda?: number;         // Minimum EBITDA
  max_ebitda?: number;         // Maximum EBITDA
  min_locations?: number;      // Minimum locations
  max_locations?: number;      // Maximum locations
  
  // Geographic scope
  geographic_scope?: string;   // "National", "Regional", "Local"
  target_regions?: string[];   // Regions this type focuses on
  
  // Acquisition behavior
  acquisition_style?: string;  // "Platform", "Add-on", "Both"
  acquisition_frequency?: string; // "Active", "Opportunistic", "Inactive"
  
  // Description
  description?: string;        // Human-readable description
  fit_rationale?: string;      // Why this type fits the industry
}
```

### Example (Collision Repair)

```json
{
  "types": [
    {
      "type_name": "Large MSO",
      "priority_order": 1,
      "min_revenue": 10,
      "min_locations": 10,
      "geographic_scope": "National",
      "acquisition_style": "Add-on",
      "acquisition_frequency": "Active",
      "description": "National multi-shop operators like Caliber, Gerber, Crash Champions",
      "fit_rationale": "Aggressive acquirers with established integration playbooks"
    },
    {
      "type_name": "Regional Platform",
      "priority_order": 2,
      "min_revenue": 3,
      "max_revenue": 15,
      "min_locations": 3,
      "geographic_scope": "Regional",
      "acquisition_style": "Both",
      "acquisition_frequency": "Active",
      "description": "PE-backed regional consolidators building density",
      "fit_rationale": "Active buyers seeking tuck-in acquisitions"
    },
    {
      "type_name": "Single-Shop PE",
      "priority_order": 3,
      "min_revenue": 1,
      "max_revenue": 5,
      "min_locations": 1,
      "max_locations": 3,
      "geographic_scope": "Local",
      "acquisition_style": "Platform",
      "acquisition_frequency": "Opportunistic",
      "description": "PE firms looking for platform investments",
      "fit_rationale": "May pay premium for quality platform opportunity"
    },
    {
      "type_name": "Strategic Buyer",
      "priority_order": 4,
      "geographic_scope": "National",
      "acquisition_style": "Platform",
      "description": "Insurance companies, OEMs, or adjacent services",
      "fit_rationale": "Vertical integration play"
    }
  ]
}
```

### Usage in Scoring

```typescript
function matchBuyerType(buyer: Buyer, criteria: BuyerTypesCriteria): BuyerTypeMatch {
  for (const type of criteria.types.sort((a, b) => a.priority_order - b.priority_order)) {
    // Check size constraints
    if (type.min_locations && (buyer.location_count || 0) < type.min_locations) {
      continue;
    }
    if (type.min_revenue && (buyer.min_revenue || 0) < type.min_revenue) {
      continue;
    }
    
    // Check geographic scope
    if (type.geographic_scope === "National" && !buyer.target_geographies?.includes("National")) {
      continue;
    }
    
    return {
      matched: true,
      type_name: type.type_name,
      priority: type.priority_order,
      constraints: {
        min_revenue: type.min_revenue,
        min_locations: type.min_locations
      }
    };
  }
  
  return { matched: false };
}
```

---

## Scoring Behavior

### Schema

```typescript
interface ScoringBehavior {
  // Category weights
  size_weight: number;         // 0-100, default 25
  geography_weight: number;    // 0-100, default 25
  service_weight: number;      // 0-100, default 25
  owner_goals_weight: number;  // 0-100, default 25
  
  // Matching modes
  strict_geography: boolean;   // Require exact geo match
  strict_services: boolean;    // Require all primary services
  
  // Bonus configuration
  thesis_bonus_enabled: boolean;
  engagement_bonus_enabled: boolean;
  max_thesis_bonus: number;    // Default 15
  max_engagement_bonus: number; // Default 20
  
  // Learning configuration
  learning_enabled: boolean;
  learning_penalty_max: number; // Default 25
  
  // Data quality handling
  penalize_incomplete: boolean;
  incomplete_penalty: number;   // Points to deduct for missing data
  
  // Custom rules
  custom_rules?: CustomRule[];
}

interface CustomRule {
  condition: string;           // Condition expression
  action: 'bonus' | 'penalty' | 'disqualify';
  points?: number;             // Points to add/subtract
  reason: string;              // Human-readable reason
}
```

### Example

```json
{
  "size_weight": 30,
  "geography_weight": 25,
  "service_weight": 25,
  "owner_goals_weight": 20,
  "strict_geography": false,
  "strict_services": true,
  "thesis_bonus_enabled": true,
  "engagement_bonus_enabled": true,
  "max_thesis_bonus": 15,
  "max_engagement_bonus": 20,
  "learning_enabled": true,
  "learning_penalty_max": 25,
  "penalize_incomplete": true,
  "incomplete_penalty": 10,
  "custom_rules": [
    {
      "condition": "buyer.has_fee_agreement = true",
      "action": "bonus",
      "points": 5,
      "reason": "Has fee agreement in place"
    },
    {
      "condition": "buyer.last_call_date > 90_days_ago",
      "action": "penalty",
      "points": 10,
      "reason": "No recent engagement"
    }
  ]
}
```

---

## Validation Rules

### Size Criteria Validation

```typescript
function validateSizeCriteria(criteria: SizeCriteria): ValidationResult {
  const errors = [];
  const warnings = [];
  
  // At least one size metric required
  if (!criteria.min_revenue && !criteria.min_ebitda && !criteria.min_locations) {
    warnings.push("No size thresholds defined - cannot filter by size");
  }
  
  // Logical consistency
  if (criteria.min_revenue && criteria.max_revenue && 
      criteria.min_revenue > criteria.max_revenue) {
    errors.push("min_revenue cannot be greater than max_revenue");
  }
  
  // Target within range
  if (criteria.target_revenue) {
    if (criteria.min_revenue && criteria.target_revenue < criteria.min_revenue) {
      warnings.push("target_revenue is below min_revenue");
    }
    if (criteria.max_revenue && criteria.target_revenue > criteria.max_revenue) {
      warnings.push("target_revenue is above max_revenue");
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

### Service Criteria Validation

```typescript
function validateServiceCriteria(criteria: ServiceCriteria): ValidationResult {
  const errors = [];
  const warnings = [];
  
  // Primary focus required
  if (!criteria.primary_focus?.length) {
    errors.push("primary_focus is required for service scoring");
  }
  
  // No overlap between required and excluded
  if (criteria.required_services && criteria.excluded_services) {
    const overlap = criteria.required_services.filter(s => 
      criteria.excluded_services.includes(s)
    );
    if (overlap.length) {
      errors.push(`Services cannot be both required and excluded: ${overlap.join(", ")}`);
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}
```

---

## TypeScript Interfaces

### Complete Type Definitions

```typescript
// src/lib/criteriaSchema.ts

export interface SizeCriteria {
  min_revenue?: number;
  max_revenue?: number;
  target_revenue?: number;
  min_ebitda?: number;
  max_ebitda?: number;
  target_ebitda?: number;
  ebitda_multiple_min?: string;
  ebitda_multiple_max?: string;
  min_locations?: number;
  max_locations?: number;
  min_employees?: number;
  single_location_ok?: boolean;
  startup_ok?: boolean;
}

export interface ServiceCriteria {
  primary_focus: string[];
  required_services?: string[];
  preferred_services?: string[];
  excluded_services?: string[];
  business_model?: string;
  revenue_model?: string;
  specializations?: string[];
  certifications?: string[];
  semantic_matching?: boolean;
}

export interface GeographyCriteria {
  required_regions?: string[];
  preferred_regions?: string[];
  preferred_states?: string[];
  preferred_metros?: string[];
  priority_metros?: string[];
  excluded_regions?: string[];
  excluded_states?: string[];
  coverage_type?: 'national' | 'regional' | 'local';
  expansion_targets?: string[];
  density_preference?: 'clustered' | 'dispersed' | 'any';
}

export interface BuyerType {
  type_name: string;
  priority_order: number;
  min_revenue?: number;
  max_revenue?: number;
  min_ebitda?: number;
  max_ebitda?: number;
  min_locations?: number;
  max_locations?: number;
  geographic_scope?: string;
  target_regions?: string[];
  acquisition_style?: string;
  acquisition_frequency?: string;
  description?: string;
  fit_rationale?: string;
}

export interface BuyerTypesCriteria {
  types: BuyerType[];
}

export interface TrackerCriteria {
  size_criteria: SizeCriteria;
  service_criteria: ServiceCriteria;
  geography_criteria: GeographyCriteria;
  buyer_types_criteria: BuyerTypesCriteria;
}
```
