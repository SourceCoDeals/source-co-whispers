import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { BuyerDataSection, DataField, DataListField, DataGrid } from "@/components/BuyerDataSection";
import { Loader2, ArrowLeft, Edit, ExternalLink, Building2, MapPin, Users, BarChart3, History, Target, User, Quote } from "lucide-react";
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
      deal_breakers: editData.deal_breakers?.split?.(",").map((s: string) => s.trim()).filter(Boolean) || editData.deal_breakers || [],
      thesis_confidence: editData.thesis_confidence,
      business_model_prefs: editData.business_model_prefs,
      key_quotes: editData.key_quotes?.split?.("\n").filter(Boolean) || editData.key_quotes || [],
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Intelligence updated!" });
    setIsEditing(false);
    loadData();
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!buyer) return <AppLayout><div className="text-center py-12">Buyer not found</div></AppLayout>;

  const geoPrefs = typeof buyer.geo_preferences === 'object' ? buyer.geo_preferences : {};
  const recentAcqs = Array.isArray(buyer.recent_acquisitions) ? buyer.recent_acquisitions : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-display font-bold">{buyer.pe_firm_name}</h1>
              <IntelligenceBadge buyer={buyer} showPercentage />
            </div>
            {buyer.platform_company_name && (
              <p className="text-lg text-muted-foreground">{buyer.platform_company_name}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {buyer.platform_website && (
                <a 
                  href={buyer.platform_website.startsWith("http") ? buyer.platform_website : `https://${buyer.platform_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
              {buyer.num_platforms && (
                <span>{buyer.num_platforms} platform{buyer.num_platforms > 1 ? "s" : ""}</span>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Company Identification */}
              <BuyerDataSection 
                title="Company Identification" 
                icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
              >
                <DataGrid columns={2}>
                  <DataField label="PE Firm" value={buyer.pe_firm_name} />
                  <DataField label="Platform Company" value={buyer.platform_company_name} />
                  <DataField label="Website" value={buyer.platform_website} type="url" />
                  <DataField label="Business Model" value={buyer.business_model} />
                </DataGrid>
              </BuyerDataSection>

              {/* Location & Geography */}
              <BuyerDataSection 
                title="Location & Geography" 
                icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                isEmpty={!buyer.geographic_footprint?.length && !geoPrefs.target_regions?.length}
                emptyMessage="No geographic data available"
              >
                <div className="space-y-4">
                  <DataListField label="Current Footprint" items={buyer.geographic_footprint} />
                  <DataListField label="Target Geographies" items={geoPrefs.target_regions} variant="default" />
                  <DataListField label="Geographic Exclusions" items={geoPrefs.exclusions} variant="destructive" />
                </div>
              </BuyerDataSection>

              {/* Size Metrics */}
              <BuyerDataSection 
                title="Size Metrics" 
                icon={<BarChart3 className="w-4 h-4 text-muted-foreground" />}
                isEmpty={!buyer.min_revenue && !buyer.max_revenue && !buyer.preferred_ebitda}
                emptyMessage="No size metrics available"
              >
                <DataGrid columns={3}>
                  <DataField label="Min Revenue" value={buyer.min_revenue} type="currency" />
                  <DataField label="Max Revenue" value={buyer.max_revenue} type="currency" />
                  <DataField label="Target EBITDA" value={buyer.preferred_ebitda} type="percentage" />
                </DataGrid>
              </BuyerDataSection>

              {/* Acquisition History */}
              <BuyerDataSection 
                title="Acquisition History" 
                icon={<History className="w-4 h-4 text-muted-foreground" />}
                isEmpty={recentAcqs.length === 0 && !buyer.last_call_date}
                emptyMessage="No acquisition history available"
              >
                <div className="space-y-4">
                  <DataGrid columns={2}>
                    <DataField label="Last Call Date" value={buyer.last_call_date} />
                    <DataField label="Data Last Updated" value={new Date(buyer.data_last_updated).toLocaleDateString()} />
                  </DataGrid>
                  {recentAcqs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Recent Acquisitions</p>
                      <div className="space-y-2">
                        {recentAcqs.map((acq: any, i: number) => (
                          <div key={i} className="text-sm p-2 bg-muted/50 rounded">
                            <p className="font-medium">{acq.name || acq.company || "Unknown"}</p>
                            {acq.date && <p className="text-xs text-muted-foreground">{acq.date}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </BuyerDataSection>

              {/* Investment Criteria */}
              <BuyerDataSection 
                title="Investment Criteria" 
                icon={<Target className="w-4 h-4 text-muted-foreground" />}
                className="lg:col-span-2"
                isEmpty={!buyer.thesis_summary && !buyer.service_mix_prefs && !buyer.deal_breakers?.length}
                emptyMessage="No investment criteria captured yet. Add intelligence data to populate this section."
              >
                <div className="space-y-4">
                  {buyer.thesis_summary && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Investment Thesis</p>
                      <p className="text-sm">{buyer.thesis_summary}</p>
                    </div>
                  )}
                  <DataGrid columns={2}>
                    <DataField label="Service Mix Preferences" value={buyer.service_mix_prefs} />
                    <DataField label="Business Model Preferences" value={buyer.business_model_prefs} />
                  </DataGrid>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DataListField label="Deal Breakers" items={buyer.deal_breakers} variant="destructive" />
                    <DataListField label="Portfolio Companies" items={buyer.portfolio_companies} />
                  </div>
                  <div className="flex gap-4">
                    {buyer.addon_only && <Badge>Add-on Only</Badge>}
                    {buyer.platform_only && <Badge>Platform Only</Badge>}
                    {buyer.thesis_confidence && (
                      <Badge variant={buyer.thesis_confidence === "high" ? "default" : "outline"}>
                        {buyer.thesis_confidence} confidence
                      </Badge>
                    )}
                  </div>
                </div>
              </BuyerDataSection>

              {/* Key Quotes */}
              {buyer.key_quotes?.length > 0 && (
                <BuyerDataSection 
                  title="Key Quotes" 
                  icon={<Quote className="w-4 h-4 text-muted-foreground" />}
                  className="lg:col-span-2"
                >
                  <div className="space-y-3">
                    {buyer.key_quotes.map((quote: string, i: number) => (
                      <blockquote key={i} className="border-l-2 border-primary/50 pl-4 py-1 text-sm italic text-muted-foreground">
                        "{quote}"
                      </blockquote>
                    ))}
                  </div>
                </BuyerDataSection>
              )}
            </div>
          </TabsContent>

          {/* Intelligence Tab (editable) */}
          <TabsContent value="intelligence" className="space-y-4">
            <div className="bg-card rounded-lg border p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Buyer Intelligence</h2>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="w-4 h-4 mr-2" />{isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label>Investment Thesis Summary</Label>
                    <Textarea 
                      value={editData.thesis_summary || ""} 
                      onChange={(e) => setEditData({ ...editData, thesis_summary: e.target.value })} 
                      placeholder="What is this buyer looking for? Their acquisition strategy and goals..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Min Revenue ($M)</Label>
                      <Input type="number" value={editData.min_revenue || ""} onChange={(e) => setEditData({ ...editData, min_revenue: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>Max Revenue ($M)</Label>
                      <Input type="number" value={editData.max_revenue || ""} onChange={(e) => setEditData({ ...editData, max_revenue: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>Target EBITDA (%)</Label>
                      <Input type="number" value={editData.preferred_ebitda || ""} onChange={(e) => setEditData({ ...editData, preferred_ebitda: e.target.value })} className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Service Mix Preferences</Label>
                    <Input value={editData.service_mix_prefs || ""} onChange={(e) => setEditData({ ...editData, service_mix_prefs: e.target.value })} placeholder="e.g., Residential only, commercial a plus" className="mt-1" />
                  </div>
                  <div>
                    <Label>Business Model Preferences</Label>
                    <Input value={editData.business_model_prefs || ""} onChange={(e) => setEditData({ ...editData, business_model_prefs: e.target.value })} placeholder="e.g., Recurring revenue, service contracts" className="mt-1" />
                  </div>
                  <div>
                    <Label>Deal Breakers (comma-separated)</Label>
                    <Input 
                      value={Array.isArray(editData.deal_breakers) ? editData.deal_breakers.join(", ") : editData.deal_breakers || ""} 
                      onChange={(e) => setEditData({ ...editData, deal_breakers: e.target.value })} 
                      placeholder="e.g., No franchise, No West Coast, Union shops"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Key Quotes (one per line)</Label>
                    <Textarea 
                      value={Array.isArray(editData.key_quotes) ? editData.key_quotes.join("\n") : editData.key_quotes || ""} 
                      onChange={(e) => setEditData({ ...editData, key_quotes: e.target.value })} 
                      placeholder="Direct quotes from calls that capture their criteria..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  <Button onClick={saveIntelligence}>Save Intelligence</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {buyer.thesis_summary && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Investment Thesis</p>
                      <p>{buyer.thesis_summary}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <DataField label="Min Revenue" value={buyer.min_revenue} type="currency" />
                    <DataField label="Max Revenue" value={buyer.max_revenue} type="currency" />
                    <DataField label="Target EBITDA" value={buyer.preferred_ebitda} type="percentage" />
                  </div>
                  <DataField label="Service Mix Preferences" value={buyer.service_mix_prefs} />
                  <DataField label="Business Model Preferences" value={buyer.business_model_prefs} />
                  <DataListField label="Deal Breakers" items={buyer.deal_breakers} variant="destructive" />
                  {buyer.key_quotes?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Key Quotes</p>
                      {buyer.key_quotes.map((quote: string, i: number) => (
                        <blockquote key={i} className="border-l-2 border-primary/50 pl-4 py-1 text-sm italic text-muted-foreground">
                          "{quote}"
                        </blockquote>
                      ))}
                    </div>
                  )}
                  {!buyer.thesis_summary && !buyer.min_revenue && !buyer.deal_breakers?.length && (
                    <p className="text-muted-foreground">No intelligence captured yet. Click Edit to add buyer preferences.</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            <BuyerDataSection 
              title="Contacts" 
              icon={<User className="w-4 h-4 text-muted-foreground" />}
              isEmpty={contacts.length === 0}
              emptyMessage="No contacts added yet."
            >
              <div className="divide-y">
                {contacts.map((c) => (
                  <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.title}</p>
                      </div>
                      {c.priority_level && (
                        <Badge variant="outline">Priority {c.priority_level}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                      {c.linkedin_url && (
                        <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </BuyerDataSection>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
