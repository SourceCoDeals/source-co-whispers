import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, X, RefreshCw, Loader2 } from 'lucide-react';

export interface InterruptedSessionBannerProps {
  processed: number;
  remaining: number;
  onResume: () => void;
  onDismiss: () => void;
  isResuming: boolean;
}

export function InterruptedSessionBanner({
  processed,
  remaining,
  onResume,
  onDismiss,
  isResuming,
}: InterruptedSessionBannerProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Enrichment session was interrupted
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            {processed} buyers were processed before the session ended.
            {remaining} buyers still need enrichment.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={onResume}
              disabled={isResuming}
              className="bg-white dark:bg-transparent"
            >
              {isResuming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resume ({remaining} remaining)
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              disabled={isResuming}
            >
              <X className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
