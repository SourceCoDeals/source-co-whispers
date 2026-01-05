import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuyerDataSection, DataField, DataListField, DataGrid } from "@/components/BuyerDataSection";
import { BuyerSectionEditDialog } from "@/components/BuyerSectionEditDialog";
import { MainContactSection } from "@/components/MainContactSection";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Target, MapPin, Check, Building2, Users, BarChart3, History, Globe, DollarSign, User, Quote, Briefcase, Pencil, AlertTriangle, Sparkles, ChevronDown, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BuyerHeader, BuyerTranscriptsSection, BuyerDealHistoryTab, BuyerContactsTab } from "@/features/buyers/components";

type SectionType = 'company_info' | 'hq_address' | 'business_description' | 'investment_criteria' | 'geographic_footprint' | 'deal_structure' | 'customer_info' | 'acquisition_history';

export default function BuyerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('dealId');
  const { toast } = useToast();
  
  const [buyer, setBuyer] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [coreEditData, setCoreEditData] = useState({
    platform_company_name: "", platform_website: "", buyer_linkedin: "",
    pe_firm_name: "", pe_firm_website: "", pe_firm_linkedin: "",
    hq_city: "", hq_state: "", hq_country: "",
  });
  
  // Deal context state
  const [deal, setDeal] = useState<any>(null);
  const [dealScore, setDealScore] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [dealHistory, setDealHistory] = useState<any[]>([]);
  
  // Section edit state
  const [editingSection, setEditingSection] = useState<SectionType | null>(null);

  useEffect(() => { loadData(); }, [id, dealId]);

  const loadData = async () => {
    const [buyerRes, contactsRes, transcriptsRes] = await Promise.all([
      supabase.from("buyers").select("*").eq("id", id).single(),
      supabase.from("buyer_contacts").select("*").eq("buyer_id", id),
      supabase.from("buyer_transcripts").select("*").eq("buyer_id", id).order("call_date", { ascending: false }),
    ]);
    setBuyer(buyerRes.data);
    setContacts(contactsRes.data || []);
    setTranscripts(transcriptsRes.data || []);
    
    if (buyerRes.data) {
      setCoreEditData({
        platform_company_name: buyerRes.data.platform_company_name || "",
        platform_website: buyerRes.data.platform_website || "",
        buyer_linkedin: buyerRes.data.buyer_linkedin || "",
        pe_firm_name: buyerRes.data.pe_firm_name || "",
        pe_firm_website: buyerRes.data.pe_firm_website || "",
        pe_firm_linkedin: buyerRes.data.pe_firm_linkedin || "",
        hq_city: buyerRes.data.hq_city || "",
        hq_state: buyerRes.data.hq_state || "",
        hq_country: buyerRes.data.hq_country || "",
      });
    }
    
    if (dealId) {
      const [dealRes, scoreRes] = await Promise.all([
        supabase.from("deals").select("*").eq("id", dealId).single(),
        supabase.from("buyer_deal_scores").select("*").eq("deal_id", dealId).eq("buyer_id", id).single(),
      ]);
      setDeal(dealRes.data);
      setDealScore(scoreRes.data);
    }
    
    const { data: historyData } = await supabase
      .from("buyer_deal_scores")
      .select(`*, deals:deal_id (id, deal_name, industry_type, geography, revenue, status, created_at)`)
      .eq("buyer_id", id)
      .order("scored_at", { ascending: false });
    setDealHistory(historyData || []);
    setIsLoading(false);
  };

  const approveBuyerForDeal = async () => {
    if (!dealId || !id) return;
    setIsApproving(true);
    try {
      const { data: existing } = await supabase.from("buyer_deal_scores").select("id").eq("deal_id", dealId).eq("buyer_id", id).single();
      if (existing) {
        await supabase.from("buyer_deal_scores").update({ selected_for_outreach: true }).eq("deal_id", dealId).eq("buyer_id", id);
      } else {
        await supabase.from("buyer_deal_scores").insert({ deal_id: dealId, buyer_id: id, selected_for_outreach: true, composite_score: 0 });
      }
      setDealScore({ ...dealScore, selected_for_outreach: true });
      toast({ title: "Buyer approved", description: `${buyer?.platform_company_name || buyer?.pe_firm_name} approved for ${deal?.deal_name}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  const enrichFromWebsite = async () => {
    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-buyer', { body: { buyerId: id } });
      if (error) throw error;
      if (!data.success) { toast({ title: "Enrichment failed", description: data.error, variant: "destructive" }); return; }
      toast({ title: data.warning ? "Partial enrichment" : "Enrichment complete", description: data.warning || `Updated ${buyer.platform_company_name || buyer.pe_firm_name}` });
      loadData();
    } catch (err: any) {
      toast({ title: "Enrichment failed", description: err.message, variant: "destructive" });
    } finally {
      setIsEnriching(false);
    }
  };

  const saveCoreInfo = async () => {
    const { error } = await supabase.from("buyers").update({
      platform_company_name: coreEditData.platform_company_name || null,
      platform_website: coreEditData.platform_website || null,
      buyer_linkedin: coreEditData.buyer_linkedin || null,
      pe_firm_name: coreEditData.pe_firm_name,
      pe_firm_website: coreEditData.pe_firm_website || null,
      pe_firm_linkedin: coreEditData.pe_firm_linkedin || null,
      hq_city: coreEditData.hq_city || null,
      hq_state: coreEditData.hq_state || null,
      hq_country: coreEditData.hq_country || null,
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Buyer info updated" });
    setEditDialogOpen(false);
    loadData();
  };

  const toggleFeeAgreement = async () => {
    const newValue = !buyer?.has_fee_agreement;
    const { error } = await supabase.from("buyers").update({ has_fee_agreement: newValue }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setBuyer({ ...buyer, has_fee_agreement: newValue });
    toast({ title: newValue ? "Fee agreement marked" : "Fee agreement removed" });
  };

  // Criteria completeness calculation
  const calculateCriteriaCompleteness = () => {
    const fields = {
      geography: [buyer.target_geographies?.length > 0, buyer.geographic_footprint?.length > 0, buyer.hq_state],
      size: [buyer.min_revenue || buyer.max_revenue, buyer.min_ebitda || buyer.max_ebitda, buyer.revenue_sweet_spot || buyer.ebitda_sweet_spot],
      services: [buyer.target_services?.length > 0, buyer.services_offered, buyer.service_mix_prefs],
      thesis: [buyer.thesis_summary, buyer.acquisition_appetite, buyer.deal_breakers?.length > 0],
    };
    const geoScore = fields.geography.filter(Boolean).length / fields.geography.length;
    const sizeScore = fields.size.filter(Boolean).length / fields.size.length;
    const serviceScore = fields.services.filter(Boolean).length / fields.services.length;
    const thesisScore = fields.thesis.filter(Boolean).length / fields.thesis.length;
    const score = Math.round((geoScore + sizeScore + serviceScore + thesisScore) / 4 * 100);
    const missing: string[] = [];
    if (geoScore < 0.5) missing.push("geography preferences");
    if (sizeScore < 0.5) missing.push("size criteria");
    if (serviceScore < 0.5) missing.push("target services");
    if (thesisScore < 0.5) missing.push("investment thesis");
    return { score, missing };
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!buyer) return <AppLayout><div className="text-center py-12">Buyer not found</div></AppLayout>;

  const criteriaCompleteness = calculateCriteriaCompleteness();
  const recentAcqs = Array.isArray(buyer.recent_acquisitions) ? buyer.recent_acquisitions : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Deal Context Banner */}
        {deal && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Evaluating for deal:</p>
                  <p className="font-semibold text-primary">{deal.deal_name}</p>
                </div>
                {deal.geography?.length > 0 && <Badge variant="outline" className="ml-2"><MapPin className="w-3 h-3 mr-1" />{deal.geography.slice(0, 2).join(", ")}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {dealScore?.selected_for_outreach ? (
                  <Badge variant="default" className="bg-green-600"><Check className="w-3 h-3 mr-1" />Approved for Outreach</Badge>
                ) : (
                  <Button onClick={approveBuyerForDeal} disabled={isApproving}>
                    {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Approve for {deal.deal_name}
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate(`/deals/${dealId}/matching`)}>Back to Matching</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Criteria Completeness Warning */}
        {criteriaCompleteness.score < 60 && (
          <Card className="p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">Criteria Completeness: {criteriaCompleteness.score}%</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">Missing: {criteriaCompleteness.missing.join(", ")}. Add more data to improve scoring accuracy.</p>
              </div>
              <Button variant="outline" size="sm" onClick={enrichFromWebsite} disabled={isEnriching}>
                {isEnriching ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}Auto-Enrich
              </Button>
            </div>
          </Card>
        )}

        {/* Header */}
        <BuyerHeader
          buyer={buyer}
          onNavigateBack={() => navigate(-1)}
          editDialogOpen={editDialogOpen}
          onEditDialogOpenChange={setEditDialogOpen}
          coreEditData={coreEditData}
          onCoreEditDataChange={setCoreEditData}
          onSaveCoreInfo={saveCoreInfo}
          onEnrichFromWebsite={enrichFromWebsite}
          isEnriching={isEnriching}
        />

        {/* Fee Agreement Toggle */}
        <MainContactSection buyerId={id!} contacts={contacts} onContactUpdate={loadData} peFirmName={buyer.pe_firm_name} platformCompanyName={buyer.platform_company_name} deal={deal} hasFeeAgreement={buyer.has_fee_agreement} />

        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <Switch checked={buyer.has_fee_agreement || false} onCheckedChange={toggleFeeAgreement} id="fee-agreement" />
          <label htmlFor="fee-agreement" className="text-sm font-medium">Fee Agreement in Place</label>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="intel">
          <TabsList>
            <TabsTrigger value="intel"><BarChart3 className="w-4 h-4 mr-2" />Intelligence</TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-2" />Deal History ({dealHistory.length})</TabsTrigger>
            <TabsTrigger value="contacts"><Users className="w-4 h-4 mr-2" />Contacts ({contacts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="intel" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Business Description */}
              <BuyerDataSection title="Business Description" icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                actions={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSection('business_description')}><Pencil className="w-3.5 h-3.5" /></Button>}>
                <div className="space-y-4">
                  <DataField label="Industry Vertical" value={buyer.industry_vertical} />
                  <DataField label="Business Summary" value={buyer.business_summary} />
                  <DataField label="Services Offered" value={buyer.services_offered} />
                  <DataField label="Specialized Focus" value={buyer.specialized_focus} />
                </div>
              </BuyerDataSection>

              {/* Investment Criteria */}
              <BuyerDataSection title="Platform Investment Criteria" icon={<Briefcase className="w-4 h-4 text-muted-foreground" />}
                actions={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSection('investment_criteria')}><Pencil className="w-3.5 h-3.5" /></Button>}>
                <div className="space-y-4">
                  {buyer.thesis_summary && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs font-semibold uppercase text-primary mb-1">Investment Thesis</p>
                      <p className="text-sm">{buyer.thesis_summary}</p>
                      {buyer.thesis_confidence && <Badge variant={buyer.thesis_confidence === "high" ? "default" : "outline"} className="mt-2">{buyer.thesis_confidence} confidence</Badge>}
                    </div>
                  )}
                  <DataField label="Strategic Priorities" value={buyer.strategic_priorities} />
                  <DataListField label="Target Services" items={buyer.target_services} />
                  <DataListField label="Required Capabilities" items={buyer.required_capabilities} />
                  <DataField label="Service Mix Preferences" value={buyer.service_mix_prefs} />
                  <DataListField label="Target Industries" items={buyer.target_industries} collapsible collapsedCount={5} />
                  <DataListField label="Industry Exclusions" items={buyer.industry_exclusions} variant="destructive" />
                  <DataListField label="Deal Breakers" items={buyer.deal_breakers} variant="destructive" />
                </div>
              </BuyerDataSection>

              {/* Geographic Footprint */}
              <BuyerDataSection title="Geographic Footprint" icon={<Globe className="w-4 h-4 text-muted-foreground" />}
                actions={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSection('geographic_footprint')}><Pencil className="w-3.5 h-3.5" /></Button>}>
                <div className="space-y-4">
                  <DataListField label="Current Locations" items={buyer.geographic_footprint} variant="default" collapsible collapsedCount={5} />
                  <DataListField label="Service Regions" items={buyer.service_regions} variant="default" collapsible collapsedCount={5} />
                  <DataListField label="Target Geographies" items={buyer.target_geographies} variant="outline" collapsible collapsedCount={5} />
                  <DataListField label="Geographic Exclusions" items={buyer.geographic_exclusions} variant="destructive" />
                </div>
              </BuyerDataSection>

              {/* Deal Structure */}
              <BuyerDataSection title="Deal Structure" icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}
                actions={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSection('deal_structure')}><Pencil className="w-3.5 h-3.5" /></Button>}>
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Size Criteria</p>
                  <DataGrid columns={3}>
                    <DataField label="Min Revenue" value={buyer.min_revenue} type="currency" />
                    <DataField label="Max Revenue" value={buyer.max_revenue} type="currency" />
                    <DataField label="Revenue Sweet Spot" value={buyer.revenue_sweet_spot} type="currency" />
                  </DataGrid>
                  <DataGrid columns={3}>
                    <DataField label="Min EBITDA" value={buyer.min_ebitda} type="currency" />
                    <DataField label="Max EBITDA" value={buyer.max_ebitda} type="currency" />
                    <DataField label="EBITDA Sweet Spot" value={buyer.ebitda_sweet_spot} type="currency" />
                  </DataGrid>
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Deal Preferences</p>
                    <DataField label="Business Model Preferences" value={buyer.business_model_prefs} />
                    <DataListField label="Business Model Exclusions" items={buyer.business_model_exclusions} variant="destructive" />
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Acquisition Appetite</p>
                    <DataGrid columns={2}>
                      <DataField label="Current Appetite" value={buyer.acquisition_appetite} />
                      <DataField label="Acquisition Timeline" value={buyer.acquisition_timeline} />
                    </DataGrid>
                  </div>
                </div>
              </BuyerDataSection>

              {/* Customer Info */}
              <BuyerDataSection title="Customer / End Market Info" icon={<Users className="w-4 h-4 text-muted-foreground" />}
                actions={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSection('customer_info')}><Pencil className="w-3.5 h-3.5" /></Button>}>
                <div className="space-y-4">
                  <DataGrid columns={2}>
                    <DataField label="Primary Customer Size" value={buyer.primary_customer_size} />
                    <DataField label="Customer Geographic Reach" value={buyer.customer_geographic_reach} />
                  </DataGrid>
                  <DataListField label="Customer Industries" items={buyer.customer_industries} />
                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Target Customer Profile</p>
                    <DataField label="Target Customer Profile" value={buyer.target_customer_profile} />
                    <DataListField label="Target Customer Industries" items={buyer.target_customer_industries} />
                  </div>
                </div>
              </BuyerDataSection>

              {/* Acquisition History */}
              <BuyerDataSection title="Platform Acquisition History" icon={<History className="w-4 h-4 text-muted-foreground" />}
                actions={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSection('acquisition_history')}><Pencil className="w-3.5 h-3.5" /></Button>}>
                <div className="space-y-4">
                  {buyer.last_acquisition_date && (
                    <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Platform Acquisition</p>
                        <p className="text-lg font-semibold">{new Date(buyer.last_acquisition_date).toLocaleDateString()}</p>
                      </div>
                      <History className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <DataGrid columns={2}>
                    <DataField label="Total Platform Add-ons" value={buyer.total_acquisitions} />
                    <DataField label="Acquisition Frequency" value={buyer.acquisition_frequency} />
                  </DataGrid>
                  {recentAcqs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Recent Platform Acquisitions</p>
                      {recentAcqs.map((acq: any, i: number) => (
                        <div key={i} className="text-sm p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium">{acq.name || acq.company || "Unknown"}</p>
                              {acq.date && <p className="text-xs text-muted-foreground">{acq.date}</p>}
                              {acq.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{acq.location}</p>}
                            </div>
                            {acq.source_url && <a href={acq.source_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs"><ExternalLink className="w-3 h-3" /></a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </BuyerDataSection>

              {/* Key Quotes */}
              {buyer.key_quotes?.length > 0 && (
                <BuyerDataSection title={`Key Quotes (${buyer.key_quotes.length})`} icon={<Quote className="w-4 h-4 text-muted-foreground" />} className="lg:col-span-2">
                  <Collapsible>
                    <div className="space-y-3">
                      {buyer.key_quotes.slice(0, 3).map((quote: string, i: number) => (
                        <blockquote key={i} className="border-l-2 border-primary/50 pl-4 py-1 text-sm italic text-muted-foreground">"{quote}"</blockquote>
                      ))}
                    </div>
                    {buyer.key_quotes.length > 3 && (
                      <>
                        <CollapsibleContent>
                          <div className="space-y-3 mt-3">
                            {buyer.key_quotes.slice(3).map((quote: string, i: number) => (
                              <blockquote key={i + 3} className="border-l-2 border-primary/50 pl-4 py-1 text-sm italic text-muted-foreground">"{quote}"</blockquote>
                            ))}
                          </div>
                        </CollapsibleContent>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-3 w-full flex items-center gap-1 text-muted-foreground">
                            <span>Show {buyer.key_quotes.length - 3} more quotes</span>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </CollapsibleTrigger>
                      </>
                    )}
                  </Collapsible>
                </BuyerDataSection>
              )}

              {/* Transcripts */}
              <BuyerTranscriptsSection buyerId={id!} transcripts={transcripts} onRefresh={loadData} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <BuyerDealHistoryTab dealHistory={dealHistory} currentDealId={dealId || undefined} />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <BuyerContactsTab buyerId={id!} buyer={buyer} contacts={contacts} deal={deal} onRefresh={loadData} />
          </TabsContent>
        </Tabs>

        {/* Section Edit Dialog */}
        {editingSection && (
          <BuyerSectionEditDialog
            open={!!editingSection}
            onOpenChange={(open) => !open && setEditingSection(null)}
            section={editingSection}
            buyer={buyer}
            onSave={loadData}
          />
        )}
      </div>
    </AppLayout>
  );
}
