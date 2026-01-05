/**
 * Tracker-specific types for the trackers feature
 */

import type { Tables } from "@/integrations/supabase/types";

export type Tracker = Tables<"industry_trackers">;

export interface TrackerEnrichmentProgress {
  processedIds: string[];
  startedAt: string;
  lastUpdatedAt: string;
}

export interface TrackerCriteriaState {
  sizeCriteria: string;
  serviceCriteria: string;
  geographyCriteria: string;
  buyerTypesCriteria: string;
}

export interface TrackerSortState {
  column: string;
  direction: "asc" | "desc";
}

export interface TrackerSelectionState {
  selectedBuyerIds: Set<string>;
  highlightedBuyerIds: Set<string>;
}

/**
 * LocalStorage key for enrichment progress persistence
 */
export const getEnrichmentStorageKey = (trackerId: string) => 
  `enrichment_progress_${trackerId}`;
