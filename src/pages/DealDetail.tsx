import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Users, ExternalLink, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<any>(null);
  const [tracker, setTracker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    const { data: dealData } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    setDeal(dealData);
    if (dealData) {
      const { data: trackerData } = await supabase.from("industry_trackers").select("*").eq("id", dealData.tracker_id).maybeSingle();
      setTracker(trackerData);
    }
    setIsLoading(false);
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  if (!deal) return <AppLayout><div className="text-center py-12">Deal not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{deal.deal_name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{tracker?.industry_name}</span>
              {deal.industry_type && <span>• {deal.industry_type}</span>}
            </div>
          </div>
          <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>{deal.status}</Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Deal Overview */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Deal Overview</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {deal.geography?.length > 0 && (
                <div>
                  <p className="text-muted-foreground">Geography</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {deal.geography.map((geo: string) => (
                      <Badge key={geo} variant="outline" className="text-xs">{geo}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {deal.revenue && (
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-medium">${deal.revenue}M</p>
                </div>
              )}
              {deal.ebitda_percentage && (
                <div>
                  <p className="text-muted-foreground">EBITDA Margin</p>
                  <p className="font-medium">{deal.ebitda_percentage}%</p>
                </div>
              )}
              {deal.business_model && (
                <div>
                  <p className="text-muted-foreground">Business Model</p>
                  <p className="font-medium">{deal.business_model}</p>
                </div>
              )}
            </div>
            {deal.service_mix && (
              <div>
                <p className="text-sm text-muted-foreground">Service Mix</p>
                <p className="text-sm mt-1">{deal.service_mix}</p>
              </div>
            )}
            {deal.company_website && (
              <div>
                <p className="text-sm text-muted-foreground">Company Website</p>
                <a 
                  href={deal.company_website.startsWith('http') ? deal.company_website : `https://${deal.company_website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  {deal.company_website} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Owner Goals & Requirements */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Owner Goals & Requirements</h2>
            {deal.owner_goals ? (
              <div>
                <p className="text-sm text-muted-foreground">Owner Goals</p>
                <p className="text-sm mt-1">{deal.owner_goals}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No owner goals specified</p>
            )}
            {deal.special_requirements && (
              <div>
                <p className="text-sm text-muted-foreground">Special Requirements</p>
                <p className="text-sm mt-1">{deal.special_requirements}</p>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Additional Information</h2>
            {deal.additional_info ? (
              <p className="text-sm">{deal.additional_info}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No additional information</p>
            )}
            {deal.transcript_link && (
              <div>
                <p className="text-sm text-muted-foreground">Transcript</p>
                <a 
                  href={deal.transcript_link.startsWith('http') ? deal.transcript_link : `https://${deal.transcript_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <FileText className="w-3 h-3" /> View Transcript
                </a>
              </div>
            )}
            <div className="pt-2 border-t flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Created: {format(new Date(deal.created_at), "MMM d, yyyy")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Updated: {format(new Date(deal.updated_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Actions</h2>
            <div className="space-y-3">
              <Button className="w-full" onClick={() => navigate(`/deals/${id}/matching`)}><Users className="w-4 h-4 mr-2" />View Buyer Matches</Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/deals/${id}/introductions`)}>Track Introductions</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
