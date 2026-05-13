import { cn, formatCurrency } from "@/lib/utils";
import type { Account } from "@/types";
import { ACCOUNT_TYPES } from "@/lib/constants";

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export default function AccountCard({ account, onClick }: AccountCardProps) {
  const accountType = ACCOUNT_TYPES.find((t) => t.id === account.type);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md active:scale-[0.98] transition-all duration-200"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Colored left bar */}
        <div
          className="w-1 h-12 rounded-full shrink-0"
          style={{ backgroundColor: account.color }}
        />

        {/* Icon */}
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 text-2xl"
          style={{ backgroundColor: `${account.color}20` }}
        >
          {account.icon}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-800 truncate">
            {account.name}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {accountType?.name ?? account.type}
          </p>
        </div>

        {/* Balance */}
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-zinc-800">
            {formatCurrency(account.balance, account.currency)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{account.currency}</p>
        </div>
      </div>
    </button>
  );
}
