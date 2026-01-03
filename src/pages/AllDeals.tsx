import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, FileText, ChevronRight, MoreHorizontal, Archive, Trash2, Building2, Globe, ArrowUp, ArrowDown, Sparkles, Users, ThumbsUp, ThumbsDown, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { normalizeDomain } from "@/lib/normalizeDomain";
import { deleteDealWithRelated } from "@/lib/cascadeDelete";
import { DealScoreBadge } from "@/components/DealScoreBadge";
import { DealFiltersBar } from "@/components/DealFiltersBar";
import { TimeframeOption, getDateRange } from "@/components/TimeframeFilter";

type SortOption = "date" | "score";
type SortDirection = "asc" | "desc";

interface BuyerCounts {
  approved: number;
  interested: number;
  passed: number;
}

interface CompanyGroup {
  companyId: string | null;
  companyName: string;
  domain: string | null;
  deals: any[];
  revenue: number | null;
  geography: string[] | null;
}

export default function AllDeals() {
  const [deals, setDeals] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<Record<string, any>>({});
  const [buyerCounts, setBuyerCounts] = useState<Record<string, BuyerCounts>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyGroup | null>(null);
  const [dealDeleteDialogOpen, setDealDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<{ id: string; name: string } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("score");
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

  const archiveCompany = async (group: CompanyGroup) => {
    const dealIds = group.deals.map(d => d.id);
    const { error } = await supabase.from("deals").update({ status: "Archived" }).in("id", dealIds);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    
    toast({ 
      title: "Company archived", 
      description: `${group.companyName} has been archived from ${group.deals.length} universe${group.deals.length > 1 ? 's' : ''}` 
    });
    loadDeals();
  };

  const confirmDeleteCompany = (group: CompanyGroup) => {
    setCompanyToDelete(group);
    setDeleteDialogOpen(true);
  };

  const deleteCompany = async () => {
    if (!companyToDelete) return;
    
    let hasError = false;
    
    for (const deal of companyToDelete.deals) {
      const { error } = await deleteDealWithRelated(deal.id);
      if (error) {
        hasError = true;
        toast({ title: "Error", description: error.message, variant: "destructive" });
        break;
      }
    }
    
    if (!hasError) {
      if (companyToDelete.companyId) {
        await supabase.from("companies").delete().eq("id", companyToDelete.companyId);
      }
      
      toast({ 
        title: "Company deleted", 
        description: `${companyToDelete.companyName} has been permanently deleted` 
      });
      loadDeals();
    }
    
    setDeleteDialogOpen(false);
    setCompanyToDelete(null);
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

  // Group filtered deals by company
  const companyGroups = useMemo((): CompanyGroup[] => {
    const groups: Record<string, CompanyGroup> = {};
    
    filteredDeals.forEach((deal) => {
      const groupKey = deal.company_id || normalizeDomain(deal.company_website) || `deal-${deal.id}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          companyId: deal.company_id,
          companyName: deal.deal_name,
          domain: normalizeDomain(deal.company_website),
          deals: [],
          revenue: deal.revenue,
          geography: deal.geography,
        };
      }
      groups[groupKey].deals.push(deal);
    });

    return Object.values(groups).sort((a, b) => {
      if (sortBy === "score") {
        const aMaxScore = Math.max(...a.deals.map(d => d.deal_score ?? -1));
        const bMaxScore = Math.max(...b.deals.map(d => d.deal_score ?? -1));
        return sortDirection === "desc" ? bMaxScore - aMaxScore : aMaxScore - bMaxScore;
      } else {
        const aLatest = Math.max(...a.deals.map(d => new Date(d.created_at).getTime()));
        const bLatest = Math.max(...b.deals.map(d => new Date(d.created_at).getTime()));
        return sortDirection === "desc" ? bLatest - aLatest : aLatest - bLatest;
      }
    });
  }, [filteredDeals, sortBy, sortDirection]);

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(option);
      setSortDirection("desc");
    }
  };

  const hasActiveFilters = searchQuery !== "" || selectedTracker !== "all" || scoreRange !== "all" || statusFilter !== "all" || timeframe !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTracker("all");
    setScoreRange("all");
    setStatusFilter("all");
    setTimeframe("all");
  };

  const trackerList = Object.values(trackers).map((t) => ({ id: t.id, industry_name: t.industry_name }));

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin" /></div></AppLayout>;
  }

  const uniqueCompanies = companyGroups.length;
  const totalTrackers = new Set(filteredDeals.map(d => d.tracker_id)).size;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold">All Deals</h1>
              <p className="text-muted-foreground">
                {uniqueCompanies} {uniqueCompanies === 1 ? 'company' : 'companies'} across {totalTrackers} buyer universe{totalTrackers !== 1 ? 's' : ''}
                {hasActiveFilters && <span className="text-primary"> (filtered)</span>}
              </p>
            </div>
            
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Button
                variant={sortBy === "score" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("score")}
                className="gap-1"
              >
                Score
                {sortBy === "score" && (
                  sortDirection === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant={sortBy === "date" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("date")}
                className="gap-1"
              >
                Date
                {sortBy === "date" && (
                  sortDirection === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                )}
              </Button>
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
            <div className="space-y-4">
              {companyGroups.map((group) => {
                const isMultiTracker = group.deals.length > 1;
                const bestScore = Math.max(...group.deals.map(d => d.deal_score ?? -1));
                
                return (
                  <div key={group.companyId || group.domain || group.deals[0].id} className="bg-card rounded-lg border overflow-hidden">
                    {/* Company Header */}
                    <div className="p-4 bg-muted/30 border-b">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="font-semibold truncate">{group.companyName}</h2>
                            {isMultiTracker && (
                              <Badge variant="secondary" className="text-xs">
                                {group.deals.length} universes
                              </Badge>
                            )}
                            {isMultiTracker && bestScore >= 0 && (
                              <DealScoreBadge score={bestScore} size="sm" showLabel />
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {group.domain && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {group.domain}
                              </span>
                            )}
                            {group.revenue && <span>${group.revenue}M</span>}
                            {group.geography?.length > 0 && <span>{group.geography.join(", ")}</span>}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => archiveCompany(group)}>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive from all universes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => confirmDeleteCompany(group)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Deals in this company */}
                    <div className="divide-y">
                      {group.deals.map((deal) => {
                        const tracker = trackers[deal.tracker_id];
                        const counts = buyerCounts[deal.id] || { approved: 0, interested: 0, passed: 0 };
                        const isEnriched = !!deal.last_enriched_at;
                        
                        return (
                          <div key={deal.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
                            <Link to={`/deals/${deal.id}`} className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-primary">
                                  {tracker?.industry_name || "Unknown"}
                                </span>
                                {isEnriched && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="secondary" className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                        <Sparkles className="w-3 h-3" />
                                        Enriched
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Enriched on {new Date(deal.last_enriched_at).toLocaleDateString()}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                              {isMultiTracker && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Listed {new Date(deal.created_at).toLocaleDateString()}
                                </p>
                              )}
                            </Link>
                            
                            {/* Buyer Counts */}
                            <div className="flex items-center gap-4 mr-4">
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

                            <div className="flex items-center gap-3">
                              <DealScoreBadge score={deal.deal_score} size="sm" />
                              <Badge variant={deal.status === "Active" ? "active" : deal.status === "Closed" ? "closed" : "dead"}>{deal.status}</Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {companyToDelete?.companyName}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this company and remove it from {companyToDelete?.deals.length} buyer universe{companyToDelete?.deals.length !== 1 ? 's' : ''}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteCompany} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
