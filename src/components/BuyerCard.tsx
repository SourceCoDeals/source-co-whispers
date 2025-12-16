import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { Building2, MapPin, DollarSign, TrendingUp, Globe } from "lucide-react";

interface BuyerCardProps {
  buyer: any;
  view?: "compact" | "expanded";
}

export function BuyerCard({ buyer, view = "compact" }: BuyerCardProps) {
  const hasInvestmentCriteria = buyer.min_revenue || buyer.max_revenue || buyer.preferred_ebitda;
  const hasGeography = buyer.geographic_footprint?.length > 0 || buyer.geo_preferences;
  
  if (view === "compact") {
    return (
      <Link 
        to={`/buyers/${buyer.id}`} 
        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{buyer.pe_firm_name}</p>
            {buyer.addon_only && <Badge variant="outline" className="text-xs">Add-on Only</Badge>}
            {buyer.platform_only && <Badge variant="outline" className="text-xs">Platform Only</Badge>}
          </div>
          {buyer.platform_company_name && (
            <p className="text-sm text-muted-foreground truncate">{buyer.platform_company_name}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {buyer.geographic_footprint?.length > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {buyer.geographic_footprint.slice(0, 2).join(", ")}
                {buyer.geographic_footprint.length > 2 && ` +${buyer.geographic_footprint.length - 2}`}
              </span>
            )}
            {(buyer.min_revenue || buyer.max_revenue) && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {buyer.min_revenue && buyer.max_revenue 
                  ? `$${buyer.min_revenue}M-$${buyer.max_revenue}M`
                  : buyer.min_revenue 
                    ? `$${buyer.min_revenue}M+`
                    : `Up to $${buyer.max_revenue}M`
                }
              </span>
            )}
          </div>
        </div>
        <IntelligenceBadge buyer={buyer} />
      </Link>
    );
  }

  return (
    <Link 
      to={`/buyers/${buyer.id}`} 
      className="block p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{buyer.pe_firm_name}</p>
            {buyer.addon_only && <Badge variant="outline" className="text-xs">Add-on Only</Badge>}
            {buyer.platform_only && <Badge variant="outline" className="text-xs">Platform Only</Badge>}
          </div>
          {buyer.platform_company_name && (
            <p className="text-sm text-muted-foreground">{buyer.platform_company_name}</p>
          )}
        </div>
        <IntelligenceBadge buyer={buyer} />
      </div>
      
      {buyer.thesis_summary && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{buyer.thesis_summary}</p>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {hasGeography && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">Geography</p>
              <p className="font-medium">
                {buyer.geographic_footprint?.slice(0, 2).join(", ")}
                {buyer.geographic_footprint?.length > 2 && ` +${buyer.geographic_footprint.length - 2}`}
              </p>
            </div>
          </div>
        )}
        
        {hasInvestmentCriteria && (
          <div className="flex items-start gap-2">
            <DollarSign className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">Revenue Target</p>
              <p className="font-medium">
                {buyer.min_revenue && buyer.max_revenue 
                  ? `$${buyer.min_revenue}M-$${buyer.max_revenue}M`
                  : buyer.min_revenue 
                    ? `$${buyer.min_revenue}M+`
                    : buyer.max_revenue
                      ? `Up to $${buyer.max_revenue}M`
                      : "—"
                }
              </p>
            </div>
          </div>
        )}
        
        {buyer.preferred_ebitda && (
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">EBITDA</p>
              <p className="font-medium">{buyer.preferred_ebitda}%+</p>
            </div>
          </div>
        )}
        
        {buyer.services_offered && (
          <div className="flex items-start gap-2">
            <Building2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-muted-foreground">Services</p>
              <p className="font-medium truncate">{buyer.services_offered}</p>
            </div>
          </div>
        )}
      </div>
      
      {buyer.deal_breakers?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {buyer.deal_breakers.slice(0, 3).map((db: string, i: number) => (
            <Badge key={i} variant="destructive" className="text-xs">{db}</Badge>
          ))}
          {buyer.deal_breakers.length > 3 && (
            <Badge variant="outline" className="text-xs">+{buyer.deal_breakers.length - 3} more</Badge>
          )}
        </div>
      )}
    </Link>
  );
}
