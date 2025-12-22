import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuyerDataSection, DataField, DataListField, DataGrid } from "@/components/BuyerDataSection";
import { Loader2, ArrowLeft, Edit, ExternalLink, Building2, MapPin, BarChart3, Target, Globe, Linkedin, Sparkles, DollarSign, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Platform {
  id: string;
  pe_firm_id: string;
  domain: string;
  name: string;
  website: string | null;
  linkedin: string | null;
  industry_vertical: string | null;
  business_summary: string | null;
  services_offered: string | null;
  business_model: string | null;
  specialized_focus: string | null;
  geographic_footprint: string[] | null;
  thesis_summary: string | null;
  thesis_confidence: string | null;
  min_revenue: number | null;
  max_revenue: number | null;
  revenue_sweet_spot: number | null;
  min_ebitda: number | null;
  max_ebitda: number | null;
  ebitda_sweet_spot: number | null;
  target_services: string[] | null;
  target_industries: string[] | null;
  deal_breakers: string[] | null;
  data_last_updated: string;
}

interface PEFirm {
  id: string;
  name: string;
  website: string | null;
  linkedin: string | null;
  hq_city: string | null;
  hq_state: string | null;
  hq_country: string | null;
}

export default function PlatformDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [peFirm, setPeFirm] = useState<PEFirm | null>(null);
  const [trackerNames, setTrackerNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Platform>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    // Load platform
    const { data: platformData, error: platformError } = await supabase
      .from("platforms")
      .select("*")
      .eq("id", id)
      .single();

    if (platformError || !platformData) {
      setIsLoading(false);
      return;
    }

    setPlatform(platformData);
    setEditData(platformData);

    // Load PE firm
    const { data: peFirmData } = await supabase
      .from("pe_firms")
      .select("*")
      .eq("id", platformData.pe_firm_id)
      .single();

    setPeFirm(peFirmData);

    // Load tracker names via tracker_buyers junction
    const { data: trackerBuyers } = await supabase
      .from("tracker_buyers")
      .select("tracker_id")
      .eq("platform_id", id);

    if (trackerBuyers && trackerBuyers.length > 0) {
      const trackerIds = trackerBuyers.map(tb => tb.tracker_id);
      const { data: trackers } = await supabase
        .from("industry_trackers")
        .select("industry_name")
        .in("id", trackerIds);

      setTrackerNames(trackers?.map(t => t.industry_name) || []);
    }

    setIsLoading(false);
  };

  const saveChanges = async () => {
    const { error } = await supabase
      .from("platforms")
      .update({
        name: editData.name,
        website: editData.website,
        linkedin: editData.linkedin,
        industry_vertical: editData.industry_vertical,
        business_summary: editData.business_summary,
        services_offered: editData.services_offered,
        thesis_summary: editData.thesis_summary,
        min_revenue: editData.min_revenue,
        max_revenue: editData.max_revenue,
        min_ebitda: editData.min_ebitda,
        max_ebitda: editData.max_ebitda,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Platform updated" });
    setEditDialogOpen(false);
    loadData();
  };

  const formatRevenue = (min: number | null, max: number | null, sweetSpot: number | null) => {
    const format = (n: number) => {
      if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
      return `$${n}`;
    };

    if (sweetSpot) return `Target: ${format(sweetSpot)}`;
    if (min && max) return `${format(min)} - ${format(max)}`;
    if (min) return `${format(min)}+`;
    if (max) return `Up to ${format(max)}`;
    return null;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!platform) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Platform not found</h2>
          <Button onClick={() => navigate("/buyers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Buyers
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/buyers")} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Buyers
            </Button>
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-display font-bold">{platform.name}</h1>
                {peFirm && (
                  <p className="text-muted-foreground">
                    Backed by {peFirm.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {trackerNames.map((name, i) => (
                <Badge key={i} variant="secondary">{name}</Badge>
              ))}
              {platform.thesis_confidence && (
                <Badge variant={platform.thesis_confidence === "high" ? "default" : "outline"}>
                  {platform.thesis_confidence} confidence
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {platform.website && (
              <Button variant="outline" size="sm" asChild>
                <a href={platform.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4 mr-2" />
                  Website
                </a>
              </Button>
            )}
            {platform.linkedin && (
              <Button variant="outline" size="sm" asChild>
                <a href={platform.linkedin} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
            )}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Platform</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Platform Name</Label>
                      <Input 
                        value={editData.name || ""} 
                        onChange={(e) => setEditData({...editData, name: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input 
                        value={editData.industry_vertical || ""} 
                        onChange={(e) => setEditData({...editData, industry_vertical: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input 
                        value={editData.website || ""} 
                        onChange={(e) => setEditData({...editData, website: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn</Label>
                      <Input 
                        value={editData.linkedin || ""} 
                        onChange={(e) => setEditData({...editData, linkedin: e.target.value})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Summary</Label>
                    <Textarea 
                      value={editData.business_summary || ""} 
                      onChange={(e) => setEditData({...editData, business_summary: e.target.value})} 
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thesis Summary</Label>
                    <Textarea 
                      value={editData.thesis_summary || ""} 
                      onChange={(e) => setEditData({...editData, thesis_summary: e.target.value})} 
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Revenue</Label>
                      <Input 
                        type="number"
                        value={editData.min_revenue || ""} 
                        onChange={(e) => setEditData({...editData, min_revenue: e.target.value ? Number(e.target.value) : null})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Revenue</Label>
                      <Input 
                        type="number"
                        value={editData.max_revenue || ""} 
                        onChange={(e) => setEditData({...editData, max_revenue: e.target.value ? Number(e.target.value) : null})} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min EBITDA</Label>
                      <Input 
                        type="number"
                        value={editData.min_ebitda || ""} 
                        onChange={(e) => setEditData({...editData, min_ebitda: e.target.value ? Number(e.target.value) : null})} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max EBITDA</Label>
                      <Input 
                        type="number"
                        value={editData.max_ebitda || ""} 
                        onChange={(e) => setEditData({...editData, max_ebitda: e.target.value ? Number(e.target.value) : null})} 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={saveChanges}>Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Revenue Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {formatRevenue(platform.min_revenue, platform.max_revenue, platform.revenue_sweet_spot) || "Not specified"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                EBITDA Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {formatRevenue(platform.min_ebitda, platform.max_ebitda, platform.ebitda_sweet_spot) || "Not specified"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Geography
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {platform.geographic_footprint?.slice(0, 2).join(", ") || "Not specified"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Industry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {platform.industry_vertical || "Not specified"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="criteria">Investment Criteria</TabsTrigger>
            <TabsTrigger value="pe-firm">PE Firm</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <BuyerDataSection title="Business Overview" icon={<Building2 className="w-4 h-4" />}>
              <DataGrid>
                <DataField label="Business Summary" value={platform.business_summary} />
                <DataField label="Services Offered" value={platform.services_offered} />
                <DataField label="Business Model" value={platform.business_model} />
                <DataField label="Specialized Focus" value={platform.specialized_focus} />
              </DataGrid>
            </BuyerDataSection>

            {platform.thesis_summary && (
              <BuyerDataSection title="Investment Thesis" icon={<Sparkles className="w-4 h-4" />}>
                <p className="text-sm">{platform.thesis_summary}</p>
              </BuyerDataSection>
            )}
          </TabsContent>

          <TabsContent value="criteria" className="space-y-4">
            <BuyerDataSection title="Size Criteria" icon={<BarChart3 className="w-4 h-4" />}>
              <DataGrid>
                <DataField 
                  label="Revenue Range" 
                  value={formatRevenue(platform.min_revenue, platform.max_revenue, platform.revenue_sweet_spot)} 
                />
                <DataField 
                  label="EBITDA Range" 
                  value={formatRevenue(platform.min_ebitda, platform.max_ebitda, platform.ebitda_sweet_spot)} 
                />
              </DataGrid>
            </BuyerDataSection>

            <BuyerDataSection title="Target Focus" icon={<Target className="w-4 h-4" />}>
              <DataGrid>
                <DataListField label="Target Services" items={platform.target_services} />
                <DataListField label="Target Industries" items={platform.target_industries} />
                <DataListField label="Geographic Footprint" items={platform.geographic_footprint} />
              </DataGrid>
            </BuyerDataSection>

            {platform.deal_breakers && platform.deal_breakers.length > 0 && (
              <BuyerDataSection title="Deal Breakers" icon={<Target className="w-4 h-4" />}>
                <DataListField label="Deal Breakers" items={platform.deal_breakers} />
              </BuyerDataSection>
            )}
          </TabsContent>

          <TabsContent value="pe-firm" className="space-y-4">
            {peFirm && (
              <BuyerDataSection title="PE Firm Details" icon={<Building2 className="w-4 h-4" />}>
                <DataGrid>
                  <DataField label="Firm Name" value={peFirm.name} />
                  <DataField label="Location" value={[peFirm.hq_city, peFirm.hq_state, peFirm.hq_country].filter(Boolean).join(", ")} />
                  <DataField label="Website" value={peFirm.website} type="url" />
                </DataGrid>
              </BuyerDataSection>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
