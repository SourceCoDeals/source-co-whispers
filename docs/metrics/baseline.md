# Baseline Metrics

**Date:** January 2025

## File Size Metrics

| File | Current Lines | Target Lines | Status |
|------|---------------|--------------|--------|
| TrackerDetail.tsx | 2,936 | <300 | ❌ Needs refactor |
| BuyerDetail.tsx | ~2,400 | <500 | ❌ Needs refactor |
| DealMatching.tsx | ~1,900 | <500 | ❌ Needs refactor |
| DealDetail.tsx | ~1,700 | <500 | ❌ Needs refactor |

## TypeScript Configuration

| Setting | Before | After Phase 5 | Target |
|---------|--------|---------------|--------|
| strictNullChecks | false | true | true |
| noImplicitAny | false | false | true (Phase 40) |

## Test Coverage

| Metric | Current | Target |
|--------|---------|--------|
| Unit tests | 0% | 80% |
| Integration tests | 0% | 60% |
| E2E tests | 0% | Critical paths |

## Component Architecture

### Pre-Refactor State
- Large monolithic page components
- Business logic mixed with UI
- Inline state management
- No standardized error handling

### Post-Refactor Target
- Small, focused components (<300 lines)
- Custom hooks for business logic
- Centralized state via TanStack Query
- Consistent error boundaries and utilities

## Completed Work (Prior Sessions)

The following components were created in earlier sessions:

### Hooks (src/hooks/)
- `useSortableTable.ts` - Table sorting logic
- `useBulkEnrichment.ts` - Bulk buyer/deal enrichment
- `useTrackerData.ts` - Tracker data fetching

### Components (src/components/tracker/)
- `TrackerBuyersTable.tsx` - Buyer table display
- `TrackerDealsTable.tsx` - Deal table display
- `TrackerBuyersToolbar.tsx` - Buyer actions toolbar
- `TrackerDealsToolbar.tsx` - Deal actions toolbar
- `AddBuyerDialog.tsx` - Add buyer modal
- `DedupeDialog.tsx` - Deduplication modal
- `InterruptedSessionBanner.tsx` - Session recovery UI

### Types (src/lib/types.ts)
- 25+ comprehensive TypeScript interfaces
- All core entities typed (Tracker, Buyer, Deal, etc.)

**Note:** These components exist but TrackerDetail.tsx is not yet using them.
