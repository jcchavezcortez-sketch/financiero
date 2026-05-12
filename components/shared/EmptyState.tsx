import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = "📭",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-zinc-700 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-400 max-w-xs leading-relaxed mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
