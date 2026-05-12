import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  amount: number;
  type: "income" | "expense" | "balance" | "neutral";
  icon?: string;
  subtitle?: string;
  currency?: string;
  className?: string;
}

export default function SummaryCard({
  title,
  amount,
  type,
  icon,
  subtitle,
  currency = "PEN",
  className,
}: SummaryCardProps) {
  const colorMap = {
    income: {
      amount: "text-emerald-600",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
    },
    expense: {
      amount: "text-rose-600",
      bg: "bg-rose-50",
      iconBg: "bg-rose-100",
    },
    balance: {
      amount: "text-violet-700",
      bg: "bg-violet-50",
      iconBg: "bg-violet-100",
    },
    neutral: {
      amount: "text-zinc-800",
      bg: "bg-zinc-50",
      iconBg: "bg-zinc-100",
    },
  };

  const colors = colorMap[type];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
              {title}
            </p>
            <p className={cn("text-xl font-bold truncate", colors.amount)}>
              {type === "expense" ? "- " : ""}
              {formatCurrency(amount, currency)}
            </p>
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl shrink-0", colors.iconBg)}>
              <span className="text-xl">{icon}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
