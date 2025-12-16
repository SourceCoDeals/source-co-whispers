import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Users } from "lucide-react";

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<any>(null);
  const [tracker, setTracker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const { data: dealData } = await supabase.from("deals").select("*").eq("id", id).single();
    setDeal(dealData);
    if (dealData) {
      const { data: trackerData } = await supabase.from("industry_trackers").select("*").eq("id", dealData.tracker_id).single();
      setTracker(trackerData);
    }
    setIsLoading(false);
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!deal) return <AppLayout><div className="text-center py-12">Deal not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{deal.deal_name}</h1>
            <p className="text-muted-foreground">{tracker?.industry_name}</p>
          </div>
          <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>{deal.status}</Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Deal Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {deal.geography?.length > 0 && <div><p className="text-muted-foreground">Geography</p><p className="font-medium">{deal.geography.join(", ")}</p></div>}
              {deal.revenue && <div><p className="text-muted-foreground">Revenue</p><p className="font-medium">${deal.revenue}M</p></div>}
              {deal.ebitda_percentage && <div><p className="text-muted-foreground">EBITDA</p><p className="font-medium">{deal.ebitda_percentage}%</p></div>}
              {deal.business_model && <div><p className="text-muted-foreground">Business Model</p><p className="font-medium">{deal.business_model}</p></div>}
            </div>
            {deal.service_mix && <div><p className="text-sm text-muted-foreground">Service Mix</p><p>{deal.service_mix}</p></div>}
          </div>

          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Actions</h2>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => navigate(`/deals/${id}/matching`)}><Users className="w-4 h-4 mr-2" />View Buyer Matches</Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/deals/${id}/introductions`)}>Track Introductions</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
