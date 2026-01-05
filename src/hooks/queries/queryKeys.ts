/**
 * Centralized query key factory for TanStack Query.
 * 
 * Benefits:
 * - Prevents key collisions between different queries
 * - Ensures consistent invalidation patterns
 * - Provides type safety for query keys
 * - Makes refactoring easier
 * 
 * Usage:
 * ```typescript
 * // In a query hook:
 * useQuery({
 *   queryKey: trackerKeys.detail(trackerId),
 *   queryFn: () => fetchTracker(trackerId),
 * });
 * 
 * // For invalidation:
 * queryClient.invalidateQueries({ queryKey: trackerKeys.all });
 * ```
 */

export const trackerKeys = {
  all: ["trackers"] as const,
  lists: () => [...trackerKeys.all, "list"] as const,
  list: (filters?: { archived?: boolean }) =>
    [...trackerKeys.lists(), filters] as const,
  details: () => [...trackerKeys.all, "detail"] as const,
  detail: (id: string) => [...trackerKeys.details(), id] as const,
};

export const buyerKeys = {
  all: ["buyers"] as const,
  lists: () => [...buyerKeys.all, "list"] as const,
  byTracker: (trackerId: string) =>
    [...buyerKeys.lists(), "tracker", trackerId] as const,
  details: () => [...buyerKeys.all, "detail"] as const,
  detail: (id: string) => [...buyerKeys.details(), id] as const,
  contacts: (buyerId: string) =>
    [...buyerKeys.detail(buyerId), "contacts"] as const,
  transcripts: (buyerId: string) =>
    [...buyerKeys.detail(buyerId), "transcripts"] as const,
};

export const dealKeys = {
  all: ["deals"] as const,
  lists: () => [...dealKeys.all, "list"] as const,
  byTracker: (trackerId: string) =>
    [...dealKeys.lists(), "tracker", trackerId] as const,
  details: () => [...dealKeys.all, "detail"] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
  transcripts: (dealId: string) =>
    [...dealKeys.detail(dealId), "transcripts"] as const,
  scores: (dealId: string) =>
    [...dealKeys.detail(dealId), "scores"] as const,
};

export const buyerDealScoreKeys = {
  all: ["buyerDealScores"] as const,
  byDeal: (dealId: string) =>
    [...buyerDealScoreKeys.all, "deal", dealId] as const,
  byBuyer: (buyerId: string) =>
    [...buyerDealScoreKeys.all, "buyer", buyerId] as const,
  specific: (buyerId: string, dealId: string) =>
    [...buyerDealScoreKeys.all, buyerId, dealId] as const,
};

export const peFirmKeys = {
  all: ["peFirms"] as const,
  lists: () => [...peFirmKeys.all, "list"] as const,
  details: () => [...peFirmKeys.all, "detail"] as const,
  detail: (id: string) => [...peFirmKeys.details(), id] as const,
  contacts: (firmId: string) =>
    [...peFirmKeys.detail(firmId), "contacts"] as const,
  platforms: (firmId: string) =>
    [...peFirmKeys.detail(firmId), "platforms"] as const,
};

export const platformKeys = {
  all: ["platforms"] as const,
  lists: () => [...platformKeys.all, "list"] as const,
  byPeFirm: (peFirmId: string) =>
    [...platformKeys.lists(), "peFirm", peFirmId] as const,
  details: () => [...platformKeys.all, "detail"] as const,
  detail: (id: string) => [...platformKeys.details(), id] as const,
  contacts: (platformId: string) =>
    [...platformKeys.detail(platformId), "contacts"] as const,
};

export const outreachKeys = {
  all: ["outreach"] as const,
  byDeal: (dealId: string) =>
    [...outreachKeys.all, "deal", dealId] as const,
  byBuyer: (buyerId: string) =>
    [...outreachKeys.all, "buyer", buyerId] as const,
};

export const companyKeys = {
  all: ["companies"] as const,
  lists: () => [...companyKeys.all, "list"] as const,
  details: () => [...companyKeys.all, "detail"] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
  byDomain: (domain: string) =>
    [...companyKeys.all, "domain", domain] as const,
};
