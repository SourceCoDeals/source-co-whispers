import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Tracker = Tables<'industry_trackers'>;
export type Buyer = Tables<'buyers'>;
export type Deal = Tables<'deals'>;

export interface DealBuyerCounts {
  approved: number;
  interested: number;
  passed: number;
}

export interface UseTrackerDataResult {
  tracker: Tracker | null;
  buyers: Buyer[];
  deals: Deal[];
  dealBuyerCounts: Record<string, DealBuyerCounts>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTrackerData(trackerId: string | undefined): UseTrackerDataResult {
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealBuyerCounts, setDealBuyerCounts] = useState<Record<string, DealBuyerCounts>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!trackerId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      const [trackerRes, buyersRes, dealsRes] = await Promise.all([
        supabase.from('industry_trackers').select('*').eq('id', trackerId).single(),
        supabase.from('buyers').select('*').eq('tracker_id', trackerId).order('pe_firm_name'),
        supabase.from('deals').select('*').eq('tracker_id', trackerId).order('created_at', { ascending: false }),
      ]);

      if (trackerRes.error) throw trackerRes.error;
      
      setTracker(trackerRes.data);
      setBuyers(buyersRes.data || []);
      setDeals(dealsRes.data || []);

      // Fetch buyer counts for each deal
      if (dealsRes.data && dealsRes.data.length > 0) {
        const dealIds = dealsRes.data.map(d => d.id);
        const { data: scores } = await supabase
          .from('buyer_deal_scores')
          .select('deal_id, selected_for_outreach, interested, passed_on_deal')
          .in('deal_id', dealIds);

        if (scores) {
          const counts: Record<string, DealBuyerCounts> = {};
          dealIds.forEach(dealId => {
            const dealScores = scores.filter(s => s.deal_id === dealId);
            counts[dealId] = {
              approved: dealScores.filter(s => s.selected_for_outreach).length,
              interested: dealScores.filter(s => s.interested).length,
              passed: dealScores.filter(s => s.passed_on_deal).length,
            };
          });
          setDealBuyerCounts(counts);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tracker data'));
    } finally {
      setIsLoading(false);
    }
  }, [trackerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    tracker,
    buyers,
    deals,
    dealBuyerCounts,
    isLoading,
    error,
    refetch: loadData,
  };
}
