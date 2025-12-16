import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";

export default function AllDeals() {
  const [deals, setDeals] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    const [dealsRes, trackersRes] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("industry_trackers").select("id, industry_name"),
    ]);
    
    setDeals(dealsRes.data || []);
    const trackerMap: Record<string, string> = {};
    (trackersRes.data || []).forEach((t) => { trackerMap[t.id] = t.industry_name; });
    setTrackers(trackerMap);
    setIsLoading(false);
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">All Deals</h1>
          <p className="text-muted-foreground">View all deals across all buyer universes</p>
        </div>

        {deals.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No deals yet</h3>
            <p className="text-muted-foreground">List a deal in a buyer universe to get started.</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border divide-y">
            {deals.map((deal) => (
              <Link key={deal.id} to={`/deals/${deal.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium">{deal.deal_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {trackers[deal.tracker_id] || "Unknown"} · {deal.geography?.join(", ")} · ${deal.revenue}M
                  </p>
                </div>
                <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>{deal.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
