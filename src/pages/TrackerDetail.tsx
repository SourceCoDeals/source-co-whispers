import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CSVImport } from "@/components/CSVImport";
import { StructuredCriteriaPanel } from "@/components/StructuredCriteriaPanel";
import { Loader2, Plus, ArrowLeft, Search, FileText, Users, ExternalLink, Building2, ArrowUpDown, Trash2, MapPin, Sparkles, Archive, Pencil, Check, X, Info, Wand2, DollarSign, Briefcase } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [enrichingBuyers, setEnrichingBuyers] = useState<Set<string>>(new Set());
  const [isBulkEnriching, setIsBulkEnriching] = useState(false);
  const [isEditingFitCriteria, setIsEditingFitCriteria] = useState(false);
  const [editedSizeCriteria, setEditedSizeCriteria] = useState("");
  const [editedServiceCriteria, setEditedServiceCriteria] = useState("");
  const [editedGeographyCriteria, setEditedGeographyCriteria] = useState("");
  const [isSavingFitCriteria, setIsSavingFitCriteria] = useState(false);
  const [isParsingCriteria, setIsParsingCriteria] = useState(false);

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

  const deleteBuyer = async (buyerId: string, buyerName: string) => {
    const { error } = await supabase.from("buyers").delete().eq("id", buyerId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Buyer deleted", description: `${buyerName} has been removed` });
    loadData();
  };

  const deleteDeal = async (dealId: string, dealName: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deal deleted", description: `${dealName} has been removed` });
    loadData();
  };

  const archiveDeal = async (dealId: string, dealName: string) => {
    const { error } = await supabase.from("deals").update({ status: "Archived" }).eq("id", dealId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deal archived", description: `${dealName} has been archived` });
    loadData();
  };

  const enrichBuyer = async (buyerId: string, buyerName: string) => {
    setEnrichingBuyers(prev => new Set(prev).add(buyerId));
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-buyer', {
        body: { buyerId }
      });

      if (error) {
        toast({ 
          title: "Enrichment failed", 
          description: error.message, 
          variant: "destructive" 
        });
        return;
      }

      if (!data.success) {
        toast({ 
          title: "Enrichment failed", 
          description: data.error || "Unknown error", 
          variant: "destructive" 
        });
        return;
      }

      toast({ 
        title: "Buyer enriched", 
        description: `${buyerName}: ${data.message}` 
      });
      
      await loadData();
    } catch (err) {
      toast({ 
        title: "Enrichment failed", 
        description: err instanceof Error ? err.message : "Unknown error", 
        variant: "destructive" 
      });
    } finally {
      setEnrichingBuyers(prev => {
        const next = new Set(prev);
        next.delete(buyerId);
        return next;
      });
    }
  };

  const enrichAllBuyers = async () => {
    const buyersWithWebsites = buyers.filter(b => b.platform_website || b.pe_firm_website);
    
    if (buyersWithWebsites.length === 0) {
      toast({ 
        title: "No websites to scrape", 
        description: "Add website URLs to buyers first", 
        variant: "destructive" 
      });
      return;
    }

    setIsBulkEnriching(true);
    let successCount = 0;
    let errorCount = 0;

    for (const buyer of buyersWithWebsites) {
      setEnrichingBuyers(prev => new Set(prev).add(buyer.id));
      
      try {
        const { data, error } = await supabase.functions.invoke('enrich-buyer', {
          body: { buyerId: buyer.id }
        });

        if (error || !data?.success) {
          errorCount++;
        } else {
          successCount++;
        }
      } catch {
        errorCount++;
      }
      
      setEnrichingBuyers(prev => {
        const next = new Set(prev);
        next.delete(buyer.id);
        return next;
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsBulkEnriching(false);
    await loadData();

    toast({ 
      title: "Bulk enrichment complete", 
      description: `${successCount} enriched, ${errorCount} failed` 
    });
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
    return buyer.business_summary || buyer.services_offered || null;
  };

  const hasWebsite = (buyer: any) => buyer.platform_website || buyer.pe_firm_website;
  
  const isRecentlyEnriched = (buyer: any) => {
    if (!buyer.data_last_updated) return false;
    const lastUpdated = new Date(buyer.data_last_updated);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastUpdated > hourAgo;
  };

  const startEditingFitCriteria = () => {
    setEditedSizeCriteria(tracker?.fit_criteria_size || "");
    setEditedServiceCriteria(tracker?.fit_criteria_service || "");
    setEditedGeographyCriteria(tracker?.fit_criteria_geography || "");
    setIsEditingFitCriteria(true);
  };

  const cancelEditingFitCriteria = () => {
    setIsEditingFitCriteria(false);
    setEditedSizeCriteria("");
    setEditedServiceCriteria("");
    setEditedGeographyCriteria("");
  };

  const saveFitCriteria = async () => {
    setIsSavingFitCriteria(true);
    const { error } = await supabase
      .from("industry_trackers")
      .update({ 
        fit_criteria_size: editedSizeCriteria,
        fit_criteria_service: editedServiceCriteria,
        fit_criteria_geography: editedGeographyCriteria,
        updated_at: new Date().toISOString() 
      })
      .eq("id", id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to save fit criteria", variant: "destructive" });
    } else {
      toast({ title: "Fit criteria updated" });
      setTracker({ 
        ...tracker, 
        fit_criteria_size: editedSizeCriteria,
        fit_criteria_service: editedServiceCriteria,
        fit_criteria_geography: editedGeographyCriteria
      });
      setIsEditingFitCriteria(false);
    }
    setIsSavingFitCriteria(false);
  };

  const parseFitCriteria = async () => {
    // Use the original fit_criteria text if structured fields are empty, otherwise combine structured fields
    let criteriaText = tracker?.fit_criteria || '';
    
    if (isEditingFitCriteria) {
      criteriaText = `Size Criteria: ${editedSizeCriteria}\n\nService/Product Criteria: ${editedServiceCriteria}\n\nGeography Criteria: ${editedGeographyCriteria}`;
    } else if (tracker?.fit_criteria_size || tracker?.fit_criteria_service || tracker?.fit_criteria_geography) {
      criteriaText = `Size Criteria: ${tracker?.fit_criteria_size || ''}\n\nService/Product Criteria: ${tracker?.fit_criteria_service || ''}\n\nGeography Criteria: ${tracker?.fit_criteria_geography || ''}`;
    }
    
    if (!criteriaText.trim() || criteriaText === 'Size Criteria: \n\nService/Product Criteria: \n\nGeography Criteria: ') {
      toast({ title: "No criteria to parse", description: "Please add fit criteria text first", variant: "destructive" });
      return;
    }

    setIsParsingCriteria(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-fit-criteria', {
        body: { fit_criteria: criteriaText }
      });

      if (error) {
        toast({ title: "Parsing failed", description: error.message, variant: "destructive" });
        return;
      }

      if (!data.success) {
        toast({ title: "Parsing failed", description: data.error || "Unknown error", variant: "destructive" });
        return;
      }

      // Update the tracker with structured criteria
      const { error: updateError } = await supabase
        .from("industry_trackers")
        .update({
          size_criteria: data.size_criteria,
          service_criteria: data.service_criteria,
          geography_criteria: data.geography_criteria,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateError) {
        toast({ title: "Failed to save", description: updateError.message, variant: "destructive" });
        return;
      }

      setTracker({
        ...tracker,
        size_criteria: data.size_criteria,
        service_criteria: data.service_criteria,
        geography_criteria: data.geography_criteria
      });

      toast({ title: "Criteria parsed", description: "Structured criteria extracted successfully" });
    } catch (err) {
      toast({ title: "Parsing failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsParsingCriteria(false);
    }
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

        {/* Fit Criteria Section */}
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Buyer Fit Criteria</h3>
            </div>
            {!isEditingFitCriteria && (
              <Button variant="ghost" size="sm" onClick={startEditingFitCriteria}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
          
          {isEditingFitCriteria ? (
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    Size Criteria
                  </Label>
                  <Textarea
                    value={editedSizeCriteria}
                    onChange={(e) => setEditedSizeCriteria(e.target.value)}
                    placeholder="Revenue thresholds, EBITDA ranges, employee count, location count, sq ft requirements..."
                    className="min-h-[100px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    Service/Product Mix
                  </Label>
                  <Textarea
                    value={editedServiceCriteria}
                    onChange={(e) => setEditedServiceCriteria(e.target.value)}
                    placeholder="Required services, preferred capabilities, excluded services, business model preferences..."
                    className="min-h-[100px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Geography
                  </Label>
                  <Textarea
                    value={editedGeographyCriteria}
                    onChange={(e) => setEditedGeographyCriteria(e.target.value)}
                    placeholder="Target regions, excluded areas, coverage type, HQ requirements..."
                    className="min-h-[100px] text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={cancelEditingFitCriteria} disabled={isSavingFitCriteria || isParsingCriteria}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button variant="outline" size="sm" onClick={parseFitCriteria} disabled={isParsingCriteria || isSavingFitCriteria}>
                  {isParsingCriteria ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  Parse Criteria
                </Button>
                <Button size="sm" onClick={saveFitCriteria} disabled={isSavingFitCriteria || isParsingCriteria}>
                  {isSavingFitCriteria ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {(tracker.fit_criteria_size || tracker.fit_criteria_service || tracker.fit_criteria_geography) ? (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {tracker.fit_criteria_size && (
                    <div className="bg-muted/30 rounded-lg p-3 border">
                      <div className="flex items-center gap-1.5 mb-2">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium">Size</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria_size}</p>
                    </div>
                  )}
                  {tracker.fit_criteria_service && (
                    <div className="bg-muted/30 rounded-lg p-3 border">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Briefcase className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium">Service/Product Mix</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria_service}</p>
                    </div>
                  )}
                  {tracker.fit_criteria_geography && (
                    <div className="bg-muted/30 rounded-lg p-3 border">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium">Geography</span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria_geography}</p>
                    </div>
                  )}
                </div>
              ) : tracker.fit_criteria ? (
                <div className="mt-3">
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tracker.fit_criteria}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={parseFitCriteria} disabled={isParsingCriteria}>
                      {isParsingCriteria ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5 mr-1" />
                      )}
                      Parse into Structured Criteria
                    </Button>
                    <span className="text-xs text-muted-foreground">Extract size, service, and geography details</span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground italic">
                  No fit criteria defined. Click Edit to add criteria that will guide buyer matching.
                </p>
              )}
              <StructuredCriteriaPanel
                sizeCriteria={tracker.size_criteria}
                serviceCriteria={tracker.service_criteria}
                geographyCriteria={tracker.geography_criteria}
              />
            </>
          )}
        </div>

        <Tabs defaultValue="buyers">
          <TabsList><TabsTrigger value="buyers"><Users className="w-4 h-4 mr-2" />Buyers ({buyers.length})</TabsTrigger><TabsTrigger value="deals"><FileText className="w-4 h-4 mr-2" />Deals ({deals.length})</TabsTrigger></TabsList>
          
          <TabsContent value="buyers" className="mt-4 space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search buyers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      onClick={enrichAllBuyers}
                      disabled={isBulkEnriching || buyers.filter(hasWebsite).length === 0}
                    >
                      {isBulkEnriching ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Enrich All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Scrape websites and extract data for all buyers</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                      <TableHead className="w-[100px]"></TableHead>
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
                              <span className="font-medium">{buyer.platform_company_name || buyer.pe_firm_name}</span>
                              {buyer.platform_website ? (
                                <a 
                                  href={getWebsiteUrl(buyer.platform_website)!} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary hover:text-primary/80"
                                  title="Visit website"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground/40" title="Website not set">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {isRecentlyEnriched(buyer) && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Enriched
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {getHQ(buyer) || <span className="italic">Location not set</span>}
                            </span>
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
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {buyer.pe_firm_name}
                                <ExternalLink className="w-3 h-3" />
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
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      enrichBuyer(buyer.id, buyer.platform_company_name || buyer.pe_firm_name);
                                    }}
                                    disabled={enrichingBuyers.has(buyer.id) || !hasWebsite(buyer)}
                                  >
                                    {enrichingBuyers.has(buyer.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{hasWebsite(buyer) ? "Enrich with AI" : "No website to scrape"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Buyer</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {buyer.platform_company_name || buyer.pe_firm_name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteBuyer(buyer.id, buyer.platform_company_name || buyer.pe_firm_name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
                <div key={deal.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <Link to={`/deals/${deal.id}`} className="flex-1">
                    <p className="font-medium">{deal.deal_name}</p>
                    <p className="text-sm text-muted-foreground">{deal.geography?.join(", ")} · ${deal.revenue}M · {deal.ebitda_percentage}% EBITDA</p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>{deal.status}</Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => archiveDeal(deal.id, deal.deal_name)}
                            disabled={deal.status === "Archived"}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{deal.status === "Archived" ? "Already archived" : "Archive deal"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Deal?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{deal.deal_name}" and all related data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDeal(deal.id, deal.deal_name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
