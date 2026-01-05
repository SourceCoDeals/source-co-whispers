import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, GitMerge } from 'lucide-react';

export interface DedupeGroup {
  key: string;
  matchType: 'domain' | 'name';
  count: number;
  platformNames: string[];
  peFirmNames: string[];
  mergedPeFirmName: string;
  keeperName: string;
}

export interface DedupePreview {
  duplicateGroups: DedupeGroup[];
  stats: { groupsFound: number; totalDuplicates: number };
}

export interface DedupeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: DedupePreview | null;
  isProcessing: boolean;
  onExecute: () => void;
}

export function DedupeDialog({
  open,
  onOpenChange,
  preview,
  isProcessing,
  onExecute,
}: DedupeDialogProps) {
  if (!preview) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" />
            Duplicate Buyers Found
          </DialogTitle>
          <DialogDescription>
            Found {preview.stats.groupsFound} duplicate groups containing {preview.stats.totalDuplicates} total records.
            Review and merge to keep your buyer list clean.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {preview.duplicateGroups.map((group, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={group.matchType === 'domain' ? 'default' : 'secondary'}>
                    {group.matchType === 'domain' ? 'Domain Match' : 'Name Match'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {group.count} records → 1 merged
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Platforms:</span>
                  <ul className="list-disc list-inside">
                    {group.platformNames.slice(0, 3).map((name, i) => (
                      <li key={i} className={i === 0 ? 'font-medium' : ''}>
                        {name} {i === 0 && '(keeper)'}
                      </li>
                    ))}
                    {group.platformNames.length > 3 && (
                      <li className="text-muted-foreground">+{group.platformNames.length - 3} more</li>
                    )}
                  </ul>
                </div>
                <div>
                  <span className="text-muted-foreground">PE Firms:</span>
                  <ul className="list-disc list-inside">
                    {[...new Set(group.peFirmNames)].slice(0, 3).map((name, i) => (
                      <li key={i}>{name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onExecute} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4 mr-2" />
                Merge All
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
