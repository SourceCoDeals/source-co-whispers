import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CSVImport } from "@/components/CSVImport";
import { Loader2, Plus, ArrowLeft, Search, FileText, Users, ExternalLink, Building2, ArrowUpDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TrackerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tracker, setTracker] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newBuyer, setNewBuyer] = useState({ pe_firm_name: "", pe_firm_website: "", platform_company_name: "", platform_website: "" });
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
    setNewBuyer({ pe_firm_name: "", pe_firm_website: "", platform_company_name: "", platform_website: "" });
    setDialogOpen(false);
    loadData();
  };

  const filteredBuyers = buyers.filter((b) => 
    b.pe_firm_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.platform_company_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getWebsiteUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const getHQ = (buyer: any) => {
    if (buyer.hq_city && buyer.hq_state) return `${buyer.hq_city}, ${buyer.hq_state}`;
    if (buyer.hq_state) return buyer.hq_state;
    if (buyer.hq_city) return buyer.hq_city;
    return null;
  };

  const getDescription = (buyer: any) => {
    return buyer.services_offered || buyer.business_summary || null;
  };

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
              <CSVImport trackerId={id!} onComplete={loadData} />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Buyer</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Buyer</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div><Label>PE Firm Name *</Label><Input value={newBuyer.pe_firm_name} onChange={(e) => setNewBuyer({ ...newBuyer, pe_firm_name: e.target.value })} placeholder="e.g., Blackstone" className="mt-1" /></div>
                    <div><Label>PE Firm Website</Label><Input value={newBuyer.pe_firm_website} onChange={(e) => setNewBuyer({ ...newBuyer, pe_firm_website: e.target.value })} placeholder="e.g., https://blackstone.com" className="mt-1" /></div>
                    <div><Label>Platform Company</Label><Input value={newBuyer.platform_company_name} onChange={(e) => setNewBuyer({ ...newBuyer, platform_company_name: e.target.value })} placeholder="e.g., ABC Services" className="mt-1" /></div>
                    <div><Label>Platform Company Website</Label><Input value={newBuyer.platform_website} onChange={(e) => setNewBuyer({ ...newBuyer, platform_website: e.target.value })} placeholder="e.g., https://abcservices.com" className="mt-1" /></div>
                    <Button onClick={addBuyer} disabled={!newBuyer.pe_firm_name.trim()} className="w-full">Add Buyer</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="bg-card rounded-lg border overflow-hidden">
              {filteredBuyers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {search ? "No buyers match your search" : "No buyers yet. Add buyers manually or import from CSV."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[220px]">
                        <div className="flex items-center gap-1">Platform Company <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></div>
                      </TableHead>
                      <TableHead className="w-[180px]">
                        <div className="flex items-center gap-1">PE Firm <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></div>
                      </TableHead>
                      <TableHead className="w-[300px]">Description</TableHead>
                      <TableHead className="w-[120px] text-center">Intelligence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBuyers.map((buyer) => (
                      <TableRow 
                        key={buyer.id} 
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => navigate(`/buyers/${buyer.id}`)}
                      >
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              {buyer.platform_website ? (
                                <a 
                                  href={getWebsiteUrl(buyer.platform_website)!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {buyer.platform_company_name || "—"}
                                </a>
                              ) : (
                                <span className="font-medium">{buyer.platform_company_name || "—"}</span>
                              )}
                            </div>
                            {getHQ(buyer) && (
                              <span className="text-xs text-muted-foreground">{getHQ(buyer)}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {buyer.pe_firm_website ? (
                              <a 
                                href={getWebsiteUrl(buyer.pe_firm_website)!} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:underline"
                              >
                                {buyer.pe_firm_name}
                              </a>
                            ) : (
                              <span>{buyer.pe_firm_name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-3">{getDescription(buyer) || "—"}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <IntelligenceBadge buyer={buyer} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
