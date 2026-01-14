# Scoring Algorithm

## Overview

The buyer-deal scoring algorithm evaluates compatibility between potential buyers and acquisition opportunities across multiple dimensions. The algorithm produces a composite score (0-100) that represents the overall fit quality.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      score-buyer-deal                            │
│                    (Edge Function ~2,500 lines)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  scoreSizeCat   │  │  scoreGeoCat    │  │ scoreServiceCat │
│     (0-100)     │  │    (0-100)      │  │     (0-100)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Weighted Composite                            │
│  (sizeScore × sizeWeight × sizeMult) + ...                      │
│  ─────────────────────────────────────                          │
│            totalWeight                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Thesis Bonus   │  │ Engagement Bonus│  │ Learning Penalty│
│   (+0-15 pts)   │  │   (+0-20 pts)   │  │   (-0-25 pts)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Final Composite Score                         │
│                         (0-100)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Category Scoring

### 1. Size Score (0-100)

Evaluates whether the deal's financial profile matches the buyer's target criteria.

#### Input Data

**From Deal:**
- `revenue` (annual revenue in millions)
- `ebitda_amount` (EBITDA in millions)
- `location_count` (number of locations)

**From Buyer:**
- `min_revenue`, `max_revenue`, `revenue_sweet_spot`
- `min_ebitda`, `max_ebitda`, `ebitda_sweet_spot`, `preferred_ebitda`
- Buyer type constraints from tracker

#### Scoring Logic

```typescript
function scoreSizeCategory(deal: Deal, buyer: Buyer, tracker: Tracker): number {
  // Step 1: Hard disqualification check
  const effectiveMinRevenue = buyer.min_revenue || 
    getMinFromBuyerType(buyer.matched_type, tracker.buyer_types_criteria);
  
  if (deal.revenue < effectiveMinRevenue * 0.7) {
    return 0; // Hard disqualification - deal too small
  }

  // Step 2: Revenue scoring (0-100)
  let revenueScore = 0;
  if (deal.revenue >= buyer.revenue_sweet_spot) {
    revenueScore = 100;
  } else if (deal.revenue >= buyer.min_revenue) {
    revenueScore = 70 + 30 * (deal.revenue - buyer.min_revenue) / 
                   (buyer.revenue_sweet_spot - buyer.min_revenue);
  } else {
    revenueScore = 70 * deal.revenue / buyer.min_revenue;
  }

  // Step 3: EBITDA scoring (0-100)
  let ebitdaScore = calculateEBITDAScore(deal.ebitda_amount, buyer);

  // Step 4: Location scoring for multi-location buyers
  let locationScore = 100;
  if (buyer.min_locations && deal.location_count < buyer.min_locations) {
    if (deal.location_count === 1 && buyer.min_locations > 1) {
      return 0; // Single-location penalty for multi-location buyers
    }
    locationScore = 60;
  }

  // Step 5: Combined size score
  return (revenueScore * 0.4 + ebitdaScore * 0.4 + locationScore * 0.2);
}
```

#### Buyer Type Constraints

When a buyer's individual criteria are missing, the system falls back to constraints from their matched buyer type:

```typescript
const BUYER_TYPE_CONSTRAINTS = {
  "Large MSO": { min_locations: 10, min_revenue: 10 },
  "National Platform": { min_locations: 3, min_revenue: 5 },
  "Regional Consolidator": { min_locations: 2, min_revenue: 2 },
  "Single-Shop PE": { min_locations: 1, min_revenue: 1 }
};
```

---

### 2. Geography Score (0-100)

Evaluates geographic alignment between deal location and buyer preferences.

#### Input Data

**From Deal:**
- `geography` (array of states/regions)
- `headquarters` (HQ location)
- `customer_geography` (customer locations)

**From Buyer:**
- `target_geographies` (preferred acquisition locations)
- `geographic_footprint` (existing presence)
- `service_regions` (service coverage)
- `hq_state` (headquarters state)
- `geographic_exclusions` (excluded geographies)

#### Weighted Matching

