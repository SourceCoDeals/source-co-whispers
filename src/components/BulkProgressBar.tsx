import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface BulkProgressBarProps {
  current: number;
  total: number;
  label: string;
  isVisible: boolean;
}

export function BulkProgressBar({ current, total, label, isVisible }: BulkProgressBarProps) {
  if (!isVisible || total === 0) return null;
  
  const percentage = Math.round((current / total) * 100);
  const remaining = total - current;
  
  // Estimate time remaining (rough: ~2 seconds per item)
  const estimatedSeconds = remaining * 2;
  const estimatedMinutes = Math.floor(estimatedSeconds / 60);
  const remainingSeconds = estimatedSeconds % 60;
  
  const timeRemaining = estimatedMinutes > 0 
    ? `~${estimatedMinutes}m ${remainingSeconds}s remaining`
    : estimatedSeconds > 0 
      ? `~${estimatedSeconds}s remaining`
      : 'Almost done...';

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-muted-foreground">
          {current} / {total} ({percentage}%)
        </span>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      <p className="text-xs text-muted-foreground text-right">
        {timeRemaining}
      </p>
    </div>
  );
}
