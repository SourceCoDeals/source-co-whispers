import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { Loader2, ArrowLeft, Edit, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function BuyerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [buyer, setBuyer] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const [buyerRes, contactsRes] = await Promise.all([
      supabase.from("buyers").select("*").eq("id", id).single(),
      supabase.from("buyer_contacts").select("*").eq("buyer_id", id),
    ]);
    setBuyer(buyerRes.data);
    setContacts(contactsRes.data || []);
    setEditData(buyerRes.data || {});
    setIsLoading(false);
  };

  const saveIntelligence = async () => {
    const { error } = await supabase.from("buyers").update({
      thesis_summary: editData.thesis_summary,
      min_revenue: editData.min_revenue,
      max_revenue: editData.max_revenue,
      preferred_ebitda: editData.preferred_ebitda,
      service_mix_prefs: editData.service_mix_prefs,
      deal_breakers: editData.deal_breakers?.split(",").map((s: string) => s.trim()).filter(Boolean) || [],
      thesis_confidence: editData.thesis_confidence,
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Intelligence updated!" });
    setIsEditing(false);
    loadData();
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!buyer) return <AppLayout><div className="text-center py-12">Buyer not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{buyer.pe_firm_name}</h1>
            {buyer.platform_company_name && <p className="text-muted-foreground">{buyer.platform_company_name}</p>}
          </div>
          <IntelligenceBadge buyer={buyer} showPercentage />
        </div>

        <Tabs defaultValue="intelligence">
          <TabsList><TabsTrigger value="intelligence">Intelligence</TabsTrigger><TabsTrigger value="contacts">Contacts</TabsTrigger><TabsTrigger value="public">Public Data</TabsTrigger></TabsList>
          
          <TabsContent value="intelligence" className="mt-4">
            <div className="bg-card rounded-lg border p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Buyer Intelligence</h2>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}><Edit className="w-4 h-4 mr-2" />{isEditing ? "Cancel" : "Edit"}</Button>
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div><Label>Investment Thesis Summary</Label><Textarea value={editData.thesis_summary || ""} onChange={(e) => setEditData({ ...editData, thesis_summary: e.target.value })} placeholder="What is this buyer looking for?" /></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Min Revenue ($M)</Label><Input type="number" value={editData.min_revenue || ""} onChange={(e) => setEditData({ ...editData, min_revenue: e.target.value })} /></div>
                    <div><Label>Max Revenue ($M)</Label><Input type="number" value={editData.max_revenue || ""} onChange={(e) => setEditData({ ...editData, max_revenue: e.target.value })} /></div>
                    <div><Label>Preferred EBITDA (%)</Label><Input type="number" value={editData.preferred_ebitda || ""} onChange={(e) => setEditData({ ...editData, preferred_ebitda: e.target.value })} /></div>
                  </div>
                  <div><Label>Service Mix Preferences</Label><Input value={editData.service_mix_prefs || ""} onChange={(e) => setEditData({ ...editData, service_mix_prefs: e.target.value })} placeholder="e.g., Residential only, commercial a plus" /></div>
                  <div><Label>Deal Breakers (comma-separated)</Label><Input value={Array.isArray(editData.deal_breakers) ? editData.deal_breakers.join(", ") : editData.deal_breakers || ""} onChange={(e) => setEditData({ ...editData, deal_breakers: e.target.value })} placeholder="e.g., No franchise, No West Coast" /></div>
                  <Button onClick={saveIntelligence}>Save Intelligence</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {buyer.thesis_summary ? <div><p className="text-sm text-muted-foreground">Thesis Summary</p><p>{buyer.thesis_summary}</p></div> : null}
                  <div className="grid grid-cols-3 gap-4">
                    {buyer.min_revenue && <div><p className="text-sm text-muted-foreground">Min Revenue</p><p className="font-medium">${buyer.min_revenue}M</p></div>}
                    {buyer.max_revenue && <div><p className="text-sm text-muted-foreground">Max Revenue</p><p className="font-medium">${buyer.max_revenue}M</p></div>}
                    {buyer.preferred_ebitda && <div><p className="text-sm text-muted-foreground">EBITDA Target</p><p className="font-medium">{buyer.preferred_ebitda}%+</p></div>}
                  </div>
                  {buyer.deal_breakers?.length > 0 && <div><p className="text-sm text-muted-foreground">Deal Breakers</p><div className="flex flex-wrap gap-2 mt-1">{buyer.deal_breakers.map((db: string, i: number) => <Badge key={i} variant="destructive">{db}</Badge>)}</div></div>}
                  {!buyer.thesis_summary && !buyer.min_revenue && <p className="text-muted-foreground">No intelligence captured yet. Click Edit to add buyer preferences.</p>}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <div className="bg-card rounded-lg border p-6">
              {contacts.length === 0 ? <p className="text-muted-foreground">No contacts added yet.</p> : (
                <div className="divide-y">{contacts.map((c) => <div key={c.id} className="py-3"><p className="font-medium">{c.name}</p><p className="text-sm text-muted-foreground">{c.title} · {c.email}</p></div>)}</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="public" className="mt-4">
            <div className="bg-card rounded-lg border p-6 space-y-4">
              {buyer.geographic_footprint?.length > 0 && <div><p className="text-sm text-muted-foreground">Geographic Footprint</p><p>{buyer.geographic_footprint.join(", ")}</p></div>}
              {buyer.services_offered && <div><p className="text-sm text-muted-foreground">Services</p><p>{buyer.services_offered}</p></div>}
              {buyer.business_model && <div><p className="text-sm text-muted-foreground">Business Model</p><p>{buyer.business_model}</p></div>}
              {!buyer.geographic_footprint?.length && !buyer.services_offered && <p className="text-muted-foreground">No public data available.</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
