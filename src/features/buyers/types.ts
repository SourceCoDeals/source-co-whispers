/**
 * Buyer-specific types for the buyers feature
 */

import type { Tables } from "@/integrations/supabase/types";

export type Buyer = Tables<"buyers">;

export interface BuyerWithContacts extends Buyer {
  buyer_contacts?: Tables<"buyer_contacts">[];
}

export interface BuyerEnrichmentResult {
  success: boolean;
  partial?: boolean;
  reason?: string;
  fieldsUpdated?: number;
}

export interface BuyerDedupeGroup {
  key: string;
  matchType: "domain" | "name";
  count: number;
  platformNames: string[];
  peFirmNames: string[];
  mergedPeFirmName: string;
  keeperName: string;
}

export interface DedupePreview {
  duplicateGroups: BuyerDedupeGroup[];
  stats: {
    groupsFound: number;
    totalDuplicates: number;
  };
}
