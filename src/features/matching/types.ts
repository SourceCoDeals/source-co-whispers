/**
 * Matching-specific types for the matching feature
 */

import type { Tables } from "@/integrations/supabase/types";

export type BuyerDealScore = Tables<"buyer_deal_scores">;

export interface MatchingFilters {
  showApproved: boolean;
  showInterested: boolean;
  showPassed: boolean;
  showUnscored: boolean;
  minScore?: number;
  maxScore?: number;
}

export interface MatchingSort {
  column: string;
  direction: "asc" | "desc";
}
