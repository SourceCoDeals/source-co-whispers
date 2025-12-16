import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function NewDeal() {
  const { trackerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tracker, setTracker] = useState<any>(null);
  const [form, setForm] = useState({ deal_name: "", industry_type: "", geography: "", revenue: "", ebitda_percentage: "", service_mix: "", business_model: "Corporate", special_requirements: "" });

  useEffect(() => {
    supabase.from("industry_trackers").select("*").eq("id", trackerId).single().then(({ data }) => setTracker(data));
  }, [trackerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.deal_name.trim()) return;
    setIsLoading(true);
    const { data, error } = await supabase.from("deals").insert({
      tracker_id: trackerId,
      deal_name: form.deal_name,
      industry_type: form.industry_type || tracker?.industry_name,
      geography: form.geography.split(",").map((s) => s.trim()).filter(Boolean),
      revenue: form.revenue ? parseFloat(form.revenue) : null,
      ebitda_percentage: form.ebitda_percentage ? parseFloat(form.ebitda_percentage) : null,
      service_mix: form.service_mix,
      business_model: form.business_model,
      special_requirements: form.special_requirements,
    }).select().single();
    
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setIsLoading(false); return; }
    toast({ title: "Deal listed!" });
    navigate(`/deals/${data.id}/matching`);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <h1 className="text-2xl font-display font-bold mb-2">List New Deal</h1>
        <p className="text-muted-foreground mb-6">in {tracker?.industry_name || "..."}</p>
        
        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-lg border p-6">
          <div><Label>Deal Name *</Label><Input value={form.deal_name} onChange={(e) => setForm({ ...form, deal_name: e.target.value })} placeholder="e.g., Southeast Roofing Co." className="mt-1" /></div>
          <div><Label>Geography (comma-separated states)</Label><Input value={form.geography} onChange={(e) => setForm({ ...form, geography: e.target.value })} placeholder="e.g., GA, FL, SC" className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Revenue ($M)</Label><Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} placeholder="e.g., 6.5" className="mt-1" /></div>
            <div><Label>EBITDA (%)</Label><Input type="number" value={form.ebitda_percentage} onChange={(e) => setForm({ ...form, ebitda_percentage: e.target.value })} placeholder="e.g., 23" className="mt-1" /></div>
          </div>
          <div><Label>Service Mix</Label><Textarea value={form.service_mix} onChange={(e) => setForm({ ...form, service_mix: e.target.value })} placeholder="Describe services offered..." className="mt-1" /></div>
          <div><Label>Business Model</Label><Select value={form.business_model} onValueChange={(v) => setForm({ ...form, business_model: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Corporate">Corporate</SelectItem><SelectItem value="Franchise">Franchise</SelectItem><SelectItem value="Mixed">Mixed</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
          <div><Label>Special Requirements</Label><Textarea value={form.special_requirements} onChange={(e) => setForm({ ...form, special_requirements: e.target.value })} placeholder="Any specific requirements..." className="mt-1" /></div>
          <Button type="submit" disabled={isLoading || !form.deal_name.trim()} className="w-full">{isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}List Deal & Match Buyers</Button>
        </form>
      </div>
    </AppLayout>
  );
}
