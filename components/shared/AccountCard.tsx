import { cn, formatCurrency } from "@/lib/utils";
import { ACCOUNT_TYPES } from "@/lib/constants";

interface AccountCardData {
  id: string;
  name: string;
  type?: string;
  account_type?: string;
  balance: number;
  currency: string;
  color: string;
  icon: string;
  include_in_available_balance?: boolean;
  include_in_net_worth?: boolean;
}

interface AccountCardProps {
  account: AccountCardData;
  onClick?: () => void;
}

export default function AccountCard({ account, onClick }: AccountCardProps) {
  const typeId = account.account_type ?? account.type ?? "debit";
  const accountType = ACCOUNT_TYPES.find((t) => t.id === typeId);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md active:scale-[0.98] transition-all duration-200"
    >
      <div className="flex items-center gap-4 p-4">
        <div
          className="w-1 h-12 rounded-full shrink-0"
          style={{ backgroundColor: account.color }}
        />
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 text-2xl"
          style={{ backgroundColor: `${account.color}20` }}
        >
          {account.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-800 truncate">{account.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {accountType?.name ?? typeId}
            {account.account_type === "protected_savings" && (
              <span className="ml-1 text-amber-600">· no tocar</span>
            )}
          </p>
        </div>
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
