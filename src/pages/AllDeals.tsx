import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, FileText, ChevronRight, MoreHorizontal, Archive, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AllDeals() {
  const [deals, setDeals] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    const [dealsRes, trackersRes] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("industry_trackers").select("*"),
    ]);
    
    setDeals(dealsRes.data || []);
    const trackerMap: Record<string, any> = {};
    (trackersRes.data || []).forEach((t) => { trackerMap[t.id] = t; });
    setTrackers(trackerMap);
    setIsLoading(false);
  };

  const archiveDeal = async (e: React.MouseEvent, dealId: string, dealName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { error } = await supabase.from("deals").update({ status: "Archived" }).eq("id", dealId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deal archived", description: `${dealName} has been archived` });
    loadDeals();
  };

  const deleteDeal = async (e: React.MouseEvent, dealId: string, dealName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${dealName}"? This cannot be undone.`)) return;
    
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deal deleted", description: `${dealName} has been deleted` });
    loadDeals();
  };

  // Group deals by industry
  const dealsByIndustry = deals.reduce((acc, deal) => {
    const trackerId = deal.tracker_id;
    if (!acc[trackerId]) acc[trackerId] = [];
    acc[trackerId].push(deal);
    return acc;
  }, {} as Record<string, any[]>);

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">All Deals</h1>
          <p className="text-muted-foreground">{deals.length} deals across {Object.keys(dealsByIndustry).length} industries</p>
        </div>

        {deals.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No deals yet</h3>
            <p className="text-muted-foreground">List a deal in a buyer universe to get started.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(dealsByIndustry).map(([trackerId, industryDeals]: [string, any[]]) => {
              const tracker = trackers[trackerId];
              return (
                <div key={trackerId} className="bg-card rounded-lg border overflow-hidden">
                  <Link 
                    to={`/trackers/${trackerId}`} 
                    className="flex items-center justify-between p-4 bg-muted/30 border-b hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <h2 className="font-semibold">{tracker?.industry_name || "Unknown Industry"}</h2>
                      <p className="text-sm text-muted-foreground">{industryDeals.length} deal{industryDeals.length !== 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                  <div className="divide-y">
                    {industryDeals.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                        <Link to={`/deals/${deal.id}`} className="flex-1 min-w-0">
                          <p className="font-medium">{deal.deal_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {deal.geography?.join(", ") || "—"} · {deal.revenue ? `$${deal.revenue}M` : "—"} {deal.ebitda_percentage ? `· ${deal.ebitda_percentage}% EBITDA` : ""}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>{deal.status}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => archiveDeal(e, deal.id, deal.deal_name)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => deleteDeal(e, deal.id, deal.deal_name)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}