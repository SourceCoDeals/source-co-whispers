import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, FileText, UserCheck, Heart, MessageSquare, MapPin } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EngagementSignals {
  hasCalls: boolean;
  siteVisitRequested: boolean;
  financialsRequested: boolean;
  ceoInvolved: boolean;
  personalConnection: boolean;
  expressedInterest: boolean;
  engagementScore: number;
  signals: string[];
}

interface EngagementSignalsBadgeProps {
  signals: EngagementSignals;
  variant?: "compact" | "detailed";
}

export function EngagementSignalsBadge({ signals, variant = "compact" }: EngagementSignalsBadgeProps) {
  if (!signals.hasCalls && signals.signals.length === 0) {
    return null;
  }

  const signalIcons = {
    siteVisitRequested: { icon: MapPin, label: "Site visit requested", color: "text-green-600" },
    financialsRequested: { icon: FileText, label: "Financials requested", color: "text-blue-600" },
    ceoInvolved: { icon: UserCheck, label: "Senior leadership involved", color: "text-purple-600" },
    personalConnection: { icon: Heart, label: "Personal connection", color: "text-pink-600" },
    expressedInterest: { icon: MessageSquare, label: "Strong interest expressed", color: "text-amber-600" },
  };

  const activeSignals = Object.entries(signalIcons).filter(
    ([key]) => signals[key as keyof typeof signals]
  );

  const getScoreColor = (score: number) => {
    if (score >= 60) return "bg-green-100 text-green-700 border-green-300";
    if (score >= 30) return "bg-amber-100 text-amber-700 border-amber-300";
    return "bg-muted text-muted-foreground";
  };

  if (variant === "compact") {
    if (activeSignals.length === 0 && !signals.hasCalls) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`gap-1 cursor-help ${getScoreColor(signals.engagementScore)}`}
            >
              <Phone className="w-3 h-3" />
              {signals.engagementScore > 0 && (
                <span className="font-medium">{signals.engagementScore}</span>
              )}
              {activeSignals.length > 0 && (
                <span className="text-xs">+{activeSignals.length}</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">Engagement Score: {signals.engagementScore}/100</p>
              {signals.signals.length > 0 ? (
                <ul className="text-xs space-y-1">
                  {signals.signals.map((signal, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {signal}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No call activity recorded</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed variant
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Engagement</span>
        <Badge variant="outline" className={getScoreColor(signals.engagementScore)}>
          {signals.engagementScore}/100
        </Badge>
      </div>
      
      {signals.signals.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeSignals.map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className={`gap-1 text-xs ${config.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{config.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      ) : signals.hasCalls ? (
        <p className="text-xs text-muted-foreground">
          {signals.signals[0] || "Call activity recorded"}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No engagement signals detected</p>
      )}
    </div>
  );
}
