"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import MonthSelector from "@/components/shared/MonthSelector";
import {
  getAccounts,
  getTransactions,
  getLiabilities,
} from "@/lib/supabase/queries";
import {
  getAvailableLiquidity,
  getProtectedSavings,
  getTotalLiabilities,
  getNetWorth,
} from "@/lib/finance";
import type { Account, Liability, Transaction } from "@/types";
import type { Database } from "@/types/database";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];
type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];

interface MonthlyBreakdown {
  openingBalance: number;
  income: number;
  expenses: number;
  closingBalance: number;
}

export default function BalancePage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAccounts(), getTransactions(), getLiabilities("active")])
      .then(([accs, txns, liabs]) => {
        setAccounts(accs);
        setTransactions(txns);
        setLiabilities(liabs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const typedAccounts = accounts as unknown as Account[];
  const typedTransactions = transactions as unknown as Transaction[];
  const typedLiabilities = liabilities as unknown as Liability[];

  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

  const monthTransactions = typedTransactions.filter((t) => {
    const txDate = new Date(t.date);
    return txDate >= monthStart && txDate <= monthEnd;
  });

  const monthIncome = monthTransactions
    .filter((t) => t.type === "income" || t.movement_type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpenses = monthTransactions
    .filter((t) => t.type === "expense" || t.movement_type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const openingBalance = getAvailableLiquidity(typedAccounts);
  const closingBalance = openingBalance + monthIncome - monthExpenses;

  const liquidAvailable = getAvailableLiquidity(typedAccounts);
  const protectedSavings = getProtectedSavings(typedAccounts);
  const totalDebt = getTotalLiabilities(typedLiabilities);
  const netWorth = getNetWorth(typedAccounts, typedLiabilities);

  const monthName = monthStart.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Saldo por mes</h1>
      </div>

      {/* Month Navigator */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-zinc-100 p-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setSelectedMonth(
                new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
              )
            }
            className="h-10 w-10 p-0"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="text-center flex-1">
            <p className="text-sm font-semibold text-zinc-700 capitalize">
              {monthName}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setSelectedMonth(
                new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
              )
            }
            className="h-10 w-10 p-0"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>

      {/* Financial Summary Card */}
      <div className="px-5 mb-5">
        <div className="gradient-purple rounded-3xl p-5 text-white">
          <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-1">
            Patrimonio neto
          </p>
          <p className={`text-3xl font-bold ${netWorth < 0 ? "text-rose-300" : ""}`}>
            {formatCurrency(netWorth)}
          </p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-violet-300 text-xs">Disponible</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(liquidAvailable)}</p>
            </div>
            <div>
              <p className="text-violet-300 text-xs">Protegido</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(protectedSavings)}</p>
            </div>
            <div>
              <p className="text-violet-300 text-xs">Deudas</p>
              <p className="text-rose-300 text-sm font-semibold">- {formatCurrency(totalDebt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {loading ? (
        <div className="px-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-5 space-y-3">
          {/* Opening Balance */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 font-medium">Saldo inicial</p>
                <p className="text-xs text-zinc-400 mt-0.5">Al 1er día del mes</p>
              </div>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(openingBalance)}
              </p>
            </div>
          </div>

          {/* Income */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 font-medium">+ Ingresos</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {monthTransactions.filter((t) => t.type === "income").length} transacciones
                </p>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                +{formatCurrency(monthIncome)}
              </p>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 font-medium">- Gastos</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {monthTransactions.filter((t) => t.type === "expense").length} transacciones
                </p>
              </div>
              <p className="text-xl font-bold text-rose-600">
                -{formatCurrency(monthExpenses)}
              </p>
            </div>
          </div>


          {/* Closing Balance */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-purple-900">= Saldo actual</p>
                <p className="text-xs text-purple-600 mt-0.5">Resultado del mes</p>
              </div>
              <p className={`text-2xl font-bold ${
                closingBalance >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}>
                {formatCurrency(closingBalance)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="pb-8" />
    </div>
  );
}
