import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { History, ChevronRight, Users, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface DealHistoryItem {
  id: string;
  tracker_id: string;
  tracker_name: string;
  status: string | null;
  created_at: string;
  buyer_stats: {
    total: number;
    interested: number;
    passed: number;
    pending: number;
  };
}

interface DealHistorySectionProps {
  companyId: string;
  currentDealId: string;
}

export function DealHistorySection({ companyId, currentDealId }: DealHistorySectionProps) {
  const [history, setHistory] = useState<DealHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [companyId]);

  const loadHistory = async () => {
    // Get all deals for this company
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select(`
        id,
        tracker_id,
        status,
        created_at,
        industry_trackers:tracker_id (industry_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (dealsError || !deals) {
      setIsLoading(false);
      return;
    }

    // Get buyer stats for each deal
    const historyWithStats = await Promise.all(
      deals.map(async (deal: any) => {
        const { data: scores } = await supabase
          .from('buyer_deal_scores')
          .select('interested, passed_on_deal')
          .eq('deal_id', deal.id);

        const stats = {
          total: scores?.length || 0,
          interested: scores?.filter((s) => s.interested === true).length || 0,
          passed: scores?.filter((s) => s.passed_on_deal === true).length || 0,
          pending: scores?.filter((s) => !s.interested && !s.passed_on_deal).length || 0,
        };

        return {
          id: deal.id,
          tracker_id: deal.tracker_id,
          tracker_name: deal.industry_trackers?.industry_name || 'Unknown',
          status: deal.status,
          created_at: deal.created_at,
          buyer_stats: stats,
        };
      })
    );

    setHistory(historyWithStats);
    setIsLoading(false);
  };

  // Filter out current deal
  const otherDeals = history.filter((h) => h.id !== currentDealId);

  if (isLoading) {
    return null;
  }

  if (otherDeals.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Other Buyer Universes</h3>
        <Badge variant="secondary" className="ml-auto">{otherDeals.length}</Badge>
      </div>

      <div className="space-y-3">
        {otherDeals.map((deal) => (
          <Link
            key={deal.id}
            to={`/deals/${deal.id}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{deal.tracker_name}</span>
                <Badge 
                  variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}
                  className="text-xs"
                >
                  {deal.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(deal.created_at), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {deal.buyer_stats.total} buyers
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                {deal.buyer_stats.interested > 0 && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    {deal.buyer_stats.interested}
                  </span>
                )}
                {deal.buyer_stats.passed > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="w-4 h-4" />
                    {deal.buyer_stats.passed}
                  </span>
                )}
                {deal.buyer_stats.pending > 0 && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Clock className="w-4 h-4" />
                    {deal.buyer_stats.pending}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
