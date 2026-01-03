import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  className?: string;
  color?: string;
  height?: number;
}

export function Sparkline({ data, className, color = "hsl(var(--accent))", height = 20 }: SparklineProps) {
  if (data.length === 0 || data.every(d => d === 0)) {
    return null;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const width = 80;
  const padding = 2;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * effectiveWidth;
    const y = height - padding - ((value - min) / range) * effectiveHeight;
    return `${x},${y}`;
  });
  
  const pathD = `M ${points.join(" L ")}`;
  
  // Create area path
  const areaD = `M ${padding},${height - padding} L ${points.join(" L ")} L ${width - padding},${height - padding} Z`;

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn("flex-shrink-0", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Area fill */}
      <path
        d={areaD}
        fill={color}
        fillOpacity={0.1}
      />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width - padding}
        cy={height - padding - ((data[data.length - 1] - min) / range) * effectiveHeight}
        r={2}
        fill={color}
      />
    </svg>
  );
}
