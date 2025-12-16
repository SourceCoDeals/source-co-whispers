import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "success" | "warning" | "accent";
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default",
  className 
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

  return (
    <div className={cn(
      "rounded-lg border p-5 shadow-sm",
      bgColors[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
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
        {Icon && (
          <div className={cn("p-2 rounded-lg bg-muted/50", iconColors[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
