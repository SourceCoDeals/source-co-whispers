import { Link } from "react-router-dom";
import { ArrowLeft, Archive, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tracker } from "../types";

interface TrackerHeaderProps {
  tracker: Tracker;
  buyerCount: number;
  dealCount: number;
  onArchive: () => void;
  isArchived: boolean;
}

export function TrackerHeader({ tracker, buyerCount, dealCount, onArchive, isArchived }: TrackerHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Link to="/trackers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{tracker.industry_name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {buyerCount} buyers
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {dealCount} deals
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onArchive}
          disabled={isArchived}
        >
          <Archive className="w-4 h-4 mr-2" />
          {isArchived ? "Archived" : "Archive Tracker"}
        </Button>
      </div>
    </div>
  );
}
