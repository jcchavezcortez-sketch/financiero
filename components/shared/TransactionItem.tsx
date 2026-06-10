import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/utils";
import type { Transaction } from "@/types";
import { MOVEMENT_META } from "@/types";

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export default function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const isExpense = transaction.type === "expense";
  const icon = getCategoryIcon(transaction.category);
  const mt = transaction.movement_type;
  const movementMeta = (mt && mt !== "expense" && mt !== "income") ? MOVEMENT_META[mt] : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left"
    >
      {/* Category icon */}
      <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-100 shrink-0 text-xl">
        {icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800 truncate">
          {transaction.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {movementMeta && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium shrink-0">
              {movementMeta.label}
            </span>
          )}
          <span className="text-xs text-zinc-400 truncate">{transaction.category}</span>
          <span className="text-zinc-200">•</span>
          <span className="text-xs text-zinc-400 truncate">{transaction.accountName}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p
          className={cn(
            "text-sm font-bold",
            isExpense ? "text-rose-600" : "text-emerald-600"
          )}
        >
          {isExpense ? "- " : "+ "}
          {formatCurrency(transaction.amount, transaction.currency)}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">{formatDate(transaction.date)}</p>
      </div>
    </button>
  );
}
