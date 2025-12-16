import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { MapPin, DollarSign, ExternalLink, Building2 } from "lucide-react";

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

  const getPlatformWebsite = () => {
    if (buyer.platform_website) {
      return buyer.platform_website.startsWith('http') ? buyer.platform_website : `https://${buyer.platform_website}`;
    }
    // Fallback to Google search
    return `https://www.google.com/search?q=${encodeURIComponent(buyer.platform_company_name || buyer.pe_firm_name)}`;
  };

  const getPEFirmWebsite = () => {
    // Google search for PE firm
    return `https://www.google.com/search?q=${encodeURIComponent(buyer.pe_firm_name + ' private equity')}`;
  };

  // Truncate services to first sentence or 80 chars
  const getServicesSummary = () => {
    if (!buyer.services_offered) return null;
    const text = buyer.services_offered;
    const firstSentence = text.split(/[.;]/)[0];
    if (firstSentence.length > 100) {
      return firstSentence.substring(0, 100) + '...';
    }
    return firstSentence;
  };

  if (view === "compact") {
    return (
      <div className="flex items-start justify-between p-4 hover:bg-muted/50 transition-colors group">
        <div className="flex-1 min-w-0">
          {/* Platform Company - Primary */}
          <div className="flex items-center gap-2">
            <Link to={`/buyers/${buyer.id}`} className="font-semibold hover:text-primary transition-colors">
              {buyer.platform_company_name || buyer.pe_firm_name}
            </Link>
            <a 
              href={getPlatformWebsite()} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              title="Visit platform website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          
          {/* PE Firm - Secondary */}
          {buyer.platform_company_name && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span>{buyer.pe_firm_name}</span>
              <a 
                href={getPEFirmWebsite()} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                title="Search PE firm"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          
          {/* Services Summary */}
          {buyer.services_offered && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {getServicesSummary()}
            </p>
          )}
          
          {/* Location & Revenue */}
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
        <Link to={`/buyers/${buyer.id}`}>
          <IntelligenceBadge buyer={buyer} />
        </Link>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="p-4 hover:bg-muted/50 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div>
          {/* Platform Company - Primary */}
          <div className="flex items-center gap-2">
            <Link to={`/buyers/${buyer.id}`} className="font-semibold text-lg hover:text-primary transition-colors">
              {buyer.platform_company_name || buyer.pe_firm_name}
            </Link>
            <a 
              href={getPlatformWebsite()} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-primary"
              title="Visit platform website"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            {buyer.addon_only && <Badge variant="outline" className="text-xs">Add-on Only</Badge>}
            {buyer.platform_only && <Badge variant="outline" className="text-xs">Platform Only</Badge>}
          </div>
          
          {/* PE Firm - Secondary */}
          {buyer.platform_company_name && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{buyer.pe_firm_name}</span>
              <a 
                href={getPEFirmWebsite()} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-primary"
                title="Search PE firm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
        <Link to={`/buyers/${buyer.id}`}>
          <IntelligenceBadge buyer={buyer} />
        </Link>
      </div>
      
      {/* Services Summary */}
      {buyer.services_offered && (
        <p className="text-sm text-muted-foreground mb-2">
          {buyer.services_offered}
        </p>
      )}
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
        <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-primary/30 pl-3">
          "{buyer.thesis_summary}"
        </p>
      )}
      
      {buyer.deal_breakers?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {buyer.deal_breakers.slice(0, 3).map((db: string, i: number) => (
            <Badge key={i} variant="destructive" className="text-xs">{db}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
