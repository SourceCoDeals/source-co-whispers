import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Search, Loader2, Sparkles, Trash2, ExternalLink, Building2, MapPin, DollarSign, ArrowUp, ArrowDown, ArrowUpDown, GitMerge } from "lucide-react";
import { IntelligenceBadge } from "@/components/IntelligenceBadge";
import { BulkProgressBar } from "@/components/BulkProgressBar";
import { CSVImport } from "@/components/CSVImport";
import { AddBuyerDialog, DedupeDialog, InterruptedSessionBanner } from "@/components/tracker";

interface TrackerBuyersTabProps {
  trackerId: string;
  buyers: any[];
  search: string;
  onSearchChange: (search: string) => void;
  enrichingBuyers: Set<string>;
  isBulkEnriching: boolean;
  buyerEnrichmentProgress: { current: number; total: number };
  selectedBuyerIds: Set<string>;
  highlightedBuyerIds: Set<string>;
  onSelectBuyer: (buyerId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEnrichBuyer: (buyerId: string, buyerName: string) => void;
  onEnrichAll: () => void;
  onDeleteBuyer: (buyerId: string, buyerName: string) => void;
  onDeleteSelected: () => void;
  onAddBuyer: (buyer: { pe_firm_name: string; pe_firm_website: string; platform_company_name: string; platform_website: string }) => Promise<boolean>;
  onImportComplete: () => void;
  onCheckDuplicates: () => void;
  onExecuteDedupe: () => void;
  isDeduping: boolean;
  dedupeDialogOpen: boolean;
  onDedupeDialogOpenChange: (open: boolean) => void;
  dedupePreview: any;
  isResuming?: boolean;
  hasInterruptedSession: boolean;
  interruptedSessionInfo: { processed: number; remaining: number } | null;
  onResumeEnrichment: () => void;
  onDismissSession: () => void;
  buyerSortColumn: string;
  buyerSortDirection: "asc" | "desc";
  onSort: (column: string) => void;
}

// Helper functions
const isMeaningfulText = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  return !["not specified", "n/a", "na", "unknown", "none", "tbd"].includes(lower);
};

const isActuallyEnriched = (buyer: any): boolean => {
  return (
    isMeaningfulText(buyer.business_summary) ||
    isMeaningfulText(buyer.services_offered) ||
    isMeaningfulText(buyer.thesis_summary) ||
    isMeaningfulText(buyer.strategic_priorities) ||
    (Array.isArray(buyer.portfolio_companies) && buyer.portfolio_companies.length > 0) ||
    (Array.isArray(buyer.target_industries) && buyer.target_industries.length > 0) ||
    (Array.isArray(buyer.recent_acquisitions) && buyer.recent_acquisitions.length > 0)
  );
};

const hasWebsite = (buyer: any) => buyer.platform_website || buyer.pe_firm_website;

const getWebsiteUrl = (url: string | null) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://${url}`;
};

const getHQ = (buyer: any) => {
  if (buyer.hq_city && buyer.hq_state) return `${buyer.hq_city}, ${buyer.hq_state}`;
  if (buyer.hq_state) return buyer.hq_state;
  if (buyer.hq_city) return buyer.hq_city;
  return null;
};

const getDescription = (buyer: any) => {
  return buyer.business_summary || buyer.services_offered || null;
};

