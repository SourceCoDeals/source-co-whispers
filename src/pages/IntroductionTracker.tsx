import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const stages = ["Not Started", "Initial Contact", "Connected", "NDA Sent", "NDA Signed", "IOI", "LOI", "Due Diligence", "Closed", "Dead"];

export default function IntroductionTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [dealRes, recordsRes] = await Promise.all([
      supabase.from("deals").select("*").eq("id", id).single(),
      supabase.from("outreach_records").select("*").eq("deal_id", id),
    ]);
    setDeal(dealRes.data);
    setRecords(recordsRes.data || []);
    
    if (recordsRes.data?.length) {
      const buyerIds = [...new Set(recordsRes.data.map((r) => r.buyer_id))];
      const { data: buyersData } = await supabase.from("buyers").select("*").in("id", buyerIds);
      const buyerMap: Record<string, any> = {};
      buyersData?.forEach((b) => { buyerMap[b.id] = b; });
      setBuyers(buyerMap);
    }
    setIsLoading(false);
  };

  const updateStage = async (recordId: string, stage: string) => {
    await supabase.from("outreach_records").update({ deal_stage: stage, last_activity_date: new Date().toISOString() }).eq("id", recordId);
    toast({ title: "Stage updated" });
    loadData();
  };

  const updateResponse = async (recordId: string, received: boolean) => {
    await supabase.from("outreach_records").update({ response_received: received, response_date: received ? new Date().toISOString().split("T")[0] : null }).eq("id", recordId);
    loadData();
  };

  const stats = {
    total: records.length,
    introduced: records.filter((r) => r.deal_stage !== "Not Started").length,
    responded: records.filter((r) => r.response_received).length,
    meetings: records.filter((r) => r.meeting_scheduled).length,
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">Introduction Tracker</h1>
            <p className="text-muted-foreground">{deal?.deal_name}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/deals/${id}/matching`)}>Add More Buyers</Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border p-4"><p className="text-sm text-muted-foreground">Total Selected</p><p className="text-2xl font-bold">{stats.total}</p></div>
          <div className="bg-card rounded-lg border p-4"><p className="text-sm text-muted-foreground">Introduced</p><p className="text-2xl font-bold">{stats.introduced}</p></div>
          <div className="bg-card rounded-lg border p-4"><p className="text-sm text-muted-foreground">Responded</p><p className="text-2xl font-bold">{stats.responded}</p></div>
          <div className="bg-card rounded-lg border p-4"><p className="text-sm text-muted-foreground">Meetings</p><p className="text-2xl font-bold">{stats.meetings}</p></div>
        </div>

        {records.length === 0 ? (
          <div className="bg-card rounded-lg border p-8 text-center">
            <p className="text-muted-foreground mb-4">No buyers selected for introduction yet.</p>
            <Button onClick={() => navigate(`/deals/${id}/matching`)}>Select Buyers</Button>
          </div>
        ) : (
          <div className="bg-card rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 text-sm">
                <tr><th className="text-left p-3 font-medium">Buyer</th><th className="text-left p-3 font-medium">Stage</th><th className="text-left p-3 font-medium">Response</th><th className="text-left p-3 font-medium">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => {
                  const buyer = buyers[r.buyer_id];
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="p-3"><p className="font-medium">{buyer?.pe_firm_name || "Unknown"}</p>{buyer?.platform_company_name && <p className="text-sm text-muted-foreground">{buyer.platform_company_name}</p>}</td>
                      <td className="p-3"><Select value={r.deal_stage} onValueChange={(v) => updateStage(r.id, v)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></td>
                      <td className="p-3">{r.response_received ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>}</td>
                      <td className="p-3"><Button variant="ghost" size="sm" onClick={() => updateResponse(r.id, !r.response_received)}><Check className="w-4 h-4 mr-1" />{r.response_received ? "Clear" : "Mark Response"}</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
