import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { MapPin, DollarSign } from "lucide-react";

interface BuyerCardProps {
  buyer: any;
  view?: "compact" | "expanded";
}

export function BuyerCard({ buyer, view = "compact" }: BuyerCardProps) {
  const geography = buyer.geographic_footprint?.[0] || null;
  const hasRevenue = buyer.min_revenue || buyer.max_revenue;
  
  const formatRevenue = () => {
    if (buyer.min_revenue && buyer.max_revenue) {
      return `$${buyer.min_revenue}M-$${buyer.max_revenue}M`;
    }
    if (buyer.min_revenue) return `$${buyer.min_revenue}M+`;
    if (buyer.max_revenue) return `Up to $${buyer.max_revenue}M`;
    return null;
  };

  if (view === "compact") {
    return (
      <Link 
        to={`/buyers/${buyer.id}`} 
        className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{buyer.pe_firm_name}</p>
          </div>
          {buyer.platform_company_name && (
            <p className="text-sm text-muted-foreground">{buyer.platform_company_name}</p>
          )}
          <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
            {geography && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {geography}
              </span>
            )}
            {hasRevenue && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {formatRevenue()}
              </span>
            )}
          </div>
        </div>
        <IntelligenceBadge buyer={buyer} />
      </Link>
    );
  }

  // Expanded view
  return (
    <Link 
      to={`/buyers/${buyer.id}`} 
      className="block p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
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
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
        {geography && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {buyer.geographic_footprint?.join(", ")}
          </span>
        )}
        {hasRevenue && (
          <span className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" />
            {formatRevenue()}
          </span>
        )}
        {buyer.preferred_ebitda && (
          <span>{buyer.preferred_ebitda}% EBITDA</span>
        )}
      </div>

      {buyer.thesis_summary && (
        <p className="text-sm text-muted-foreground line-clamp-2">{buyer.thesis_summary}</p>
      )}
      
      {buyer.deal_breakers?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {buyer.deal_breakers.slice(0, 3).map((db: string, i: number) => (
            <Badge key={i} variant="destructive" className="text-xs">{db}</Badge>
          ))}
        </div>
      )}
    </Link>
  );
}
