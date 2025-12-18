import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Users, ExternalLink, FileText, Calendar, Building2, DollarSign, MapPin, Target, User, Phone, Mail, Briefcase, Clock, Hash } from "lucide-react";
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
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold">{deal.deal_name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>{tracker?.industry_name}</span>
              {deal.industry_type && <span>• {deal.industry_type}</span>}
            </div>
          </div>
          <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"} className="text-sm">{deal.status}</Badge>
        </div>

        {/* Row 1: Company Overview & Financial Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Company Overview */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Company Overview</h2>
            </div>
            <div className="space-y-3 text-sm">
              {deal.company_website && (
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Website</p>
                    <a 
                      href={deal.company_website.startsWith('http') ? deal.company_website : `https://${deal.company_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {deal.company_website}
                    </a>
                  </div>
                </div>
              )}
              {deal.headquarters && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Headquarters</p>
                    <p className="font-medium">{deal.headquarters}</p>
                  </div>
                </div>
              )}
              {deal.founded_year && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Founded</p>
                    <p className="font-medium">{deal.founded_year}</p>
                  </div>
                </div>
              )}
              {deal.employee_count && (
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Employees</p>
                    <p className="font-medium">{deal.employee_count}+</p>
                  </div>
                </div>
              )}
              {deal.industry_type && (
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Industry</p>
                    <p className="font-medium">{deal.industry_type}</p>
                  </div>
                </div>
              )}
              {!deal.company_website && !deal.headquarters && !deal.founded_year && !deal.employee_count && !deal.industry_type && (
                <p className="text-muted-foreground italic">No company information available</p>
              )}
            </div>
          </div>

          {/* Financial Overview */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <DollarSign className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Financial Overview</h2>
            </div>
            <div className="space-y-4">
              {deal.revenue && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Revenue</p>
                  <p className="text-3xl font-bold text-foreground">${deal.revenue}M</p>
                </div>
              )}
              {deal.ebitda_percentage && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">EBITDA Margin</p>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold text-foreground">{deal.ebitda_percentage}%</p>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${Math.min(deal.ebitda_percentage * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!deal.revenue && !deal.ebitda_percentage && (
                <p className="text-muted-foreground italic">No financial information available</p>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Executive Summary */}
        {deal.company_overview && (
          <div className="bg-card rounded-lg border p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Executive Summary</h2>
            </div>
            <p className="text-sm leading-relaxed">{deal.company_overview}</p>
          </div>
        )}

        {/* Row 3: Services & Business Model + Geographic Coverage */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Services & Business Model */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Briefcase className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Services & Business Model</h2>
            </div>
            <div className="space-y-3 text-sm">
              {deal.service_mix && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Service Mix</p>
                  <p>{deal.service_mix}</p>
                </div>
              )}
              {deal.business_model && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Business Model</p>
                  <Badge variant="outline">{deal.business_model}</Badge>
                </div>
              )}
              {!deal.service_mix && !deal.business_model && (
                <p className="text-muted-foreground italic">No service information available</p>
              )}
            </div>
          </div>

          {/* Geographic Coverage */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Geographic Coverage</h2>
            </div>
            {deal.geography?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {deal.geography.map((geo: string) => (
                  <Badge key={geo} variant="secondary" className="text-sm font-medium">{geo}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No geographic information available</p>
            )}
          </div>
        </div>

        {/* Row 4: Owner Goals & Transition */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Target className="w-5 h-5" />
            <h2 className="font-semibold text-lg">Owner Goals & Transition</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              {deal.owner_goals ? (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Owner Goals</p>
                  <p>{deal.owner_goals}</p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No owner goals specified</p>
              )}
            </div>
            <div className="space-y-3">
              {deal.special_requirements && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Special Requirements</p>
                  <p>{deal.special_requirements}</p>
                </div>
              )}
              {deal.ownership_structure && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Ownership Structure</p>
                  <p>{deal.ownership_structure}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: Primary Contact + Attachments & Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Primary Contact */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <User className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Primary Contact</h2>
            </div>
            <div className="space-y-3 text-sm">
              {deal.contact_name && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium">{deal.contact_name}</p>
                </div>
              )}
              {deal.contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${deal.contact_email}`} className="text-primary hover:underline">{deal.contact_email}</a>
                </div>
              )}
              {deal.contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${deal.contact_phone}`} className="text-primary hover:underline">{deal.contact_phone}</a>
                </div>
              )}
              {!deal.contact_name && !deal.contact_email && !deal.contact_phone && (
                <p className="text-muted-foreground italic">No contact information available</p>
              )}
            </div>
          </div>

          {/* Attachments & Actions */}
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Attachments & Actions</h2>
            </div>
            <div className="space-y-3">
              {deal.transcript_link && (
                <a 
                  href={deal.transcript_link.startsWith('http') ? deal.transcript_link : `https://${deal.transcript_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="w-4 h-4" /> View Call Transcript
                </a>
              )}
              <Button className="w-full" onClick={() => navigate(`/deals/${id}/matching`)}>
                <Users className="w-4 h-4 mr-2" />View Buyer Matches
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/deals/${id}/introductions`)}>
                Track Introductions
              </Button>
            </div>
          </div>
        </div>

        {/* Row 6: Additional Information */}
        {deal.additional_info && (
          <div className="bg-card rounded-lg border p-6 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Hash className="w-5 h-5" />
              <h2 className="font-semibold text-lg">Additional Information</h2>
            </div>
            <p className="text-sm">{deal.additional_info}</p>
          </div>
        )}

        {/* Footer: Timestamps */}
        <div className="flex items-center justify-end gap-6 text-xs text-muted-foreground border-t pt-4">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Created: {format(new Date(deal.created_at), "MMM d, yyyy")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Updated: {format(new Date(deal.updated_at), "MMM d, yyyy")}
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
