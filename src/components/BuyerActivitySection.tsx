import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, ThumbsUp, XCircle, ChevronDown, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface BuyerScore {
  id: string;
  selected_for_outreach: boolean | null;
  interested: boolean | null;
  interested_at: string | null;
  passed_on_deal: boolean | null;
  pass_reason: string | null;
  pass_category: string | null;
  passed_at: string | null;
  buyer_id: string;
  buyer: {
    id: string;
    pe_firm_name: string;
    platform_company_name: string | null;
  } | null;
}

interface BuyerActivitySectionProps {
  dealId: string;
}

export function BuyerActivitySection({ dealId }: BuyerActivitySectionProps) {
  const navigate = useNavigate();
  const [scores, setScores] = useState<BuyerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvedOpen, setApprovedOpen] = useState(true);
  const [interestedOpen, setInterestedOpen] = useState(true);
  const [passedOpen, setPassedOpen] = useState(true);

  useEffect(() => {
    loadScores();
  }, [dealId]);

  const loadScores = async () => {
    const { data, error } = await supabase
      .from("buyer_deal_scores")
      .select(`
        id,
        selected_for_outreach,
        interested,
        interested_at,
        passed_on_deal,
        pass_reason,
        pass_category,
        passed_at,
        buyer_id,
        buyers:buyer_id (
          id,
          pe_firm_name,
          platform_company_name
        )
      `)
      .eq("deal_id", dealId);

    if (!error && data) {
      const mapped = data.map((item: any) => ({
        ...item,
        buyer: item.buyers,
      }));
      setScores(mapped);
    }
    setIsLoading(false);
  };

  const approved = scores.filter(s => s.selected_for_outreach);
  const interested = scores.filter(s => s.interested && !s.selected_for_outreach);
  const passed = scores.filter(s => s.passed_on_deal);

  if (isLoading) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading buyer history...</span>
        </div>
      </div>
    );
  }

  if (approved.length === 0 && interested.length === 0 && passed.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Buyer History</h3>
      </div>
      <p className="text-sm text-muted-foreground">No buyer history recorded yet. View buyer matches to start outreach.</p>
      </div>
    );
  }

  const BuyerRow = ({ score, showDate, dateLabel }: { score: BuyerScore; showDate?: string | null; dateLabel?: string }) => (
    <div
      className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded cursor-pointer"
      onClick={() => navigate(`/buyers/${score.buyer_id}`)}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{score.buyer?.pe_firm_name}</span>
        {score.buyer?.platform_company_name && (
          <>
            <span className="text-muted-foreground">→</span>
            <span className="text-sm text-muted-foreground">{score.buyer.platform_company_name}</span>
          </>
        )}
      </div>
      {showDate && (
        <span className="text-xs text-muted-foreground">
          {dateLabel}: {format(new Date(showDate), "MMM d, yyyy")}
        </span>
      )}
    </div>
  );

  const PassedBuyerRow = ({ score }: { score: BuyerScore }) => (
    <div
      className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded cursor-pointer"
      onClick={() => navigate(`/buyers/${score.buyer_id}`)}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{score.buyer?.pe_firm_name}</span>
        {score.buyer?.platform_company_name && (
          <>
            <span className="text-muted-foreground">→</span>
            <span className="text-sm text-muted-foreground">{score.buyer.platform_company_name}</span>
          </>
        )}
        {score.pass_category && (
          <Badge variant="outline" className="text-xs">{score.pass_category}</Badge>
        )}
      </div>
      {score.passed_at && (
        <span className="text-xs text-muted-foreground">
          {format(new Date(score.passed_at), "MMM d, yyyy")}
        </span>
      )}
    </div>
  );

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Buyer History</h3>
      </div>

      {/* Approved for Outreach */}
      {approved.length > 0 && (
        <Collapsible open={approvedOpen} onOpenChange={setApprovedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2">
            {approvedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="font-medium text-sm">Approved for Outreach</span>
            <Badge variant="success" className="ml-auto">{approved.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 space-y-1">
            {approved.map(score => (
              <BuyerRow key={score.id} score={score} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Interested */}
      {interested.length > 0 && (
        <Collapsible open={interestedOpen} onOpenChange={setInterestedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2">
            {interestedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <ThumbsUp className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-sm">Interested</span>
            <Badge variant="info" className="ml-auto">{interested.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 space-y-1">
            {interested.map(score => (
              <BuyerRow key={score.id} score={score} showDate={score.interested_at} dateLabel="Interested" />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Passed */}
      {passed.length > 0 && (
        <Collapsible open={passedOpen} onOpenChange={setPassedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2">
            {passedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="font-medium text-sm">Passed</span>
            <Badge variant="destructive" className="ml-auto">{passed.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 space-y-1">
            {passed.map(score => (
              <PassedBuyerRow key={score.id} score={score} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
