import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { BuyerDataSection } from "@/components/BuyerDataSection";
import { History, MapPin, Check, X, ArrowRight } from "lucide-react";

interface BuyerDealHistoryTabProps {
  dealHistory: any[];
  currentDealId?: string;
}

export function BuyerDealHistoryTab({ dealHistory, currentDealId }: BuyerDealHistoryTabProps) {
  if (dealHistory.length === 0) {
    return (
      <BuyerDataSection title="Deal History" icon={<History className="w-4 h-4 text-muted-foreground" />} isEmpty emptyMessage="No deals evaluated yet.">
        <div />
      </BuyerDataSection>
    );
  }

  return (
    <BuyerDataSection title={`Deal History (${dealHistory.length})`} icon={<History className="w-4 h-4 text-muted-foreground" />}>
      <div className="space-y-3">
        {dealHistory.map((record) => {
          const deal = record.deals;
          if (!deal) return null;
          
          const isCurrentDeal = deal.id === currentDealId;
          const status = record.selected_for_outreach 
            ? 'approved' 
            : record.passed_on_deal 
              ? 'passed' 
              : record.interested 
                ? 'interested' 
                : 'scored';
          
          return (
            <div 
              key={record.id} 
              className={`p-4 rounded-lg border transition-colors ${isCurrentDeal ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 hover:bg-muted/50'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link 
                      to={`/deals/${deal.id}`}
                      className="font-medium hover:underline text-primary"
                    >
                      {deal.deal_name}
                    </Link>
                    {isCurrentDeal && (
                      <Badge variant="default" className="text-xs">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Current
                      </Badge>
                    )}
                    {status === 'approved' && (
                      <Badge className="text-xs bg-green-600">
                        <Check className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    {status === 'passed' && (
                      <Badge variant="destructive" className="text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Passed
                      </Badge>
                    )}
                    {status === 'interested' && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                        Interested
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    {deal.geography?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {deal.geography.slice(0, 2).join(", ")}
                        {deal.geography.length > 2 && ` +${deal.geography.length - 2}`}
                      </span>
                    )}
                    {deal.revenue && (
                      <span>${deal.revenue}M revenue</span>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">{deal.status || 'Active'}</Badge>
                  </div>
                  
                  {/* Pass reason */}
                  {status === 'passed' && record.pass_reason && (
                    <div className="mt-2 text-sm text-destructive/80">
                      <span className="font-medium">Reason:</span> {record.pass_reason}
                      {record.pass_category && (
                        <Badge variant="outline" className="ml-2 text-xs capitalize">
                          {record.pass_category.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {record.pass_notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{record.pass_notes}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Fit reasoning */}
                  {record.fit_reasoning && status !== 'passed' && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {record.fit_reasoning}
                    </p>
                  )}
                </div>
                
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(record.composite_score || 0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(record.scored_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </BuyerDataSection>
  );
}
