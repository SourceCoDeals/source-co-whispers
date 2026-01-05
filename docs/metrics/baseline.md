# Baseline Metrics - Updated

**Date:** January 2025

## File Size Metrics

| File | Current Lines | Target Lines | Status |
|------|---------------|--------------|--------|
| TrackerDetail.tsx | 2,936 | <300 | ❌ In Progress |
| BuyerDetail.tsx | ~2,400 | <500 | ❌ Pending |
| DealMatching.tsx | ~1,900 | <500 | ❌ Pending |
| DealDetail.tsx | ~1,700 | <500 | ❌ Pending |

## Refactoring Progress

### Phase 1-5 Complete ✅
- Documentation structure created
- ErrorBoundary component added
- Error utilities (src/lib/errors.ts) created
- Query key factory (src/hooks/queries/queryKeys.ts) created
- TypeScript strict mode documented (requires manual config change)

### Phase 6-10 In Progress 🔄
- Feature folder structure created (src/features/)
- TrackerDetail state extraction (useTrackerState.ts)
- TrackerDetail actions extraction (useTrackerActions.ts)
- UI components extraction started

## Feature Folder Structure

```
src/features/
├── trackers/
│   ├── index.ts
│   ├── types.ts
│   ├── hooks/
│   │   ├── useTrackerState.ts (~300 lines of state management)
│   │   └── useTrackerActions.ts (~250 lines of actions)
│   └── components/
│       ├── TrackerHeader.tsx
│       ├── TrackerCriteriaSection.tsx
│       └── TrackerTabsContainer.tsx
├── buyers/
│   ├── index.ts
│   └── types.ts
├── deals/
│   ├── index.ts
│   └── types.ts
└── matching/
    ├── index.ts
    └── types.ts
```

## Extraction Summary

From TrackerDetail.tsx (2,936 lines):
- ~150 lines → useTrackerState.ts (state declarations)
- ~250 lines → useTrackerActions.ts (CRUD operations)
- ~50 lines → TrackerHeader.tsx
- ~70 lines → TrackerCriteriaSection.tsx
- ~30 lines → TrackerTabsContainer.tsx

**Estimated remaining:** ~2,400 lines still in TrackerDetail.tsx

## Next Steps (Phases 11-15)
1. Extract buyer table rendering to TrackerBuyersTab.tsx
2. Extract deal table rendering to TrackerDealsTab.tsx
3. Wire up new hooks and components in TrackerDetail.tsx
4. Continue component extraction
