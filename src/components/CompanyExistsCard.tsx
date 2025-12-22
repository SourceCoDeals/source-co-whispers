import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, DollarSign, MapPin } from "lucide-react";
import { format } from "date-fns";

interface DealHistoryItem {
  id: string;
  tracker_id: string;
  tracker_name: string;
  status: string | null;
  created_at: string;
}

interface CompanyExistsCardProps {
  company: {
    company_name: string;
    domain: string;
    revenue: number | null;
    geography: string[] | null;
    created_at: string;
  };
  dealHistory: DealHistoryItem[];
}

export function CompanyExistsCard({ company, dealHistory }: CompanyExistsCardProps) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-primary">Company Already Exists</h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <p className="font-medium">{company.company_name}</p>
        <p className="text-muted-foreground">{company.domain}</p>
        
        <div className="flex flex-wrap gap-3 text-muted-foreground">
          {company.revenue && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${company.revenue}M
            </span>
          )}
          {company.geography && company.geography.length > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {company.geography.join(", ")}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Added {format(new Date(company.created_at), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      {dealHistory.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Active in {dealHistory.length} buyer universe{dealHistory.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {dealHistory.map((deal) => (
              <Badge 
                key={deal.id} 
                variant={deal.status === "Active" ? "active" : "secondary"}
                className="text-xs"
              >
                {deal.tracker_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground pt-2">
        Adding this deal will link to the existing company record. All data will be shared across buyer universes.
      </p>
    </div>
  );
}
