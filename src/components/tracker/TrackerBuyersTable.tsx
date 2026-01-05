import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IntelligenceBadge } from '@/components/IntelligenceBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/alert-dialog';
import { Loader2, ExternalLink, Building2, MapPin, Sparkles, FileCheck, MoreHorizontal, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

// Use a more permissive type that works with the Supabase row data
interface BuyerRow {
  id: string;
  pe_firm_name: string;
  platform_company_name: string | null;
  platform_website: string | null;
  pe_firm_website: string | null;
  hq_city: string | null;
  hq_state: string | null;
  has_fee_agreement: boolean | null;
  business_summary: string | null;
  services_offered: string | null;
  thesis_summary: string | null;
  strategic_priorities: string | null;
  portfolio_companies: string[] | null;
  target_industries: string[] | null;
  recent_acquisitions: unknown;
}

export interface TrackerBuyersTableProps {
  buyers: BuyerRow[];
  selectedIds: Set<string>;
  enrichingIds: Set<string>;
  highlightedIds: Set<string>;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  onSelectBuyer: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onEnrichBuyer: (id: string, name: string) => void;
  onDeleteBuyer: (id: string, name: string) => void;
}

// Helper functions
const getWebsiteUrl = (url: string | null) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://${url}`;
};

const getHQ = (buyer: BuyerRow) => {
  if (buyer.hq_city && buyer.hq_state) return `${buyer.hq_city}, ${buyer.hq_state}`;
  if (buyer.hq_state) return buyer.hq_state;
  if (buyer.hq_city) return buyer.hq_city;
  return null;
};

const getDescription = (buyer: BuyerRow) => {
  return buyer.business_summary || buyer.services_offered || null;
};

const hasWebsite = (buyer: BuyerRow) => buyer.platform_website || buyer.pe_firm_website;

const isMeaningfulText = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  return !['not specified', 'n/a', 'na', 'unknown', 'none', 'tbd'].includes(lower);
};

const isActuallyEnriched = (buyer: BuyerRow): boolean => {
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

export function TrackerBuyersTable({
  buyers,
  selectedIds,
  enrichingIds,
  highlightedIds,
  sortColumn,
  sortDirection,
  onSort,
  onSelectBuyer,
  onSelectAll,
  onEnrichBuyer,
  onDeleteBuyer,
}: TrackerBuyersTableProps) {
  const allSelected = buyers.length > 0 && buyers.every(b => selectedIds.has(b.id));
  const someSelected = buyers.some(b => selectedIds.has(b.id)) && !allSelected;

  const SortableHeader = ({ column, children, className = '' }: { column: string; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column ? (
          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Select all"
                className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
              />
            </TableHead>
            <SortableHeader column="platform_company_name">Platform</SortableHeader>
            <SortableHeader column="pe_firm_name">PE Firm</SortableHeader>
            <TableHead>HQ</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Intelligence</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buyers.map((buyer) => {
            const isHighlighted = highlightedIds.has(buyer.id);
            const isEnriching = enrichingIds.has(buyer.id);
            const isEnriched = isActuallyEnriched(buyer);
            const displayName = buyer.platform_company_name || buyer.pe_firm_name;

            return (
              <TableRow
                key={buyer.id}
                className={isHighlighted ? 'bg-primary/10 border-l-4 border-l-primary' : ''}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(buyer.id)}
                    onCheckedChange={(checked) => onSelectBuyer(buyer.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/buyers/${buyer.id}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {buyer.platform_company_name || '—'}
                    </Link>
                    {buyer.platform_website && (
                      <a
                        href={getWebsiteUrl(buyer.platform_website)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {buyer.has_fee_agreement && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Fee
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Fee agreement in place</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{buyer.pe_firm_name}</span>
                    {buyer.pe_firm_website && (
                      <a
                        href={getWebsiteUrl(buyer.pe_firm_website)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getHQ(buyer) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {getHQ(buyer)}
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {getDescription(buyer) || '—'}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <IntelligenceBadge buyer={buyer as any} size="sm" />
                    {isEnriched && (
                      <Tooltip>
                        <TooltipTrigger>
                          <FileCheck className="w-4 h-4 text-green-600" />
                        </TooltipTrigger>
                        <TooltipContent>Enriched from website</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {isEnriching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="w-4 h-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {hasWebsite(buyer) && (
                        <DropdownMenuItem
                          onClick={() => onEnrichBuyer(buyer.id, displayName)}
                          disabled={isEnriching}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {isEnriched ? 'Re-enrich' : 'Enrich'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Buyer</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {displayName}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteBuyer(buyer.id, displayName)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
