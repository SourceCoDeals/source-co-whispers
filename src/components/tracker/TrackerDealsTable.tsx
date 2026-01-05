import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DealScoreBadge } from '@/components/DealScoreBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Loader2, MapPin, Users, Sparkles, FileText, MoreHorizontal, Trash2, Archive, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { DealBuyerCounts } from '@/hooks/useTrackerData';

type Deal = Tables<'deals'>;

export interface TrackerDealsTableProps {
  deals: Deal[];
  dealBuyerCounts: Record<string, DealBuyerCounts>;
  enrichingIds: Set<string>;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  onEnrichDeal: (id: string, name: string) => void;
  onArchiveDeal: (id: string, name: string) => void;
  onDeleteDeal: (id: string, name: string) => void;
}

const canEnrichDeal = (deal: Deal) => deal.transcript_link || deal.additional_info || deal.company_website;

const isMeaningfulText = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  return !['not specified', 'n/a', 'na', 'unknown', 'none', 'tbd'].includes(lower);
};

const isDealEnriched = (deal: Deal): boolean => {
  return (
    isMeaningfulText(deal.company_overview) ||
    isMeaningfulText(deal.service_mix) ||
    isMeaningfulText(deal.business_model) ||
    (deal.revenue != null && deal.revenue > 0) ||
    (deal.ebitda_percentage != null && deal.ebitda_percentage > 0) ||
    (Array.isArray(deal.geography) && deal.geography.length > 0)
  );
};

export function TrackerDealsTable({
  deals,
  dealBuyerCounts,
  enrichingIds,
  sortColumn,
  sortDirection,
  onSort,
  onEnrichDeal,
  onArchiveDeal,
  onDeleteDeal,
}: TrackerDealsTableProps) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader column="deal_score">Score</SortableHeader>
          <SortableHeader column="deal_name">Deal Name</SortableHeader>
          <SortableHeader column="geography">Geography</SortableHeader>
          <SortableHeader column="revenue">Revenue</SortableHeader>
          <SortableHeader column="ebitda">EBITDA</SortableHeader>
          <SortableHeader column="approved">
            <Users className="w-4 h-4" />
          </SortableHeader>
          <TableHead>Status</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.map((deal) => {
          const isEnriching = enrichingIds.has(deal.id);
          const isEnriched = isDealEnriched(deal);
          const counts = dealBuyerCounts[deal.id] || { approved: 0, interested: 0, passed: 0 };

          return (
            <TableRow key={deal.id}>
              <TableCell>
                <DealScoreBadge score={deal.deal_score} />
              </TableCell>
              <TableCell>
                <Link
                  to={`/deals/${deal.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {deal.deal_name}
                </Link>
                {deal.industry_type && (
                  <p className="text-xs text-muted-foreground">{deal.industry_type}</p>
                )}
              </TableCell>
              <TableCell>
                {deal.geography && deal.geography.length > 0 ? (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="line-clamp-1">{deal.geography.join(', ')}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {deal.revenue ? `$${deal.revenue}M` : '—'}
              </TableCell>
              <TableCell>
                {deal.ebitda_amount
                  ? `$${deal.ebitda_amount}M`
                  : deal.ebitda_percentage
                  ? `${deal.ebitda_percentage}%`
                  : '—'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  {counts.approved > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {counts.approved}
                    </Badge>
                  )}
                  {counts.interested > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {counts.interested} int
                    </Badge>
                  )}
                  {counts.passed > 0 && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-500">
                      {counts.passed} pass
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={deal.status === 'Active' ? 'active' : deal.status === 'Closed' ? 'closed' : 'dead'}
                >
                  {deal.status}
                </Badge>
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
                    <DropdownMenuItem asChild>
                      <Link to={`/deals/${deal.id}/matching`}>
                        <Users className="w-4 h-4 mr-2" />
                        Match Buyers
                      </Link>
                    </DropdownMenuItem>
                    {canEnrichDeal(deal) && (
                      <DropdownMenuItem
                        onClick={() => onEnrichDeal(deal.id, deal.deal_name)}
                        disabled={isEnriching}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isEnriched ? 'Re-enrich' : 'Enrich'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onArchiveDeal(deal.id, deal.deal_name)}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
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
                          <AlertDialogTitle>Delete Deal</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {deal.deal_name}? This will remove all buyer scores and transcripts. This action cannot be undone.
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
