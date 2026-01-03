import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/StatCard";
import { IntelligenceCoverageBar } from "@/components/IntelligenceBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  FileText, 
  Users, 
  Brain, 
  TrendingUp, 
  Plus,
  ArrowRight,
  Loader2,
  Sparkles
} from "lucide-react";
import { getIntelligenceCoverage } from "@/lib/types";
import { seedSampleData } from "@/lib/seedData";
import { useToast } from "@/hooks/use-toast";
import { TimeframeFilter, TimeframeOption, getDateRange } from "@/components/TimeframeFilter";
import { RecentActivityFeed } from "@/components/RecentActivityFeed";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { PipelineFunnel } from "@/components/dashboard/PipelineFunnel";
import { DealActivityChart } from "@/components/dashboard/DealActivityChart";
import { ConversionMetrics } from "@/components/dashboard/ConversionMetrics";
import { ScoreDistribution } from "@/components/dashboard/ScoreDistribution";

interface TrackerWithStats {
  id: string;
  industry_name: string;
  buyer_count: number;
  deal_count: number;
  intelligent_buyer_count: number;
}

export default function Dashboard() {
  const [trackers, setTrackers] = useState<TrackerWithStats[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('week');
  const [filteredStats, setFilteredStats] = useState({ buyers: 0, deals: 0, scores: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use the new metrics hook
  const metrics = useDashboardMetrics(timeframe);

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const { start } = getDateRange(timeframe);
      const startDate = start?.toISOString();

      const { data: trackersData, error: trackersError } = await supabase
        .from("industry_trackers")
        .select("*")
        .eq("archived", false)
        .order("updated_at", { ascending: false });

      if (trackersError) throw trackersError;

      const trackersWithStats: TrackerWithStats[] = await Promise.all(
        (trackersData || []).map(async (tracker) => {
          const [buyersResult, dealsResult] = await Promise.all([
            supabase.from("buyers").select("*").eq("tracker_id", tracker.id),
            supabase.from("deals").select("id").eq("tracker_id", tracker.id),
          ]);

          const buyers = buyersResult.data || [];
          const intelligentBuyers = buyers.filter(
            (b) => getIntelligenceCoverage(b as any) !== "low"
          );

          return {
            ...tracker,
            buyer_count: buyers.length,
            deal_count: dealsResult.data?.length || 0,
            intelligent_buyer_count: intelligentBuyers.length,
          };
        })
      );

      setTrackers(trackersWithStats);

      // Load filtered stats for timeframe
      const filteredQueries = [];
      
      let buyersQuery = supabase.from("buyers").select("id", { count: "exact", head: true });
      if (startDate) buyersQuery = buyersQuery.gte("created_at", startDate);
      filteredQueries.push(buyersQuery);

      let dealsQuery = supabase.from("deals").select("id", { count: "exact", head: true });
      if (startDate) dealsQuery = dealsQuery.gte("created_at", startDate);
      filteredQueries.push(dealsQuery);

      let scoresQuery = supabase.from("buyer_deal_scores").select("id", { count: "exact", head: true });
      if (startDate) scoresQuery = scoresQuery.gte("scored_at", startDate);
      filteredQueries.push(scoresQuery);

      const [buyersCount, dealsCount, scoresCount] = await Promise.all(filteredQueries);

      setFilteredStats({
        buyers: buyersCount.count || 0,
        deals: dealsCount.count || 0,
        scores: scoresCount.count || 0,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedSampleData();
      toast({ title: "Sample data loaded!", description: "Residential HVAC buyer universe created with 29 buyers." });
      loadDashboardData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  const totalBuyers = trackers.reduce((sum, t) => sum + t.buyer_count, 0);
  const totalDeals = trackers.reduce((sum, t) => sum + t.deal_count, 0);
  const totalIntelligent = trackers.reduce((sum, t) => sum + t.intelligent_buyer_count, 0);
  const avgCoverage = totalBuyers > 0 ? Math.round((totalIntelligent / totalBuyers) * 100) : 0;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Building institutional memory for M&A. Every deal makes the next one better.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TimeframeFilter value={timeframe} onChange={setTimeframe} />
            {trackers.length === 0 && (
              <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
                {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Load Sample Data
              </Button>
            )}
            <Button onClick={() => navigate("/trackers/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Buyer Universe
            </Button>
          </div>
        </div>

        {/* Stats Grid with Sparklines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Buyer Universes"
            value={trackers.length}
            subtitle="Active industry verticals"
            icon={Building2}
          />
          <StatCard
            title="New Buyers"
            value={filteredStats.buyers}
            subtitle={`${totalBuyers} total`}
            icon={Users}
            sparklineData={metrics.sparklines.buyers}
          />
          <StatCard
            title="Deals Processed"
            value={filteredStats.deals}
            subtitle={`${totalDeals} total`}
            icon={FileText}
            sparklineData={metrics.sparklines.deals}
          />
          <StatCard
            title="Intelligence Coverage"
            value={`${avgCoverage}%`}
            subtitle={`${totalIntelligent} buyers with data`}
            icon={Brain}
            variant={avgCoverage >= 70 ? "success" : avgCoverage >= 40 ? "warning" : "default"}
          />
        </div>

        {/* Pipeline Funnel */}
        <PipelineFunnel stages={metrics.pipeline} />

        {/* Conversion Metrics */}
        <ConversionMetrics conversions={metrics.conversions} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DealActivityChart data={metrics.timeSeries} className="lg:col-span-2" />
          <ScoreDistribution data={metrics.scoreDistribution} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Buyer Universes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Buyer Universes</h2>
              <Link 
                to="/trackers" 
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {trackers.length === 0 ? (
              <div className="bg-card rounded-lg border p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No buyer universes yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first buyer universe or load sample data to get started.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
                    {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Load Sample Data
                  </Button>
                  <Button onClick={() => navigate("/trackers/new")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Universe
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {trackers.slice(0, 4).map((tracker) => {
                  const coverage = tracker.buyer_count > 0 
                    ? Math.round((tracker.intelligent_buyer_count / tracker.buyer_count) * 100) 
                    : 0;
                  
                  return (
                    <Link
                      key={tracker.id}
                      to={`/trackers/${tracker.id}`}
                      className="bg-card rounded-lg border p-5 hover:border-accent/50 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{tracker.industry_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{tracker.buyer_count} buyers</span>
                            <span>{tracker.deal_count} deals</span>
                          </div>
                        </div>
                        <Badge 
                          variant={coverage >= 75 ? "success" : coverage >= 50 ? "warning" : "secondary"}
                        >
                          {coverage}% intelligent
                        </Badge>
                      </div>
                      <div className="mt-4">
                        <IntelligenceCoverageBar 
                          intelligentCount={tracker.intelligent_buyer_count}
                          totalCount={tracker.buyer_count}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <div className="bg-card rounded-lg border p-5">
              <RecentActivityFeed timeframe={timeframe} />
            </div>

            {/* Quick Tips */}
            <div className="bg-accent/10 rounded-lg border border-accent/20 p-5">
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-accent" />
                Improving Match Quality
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">•</span>
                  Capture buyer intelligence after every call
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">•</span>
                  Update thesis data when buyers share preferences
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent font-bold">•</span>
                  Track introduction outcomes to validate matching
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
