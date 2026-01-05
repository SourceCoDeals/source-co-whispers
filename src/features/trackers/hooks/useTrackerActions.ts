import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { deleteBuyerWithRelated, deleteDealWithRelated } from "@/lib/cascadeDelete";
import { getEnrichmentStorageKey } from "../types";

interface UseTrackerActionsOptions {
  trackerId: string | undefined;
  loadData: () => Promise<void>;
  buyers: any[];
  setEnrichingBuyers: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsBulkEnriching: (enriching: boolean) => void;
  setBuyerEnrichmentProgress: (progress: { current: number; total: number }) => void;
  setEnrichingDeals: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsBulkEnrichingDeals: (enriching: boolean) => void;
  setDealEnrichmentProgress: (progress: { current: number; total: number }) => void;
  setHasInterruptedSession: (has: boolean) => void;
  setInterruptedSessionInfo: (info: { processed: number; remaining: number } | null) => void;
}

// Constants for retry logic
const MAX_ENRICHMENT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const BETWEEN_BUYER_DELAY_MS = 500;

/**
 * Helper to check if a value is meaningful text
 */
const isMeaningfulText = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  return !["not specified", "n/a", "na", "unknown", "none", "tbd"].includes(lower);
};

/**
 * Check if a buyer is actually enriched (has meaningful data)
 */
export const isActuallyEnriched = (buyer: any): boolean => {
  return (
    isMeaningfulText(buyer.business_summary) ||
    isMeaningfulText(buyer.services_offered) ||
    isMeaningfulText(buyer.thesis_summary) ||
    isMeaningfulText(buyer.strategic_priorities) ||
    (Array.isArray(buyer.portfolio_companies) && buyer.portfolio_companies.length > 0) ||
    (Array.isArray(buyer.target_industries) && buyer.target_industries.length > 0) ||
    (Array.isArray(buyer.recent_acquisitions) && buyer.recent_acquisitions.length > 0)
  );
};

/**
 * Check if a deal can be enriched
 */
export const canEnrichDeal = (deal: any): boolean => {
  return !!(deal.transcript_link || deal.additional_info || deal.company_website);
};

/**
 * Check if a deal is enriched
 */
export const isDealEnriched = (deal: any): boolean => {
  return !!(
    deal.company_overview ||
    deal.service_mix ||
    deal.business_model ||
    (deal.geography && deal.geography.length > 0)
  );
};

/**
 * Hook for TrackerDetail actions (add, delete, enrich, etc.)
 */
