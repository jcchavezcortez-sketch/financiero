"use client";

import { format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Transaction } from "@/types";
import TransactionItem from "./TransactionItem";
import EmptyState from "./EmptyState";

interface TransactionListProps {
  transactions: Transaction[];
  emptyMessage?: string;
  showDate?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
}

function groupTransactionsByDate(transactions: Transaction[]): Record<string, Transaction[]> {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const dateKey = tx.date.split("T")[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(tx);
  }
  return groups;
}

function formatGroupDate(dateStr: string): string {
  const date = parseISO(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Hoy";
  if (isSameDay(date, yesterday)) return "Ayer";
  return format(date, "EEEE, d 'de' MMMM", { locale: es });
}

export default function TransactionList({
  transactions,
  emptyMessage = "No hay movimientos en este período",
  showDate = true,
  onTransactionClick,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="Sin movimientos"
        description={emptyMessage}
      />
    );
  }

  const grouped = groupTransactionsByDate(transactions);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="divide-y divide-zinc-50">
      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          {showDate && (
            <div className="px-4 py-2 bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm">
              <span className="text-xs font-semibold text-zinc-500 capitalize">
                {formatGroupDate(dateKey)}
              </span>
            </div>
          )}
          <div className="bg-white divide-y divide-zinc-50">
            {grouped[dateKey].map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onClick={() => onTransactionClick?.(tx)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