Different buyer geography fields carry different weights:

| Field | Weight | Meaning |
|-------|--------|---------|
| target_geographies | 1.0 | Explicitly stated target locations |
| geographic_footprint | 0.7 | Existing operational presence |
| service_regions | 0.5 | Service coverage areas |
| hq_state | 0.3 | Headquarters location |

#### Scoring Logic

```typescript
function scoreGeographyCategory(deal: Deal, buyer: Buyer): number {
  const dealGeos = normalizeGeographies(deal.geography);
  
  // Step 1: Check exclusions (hard disqualification)
  if (hasExcludedGeography(dealGeos, buyer.geographic_exclusions)) {
    return 0;
  }

  // Step 2: Target geography match (highest weight)
  let targetScore = 0;
  if (buyer.target_geographies?.length) {
    const matches = countMatches(dealGeos, buyer.target_geographies);
    if (matches.exact > 0) targetScore = 100;
    else if (matches.adjacent > 0) targetScore = 70; // Adjacent state
    else if (matches.regional > 0) targetScore = 50; // Same region
    else targetScore = 20;
  }

  // Step 3: Footprint match
  let footprintScore = calculateFootprintScore(dealGeos, buyer.geographic_footprint);

  // Step 4: Service region match
  let serviceScore = calculateServiceRegionScore(dealGeos, buyer.service_regions);

  // Step 5: HQ proximity
  let hqScore = calculateHQProximityScore(dealGeos, buyer.hq_state);

  // Step 6: Weighted combination
  return (
    targetScore * 1.0 +
    footprintScore * 0.7 +
    serviceScore * 0.5 +
    hqScore * 0.3
  ) / 2.5; // Normalize to 0-100
}
```

#### State Adjacency Map

For adjacent state scoring:

```typescript
const STATE_ADJACENCY = {
  "TX": ["OK", "AR", "LA", "NM"],
  "CA": ["OR", "NV", "AZ"],
  "FL": ["GA", "AL"],
  // ... all 50 states
};
```

#### Regional Definitions

```typescript
const REGIONS = {
  "Southeast": ["FL", "GA", "SC", "NC", "VA", "TN", "AL", "MS", "LA"],
  "Southwest": ["TX", "NM", "AZ", "OK"],
  "Northeast": ["NY", "NJ", "PA", "CT", "MA", "RI", "NH", "VT", "ME"],
  "Midwest": ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO"],
  "West": ["CA", "OR", "WA", "NV", "CO", "UT"],
  // ...
};
```

---

### 3. Services Score (0-100)

Evaluates alignment between deal services and buyer acquisition focus.

#### Input Data

**From Deal:**
- `service_mix` (services offered)
- `business_model` (business model)
- `industry_type` (industry classification)

**From Tracker:**
- `service_criteria.primary_focus` (required primary services)
- `service_criteria.required_services` (must-have services)
- `service_criteria.preferred_services` (nice-to-have services)
- `service_criteria.excluded_services` (dealbreaker services)

**From Buyer:**
- `target_services` (services buyer wants to acquire)
- `services_offered` (services buyer currently offers)
- `industry_exclusions` (excluded industries)

#### Scoring Logic

```typescript
function scoreServicesCategory(deal: Deal, buyer: Buyer, tracker: Tracker): number {
  const dealServices = parseServices(deal.service_mix);
  const primaryFocus = tracker.service_criteria?.primary_focus || [];

  // Step 1: Check for excluded services (hard disqualification)
  const excludedServices = tracker.service_criteria?.excluded_services || [];
  if (hasExcludedService(dealServices, excludedServices)) {
    return 0;
  }

  // Step 2: Primary focus alignment (most important)
  let primaryScore = 0;
  const dealPrimary = detectPrimaryService(deal);
  if (primaryFocus.includes(dealPrimary)) {
    primaryScore = 100;
  } else if (hasOverlap(dealServices, primaryFocus)) {
    primaryScore = 60; // Has focus service but not as primary
  } else {
    primaryScore = 20; // No overlap with primary focus
  }

  // Step 3: Required services check
  const requiredServices = tracker.service_criteria?.required_services || [];
  let requiredScore = 100;
  for (const required of requiredServices) {
    if (!dealServices.includes(required)) {
      requiredScore -= 20; // Penalty for each missing required service
    }
  }
  requiredScore = Math.max(0, requiredScore);

  // Step 4: Buyer target service alignment
  let buyerAlignmentScore = 0;
  if (buyer.target_services?.length) {
    const overlap = countOverlap(dealServices, buyer.target_services);
    buyerAlignmentScore = Math.min(100, overlap * 25);
  }

  // Step 5: Combined score
  return (primaryScore * 0.5 + requiredScore * 0.3 + buyerAlignmentScore * 0.2);
}
```

