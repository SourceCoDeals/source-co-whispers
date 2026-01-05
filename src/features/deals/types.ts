/**
 * Deal-specific types for the deals feature
 */

import type { Tables } from "@/integrations/supabase/types";

export type Deal = Tables<"deals">;

export interface DealWithScores extends Deal {
  buyer_deal_scores?: Tables<"buyer_deal_scores">[];
}

export interface DealBuyerCounts {
  approved: number;
  interested: number;
  passed: number;
}

export interface DealEnrichmentProgress {
  current: number;
  total: number;
}

export interface DealScoringProgress {
  current: number;
  total: number;
}
