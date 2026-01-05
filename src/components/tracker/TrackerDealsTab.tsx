import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, Trash2, Archive, TrendingUp, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { DealScoreBadge } from "@/components/DealScoreBadge";
import { BulkProgressBar } from "@/components/BulkProgressBar";
import { DealCSVImport } from "@/components/DealCSVImport";

interface TrackerDealsTabProps {
  trackerId: string;
  deals: any[];
  dealBuyerCounts: Record<string, { approved: number; interested: number; passed: number }>;
  enrichingDeals: Set<string>;
  isBulkEnrichingDeals: boolean;
  dealEnrichmentProgress: { current: number; total: number };
  isScoringAll: boolean;
  scoringProgress: { current: number; total: number };
  dealSortColumn: string;
  dealSortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  onEnrichDeal: (dealId: string, dealName: string) => void;
  onEnrichAllDeals: () => void;
  onScoreAllDeals: () => void;
  onArchiveDeal: (dealId: string, dealName: string) => void;
  onDeleteDeal: (dealId: string, dealName: string) => void;
  onImportComplete: () => void;
}

// Helper functions
const canEnrichDeal = (deal: any): boolean => {
  return !!(deal.transcript_link || deal.additional_info || deal.company_website);
};

const isDealEnriched = (deal: any): boolean => {
  return !!(
    deal.company_overview ||
    deal.service_mix ||
    deal.business_model ||
    (deal.geography && deal.geography.length > 0)
  );
};

export function TrackerDealsTab({
  trackerId,
  deals,
  dealBuyerCounts,
  enrichingDeals,
  isBulkEnrichingDeals,
  dealEnrichmentProgress,
  isScoringAll,
  scoringProgress,
  dealSortColumn,
  dealSortDirection,
  onSort,
  onEnrichDeal,
  onEnrichAllDeals,
  onScoreAllDeals,
  onArchiveDeal,
  onDeleteDeal,
  onImportComplete,
}: TrackerDealsTabProps) {
  const navigate = useNavigate();

  // Sorted deals
  const sortedDeals = useMemo(() => {
    return [...deals].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (dealSortColumn) {
        case "deal_name":
          aVal = a.deal_name?.toLowerCase() || "";
          bVal = b.deal_name?.toLowerCase() || "";
          break;
        case "geography":
          aVal = a.geography?.join(", ")?.toLowerCase() || "";
          bVal = b.geography?.join(", ")?.toLowerCase() || "";
          break;
        case "approved":
          aVal = dealBuyerCounts[a.id]?.approved || 0;
          bVal = dealBuyerCounts[b.id]?.approved || 0;
          break;
        case "interested":
          aVal = dealBuyerCounts[a.id]?.interested || 0;
          bVal = dealBuyerCounts[b.id]?.interested || 0;
          break;
        case "passed":
          aVal = dealBuyerCounts[a.id]?.passed || 0;
          bVal = dealBuyerCounts[b.id]?.passed || 0;
          break;
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "revenue":
          aVal = a.revenue || 0;
          bVal = b.revenue || 0;
          break;
        case "ebitda":
          aVal = a.ebitda_amount || a.ebitda_percentage || 0;
          bVal = b.ebitda_amount || b.ebitda_percentage || 0;
          break;
        case "deal_score":
        default:
          aVal = a.deal_score || 0;
          bVal = b.deal_score || 0;
          break;
      }

      if (typeof aVal === "string") {
        return dealSortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return dealSortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [deals, dealSortColumn, dealSortDirection, dealBuyerCounts]);

  // Sortable header component
  const SortableHeader = ({ column, children, className = "" }: { column: string; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {dealSortColumn === column ? (
          dealSortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Bulk Progress Bars */}
      <BulkProgressBar
        current={dealEnrichmentProgress.current}
        total={dealEnrichmentProgress.total}
        label="Enriching deals"
        isVisible={isBulkEnrichingDeals}
      />
      <BulkProgressBar
        current={scoringProgress.current}
        total={scoringProgress.total}
        label="Scoring deals"
        isVisible={isScoringAll}
      />

      {/* Toolbar */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {deals.length} deals
          </span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onScoreAllDeals}
            disabled={isScoringAll || deals.length === 0}
          >
            {isScoringAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scoring {scoringProgress.current} of {scoringProgress.total}...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Score All Deals
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={onEnrichAllDeals}
            disabled={isBulkEnrichingDeals || deals.length === 0}
          >
            {isBulkEnrichingDeals ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enriching {dealEnrichmentProgress.current} of {dealEnrichmentProgress.total}...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Enrich All Deals
              </>
            )}
          </Button>
          <DealCSVImport trackerId={trackerId} onComplete={onImportComplete} />
        </div>
      </div>

      {/* Deals Table */}
      {deals.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
          No deals yet. List a deal to match it with buyers.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="deal_name" className="w-[200px]">Deal Name</SortableHeader>
              <SortableHeader column="geography" className="w-[150px]">Service Area</SortableHeader>
              <SortableHeader column="approved" className="w-[80px] text-center">Approved</SortableHeader>
              <SortableHeader column="interested" className="w-[80px] text-center">Interested</SortableHeader>
              <SortableHeader column="passed" className="w-[80px] text-center">Passed</SortableHeader>
              <SortableHeader column="created_at" className="w-[100px]">Date Added</SortableHeader>
              <SortableHeader column="revenue" className="w-[90px] text-right">Revenue</SortableHeader>
              <SortableHeader column="ebitda" className="w-[90px] text-right">EBITDA</SortableHeader>
              <SortableHeader column="deal_score" className="w-[90px] text-center">Score</SortableHeader>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDeals.map((deal) => {
              const counts = dealBuyerCounts[deal.id] || { approved: 0, interested: 0, passed: 0 };
              const dateAdded = new Date(deal.created_at).toLocaleDateString("en-US", { 
                month: "short", 
                day: "numeric", 
                year: "numeric" 
              });
              
              return (
                <TableRow key={deal.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/deals/${deal.id}`} className="flex items-center gap-2 hover:underline">
                      <span className="font-medium">{deal.deal_name}</span>
                      {isDealEnriched(deal) && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Enriched
                        </Badge>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {deal.geography?.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {counts.approved > 0 ? (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                        {counts.approved}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {counts.interested > 0 ? (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                        {counts.interested}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {counts.passed > 0 ? (
                      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">
                        {counts.passed}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dateAdded}</TableCell>
                  <TableCell className="text-right text-sm">
                    {deal.revenue ? `$${deal.revenue}M` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {deal.ebitda_amount ? `$${deal.ebitda_amount.toFixed(1)}M` : deal.ebitda_percentage ? `${deal.ebitda_percentage}%` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {deal.deal_score ? <DealScoreBadge score={deal.deal_score} size="sm" /> : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"} className="mr-1">
                        {deal.status}
                      </Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => onEnrichDeal(deal.id, deal.deal_name)}
                              disabled={enrichingDeals.has(deal.id) || !canEnrichDeal(deal)}
                            >
                              {enrichingDeals.has(deal.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{canEnrichDeal(deal) ? "Enrich deal" : "No data sources to enrich from"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => onArchiveDeal(deal.id, deal.deal_name)}
                              disabled={deal.status === "Archived"}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{deal.status === "Archived" ? "Already archived" : "Archive deal"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Deal?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{deal.deal_name}" and all related data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteDeal(deal.id, deal.deal_name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
