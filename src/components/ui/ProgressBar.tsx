import * as React from "react"
import { cn } from "../../lib/utils"

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  variant?: "blue" | "green" | "orange";
}

export function ProgressBar({ value, max = 100, className, variant = "blue" }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    orange: "bg-orange-500",
  }

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full transition-all duration-500 ease-in-out", colors[variant])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
