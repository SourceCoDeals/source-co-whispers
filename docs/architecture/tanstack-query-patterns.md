# TanStack Query Patterns

## Overview

This document describes the standardized patterns for using TanStack Query in the SourceCo platform.

## Query Key Factory

All query keys are centralized in `src/hooks/queries/queryKeys.ts`. This prevents key collisions and ensures consistent cache invalidation.

### Structure

```typescript
// Each entity has a keys object with these patterns:
export const entityKeys = {
  all: ["entity"] as const,                    // Root key for all entity data
  lists: () => [...entityKeys.all, "list"],    // All list queries
  list: (filters) => [...entityKeys.lists(), filters], // Specific filtered list
  details: () => [...entityKeys.all, "detail"], // All detail queries
  detail: (id) => [...entityKeys.details(), id], // Specific detail query
};
```

### Usage Examples

```typescript
// Fetching a tracker
const { data: tracker } = useQuery({
  queryKey: trackerKeys.detail(trackerId),
  queryFn: () => fetchTracker(trackerId),
});

// Fetching buyers for a tracker
const { data: buyers } = useQuery({
  queryKey: buyerKeys.byTracker(trackerId),
  queryFn: () => fetchBuyersByTracker(trackerId),
});

// Invalidating all tracker data
queryClient.invalidateQueries({ queryKey: trackerKeys.all });

// Invalidating a specific tracker
queryClient.invalidateQueries({ queryKey: trackerKeys.detail(trackerId) });
```

## Query Hook Patterns

### Standard Query Hook

```typescript
export function useTracker(trackerId: string) {
  return useQuery({
    queryKey: trackerKeys.detail(trackerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("industry_trackers")
        .select("*")
        .eq("id", trackerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new NotFoundError("Tracker not found", "tracker", trackerId);

      return data;
    },
    enabled: !!trackerId,
  });
}
```

### Mutation with Optimistic Updates

```typescript
export function useUpdateTracker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tracker> }) => {
      const { data, error } = await supabase
        .from("industry_trackers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: trackerKeys.detail(id) });

      // Snapshot previous value
      const previousTracker = queryClient.getQueryData(trackerKeys.detail(id));

      // Optimistically update
      queryClient.setQueryData(trackerKeys.detail(id), (old) => ({
        ...old,
        ...updates,
      }));

      return { previousTracker };
    },
    onError: (err, { id }, context) => {
      // Rollback on error
      if (context?.previousTracker) {
        queryClient.setQueryData(trackerKeys.detail(id), context.previousTracker);
      }
    },
    onSettled: (_, __, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: trackerKeys.detail(id) });
    },
  });
}
```

## Error Handling

Always use the error utilities from `src/lib/errors.ts`:

```typescript
import { NotFoundError, formatErrorForUser } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";

// In query functions
if (!data) {
  throw new NotFoundError("Resource not found", "ResourceType", id);
}

// In components
const { error } = useQuery(/* ... */);
if (error) {
  toast({
    title: "Error",
    description: formatErrorForUser(error),
    variant: "destructive",
  });
}
```

## Loading States

Use the loading states provided by TanStack Query:

```typescript
const { data, isLoading, isFetching, error } = useQuery(/* ... */);

// Initial load
if (isLoading) return <Skeleton />;

// Error state
if (error) return <ErrorMessage error={error} />;

// Background refetch indicator
{isFetching && <RefreshIndicator />}
```

## Caching Strategy

- **staleTime**: How long data is considered fresh (default: 0)
- **gcTime**: How long unused data stays in cache (default: 5 minutes)

For frequently accessed data:
```typescript
useQuery({
  queryKey: trackerKeys.detail(id),
  queryFn: fetchTracker,
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 5 * 60 * 1000, // 5 minutes
});
```

## File Organization

Query hooks should be organized by feature:

```
src/hooks/queries/
├── queryKeys.ts       # Central key factory
├── useTracker.ts      # Tracker queries
├── useBuyers.ts       # Buyer queries
├── useDeals.ts        # Deal queries
└── index.ts           # Barrel export
```
