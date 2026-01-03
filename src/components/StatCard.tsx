import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/dashboard/Sparkline";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  sparklineData?: number[];
  variant?: "default" | "success" | "warning" | "accent";
  className?: string;
  onClick?: () => void;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  sparklineData,
  variant = "default",
  className,
  onClick
}: StatCardProps) {
  const iconColors = {
    default: "text-muted-foreground",
    success: "text-emerald-600",
    warning: "text-amber-600",
    accent: "text-accent",
  };

  const bgColors = {
    default: "bg-card",
    success: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900",
    warning: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
    accent: "bg-accent/5 border-accent/20",
  };

  const sparklineColors = {
    default: "hsl(var(--muted-foreground))",
    success: "hsl(142, 76%, 36%)",
    warning: "hsl(47, 92%, 55%)",
    accent: "hsl(var(--accent))",
  };

  return (
    <div 
      className={cn(
        "rounded-lg border p-5 shadow-sm transition-all",
        bgColors[variant],
        onClick && "cursor-pointer hover:shadow-md hover:border-accent/50",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold font-display">{value}</p>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
              {trend && (
                <p className={cn(
                  "text-xs font-medium",
                  trend.value >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
                </p>
              )}
            </div>
            {sparklineData && sparklineData.length > 0 && (
              <Sparkline 
                data={sparklineData} 
                color={sparklineColors[variant]}
                height={24}
              />
            )}
          </div>
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-lg bg-muted/50 ml-3", iconColors[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
