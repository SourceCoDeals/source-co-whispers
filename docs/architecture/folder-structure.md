# Folder Structure

## Current Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── tracker/         # Tracker-specific components (NEW)
│   ├── layout/          # Layout components
│   ├── dashboard/       # Dashboard widgets
│   └── skeletons/       # Loading skeletons
├── hooks/
│   ├── queries/         # TanStack Query hooks (NEW)
│   └── *.ts             # General hooks
├── lib/
│   ├── types.ts         # TypeScript interfaces
│   ├── utils.ts         # General utilities
│   ├── errors.ts        # Error utilities (NEW)
│   └── *.ts             # Domain-specific utilities
├── pages/               # Route components
└── integrations/        # External integrations (Supabase)
```

## Target Structure (Post-Refactor)

```
src/
├── features/            # Feature-based organization
│   ├── trackers/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── buyers/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── deals/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   └── matching/
│       ├── components/
│       ├── hooks/
│       └── types.ts
├── components/
│   ├── ui/              # shadcn/ui (unchanged)
│   ├── layout/          # App layout
│   └── ErrorBoundary.tsx
├── hooks/
│   └── queries/         # Shared query hooks
├── lib/
│   ├── types.ts         # Shared types
│   ├── errors.ts        # Error utilities
│   └── utils.ts         # Shared utilities
├── pages/               # Thin route wrappers
└── integrations/        # External services
```

## Migration Strategy

1. **Phase 6-8:** Create `src/features/` structure
2. **Phase 9-14:** Move tracker components to `src/features/trackers/`
3. **Phase 15-20:** Move buyer components to `src/features/buyers/`
4. **Phase 21-26:** Move deal components to `src/features/deals/`
5. **Phase 27-32:** Move matching logic to `src/features/matching/`

## Naming Conventions

- **Components:** PascalCase (`TrackerBuyersTable.tsx`)
- **Hooks:** camelCase with `use` prefix (`useTrackerData.ts`)
- **Utilities:** camelCase (`formatCurrency.ts`)
- **Types:** PascalCase interfaces, camelCase type aliases
- **Query Keys:** camelCase with descriptive names (`trackerKeys.detail(id)`)
