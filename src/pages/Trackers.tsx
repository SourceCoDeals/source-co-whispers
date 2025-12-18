import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Loader2, Sparkles, Users, FileText, ArrowUpDown, Archive, ArchiveRestore } from "lucide-react";
import { IntelligenceCoverageBar } from "@/components/IntelligenceBadge";
import { getIntelligenceCoverage } from "@/lib/types";
import { seedSampleData } from "@/lib/seedData";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Trackers() {
  const [trackers, setTrackers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
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

  const handleArchiveToggle = async (e: React.MouseEvent, trackerId: string, currentArchived: boolean) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("industry_trackers")
      .update({ archived: !currentArchived })
      .eq("id", trackerId);
    
    if (error) {
      toast({ title: "Error", description: "Failed to update archive status", variant: "destructive" });
    } else {
      toast({ title: currentArchived ? "Universe restored" : "Universe archived" });
      loadTrackers();
    }
  };

  const filteredTrackers = trackers.filter(t => showArchived ? t.archived : !t.archived);
  const archivedCount = trackers.filter(t => t.archived).length;

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

        {archivedCount > 0 && (
          <div className="flex items-center gap-2">
            <Switch 
              id="show-archived" 
              checked={showArchived} 
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">
              Show archived ({archivedCount})
            </Label>
          </div>
        )}
        
        {filteredTrackers.length === 0 ? (
          <div className="bg-card rounded-lg border p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{showArchived ? "No archived universes" : "No buyer universes yet"}</h3>
            <p className="text-muted-foreground mb-4">
              {showArchived ? "Archived universes will appear here." : "Create your first universe to start building institutional memory."}
            </p>
            {!showArchived && (
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
                  {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Load Sample Data
                </Button>
                <Button onClick={() => navigate("/trackers/new")}><Plus className="w-4 h-4 mr-2" />Create Universe</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">
                    <div className="flex items-center gap-1">
                      Industry <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Buyers
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Deals
                    </div>
                  </TableHead>
                  <TableHead className="w-[200px]">Intelligence Coverage</TableHead>
                  <TableHead className="w-[120px] text-center">Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrackers.map((t) => {
                  const intelligencePercent = t.buyer_count > 0 ? Math.round((t.intelligent_count / t.buyer_count) * 100) : 0;
                  return (
                    <TableRow 
                      key={t.id} 
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/trackers/${t.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-accent" />
                          {t.industry_name}
                          {t.archived && <Badge variant="outline" className="ml-2 text-xs">Archived</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{t.buyer_count}</TableCell>
                      <TableCell className="text-center">{t.deal_count}</TableCell>
                      <TableCell>
                        <IntelligenceCoverageBar intelligentCount={t.intelligent_count} totalCount={t.buyer_count} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={intelligencePercent >= 70 ? "success" : intelligencePercent >= 40 ? "secondary" : "outline"}>
                          {intelligencePercent}% intel
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => handleArchiveToggle(e, t.id, t.archived)}
                          title={t.archived ? "Restore" : "Archive"}
                        >
                          {t.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}