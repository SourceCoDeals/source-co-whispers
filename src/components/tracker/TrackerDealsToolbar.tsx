import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BulkProgressBar } from '@/components/BulkProgressBar';
import { DealCSVImport } from '@/components/DealCSVImport';
import { Plus, Wand2, Target, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface TrackerDealsToolbarProps {
  dealCount: number;
  isBulkEnriching: boolean;
  enrichmentProgress: { current: number; total: number };
  isScoringAll: boolean;
  scoringProgress: { current: number; total: number };
  onEnrichAll: () => void;
  onScoreAll: () => void;
  onCSVImport: () => void;
  trackerId: string;
  canEnrichDeals: boolean;
}

export function TrackerDealsToolbar({
  dealCount,
  isBulkEnriching,
  enrichmentProgress,
  isScoringAll,
  scoringProgress,
  onEnrichAll,
  onScoreAll,
  onCSVImport,
  trackerId,
  canEnrichDeals,
}: TrackerDealsToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Progress bars */}
      <BulkProgressBar
        current={enrichmentProgress.current}
        total={enrichmentProgress.total}
        label="Enriching deals"
        isVisible={isBulkEnriching}
      />
      <BulkProgressBar
        current={scoringProgress.current}
        total={scoringProgress.total}
        label="Scoring deals"
        isVisible={isScoringAll}
      />

      <div className="flex flex-wrap items-center gap-3">
        {/* Deal count */}
        <Badge variant="secondary">
          {dealCount} deal{dealCount !== 1 ? 's' : ''}
        </Badge>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to={`/trackers/${trackerId}/deals/new`}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deal
            </Link>
          </Button>

          <DealCSVImport trackerId={trackerId} onComplete={onCSVImport} />

          <Button
            variant="outline"
            size="sm"
            onClick={onEnrichAll}
            disabled={isBulkEnriching || !canEnrichDeals}
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
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onScoreAll}
            disabled={isScoringAll || dealCount === 0}
          >
            {isScoringAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scoring...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Score All
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
