import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BulkProgressBar } from '@/components/BulkProgressBar';
import { CSVImport } from '@/components/CSVImport';
import { Search, Plus, Wand2, GitMerge, Trash2, Loader2 } from 'lucide-react';
import { AddBuyerDialog } from './AddBuyerDialog';

export interface TrackerBuyersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  buyerCount: number;
  selectedCount: number;
  unenrichedCount: number;
  isBulkEnriching: boolean;
  enrichmentProgress: { current: number; total: number };
  isDeduping: boolean;
  onAddBuyer: (buyer: {
    pe_firm_name: string;
    pe_firm_website: string;
    platform_company_name: string;
    platform_website: string;
  }) => Promise<void>;
  onEnrichAll: () => void;
  onCheckDuplicates: () => void;
  onDeleteSelected: () => void;
  onCSVImport: () => void;
  trackerId: string;
}

export function TrackerBuyersToolbar({
  search,
  onSearchChange,
  buyerCount,
  selectedCount,
  unenrichedCount,
  isBulkEnriching,
  enrichmentProgress,
  isDeduping,
  onAddBuyer,
  onEnrichAll,
  onCheckDuplicates,
  onDeleteSelected,
  onCSVImport,
  trackerId,
}: TrackerBuyersToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Progress bar when enriching */}
      <BulkProgressBar
        current={enrichmentProgress.current}
        total={enrichmentProgress.total}
        label="Enriching buyers"
        isVisible={isBulkEnriching}
      />

      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search buyers..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Buyer count */}
        <Badge variant="secondary">
          {buyerCount} buyer{buyerCount !== 1 ? 's' : ''}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <AddBuyerDialog onAdd={onAddBuyer} />

          <CSVImport trackerId={trackerId} onComplete={onCSVImport} />

          <Button
            variant="outline"
            size="sm"
            onClick={onEnrichAll}
            disabled={isBulkEnriching || unenrichedCount === 0}
          >
            {isBulkEnriching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enriching...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Enrich All
                {unenrichedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unenrichedCount}
                  </Badge>
                )}
              </>
            )}
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

          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
