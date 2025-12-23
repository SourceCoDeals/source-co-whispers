import { Skeleton } from "@/components/ui/skeleton";

export function DealDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Transcripts Section */}
      <Skeleton className="h-32 rounded-lg" />

      {/* Website & Actions */}
      <Skeleton className="h-24 rounded-lg" />

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Company Overview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>

        {/* Financial Overview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-36" />
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>

      {/* More sections */}
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-36 rounded-lg" />
      </div>
    </div>
  );
}
