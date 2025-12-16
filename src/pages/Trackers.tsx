import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Loader2, Sparkles } from "lucide-react";
import { IntelligenceCoverageBar } from "@/components/IntelligenceBadge";
import { getIntelligenceCoverage } from "@/lib/types";
import { seedSampleData } from "@/lib/seedData";
import { useToast } from "@/hooks/use-toast";

export default function Trackers() {
  const [trackers, setTrackers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadTrackers();
  }, []);

  const loadTrackers = async () => {
    const { data: trackersData } = await supabase
      .from("industry_trackers")
      .select("*")
      .order("updated_at", { ascending: false });

    const withStats = await Promise.all(
      (trackersData || []).map(async (tracker) => {
        const [buyersRes, dealsRes] = await Promise.all([
          supabase.from("buyers").select("*").eq("tracker_id", tracker.id),
          supabase.from("deals").select("id").eq("tracker_id", tracker.id),
        ]);
        const buyers = buyersRes.data || [];
        const intelligent = buyers.filter((b) => getIntelligenceCoverage(b as any) !== "low").length;
        return { ...tracker, buyer_count: buyers.length, deal_count: dealsRes.data?.length || 0, intelligent_count: intelligent };
      })
    );
    setTrackers(withStats);
    setIsLoading(false);
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedSampleData();
      toast({ title: "Sample data loaded!", description: "Residential HVAC buyer universe created with 27 buyers." });
      loadTrackers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Buyer Universes</h1>
            <p className="text-muted-foreground">Manage your curated buyer universes per industry vertical</p>
          </div>
          <div className="flex gap-3">
            {trackers.length === 0 && (
              <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
                {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Load Sample Data
              </Button>
            )}
            <Button onClick={() => navigate("/trackers/new")}><Plus className="w-4 h-4 mr-2" />New Buyer Universe</Button>
          </div>
        </div>
        
        {trackers.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No buyer universes yet</h3>
            <p className="text-muted-foreground mb-4">Create your first universe to start building institutional memory.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
                {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Load Sample Data
              </Button>
              <Button onClick={() => navigate("/trackers/new")}><Plus className="w-4 h-4 mr-2" />Create Universe</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {trackers.map((t) => (
              <Link key={t.id} to={`/trackers/${t.id}`} className="bg-card rounded-lg border p-5 hover:shadow-md hover:border-accent/50 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold">{t.industry_name}</h3>
                  <Badge variant={t.intelligent_count / t.buyer_count >= 0.7 ? "success" : "secondary"}>
                    {t.buyer_count > 0 ? Math.round((t.intelligent_count / t.buyer_count) * 100) : 0}% intelligent
                  </Badge>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                  <span>{t.buyer_count} buyers</span>
                  <span>{t.deal_count} deals</span>
                </div>
                <IntelligenceCoverageBar intelligentCount={t.intelligent_count} totalCount={t.buyer_count} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