#### Primary Service Detection

Uses three signals to determine the deal's primary service:

1. **Asset Count**: If towing assets ≥5, towing is primary
2. **Mention Frequency**: Count mentions in service_mix
3. **Position**: First-mentioned service often primary

```typescript
function detectPrimaryService(deal: Deal): string {
  const serviceMix = deal.service_mix || "";
  
  // Check asset count first
  if (extractAssetCount(serviceMix, "tow") >= 5) {
    return "towing";
  }

  // Count mentions
  const mentions = countServiceMentions(serviceMix);
  
  // First mentioned with significant presence
  const firstService = extractFirstService(serviceMix);
  if (mentions[firstService] >= 2) {
    return firstService;
  }

  return getMostMentioned(mentions);
}
```

---

### 4. Owner Goals Score (0-100)

Evaluates alignment between deal owner's objectives and buyer preferences.

#### Input Data

**From Deal:**
- `owner_goals` (owner objectives)
- `ownership_structure` (current ownership)
- `special_requirements` (special deal requirements)

**From Buyer:**
- `owner_roll_requirement` (equity roll expectations)
- `owner_transition_goals` (transition preferences)
- `employee_owner` (employee ownership stance)

#### Scoring Logic

```typescript
function scoreOwnerGoalsCategory(deal: Deal, buyer: Buyer): number {
  let score = 70; // Default neutral score

  // Equity roll alignment
  const dealRollInterest = extractRollInterest(deal.owner_goals);
  const buyerRollRequirement = buyer.owner_roll_requirement;
  
  if (dealRollInterest && buyerRollRequirement) {
    if (isCompatible(dealRollInterest, buyerRollRequirement)) {
      score += 15;
    } else {
      score -= 20;
    }
  }

  // Transition timeline
  const dealTimeline = extractTimeline(deal.owner_goals);
  const buyerTimeline = buyer.owner_transition_goals;
  
  if (dealTimeline && buyerTimeline) {
    if (timelinesMatch(dealTimeline, buyerTimeline)) {
      score += 10;
    }
  }

  // Special requirements check
  if (deal.special_requirements) {
    const incompatibilities = checkRequirementCompatibility(
      deal.special_requirements, 
      buyer
    );
    score -= incompatibilities * 10;
  }

  return Math.max(0, Math.min(100, score));
}
```

---

## Composite Score Calculation

### Base Composite Formula

```typescript
function calculateCompositeScore(
  categoryScores: CategoryScores,
  weights: Weights,
  multipliers: Multipliers
): number {
  const weightedSum = 
    (categoryScores.size * weights.size * multipliers.size) +
    (categoryScores.geography * weights.geography * multipliers.geography) +
    (categoryScores.services * weights.service * multipliers.services) +
    (categoryScores.ownerGoals * weights.ownerGoals * 1.0); // No multiplier

  const totalWeight = 
    (weights.size * multipliers.size) +
    (weights.geography * multipliers.geography) +
    (weights.service * multipliers.services) +
    (weights.ownerGoals * 1.0);

  return weightedSum / totalWeight;
}
```

### Default Weights

| Category | Default Weight |
|----------|----------------|
| Size | 25 |
| Geography | 25 |
| Services | 25 |
| Owner Goals | 25 |

