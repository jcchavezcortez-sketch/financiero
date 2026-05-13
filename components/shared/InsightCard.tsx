import { cn } from "@/lib/utils";
import type { Insight } from "@/types";
import Link from "next/link";

interface InsightCardProps {
  insight: Insight;
  className?: string;
}

const typeConfig = {
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    titleColor: "text-amber-800",
    textColor: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    titleColor: "text-emerald-800",
    textColor: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    titleColor: "text-blue-800",
    textColor: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  alert: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    titleColor: "text-rose-800",
    textColor: "text-rose-700",
    badge: "bg-rose-100 text-rose-700",
  },
};

export default function InsightCard({ insight, className }: InsightCardProps) {
  const config = typeConfig[insight.type];

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{insight.emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className={cn("text-sm font-semibold mb-1", config.titleColor)}>
            {insight.title}
          </h4>
          <p className={cn("text-xs leading-relaxed", config.textColor)}>
            {insight.message}
          </p>
          {insight.actionLabel && insight.actionUrl && (
            <Link
              href={insight.actionUrl}
              className={cn(
                "inline-flex items-center mt-2 text-xs font-semibold rounded-full px-3 py-1 transition-colors",
                config.badge
              )}
            >
              {insight.actionLabel} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