export function useTrackerActions(options: UseTrackerActionsOptions) {
  const { 
    trackerId, 
    loadData, 
    buyers,
    setEnrichingBuyers,
    setIsBulkEnriching,
    setBuyerEnrichmentProgress,
    setEnrichingDeals,
    setIsBulkEnrichingDeals,
    setDealEnrichmentProgress,
    setHasInterruptedSession,
    setInterruptedSessionInfo,
  } = options;
  const { toast } = useToast();

  /**
   * Add a new buyer
   */
  const addBuyer = useCallback(async (newBuyer: { pe_firm_name: string; pe_firm_website: string; platform_company_name: string; platform_website: string }) => {
    if (!newBuyer.pe_firm_name.trim()) return false;
    const { error } = await supabase.from("buyers").insert({ tracker_id: trackerId, ...newBuyer });
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      return false; 
    }
    toast({ title: "Buyer added" });
    await loadData();
    return true;
  }, [trackerId, loadData, toast]);

  /**
   * Delete a buyer and all related data
   */
  const deleteBuyer = useCallback(async (buyerId: string, buyerName: string) => {
    const { error } = await deleteBuyerWithRelated(buyerId);
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      return false; 
    }
    toast({ title: "Buyer deleted", description: `${buyerName} has been removed` });
    await loadData();
    return true;
  }, [loadData, toast]);

  /**
   * Delete a deal and all related data
   */
  const deleteDeal = useCallback(async (dealId: string, dealName: string) => {
    const { error } = await deleteDealWithRelated(dealId);
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      return false; 
    }
    toast({ title: "Deal deleted", description: `${dealName} has been removed` });
    await loadData();
    return true;
  }, [loadData, toast]);

  /**
   * Archive a deal
   */
  const archiveDeal = useCallback(async (dealId: string, dealName: string) => {
    const { error } = await supabase.from("deals").update({ status: "Archived" }).eq("id", dealId);
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      return false; 
    }
    toast({ title: "Deal archived", description: `${dealName} has been archived` });
    await loadData();
    return true;
  }, [loadData, toast]);

  /**
   * Enrich a single buyer
   */
  const enrichBuyer = useCallback(async (buyerId: string, buyerName: string) => {
    setEnrichingBuyers(prev => new Set(prev).add(buyerId));
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-buyer', {
        body: { buyerId }
      });

      if (error) {
        toast({ 
          title: "Enrichment failed", 
          description: error.message, 
          variant: "destructive" 
        });
        return false;
      }

      if (!data.success) {
        toast({ 
          title: "Enrichment failed", 
          description: data.error || "Unknown error", 
          variant: "destructive" 
        });
        return false;
      }

      if (data.warning) {
        toast({ 
          title: "Partial enrichment", 
          description: data.warning
        });
      } else {
        toast({ 
          title: "Buyer enriched", 
          description: `${buyerName}: ${data.message}` 
        });
      }
      
      await loadData();
      return true;
    } catch (err) {
      toast({ 
        title: "Enrichment failed", 
        description: err instanceof Error ? err.message : "Unknown error", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setEnrichingBuyers(prev => {
        const next = new Set(prev);
        next.delete(buyerId);
        return next;
      });
    }
  }, [loadData, setEnrichingBuyers, toast]);

  /**
   * Enrich a single deal
   */
  const enrichDeal = useCallback(async (dealId: string, dealName: string) => {
    setEnrichingDeals(prev => new Set(prev).add(dealId));
    
    try {
      // Get the deal data first
      const { data: deal, error: fetchError } = await supabase
        .from("deals")
        .select("*")
        .eq("id", dealId)
        .single();
      
      if (fetchError || !deal) {
        toast({ 
          title: "Error", 
          description: "Could not fetch deal data", 
          variant: "destructive" 
        });
        return false;
      }

      // Try transcript extraction first if available
      if (deal.transcript_link) {
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('extract-deal-transcript', {
          body: { dealId, transcriptUrl: deal.transcript_link }
        });
        
        if (!transcriptError && transcriptData?.success) {
          toast({ 
            title: "Deal enriched from transcript", 
            description: `${dealName}: ${transcriptData.fieldsUpdated || 0} fields updated` 
          });
          await loadData();
          return true;
        }
      }

      // Fall back to general enrichment
      const { data, error } = await supabase.functions.invoke('enrich-deal', {
        body: { 
          dealId, 
          additionalInfo: deal.additional_info,
          companyWebsite: deal.company_website
        }
      });

      if (error) {
        toast({ 
          title: "Enrichment failed", 
          description: error.message, 
          variant: "destructive" 
        });
        return false;
      }

      if (!data.success) {
        toast({ 
          title: "Enrichment failed", 
          description: data.error || "Unknown error", 
          variant: "destructive" 
        });
        return false;
      }

      toast({ 
        title: "Deal enriched", 
        description: `${dealName}: ${data.fieldsUpdated || 0} fields updated` 
      });
      
      await loadData();
      return true;
    } catch (err) {
      toast({ 
        title: "Enrichment failed", 
        description: err instanceof Error ? err.message : "Unknown error", 
        variant: "destructive" 
      });
      return false;
    } finally {
      setEnrichingDeals(prev => {
        const next = new Set(prev);
        next.delete(dealId);
        return next;
      });
    }
  }, [loadData, setEnrichingDeals, toast]);

  /**
   * Clear enrichment progress from localStorage
   */
  const clearEnrichmentProgress = useCallback(() => {
    if (!trackerId) return;
    const storageKey = getEnrichmentStorageKey(trackerId);
    localStorage.removeItem(storageKey);
    setHasInterruptedSession(false);
    setInterruptedSessionInfo(null);
  }, [trackerId, setHasInterruptedSession, setInterruptedSessionInfo]);

  /**
   * Delete selected buyers
   */
  const deleteSelectedBuyers = useCallback(async (selectedBuyerIds: Set<string>) => {
    const buyerIdsArray = Array.from(selectedBuyerIds);
    let deleted = 0;
    let failed = 0;

    for (const buyerId of buyerIdsArray) {
      const { error } = await deleteBuyerWithRelated(buyerId);
      if (error) {
        failed++;
      } else {
        deleted++;
      }
    }

    if (deleted > 0) {
      toast({ 
        title: `${deleted} buyer${deleted === 1 ? '' : 's'} deleted`,
        description: failed > 0 ? `${failed} failed to delete` : undefined
      });
    }

    if (failed > 0 && deleted === 0) {
      toast({ 
        title: "Failed to delete buyers", 
        variant: "destructive" 
      });
    }

    await loadData();
    return { deleted, failed };
  }, [loadData, toast]);

  return {
    addBuyer,
    deleteBuyer,
    deleteDeal,
    archiveDeal,
    enrichBuyer,
    enrichDeal,
    clearEnrichmentProgress,
    deleteSelectedBuyers,
    // Export utility functions
    isActuallyEnriched,
    canEnrichDeal,
    isDealEnriched,
  };
}