Weights are configurable per tracker via `industry_trackers.{category}_weight` columns.

### Dynamic Multipliers

Multipliers adjust weights based on learned patterns from user decisions:

```typescript
// From deal_scoring_adjustments table
multipliers = {
  size: adjustments.size_weight_mult || 1.0,
  geography: adjustments.geography_weight_mult || 1.0,
  services: adjustments.services_weight_mult || 1.0
};
```

---

## Bonuses and Penalties

### Thesis Bonus (+0-15 points)

Added when buyer thesis strongly aligns with deal characteristics:

```typescript
function calculateThesisBonus(deal: Deal, buyer: Buyer): number {
  let bonus = 0;

  // Geographic thesis match
  if (buyer.thesis_summary?.includes(deal.geography?.[0])) {
    bonus += 5;
  }

  // Service thesis match
  if (buyer.thesis_summary?.toLowerCase().includes(deal.industry_type?.toLowerCase())) {
    bonus += 5;
  }

  // Acquisition appetite signal
  if (buyer.acquisition_appetite === "Active") {
    bonus += 5;
  }

  return Math.min(15, bonus);
}
```

### Engagement Bonus (+0-20 points)

Based on call signals and interaction history:

```typescript
function calculateEngagementBonus(buyer: Buyer, deal: Deal): number {
  let bonus = 0;

  // Recent call
  if (buyer.last_call_date && daysSince(buyer.last_call_date) < 90) {
    bonus += 10;
  }

  // Has key quotes
  if (buyer.key_quotes?.length > 0) {
    bonus += 5;
  }

  // Fee agreement in place
  if (buyer.has_fee_agreement) {
    bonus += 5;
  }

  return Math.min(20, bonus);
}
```

### Learning Penalty (-0-25 points)

Applied based on historical rejection patterns:

```typescript
function calculateLearningPenalty(
  buyer: Buyer, 
  deal: Deal,
  history: LearningHistory[]
): number {
  let penalty = 0;

  // Count rejections by category
  const rejectionsByCategory = groupRejections(history, buyer.id);

  // Repeated size rejections
  if (rejectionsByCategory.size >= 2) {
    penalty += 10;
  }

  // Repeated geography rejections
  if (rejectionsByCategory.geography >= 2) {
    penalty += 10;
  }

  // Pattern matching for similar deals
  const similarDealRejections = findSimilarDealRejections(history, deal, buyer);
  penalty += similarDealRejections * 5;

  return Math.min(25, penalty);
}
```

---

## Custom Scoring Instructions

Users can add natural language scoring rules via the "Optimize Scoring" panel:

### Example Instructions

```
"No DRP relationships"
"Prioritize Texas buyers"
"Exclude single-location shops"
"Must have ADAS certification capability"
```

### Parsing and Application

```typescript
// parse-scoring-instructions edge function
function parseInstructions(instructions: string): ParsedRules {
  // AI parses to structured format
  return {
    bonuses: [
      { condition: "geography includes TX", points: 10 }
    ],
    penalties: [
      { condition: "has DRP relationships", points: -20 }
    ],
    disqualifiers: [
      { condition: "location_count = 1" }
    ]
  };
}

// Applied in scoring
function applyCustomRules(
  score: number, 
  buyer: Buyer, 
  deal: Deal,
  rules: ParsedRules
): number {
  // Check disqualifiers first
  for (const rule of rules.disqualifiers) {
    if (evaluateCondition(rule.condition, buyer, deal)) {
      return 0;
    }
  }

  // Apply bonuses/penalties
  for (const bonus of rules.bonuses) {
    if (evaluateCondition(bonus.condition, buyer, deal)) {
      score += bonus.points;
    }
  }

  for (const penalty of rules.penalties) {
    if (evaluateCondition(penalty.condition, buyer, deal)) {
      score += penalty.points; // Negative value
    }
  }

  return Math.max(0, Math.min(100, score));
}
```

---

## Score Tiers

Final scores are mapped to qualitative tiers for display:

