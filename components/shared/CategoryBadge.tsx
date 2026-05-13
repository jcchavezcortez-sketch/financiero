import { cn, getCategoryIcon } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";

interface CategoryBadgeProps {
  category: string;
  variant?: "default" | "pill";
  className?: string;
}

export default function CategoryBadge({
  category,
  variant = "default",
  className,
}: CategoryBadgeProps) {
  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const cat = allCategories.find((c) => c.name === category);
  const icon = getCategoryIcon(category);
  const color = cat?.color ?? "#9CA3AF";

  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
          className
        )}
        style={{
          backgroundColor: `${color}20`,
          color: color,
        }}
      >
        <span>{icon}</span>
        <span>{category}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      <span className="text-xs">{icon}</span>
      <span>{category}</span>
    </span>
  );
}
