import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, MoreHorizontal, Archive, Trash2, ArrowUp, ArrowDown, Sparkles, ThumbsUp, ThumbsDown, UserCheck, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { normalizeDomain } from "@/lib/normalizeDomain";
import { deleteDealWithRelated } from "@/lib/cascadeDelete";
import { DealScoreBadge } from "@/components/DealScoreBadge";
import { DealFiltersBar } from "@/components/DealFiltersBar";
import { TimeframeOption, getDateRange } from "@/components/TimeframeFilter";

type SortColumn = "deal_name" | "tracker" | "geography" | "revenue" | "ebitda" | "score" | "date";
type SortDirection = "asc" | "desc";

interface BuyerCounts {
  approved: number;
  interested: number;
  passed: number;
}

export default function AllDeals() {
  const [deals, setDeals] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<Record<string, any>>({});
  const [buyerCounts, setBuyerCounts] = useState<Record<string, BuyerCounts>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dealDeleteDialogOpen, setDealDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<{ id: string; name: string } | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTracker, setSelectedTracker] = useState("all");
  const [scoreRange, setScoreRange] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeframe, setTimeframe] = useState<TimeframeOption>("all");
  
  const { toast } = useToast();

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    const [dealsRes, trackersRes, scoresRes] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("industry_trackers").select("id, industry_name"),
      supabase.from("buyer_deal_scores").select("deal_id, selected_for_outreach, interested, passed_on_deal"),
    ]);
    
    setDeals(dealsRes.data || []);
    
    const trackerMap: Record<string, any> = {};
    (trackersRes.data || []).forEach((t) => { trackerMap[t.id] = t; });
    setTrackers(trackerMap);
    
    // Aggregate buyer counts per deal
    const counts: Record<string, BuyerCounts> = {};
    (scoresRes.data || []).forEach((score) => {
      if (!counts[score.deal_id]) {
        counts[score.deal_id] = { approved: 0, interested: 0, passed: 0 };
      }
      if (score.selected_for_outreach) counts[score.deal_id].approved++;
      if (score.interested) counts[score.deal_id].interested++;
      if (score.passed_on_deal) counts[score.deal_id].passed++;
    });
    setBuyerCounts(counts);
    
    setIsLoading(false);
  };

  const archiveDeal = async (e: React.MouseEvent, dealId: string, dealName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { error } = await supabase.from("deals").update({ status: "Archived" }).eq("id", dealId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deal archived", description: `${dealName} has been archived` });
    loadDeals();
  };

  const confirmDeleteDeal = (e: React.MouseEvent, dealId: string, dealName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDealToDelete({ id: dealId, name: dealName });
    setDealDeleteDialogOpen(true);
  };

  const deleteDeal = async () => {
    if (!dealToDelete) return;
    
    const { error } = await deleteDealWithRelated(dealToDelete.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deal deleted", description: `${dealToDelete.name} has been deleted` });
      loadDeals();
    }
    
    setDealDeleteDialogOpen(false);
    setDealToDelete(null);
  };

  // Filter deals based on all criteria
  const filteredDeals = useMemo(() => {
    const { start } = getDateRange(timeframe);
    
    return deals.filter((deal) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = deal.deal_name?.toLowerCase().includes(query);
        const matchesDomain = normalizeDomain(deal.company_website)?.toLowerCase().includes(query);
        const matchesGeo = deal.geography?.some((g: string) => g.toLowerCase().includes(query));
        if (!matchesName && !matchesDomain && !matchesGeo) return false;
      }
      
      // Tracker filter
      if (selectedTracker !== "all" && deal.tracker_id !== selectedTracker) return false;
      
      // Score range filter
      if (scoreRange !== "all") {
        const score = deal.deal_score;
        if (scoreRange === "high" && (score === null || score < 70)) return false;
        if (scoreRange === "medium" && (score === null || score < 40 || score >= 70)) return false;
        if (scoreRange === "low" && (score === null || score >= 40)) return false;
        if (scoreRange === "unscored" && score !== null) return false;
      }
      
      // Status filter
      if (statusFilter !== "all" && deal.status !== statusFilter) return false;
      
      // Timeframe filter
      if (start) {
        const dealDate = new Date(deal.created_at);
        if (dealDate < start) return false;
      }
      
      return true;
    });
  }, [deals, searchQuery, selectedTracker, scoreRange, statusFilter, timeframe]);

  // Sort filtered deals
  const sortedDeals = useMemo(() => {
    return [...filteredDeals].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortColumn) {
        case "deal_name":
          aVal = a.deal_name?.toLowerCase() || "";
          bVal = b.deal_name?.toLowerCase() || "";
          break;
        case "tracker":
          aVal = trackers[a.tracker_id]?.industry_name?.toLowerCase() || "";
          bVal = trackers[b.tracker_id]?.industry_name?.toLowerCase() || "";
          break;
        case "geography":
          aVal = a.geography?.[0]?.toLowerCase() || "";
          bVal = b.geography?.[0]?.toLowerCase() || "";
          break;
        case "revenue":
          aVal = a.revenue ?? -1;
          bVal = b.revenue ?? -1;
          break;
        case "ebitda":
          aVal = a.ebitda_amount ?? -1;
          bVal = b.ebitda_amount ?? -1;
          break;
        case "score":
          aVal = a.deal_score ?? -1;
          bVal = b.deal_score ?? -1;
          break;
        case "date":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? comparison : -comparison;
      }
      
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredDeals, sortColumn, sortDirection, trackers]);

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const SortableHeader = ({ column, children, className = "" }: { column: SortColumn; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => toggleSort(column)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        {sortColumn === column ? (
          sortDirection === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </button>
    </TableHead>
  );

  const hasActiveFilters = searchQuery !== "" || selectedTracker !== "all" || scoreRange !== "all" || statusFilter !== "all" || timeframe !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTracker("all");
    setScoreRange("all");
    setStatusFilter("all");
    setTimeframe("all");
  };

  const trackerList = Object.values(trackers).map((t) => ({ id: t.id, industry_name: t.industry_name }));

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return `$${value.toFixed(1)}M`;
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }

  const uniqueTrackers = new Set(filteredDeals.map(d => d.tracker_id)).size;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold">All Deals</h1>
              <p className="text-muted-foreground">
                {filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'} across {uniqueTrackers} buyer universe{uniqueTrackers !== 1 ? 's' : ''}
                {hasActiveFilters && <span className="text-primary"> (filtered)</span>}
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <DealFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTracker={selectedTracker}
            onTrackerChange={setSelectedTracker}
            trackers={trackerList}
            scoreRange={scoreRange}
            onScoreRangeChange={setScoreRange}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {filteredDeals.length === 0 ? (
            <div className="bg-card rounded-lg border p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">{deals.length === 0 ? "No deals yet" : "No deals match your filters"}</h3>
              <p className="text-muted-foreground">
                {deals.length === 0 
                  ? "List a deal in a buyer universe to get started."
                  : "Try adjusting your search or filter criteria."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableHeader column="deal_name">Deal Name</SortableHeader>
                    <SortableHeader column="tracker">Buyer Universe</SortableHeader>
                    <TableHead className="max-w-[250px]">Description</TableHead>
                    <SortableHeader column="geography">Geography</SortableHeader>
                    <SortableHeader column="revenue" className="text-right">Revenue</SortableHeader>
                    <SortableHeader column="ebitda" className="text-right">EBITDA</SortableHeader>
                    <SortableHeader column="score" className="text-right">Score</SortableHeader>
                    <TableHead className="text-center">Engagement</TableHead>
                    <SortableHeader column="date">Added</SortableHeader>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDeals.map((deal) => {
                    const tracker = trackers[deal.tracker_id];
                    const counts = buyerCounts[deal.id] || { approved: 0, interested: 0, passed: 0 };
                    const isEnriched = !!deal.last_enriched_at;
                    
                    return (
                      <TableRow key={deal.id} className="group">
                        {/* Deal Name */}
                        <TableCell className="font-medium">
                          <Link to={`/deals/${deal.id}`} className="hover:text-primary transition-colors flex items-center gap-2">
                            {deal.deal_name}
                            {isEnriched && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent>Enriched on {new Date(deal.last_enriched_at).toLocaleDateString()}</TooltipContent>
                              </Tooltip>
                            )}
                          </Link>
                          {deal.company_website && (
                            <span className="text-xs text-muted-foreground">{normalizeDomain(deal.company_website)}</span>
                          )}
                        </TableCell>
                        
                        {/* Buyer Universe */}
                        <TableCell>
                          <Link 
                            to={`/trackers/${deal.tracker_id}`} 
                            className="text-sm text-primary hover:underline"
                          >
                            {tracker?.industry_name || "Unknown"}
                          </Link>
                        </TableCell>
                        
                        {/* Description */}
                        <TableCell className="max-w-[250px]">
                          {deal.company_overview ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-muted-foreground truncate block cursor-default">
                                  {deal.company_overview}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p className="text-sm">{deal.company_overview}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        
                        {/* Geography */}
                        <TableCell className="text-muted-foreground">
                          {deal.geography?.length > 0 ? (
                            <span className="text-sm">{deal.geography.slice(0, 2).join(", ")}{deal.geography.length > 2 && ` +${deal.geography.length - 2}`}</span>
                          ) : "—"}
                        </TableCell>
                        
                        {/* Revenue */}
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(deal.revenue)}
                        </TableCell>
                        
                        {/* EBITDA */}
                        <TableCell className="text-right tabular-nums">
                          {deal.ebitda_amount ? formatCurrency(deal.ebitda_amount) : deal.ebitda_percentage ? `${deal.ebitda_percentage}%` : "—"}
                        </TableCell>
                        
                        {/* Score */}
                        <TableCell className="text-right">
                          <DealScoreBadge score={deal.deal_score} size="sm" />
                        </TableCell>
                        
                        {/* Engagement */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-sm">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className={counts.approved > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                                    {counts.approved}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Approved for outreach</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-sm">
                                  <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
                                  <span className={counts.interested > 0 ? "text-blue-600 font-medium" : "text-muted-foreground"}>
                                    {counts.interested}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Buyers interested</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-sm">
                                  <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                                  <span className={counts.passed > 0 ? "text-rose-500" : "text-muted-foreground"}>
                                    {counts.passed}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Buyers passed</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        
                        {/* Date Added */}
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(deal.created_at).toLocaleDateString()}
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell>
                          <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>
                            {deal.status}
                          </Badge>
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => archiveDeal(e, deal.id, deal.deal_name)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => confirmDeleteDeal(e, deal.id, deal.deal_name)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <AlertDialog open={dealDeleteDialogOpen} onOpenChange={setDealDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {dealToDelete?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this deal and all associated data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteDeal} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </AppLayout>
  );
}