| Tier | Score Range | Display Color | Meaning |
|------|-------------|---------------|---------|
| Excellent | 85-100 | Green | Strong fit across all categories |
| Strong | 70-84 | Blue | Good fit with minor gaps |
| Moderate | 55-69 | Yellow | Reasonable fit, review recommended |
| Weak | 40-54 | Orange | Poor fit, likely pass |
| Poor | 0-39 | Red | Disqualified or major mismatches |

```typescript
function getScoreTier(score: number): ScoreTier {
  if (score >= 85) return { tier: "Excellent", color: "green" };
  if (score >= 70) return { tier: "Strong", color: "blue" };
  if (score >= 55) return { tier: "Moderate", color: "yellow" };
  if (score >= 40) return { tier: "Weak", color: "orange" };
  return { tier: "Poor", color: "red" };
}
```

---

## Data Quality Indicators

### Needs Review Status

Buyers with insufficient data trigger "Needs Review" status:

```typescript
function checkDataQuality(buyer: Buyer, deal: Deal): DataQualityResult {
  const missingCritical = [];

  if (!buyer.target_geographies?.length) {
    missingCritical.push("target_geographies");
  }
  if (!buyer.min_revenue && !buyer.min_ebitda) {
    missingCritical.push("size_criteria");
  }
  if (!buyer.target_services?.length && !buyer.services_offered) {
    missingCritical.push("services");
  }

  return {
    needsReview: missingCritical.length > 0,
    missingFields: missingCritical,
    confidenceLevel: missingCritical.length === 0 ? "high" : 
                     missingCritical.length < 2 ? "medium" : "low"
  };
}
```

---

## Learning System

### Weight Recalculation (recalculate-deal-weights)

Triggered when users approve or reject buyers:

```typescript
async function recalculateDealWeights(dealId: string) {
  // Get all scores for this deal
  const scores = await getScoresForDeal(dealId);
  
  // Analyze approved vs rejected patterns
  const approved = scores.filter(s => s.selected_for_outreach);
  const rejected = scores.filter(s => s.passed_on_deal || s.hidden_from_deal);

  // Calculate average category scores for each group
  const avgApproved = calculateAverages(approved);
  const avgRejected = calculateAverages(rejected);

  // Adjust multipliers based on patterns
  const multipliers = {
    size: calculateMultiplier(avgApproved.size, avgRejected.size),
    geography: calculateMultiplier(avgApproved.geography, avgRejected.geography),
    services: calculateMultiplier(avgApproved.services, avgRejected.services)
  };

  // Save adjustments
  await saveAdjustments(dealId, multipliers);
}
```

### Historical Learning (buyer_learning_history)

Long-term pattern tracking:

```typescript
interface LearningHistoryEntry {
  buyer_id: string;
  deal_id: string;
  action_type: "rejection" | "pass";
  rejection_reason: string;
  rejection_categories: string[];
  deal_context: {
    revenue: number;
    geography: string[];
    services: string[];
  };
  created_at: string;
}
```

When a buyer shows repeated rejections for specific reasons, future scores receive automatic penalties.

---

## Score Explanation

Each score includes human-readable explanation:

```typescript
function generateScoreExplanation(
  scores: CategoryScores,
  buyer: Buyer,
  deal: Deal
): string {
  const parts = [];

  // Size explanation
  if (scores.size >= 80) {
    parts.push(`Revenue of $${deal.revenue}M is within ${buyer.pe_firm_name}'s target range`);
  } else if (scores.size < 50) {
    parts.push(`Deal size may be below ${buyer.pe_firm_name}'s minimum threshold`);
  }

  // Geography explanation
  if (scores.geography >= 80) {
    parts.push(`${deal.geography?.[0]} aligns with stated target geographies`);
  } else if (scores.geography < 50) {
    parts.push(`Limited geographic overlap with acquisition focus`);
  }

  // Services explanation
  if (scores.services >= 80) {
    parts.push(`Strong service alignment with acquisition thesis`);
  }

  return parts.join(". ") + ".";
}
```
