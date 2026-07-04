"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { getAccounts, getTransactions } from "@/lib/supabase/queries";
import { getAvailableLiquidity } from "@/lib/finance";
import { MONTHS_ES } from "@/lib/constants";
import type { Account } from "@/types";
import type { Database } from "@/types/database";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];

const INCOME_COLOR = "#10B981";
const EXPENSE_COLOR = "#F43F5E";

function isIncomeTx(t: TransactionRow) {
  return t.type === "income" || t.movement_type === "income";
}

function isExpenseTx(t: TransactionRow) {
  return t.type === "expense" || t.movement_type === "expense";
}

// Signed effect of a transaction on the available balance
function txEffect(t: TransactionRow): number {
  if (t.affects_available_balance === false) return 0;
  if (isIncomeTx(t)) return t.amount;
  if (isExpenseTx(t)) return -t.amount;
  return 0;
}

export default function BalancePage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAccounts(), getTransactions()])
      .then(([accs, txns]) => {
        setAccounts(accs);
        setTransactions(txns as unknown as TransactionRow[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentAvailable = getAvailableLiquidity(accounts as unknown as Account[]);

  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0,
    23, 59, 59, 999
  );

  // Historical reconstruction: walk back from the current balance.
  // closing(M) = current − Σ effects after M; opening(M) = closing(M) − Σ effects in M
  const { openingBalance, closingBalance, monthIncome, monthExpenses, monthTxs } =
    useMemo(() => {
      let effectAfter = 0;
      let effectInMonth = 0;
      let income = 0;
      let expenses = 0;
      const inMonth: TransactionRow[] = [];

      for (const t of transactions) {
        const d = new Date(t.date);
        if (d > monthEnd) {
          effectAfter += txEffect(t);
        } else if (d >= monthStart) {
          effectInMonth += txEffect(t);
          inMonth.push(t);
          if (isIncomeTx(t)) income += t.amount;
          else if (isExpenseTx(t)) expenses += t.amount;
        }
      }

      const closing = currentAvailable - effectAfter;
      return {
        openingBalance: closing - effectInMonth,
        closingBalance: closing,
        monthIncome: income,
        monthExpenses: expenses,
        monthTxs: inMonth,
      };
    }, [transactions, currentAvailable, monthStart.getTime(), monthEnd.getTime()]);

  // Last 6 months trend (ending at selected month)
  const trendData = useMemo(() => {
    const months: { name: string; Ingresos: number; Gastos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - i, 1);
      const mEnd = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() - i + 1,
        0, 23, 59, 59, 999
      );
      let inc = 0;
      let exp = 0;
      for (const t of transactions) {
        const d = new Date(t.date);
        if (d >= mStart && d <= mEnd) {
          if (isIncomeTx(t)) inc += t.amount;
          else if (isExpenseTx(t)) exp += t.amount;
        }
      }
      months.push({
        name: MONTHS_ES[mStart.getMonth()].slice(0, 3),
        Ingresos: inc,
        Gastos: exp,
      });
    }
    return months;
  }, [transactions, selectedMonth]);

  const hasTrendData = trendData.some((m) => m.Ingresos > 0 || m.Gastos > 0);

  const monthName = `${MONTHS_ES[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`;

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
            <p className="text-sm font-semibold text-zinc-700 capitalize">{monthName}</p>
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

      {loading ? (
        <div className="px-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Monthly Breakdown */}
          <div className="px-5 space-y-3">
            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 font-medium">Saldo inicial</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Al 1 de {MONTHS_ES[selectedMonth.getMonth()].toLowerCase()}</p>
                </div>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(openingBalance)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 font-medium">+ Ingresos</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {monthTxs.filter(isIncomeTx).length} movimientos
                  </p>
                </div>
                <p className="text-xl font-bold text-emerald-600">
                  +{formatCurrency(monthIncome)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 font-medium">− Gastos</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {monthTxs.filter(isExpenseTx).length} movimientos
                  </p>
                </div>
                <p className="text-xl font-bold text-rose-600">
                  −{formatCurrency(monthExpenses)}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-purple-900">= Saldo al cierre</p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    Resultado del mes: {monthIncome - monthExpenses >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(monthIncome - monthExpenses))}
                  </p>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    closingBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {formatCurrency(closingBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Trend chart: last 6 months */}
          {hasTrendData && (
            <div className="px-5 mt-6">
              <h2 className="text-base font-semibold text-zinc-700 mb-3">
                Últimos 6 meses
              </h2>
              <div className="bg-white rounded-2xl border border-zinc-100 p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      axisLine={{ stroke: "#e4e4e7" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#a1a1aa" }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e4e4e7",
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "#52525b" }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="Ingresos" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="Gastos" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <p className="px-5 mt-4 text-xs text-zinc-400 leading-relaxed">
            El saldo se reconstruye a partir de tus movimientos registrados. Los ajustes
            manuales de saldo sin movimiento asociado pueden afectar el histórico.
          </p>
        </>
      )}

      <div className="pb-8" />
    </div>
  );
}
