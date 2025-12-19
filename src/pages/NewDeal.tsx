import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";

export default function NewDeal() {
  const { trackerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tracker, setTracker] = useState<any>(null);
  const [form, setForm] = useState({
    deal_name: "",
    company_website: "",
    geography: "",
    revenue: "",
    ebitda_percentage: "",
    service_mix: "",
    owner_goals: "",
    additional_info: "",
    transcript_link: ""
  });

  useEffect(() => {
    supabase.from("industry_trackers").select("*").eq("id", trackerId).single().then(({ data }) => setTracker(data));
  }, [trackerId]);

  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.deal_name.trim()) return;
    setIsLoading(true);
    
    const { data, error } = await supabase.from("deals").insert({
      tracker_id: trackerId,
      deal_name: form.deal_name,
      company_website: form.company_website || null,
      industry_type: tracker?.industry_name,
      geography: form.geography.split(",").map((s) => s.trim()).filter(Boolean),
      revenue: form.revenue ? parseFloat(form.revenue) : null,
      ebitda_percentage: form.ebitda_percentage ? parseFloat(form.ebitda_percentage) : null,
      service_mix: form.service_mix,
      owner_goals: form.owner_goals,
      additional_info: form.additional_info,
      transcript_link: form.transcript_link || null,
    }).select().single();
    
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      setIsLoading(false); 
      return; 
    }

    // If transcript link provided, extract info from it
    if (form.transcript_link) {
      setExtractionStatus("Extracting info from transcript...");
      try {
        const { data: extractionResult, error: extractionError } = await supabase.functions.invoke('extract-deal-transcript', {
          body: { dealId: data.id }
        });
        
        if (extractionError) {
          console.error('Extraction error:', extractionError);
          toast({ 
            title: "Deal created", 
            description: "Transcript extraction failed, but you can retry from the deal page." 
          });
        } else if (extractionResult?.success) {
          toast({ 
            title: "Deal listed!", 
            description: `Extracted ${extractionResult.extractedFields?.length || 0} fields from transcript.` 
          });
        } else {
          toast({ 
            title: "Deal created", 
            description: extractionResult?.error || "Extraction incomplete, you can retry from the deal page." 
          });
        }
      } catch (err) {
        console.error('Extraction failed:', err);
        toast({ title: "Deal created", description: "Transcript extraction failed." });
      }
    } else {
      toast({ title: "Deal listed!" });
    }

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
          <div><Label>Company Website</Label><Input type="url" value={form.company_website} onChange={(e) => setForm({ ...form, company_website: e.target.value })} placeholder="e.g., https://example.com" className="mt-1" /></div>
          <div><Label>Geography (comma-separated states)</Label><Input value={form.geography} onChange={(e) => setForm({ ...form, geography: e.target.value })} placeholder="e.g., GA, FL, SC" className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Revenue ($M)</Label><Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} placeholder="e.g., 6.5" className="mt-1" /></div>
            <div><Label>EBITDA (%)</Label><Input type="number" value={form.ebitda_percentage} onChange={(e) => setForm({ ...form, ebitda_percentage: e.target.value })} placeholder="e.g., 23" className="mt-1" /></div>
          </div>
          <div><Label>Service Mix</Label><Textarea value={form.service_mix} onChange={(e) => setForm({ ...form, service_mix: e.target.value })} placeholder="Describe services/products offered..." className="mt-1" /></div>
          <div><Label>Goals of Owner</Label><Textarea value={form.owner_goals} onChange={(e) => setForm({ ...form, owner_goals: e.target.value })} placeholder="What the owner wants from the sale..." className="mt-1" /></div>
          <div><Label>Additional Information</Label><Textarea value={form.additional_info} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} placeholder="Any other relevant details..." className="mt-1" /></div>
          <div>
            <Label>Transcript Link</Label>
            <Input type="url" value={form.transcript_link} onChange={(e) => setForm({ ...form, transcript_link: e.target.value })} placeholder="Link to call transcript (e.g., Fireflies.ai)" className="mt-1" />
            {form.transcript_link && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI will extract company info from transcript
              </p>
            )}
          </div>
          <Button type="submit" disabled={isLoading || !form.deal_name.trim()} className="w-full">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {extractionStatus || "List Deal & Match Buyers"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
