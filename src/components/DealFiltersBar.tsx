import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TimeframeFilter, TimeframeOption } from "@/components/TimeframeFilter";

interface DealFiltersBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedTracker: string;
  onTrackerChange: (value: string) => void;
  trackers: { id: string; industry_name: string }[];
  scoreRange: string;
  onScoreRangeChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  timeframe: TimeframeOption;
  onTimeframeChange: (value: TimeframeOption) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function DealFiltersBar({
  searchQuery,
  onSearchChange,
  selectedTracker,
  onTrackerChange,
  trackers,
  scoreRange,
  onScoreRangeChange,
  statusFilter,
  onStatusChange,
  timeframe,
  onTimeframeChange,
  onClearFilters,
  hasActiveFilters,
}: DealFiltersBarProps) {
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search deals by name, domain, or geography..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>

        {/* Tracker Filter */}
        <Select value={selectedTracker} onValueChange={onTrackerChange}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Trackers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trackers</SelectItem>
            {trackers.map((tracker) => (
              <SelectItem key={tracker.id} value={tracker.id}>
                {tracker.industry_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Score Range Filter */}
        <Select value={scoreRange} onValueChange={onScoreRangeChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Any Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Score</SelectItem>
            <SelectItem value="high">High (70+)</SelectItem>
            <SelectItem value="medium">Medium (40-69)</SelectItem>
            <SelectItem value="low">Low (0-39)</SelectItem>
            <SelectItem value="unscored">Unscored</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Any Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Timeframe Filter */}
        <TimeframeFilter value={timeframe} onChange={onTimeframeChange} />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9">
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