export function TrackerBuyersTab({
  trackerId,
  buyers,
  search,
  onSearchChange,
  enrichingBuyers,
  isBulkEnriching,
  buyerEnrichmentProgress,
  selectedBuyerIds,
  highlightedBuyerIds,
  onSelectBuyer,
  onSelectAll,
  onEnrichBuyer,
  onEnrichAll,
  onDeleteBuyer,
  onDeleteSelected,
  onAddBuyer,
  onImportComplete,
  onCheckDuplicates,
  onExecuteDedupe,
  isDeduping,
  dedupeDialogOpen,
  onDedupeDialogOpenChange,
  dedupePreview,
  hasInterruptedSession,
  interruptedSessionInfo,
  onResumeEnrichment,
  onDismissSession,
  buyerSortColumn,
  buyerSortDirection,
  isResuming = false,
  onSort,
}: TrackerBuyersTabProps) {

  // Filter and sort buyers
  const filteredBuyers = buyers.filter((b) =>
    b.pe_firm_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.platform_company_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const sortedBuyers = useMemo(() => {
    return [...filteredBuyers].sort((a, b) => {
      let aVal = "";
      let bVal = "";
      
      switch (buyerSortColumn) {
        case "platform_company_name":
          aVal = (a.platform_company_name || a.pe_firm_name || "").toLowerCase();
          bVal = (b.platform_company_name || b.pe_firm_name || "").toLowerCase();
          break;
        case "pe_firm_name":
          aVal = (a.pe_firm_name || "").toLowerCase();
          bVal = (b.pe_firm_name || "").toLowerCase();
          break;
        default:
          aVal = (a.platform_company_name || a.pe_firm_name || "").toLowerCase();
          bVal = (b.platform_company_name || b.pe_firm_name || "").toLowerCase();
      }
      
      return buyerSortDirection === "asc" 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    });
  }, [filteredBuyers, buyerSortColumn, buyerSortDirection]);

  // Calculate counts
  const unenrichedCount = buyers.filter((b) => hasWebsite(b) && !isActuallyEnriched(b)).length;
  const allSelected = sortedBuyers.length > 0 && sortedBuyers.every(b => selectedBuyerIds.has(b.id));

  // Sortable header component
  const BuyerSortableHeader = ({ column, children, className = "" }: { column: string; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {buyerSortColumn === column ? (
          buyerSortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Bulk Progress Bar */}
      <BulkProgressBar
        current={buyerEnrichmentProgress.current}
        total={buyerEnrichmentProgress.total}
        label="Enriching buyers"
        isVisible={isBulkEnriching}
      />

      {/* Interrupted Session Banner */}
      {hasInterruptedSession && interruptedSessionInfo && (
        <InterruptedSessionBanner
          processed={interruptedSessionInfo.processed}
          remaining={interruptedSessionInfo.remaining}
          onResume={onResumeEnrichment}
          onDismiss={onDismissSession}
          isResuming={isResuming}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search buyers..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary">{buyers.length} buyers</Badge>
        </div>
        <div className="flex items-center gap-2">
          <AddBuyerDialog
            onAdd={async (buyer) => {
              await onAddBuyer(buyer);
            }}
          />
          <CSVImport trackerId={trackerId} onComplete={onImportComplete} />
          <Button
            variant="outline"
            size="sm"
            onClick={onEnrichAll}
            disabled={isBulkEnriching || unenrichedCount === 0}
          >
            {isBulkEnriching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Enrich All
            {unenrichedCount > 0 && !isBulkEnriching && ` (${unenrichedCount})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCheckDuplicates}
            disabled={isDeduping}
          >
            {isDeduping ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4 mr-2" />
            )}
            Dedupe
          </Button>
          {selectedBuyerIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedBuyerIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Dedupe Dialog */}
      <DedupeDialog
        open={dedupeDialogOpen}
        onOpenChange={onDedupeDialogOpenChange}
        preview={dedupePreview}
        onExecute={onExecuteDedupe}
        isProcessing={isDeduping}
      />

      {/* Buyers Table */}
      {sortedBuyers.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
          {search ? "No buyers match your search" : "No buyers yet. Add buyers to start building your universe."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                />
              </TableHead>
              <BuyerSortableHeader column="platform_company_name" className="w-[250px]">Platform / Buyer</BuyerSortableHeader>
              <BuyerSortableHeader column="pe_firm_name" className="w-[200px]">PE Firm</BuyerSortableHeader>
              <TableHead className="w-[300px]">Description</TableHead>
              <TableHead className="w-[80px] text-center">Intel</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBuyers.map((buyer) => {
              const isHighlighted = highlightedBuyerIds.has(buyer.id);
              const isSelected = selectedBuyerIds.has(buyer.id);
              
              return (
                <TableRow 
                  key={buyer.id} 
                  className={`hover:bg-muted/50 cursor-pointer ${isHighlighted ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  onClick={() => window.location.href = `/buyers/${buyer.id}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onSelectBuyer(buyer.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {buyer.platform_website ? (
                          <a 
                            href={getWebsiteUrl(buyer.platform_website)!} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            {buyer.platform_company_name || buyer.pe_firm_name}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="font-medium">{buyer.platform_company_name || buyer.pe_firm_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isActuallyEnriched(buyer) && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Enriched
                          </Badge>
                        )}
                        {(buyer.has_fee_agreement || (buyer.fee_agreement_status && buyer.fee_agreement_status !== 'None')) && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <DollarSign className="w-3 h-3 mr-1" />
                            Fee Agreed
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {getHQ(buyer) || <span className="italic">Location not set</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {buyer.pe_firm_website ? (
                        <a 
                          href={getWebsiteUrl(buyer.pe_firm_website)!} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {buyer.pe_firm_name}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span>{buyer.pe_firm_name}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-3">{getDescription(buyer) || "—"}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <IntelligenceBadge buyer={buyer} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => onEnrichBuyer(buyer.id, buyer.platform_company_name || buyer.pe_firm_name)}
                              disabled={enrichingBuyers.has(buyer.id) || !hasWebsite(buyer)}
                            >
                              {enrichingBuyers.has(buyer.id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{hasWebsite(buyer) ? "Enrich with AI" : "No website to scrape"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Buyer</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {buyer.platform_company_name || buyer.pe_firm_name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDeleteBuyer(buyer.id, buyer.platform_company_name || buyer.pe_firm_name)}
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
