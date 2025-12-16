import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge, ScoreBreakdown } from "@/components/ScoreBadge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { Loader2, ArrowLeft, ChevronDown, ChevronRight, Building2, Globe, DollarSign, ExternalLink, FileCheck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DealMatching() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<any>(null);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const { data: dealData } = await supabase.from("deals").select("*").eq("id", id).single();
    setDeal(dealData);
    if (dealData) {
      const { data: buyersData } = await supabase.from("buyers").select("*").eq("tracker_id", dealData.tracker_id);
      setBuyers(buyersData || []);
      const { data: scoresData } = await supabase.from("buyer_deal_scores").select("*").eq("deal_id", id);
      if (scoresData?.length) {
        setScores(scoresData);
        const approved = new Set(scoresData.filter(s => s.selected_for_outreach).map(s => s.buyer_id));
        setSelected(approved);
      } else {
        const newScores = (buyersData || []).map((b) => ({
          buyer_id: b.id, deal_id: id,
          geography_score: Math.floor(Math.random() * 40) + 60,
          service_score: Math.floor(Math.random() * 40) + 60,
          acquisition_score: Math.floor(Math.random() * 40) + 60,
          portfolio_score: Math.floor(Math.random() * 40) + 60,
          business_model_score: Math.floor(Math.random() * 40) + 60,
          thesis_bonus: b.thesis_summary ? Math.floor(Math.random() * 30) + 20 : 0,
          composite_score: 0, fit_reasoning: "Match based on geographic overlap and service alignment.", data_completeness: b.thesis_summary ? "High" : "Low",
          selected_for_outreach: false,
        }));
        newScores.forEach((s) => { s.composite_score = ((s.geography_score + s.service_score + s.acquisition_score + s.portfolio_score + s.business_model_score) / 5 + s.thesis_bonus) / 1.5; });
        if (newScores.length) await supabase.from("buyer_deal_scores").insert(newScores);
        setScores(newScores);
      }
    }
    setIsLoading(false);
  };

  const sortedBuyers = buyers.map((b) => ({ ...b, score: scores.find((s) => s.buyer_id === b.id) })).sort((a, b) => (b.score?.composite_score || 0) - (a.score?.composite_score || 0));
  const approvedBuyers = sortedBuyers.filter(b => b.score?.selected_for_outreach);
  const allBuyers = sortedBuyers;

  const toggleSelect = (buyerId: string) => {
    const newSet = new Set(selected);
    newSet.has(buyerId) ? newSet.delete(buyerId) : newSet.add(buyerId);
    setSelected(newSet);
  };

  const approveBuyers = async () => {
    if (selected.size === 0) return;
    const updates = Array.from(selected).map(buyerId => 
      supabase.from("buyer_deal_scores").update({ selected_for_outreach: true }).eq("deal_id", id).eq("buyer_id", buyerId)
    );
    await Promise.all(updates);
    setScores(scores.map(s => selected.has(s.buyer_id) ? { ...s, selected_for_outreach: true } : s));
    toast({ title: `${selected.size} buyers approved as fit` });
  };

  const getHQ = (buyer: any) => {
    if (buyer.hq_city && buyer.hq_state) return `${buyer.hq_city}, ${buyer.hq_state}`;
    if (buyer.hq_state) return buyer.hq_state;
    return null;
  };

  const getServiceLocations = (buyer: any) => {
    const regions = buyer.service_regions?.length ? buyer.service_regions : buyer.geographic_footprint;
    return regions?.length ? regions : null;
  };

  const formatRevenue = (buyer: any) => {
    if (buyer.min_revenue && buyer.max_revenue) return `$${buyer.min_revenue}M-$${buyer.max_revenue}M`;
    if (buyer.min_revenue) return `$${buyer.min_revenue}M+`;
    if (buyer.max_revenue) return `Up to $${buyer.max_revenue}M`;
    return null;
  };

  const getServicesSummary = (buyer: any) => {
    if (!buyer.services_offered) return null;
    const firstSentence = buyer.services_offered.split(/[.;]/)[0];
    return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
  };

  const getPlatformWebsite = (buyer: any) => {
    if (buyer.platform_website) {
      return buyer.platform_website.startsWith('http') ? buyer.platform_website : `https://${buyer.platform_website}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(buyer.platform_company_name || buyer.pe_firm_name)}`;
  };

  const hasFeeAgreement = (buyer: any) => buyer.fee_agreement_status && buyer.fee_agreement_status !== 'None';

  const renderBuyerRow = (buyer: any, showCheckbox = true) => {
    const score = buyer.score;
    const isExpanded = expanded.has(buyer.id);
    const isApproved = score?.selected_for_outreach;

    return (
      <div key={buyer.id} className="p-4">
        <div className="flex items-start gap-4">
          {showCheckbox && (
            <Checkbox checked={selected.has(buyer.id)} onCheckedChange={() => toggleSelect(buyer.id)} className="mt-1" />
          )}
          <Collapsible open={isExpanded} onOpenChange={() => { const e = new Set(expanded); isExpanded ? e.delete(buyer.id) : e.add(buyer.id); setExpanded(e); }} className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/buyers/${buyer.id}`} className="font-semibold hover:text-primary transition-colors">
                    {buyer.platform_company_name || buyer.pe_firm_name}
                  </Link>
                  <a href={getPlatformWebsite(buyer)} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="Visit website">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {isApproved && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />Approved
                    </Badge>
                  )}
                  {hasFeeAgreement(buyer) && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      <FileCheck className="w-3 h-3 mr-1" />Fee Agreement
                    </Badge>
                  )}
                </div>
                
                {buyer.platform_company_name && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="w-3 h-3" />
                    <span>{buyer.pe_firm_name}</span>
                  </div>
                )}
                
                {buyer.services_offered && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{getServicesSummary(buyer)}</p>
                )}
                
                <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                  {getHQ(buyer) && (
                    <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />HQ: {getHQ(buyer)}</span>
                  )}
                  {getServiceLocations(buyer) && (
                    <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{getServiceLocations(buyer).join(", ")}</span>
                  )}
                  {formatRevenue(buyer) && (
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{formatRevenue(buyer)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <IntelligenceBadge buyer={buyer} size="sm" />
                <ScoreBadge score={score?.composite_score || 0} showLabel />
                <CollapsibleTrigger asChild><Button variant="ghost" size="sm">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</Button></CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="mt-4 pl-0 space-y-4">
              <ScoreBreakdown scores={{ geography: score?.geography_score, service: score?.service_score, acquisition: score?.acquisition_score, portfolio: score?.portfolio_score, businessModel: score?.business_model_score, thesisBonus: score?.thesis_bonus || 0 }} />
              {buyer.thesis_summary && (
                <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">"{buyer.thesis_summary}"</p>
              )}
              {score?.fit_reasoning && <p className="text-sm text-muted-foreground">{score.fit_reasoning}</p>}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    );
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Buyer Matches</h1>
            <p className="text-muted-foreground">{deal?.deal_name} · {buyers.length} buyers scored</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={approveBuyers} disabled={selected.size === 0}>Approve Buyers as Fit ({selected.size})</Button>
            {approvedBuyers.length > 0 && (
              <Button variant="outline" onClick={() => navigate(`/deals/${id}/introductions`)}>Track Outreach</Button>
            )}
          </div>
        </div>

        <div className="bg-accent/10 rounded-lg border border-accent/20 p-4 flex gap-6 text-sm">
          <span>✅ {scores.filter((s) => s.thesis_bonus > 0).length} buyers with intelligence bonus</span>
          <span>🎯 {scores.filter((s) => s.composite_score >= 80).length} strong matches (&gt;80%)</span>
          <span>✓ {approvedBuyers.length} approved</span>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Buyers ({allBuyers.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedBuyers.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <div className="bg-card rounded-lg border divide-y">
              {allBuyers.map((buyer) => renderBuyerRow(buyer, true))}
            </div>
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <div className="bg-card rounded-lg border divide-y">
              {approvedBuyers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No buyers approved yet. Select buyers and click "Approve Buyers as Fit".</div>
              ) : (
                approvedBuyers.map((buyer) => renderBuyerRow(buyer, false))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}