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

### Phase 6-10 Complete ✅
- Feature folder structure created (src/features/)
- TrackerDetail state extraction (useTrackerState.ts)
- TrackerDetail actions extraction (useTrackerActions.ts)
- UI components extraction started

### Phase 11-15 In Progress 🔄
- TrackerBuyersTab.tsx created (~450 lines)
- TrackerDealsTab.tsx created (~380 lines)
- TrackerHeader.tsx updated with navigation
- TrackerCriteriaSection.tsx functional
- Integration into TrackerDetail.tsx pending

## Feature Folder Structure

```
src/features/
├── trackers/
│   ├── index.ts
│   ├── types.ts
│   ├── hooks/
│   │   ├── useTrackerState.ts (~377 lines of state management)
│   │   └── useTrackerActions.ts (~355 lines of actions)
│   └── components/
│       ├── TrackerHeader.tsx (~30 lines)
│       ├── TrackerCriteriaSection.tsx (~82 lines)
│       └── TrackerTabsContainer.tsx (~39 lines)
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

## Modular Tracker Components

```
src/components/tracker/
├── index.ts (barrel exports)
├── TrackerBuyersTable.tsx
├── TrackerDealsTable.tsx
├── TrackerBuyersToolbar.tsx
├── TrackerDealsToolbar.tsx
├── TrackerBuyersTab.tsx (~450 lines) ← NEW
├── TrackerDealsTab.tsx (~380 lines) ← NEW
├── AddBuyerDialog.tsx
├── DedupeDialog.tsx
└── InterruptedSessionBanner.tsx
```

## Extraction Summary

From TrackerDetail.tsx (2,936 lines):
- ~377 lines → useTrackerState.ts (state declarations + load logic)
- ~355 lines → useTrackerActions.ts (CRUD + enrichment operations)
- ~30 lines → TrackerHeader.tsx
- ~82 lines → TrackerCriteriaSection.tsx
- ~39 lines → TrackerTabsContainer.tsx
- ~450 lines → TrackerBuyersTab.tsx (complete buyers tab UI)
- ~380 lines → TrackerDealsTab.tsx (complete deals tab UI)

**Total extracted:** ~1,713 lines
**Estimated remaining in TrackerDetail.tsx after integration:** ~1,200 lines

## Next Steps (Phases 16-20)
1. Wire TrackerBuyersTab and TrackerDealsTab into TrackerDetail.tsx
2. Extract criteria editing section to dedicated component
3. Extract document management section
4. Extract M&A Guide section
5. Continue reducing TrackerDetail.tsx to <500 lines
