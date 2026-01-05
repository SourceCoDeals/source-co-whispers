import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tracker } from "../types";

interface TrackerHeaderProps {
  tracker: Tracker;
  buyerCount: number;
  dealCount: number;
}

export function TrackerHeader({ tracker, buyerCount, dealCount }: TrackerHeaderProps) {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" onClick={() => navigate("/trackers")}>
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="flex-1">
        <h1 className="text-2xl font-display font-bold">{tracker.industry_name}</h1>
        <p className="text-muted-foreground">
          {buyerCount} buyers · {dealCount} deals
        </p>
      </div>
      <Button onClick={() => navigate(`/trackers/${tracker.id}/deals/new`)}>
        <Plus className="w-4 h-4 mr-2" />
        List New Deal
      </Button>
    </div>
  );
}
