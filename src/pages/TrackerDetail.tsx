import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BuyerCard } from "@/components/BuyerCard";
import { CSVImport } from "@/components/CSVImport";
import { Loader2, Plus, ArrowLeft, Search, FileText, Users, LayoutGrid, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function TrackerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tracker, setTracker] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [buyerView, setBuyerView] = useState<"compact" | "expanded">("compact");
  const [newBuyer, setNewBuyer] = useState({ pe_firm_name: "", platform_company_name: "" });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [trackerRes, buyersRes, dealsRes] = await Promise.all([
      supabase.from("industry_trackers").select("*").eq("id", id).single(),
      supabase.from("buyers").select("*").eq("tracker_id", id).order("pe_firm_name"),
      supabase.from("deals").select("*").eq("tracker_id", id).order("created_at", { ascending: false }),
    ]);
    setTracker(trackerRes.data);
    setBuyers(buyersRes.data || []);
    setDeals(dealsRes.data || []);
    setIsLoading(false);
  };

  const addBuyer = async () => {
    if (!newBuyer.pe_firm_name.trim()) return;
    const { error } = await supabase.from("buyers").insert({ tracker_id: id, ...newBuyer });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Buyer added" });
    setNewBuyer({ pe_firm_name: "", platform_company_name: "" });
    setDialogOpen(false);
    loadData();
  };

  const filteredBuyers = buyers.filter((b) => 
    b.pe_firm_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.platform_company_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!tracker) return <AppLayout><div className="text-center py-12">Tracker not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/trackers")}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{tracker.industry_name}</h1>
            <p className="text-muted-foreground">{buyers.length} buyers · {deals.length} deals</p>
          </div>
          <Button onClick={() => navigate(`/trackers/${id}/deals/new`)}><Plus className="w-4 h-4 mr-2" />List New Deal</Button>
        </div>

        <Tabs defaultValue="buyers">
          <TabsList><TabsTrigger value="buyers"><Users className="w-4 h-4 mr-2" />Buyers ({buyers.length})</TabsTrigger><TabsTrigger value="deals"><FileText className="w-4 h-4 mr-2" />Deals ({deals.length})</TabsTrigger></TabsList>
          
          <TabsContent value="buyers" className="mt-4 space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search buyers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <ToggleGroup type="single" value={buyerView} onValueChange={(v) => v && setBuyerView(v as "compact" | "expanded")}>
                <ToggleGroupItem value="compact" aria-label="Compact view"><List className="w-4 h-4" /></ToggleGroupItem>
                <ToggleGroupItem value="expanded" aria-label="Expanded view"><LayoutGrid className="w-4 h-4" /></ToggleGroupItem>
              </ToggleGroup>
              <CSVImport trackerId={id!} onComplete={loadData} />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Buyer</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Buyer</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div><Label>PE Firm Name *</Label><Input value={newBuyer.pe_firm_name} onChange={(e) => setNewBuyer({ ...newBuyer, pe_firm_name: e.target.value })} placeholder="e.g., Blackstone" className="mt-1" /></div>
                    <div><Label>Platform Company</Label><Input value={newBuyer.platform_company_name} onChange={(e) => setNewBuyer({ ...newBuyer, platform_company_name: e.target.value })} placeholder="e.g., ABC Services" className="mt-1" /></div>
                    <Button onClick={addBuyer} disabled={!newBuyer.pe_firm_name.trim()} className="w-full">Add Buyer</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="bg-card rounded-lg border">
              {filteredBuyers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {search ? "No buyers match your search" : "No buyers yet. Add buyers manually or import from CSV."}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredBuyers.map((buyer) => (
                    <BuyerCard key={buyer.id} buyer={buyer} view={buyerView} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="deals" className="mt-4 space-y-4">
            <div className="bg-card rounded-lg border divide-y">
              {deals.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No deals yet. List a deal to match it with buyers.</div>
              ) : deals.map((deal) => (
                <Link key={deal.id} to={`/deals/${deal.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{deal.deal_name}</p>
                    <p className="text-sm text-muted-foreground">{deal.geography?.join(", ")} · ${deal.revenue}M · {deal.ebitda_percentage}% EBITDA</p>
                  </div>
                  <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>{deal.status}</Badge>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
