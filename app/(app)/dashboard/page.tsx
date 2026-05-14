"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MonthSelector from "@/components/shared/MonthSelector";
import TransactionItem from "@/components/shared/TransactionItem";
import { getFinancialOverview, type FinancialOverview } from "@/lib/supabase/queries";
import {
  getAvailableLiquidity,
  getProtectedSavings,
  getTotalLiabilities,
  getNetWorth,
  getMonthlyIncome,
  getMonthlyExpenses,
  getMonthlyBalance,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FinancialOverview | null>(null);

  useEffect(() => {
    setLoading(true);
    getFinancialOverview(currentMonth.getMonth(), currentMonth.getFullYear())
      .then(setOverview)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const name = overview?.profile?.name ?? "tú";

  // Financial metrics
  const accounts = overview?.accounts ?? [];
  const liabilities = overview?.liabilities ?? [];
  const transactions = overview?.transactions ?? [];

  const availableLiquidity = getAvailableLiquidity(accounts);
  const protectedSavings = getProtectedSavings(accounts);
  const totalLiabilities = getTotalLiabilities(liabilities);
  const netWorth = getNetWorth(accounts, liabilities);
  const monthlyIncome = getMonthlyIncome(transactions);
  const monthlyExpenses = getMonthlyExpenses(transactions);
  const monthlyBalance = getMonthlyBalance(transactions);

  const savingsGoal = overview?.settings?.savings_goal ?? 0;
  const savingsPct = savingsGoal > 0 ? Math.min((monthlyBalance > 0 ? monthlyBalance : 0) / savingsGoal * 100, 100) : 0;

  const recentTx: Transaction[] = (overview?.transactions ?? []).slice(0, 5).map((t) => ({
    id: t.id,
    type: t.type as "expense" | "income",
    amount: t.amount,
    description: t.description,
    merchant: t.merchant ?? undefined,
    category: t.category?.name ?? "Otros",
    categoryId: t.category_id ?? "",
    accountId: t.account_id,
    accountName: t.account?.name ?? "",
    date: t.date,
    currency: t.currency,
  }));

  const catBreakdown = (overview?.categoryBreakdown ?? []).slice(0, 4);
  const dailySpending = overview?.dailySpending ?? [];
  const maxCat = Math.max(...catBreakdown.map((c) => c.total), 1);

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="px-5 pt-12 pb-4"><div className="h-8 bg-zinc-100 rounded-xl w-48 animate-pulse" /></div>
        <div className="px-5 mb-4"><div className="h-36 bg-zinc-100 rounded-3xl animate-pulse" /></div>
        <div className="px-5 mb-4 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
        {[0, 1].map((i) => <div key={i} className="px-5 mb-4"><div className="h-24 bg-zinc-100 rounded-2xl animate-pulse" /></div>)}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-sm">Buenos días</p>
            <h1 className="text-2xl font-bold text-zinc-800">Hola, {name} 👋</h1>
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-violet-100 text-violet-700 font-semibold text-lg">
            {name[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="px-5 mb-4">
        <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
      </div>

      {/* Balance Real — card principal */}
      <div className="px-5 mb-4">
        <div className="gradient-purple rounded-3xl p-6 text-white shadow-lg shadow-violet-200">
          <p className="text-violet-200 text-sm font-medium mb-1">Balance real</p>
          <p className="text-4xl font-bold mb-1">{formatCurrency(netWorth)}</p>
          <p className="text-violet-300 text-xs">Liquidez + ahorros − deudas</p>
        </div>
      </div>

      {/* 3 cards: Disponible / Ahorro / Deuda */}
      <div className="px-5 mb-4 grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-emerald-600 font-medium mb-1">Disponible</p>
          <p className="text-sm font-bold text-emerald-700">{formatCurrency(availableLiquidity)}</p>
        </div>
        <div className="bg-violet-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-violet-600 font-medium mb-1">Ahorro</p>
          <p className="text-sm font-bold text-violet-700">{formatCurrency(protectedSavings)}</p>
        </div>
        <div className="bg-rose-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-rose-600 font-medium mb-1">Deudas</p>
          <p className="text-sm font-bold text-rose-700">{formatCurrency(totalLiabilities)}</p>
        </div>
      </div>

      {/* Resumen del mes */}
      <div className="px-5 mb-4 grid grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-100 rounded-2xl p-3 text-center">
          <p className="text-xs text-zinc-400 font-medium mb-1">Ingresos</p>
          <p className="text-sm font-bold text-zinc-700">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl p-3 text-center">
          <p className="text-xs text-zinc-400 font-medium mb-1">Gastos</p>
          <p className="text-sm font-bold text-zinc-700">{formatCurrency(monthlyExpenses)}</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl p-3 text-center">
          <p className="text-xs text-zinc-400 font-medium mb-1">Balance</p>
          <p className={`text-sm font-bold ${monthlyBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatCurrency(monthlyBalance)}
          </p>
        </div>
      </div>

      {/* Meta de ahorro */}
      {savingsGoal > 0 && (
        <div className="px-5 mb-4">
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🐷</span>
                <span className="text-sm font-semibold text-zinc-700">Meta de ahorro mensual</span>
              </div>
              <span className="text-xs font-bold text-violet-600">{Math.round(savingsPct)}%</span>
            </div>
            <Progress value={savingsPct} className="h-2 mb-2" />
            <p className="text-xs text-zinc-500">
              {formatCurrency(monthlyBalance > 0 ? Math.min(monthlyBalance, savingsGoal) : 0)} de {formatCurrency(savingsGoal)}
              {savingsPct >= 100 ? " — ¡Meta cumplida! 🎉" : ` — Faltan ${formatCurrency(Math.max(savingsGoal - monthlyBalance, 0))}`}
            </p>
          </CardContent></Card>
        </div>
      )}

      {/* En qué gastas más */}
      {catBreakdown.length > 0 && (
        <div className="px-5 mb-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2"><span>📊</span><span>En qué gastas más</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {catBreakdown.map((cat) => (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-sm text-zinc-700">{cat.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-800">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(cat.total / maxCat) * 100}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gastos últimos 7 días */}
      {dailySpending.some((d) => d.amount > 0) && (
        <div className="px-5 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2"><span>📈</span><span>Gastos últimos 7 días</span></CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={dailySpending} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v)), "Gasto"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #f4f4f5", padding: "8px 12px" }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {dailySpending.map((_, i) => (
                      <Cell key={i} fill={i === dailySpending.length - 1 ? "#7c3aed" : "#ddd6fe"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Últimos movimientos */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-800">Últimos movimientos</h2>
          <Link href="/transactions" className="flex items-center gap-0.5 text-sm text-violet-600 font-medium">
            Ver todos<ChevronRight className="size-4" />
          </Link>
        </div>
        {recentTx.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-zinc-50">
              {recentTx.map((tx) => <TransactionItem key={tx.id} transaction={tx} />)}
            </div>
          </Card>
        ) : (
          <div className="bg-zinc-50 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-medium text-zinc-700 mb-1">Sin movimientos este mes</p>
            <p className="text-xs text-zinc-500 mb-3">Registra tus gastos e ingresos para ver el análisis</p>
            <Link href="/add" className="inline-block px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium">
              Agregar primer movimiento
            </Link>
          </div>
        )}
      </div>

      {/* Deudas activas insight */}
      {totalLiabilities > 0 && (
        <div className="px-5 mb-6">
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💳</span>
              <div>
                <p className="text-sm font-semibold text-rose-800">Tienes deudas activas</p>
                <p className="text-xs text-rose-600 mt-0.5">
                  Total: {formatCurrency(totalLiabilities)} — revisa y actualiza en la sección de Cuentas
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
