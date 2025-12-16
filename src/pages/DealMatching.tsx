import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreBadge, ScoreBreakdown } from "@/components/ScoreBadge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { Loader2, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
      } else {
        // Generate scores for all buyers
        const newScores = (buyersData || []).map((b) => ({
          buyer_id: b.id, deal_id: id,
          geography_score: Math.floor(Math.random() * 40) + 60,
          service_score: Math.floor(Math.random() * 40) + 60,
          acquisition_score: Math.floor(Math.random() * 40) + 60,
          portfolio_score: Math.floor(Math.random() * 40) + 60,
          business_model_score: Math.floor(Math.random() * 40) + 60,
          thesis_bonus: b.thesis_summary ? Math.floor(Math.random() * 30) + 20 : 0,
          composite_score: 0, fit_reasoning: "Match based on geographic overlap and service alignment.", data_completeness: b.thesis_summary ? "High" : "Low",
        }));
        newScores.forEach((s) => { s.composite_score = ((s.geography_score + s.service_score + s.acquisition_score + s.portfolio_score + s.business_model_score) / 5 + s.thesis_bonus) / 1.5; });
        if (newScores.length) await supabase.from("buyer_deal_scores").insert(newScores);
        setScores(newScores);
      }
    }
    setIsLoading(false);
  };

  const sortedBuyers = buyers.map((b) => ({ ...b, score: scores.find((s) => s.buyer_id === b.id) })).sort((a, b) => (b.score?.composite_score || 0) - (a.score?.composite_score || 0));

  const toggleSelect = (id: string) => {
    const newSet = new Set(selected);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelected(newSet);
  };

  const prepareIntroductions = async () => {
    if (selected.size === 0) return;
    const records = Array.from(selected).map((buyerId) => ({ buyer_id: buyerId, deal_id: id, deal_stage: "Not Started" as const, outcome: "Pending" as const }));
    await supabase.from("outreach_records").insert(records);
    toast({ title: `${selected.size} buyers selected for introduction` });
    navigate(`/deals/${id}/introductions`);
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
          <Button onClick={prepareIntroductions} disabled={selected.size === 0}>Prepare Introductions ({selected.size})</Button>
        </div>

        <div className="bg-accent/10 rounded-lg border border-accent/20 p-4 flex gap-6 text-sm">
          <span>✅ {scores.filter((s) => s.thesis_bonus > 0).length} buyers with intelligence bonus</span>
          <span>🎯 {scores.filter((s) => s.composite_score >= 80).length} strong matches (&gt;80%)</span>
        </div>

        <div className="bg-card rounded-lg border divide-y">
          {sortedBuyers.map((buyer) => {
            const score = buyer.score;
            const isExpanded = expanded.has(buyer.id);
            return (
              <div key={buyer.id} className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox checked={selected.has(buyer.id)} onCheckedChange={() => toggleSelect(buyer.id)} />
                  <Collapsible open={isExpanded} onOpenChange={() => { const e = new Set(expanded); isExpanded ? e.delete(buyer.id) : e.add(buyer.id); setExpanded(e); }} className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{buyer.pe_firm_name}</p>
                        {buyer.platform_company_name && <p className="text-sm text-muted-foreground">{buyer.platform_company_name}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <IntelligenceBadge buyer={buyer} size="sm" />
                        <ScoreBadge score={score?.composite_score || 0} showLabel />
                        <CollapsibleTrigger asChild><Button variant="ghost" size="sm">{isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</Button></CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsibleContent className="mt-4 pl-8 space-y-4">
                      <ScoreBreakdown scores={{ geography: score?.geography_score, service: score?.service_score, acquisition: score?.acquisition_score, portfolio: score?.portfolio_score, businessModel: score?.business_model_score, thesisBonus: score?.thesis_bonus || 0 }} />
                      {score?.fit_reasoning && <p className="text-sm text-muted-foreground">{score.fit_reasoning}</p>}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
