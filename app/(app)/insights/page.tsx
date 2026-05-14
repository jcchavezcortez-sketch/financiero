"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getFinancialOverview, type FinancialOverview } from "@/lib/supabase/queries";
import {
  getAvailableLiquidity,
  getProtectedSavings,
  getTotalLiabilities,
  getNetWorth,
  getMonthlyIncome,
  getMonthlyExpenses,
  getMonthlyBalance,
  getNextDueDate,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import { MONTHS_ES } from "@/lib/constants";

const savingsTips = [
  { emoji: "🛒", title: "Planifica tus compras del supermercado", description: "Hacer una lista antes de ir puede reducir tus gastos hasta un 20%." },
  { emoji: "☕", title: "El café en casa importa", description: "Preparar café en casa puede ahorrarte S/ 80–120 al mes." },
  { emoji: "📱", title: "Revisa tus suscripciones", description: "¿Usas todas tus apps de pago? Cancelar una puede liberar S/ 30–60 al mes." },
];

export default function InsightsPage() {
  const [currentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FinancialOverview | null>(null);

  useEffect(() => {
    getFinancialOverview(currentMonth.getMonth(), currentMonth.getFullYear())
      .then(setOverview)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const transactions = overview?.transactions ?? [];
  const accounts = overview?.accounts ?? [];
  const liabilities = overview?.liabilities ?? [];

  const monthlyIncome = getMonthlyIncome(transactions);
  const monthlyExpenses = getMonthlyExpenses(transactions);
  const monthlyBalance = getMonthlyBalance(transactions);
  const totalLiabilities = getTotalLiabilities(liabilities);
  const netWorth = getNetWorth(accounts, liabilities);
  const nextDue = getNextDueDate(liabilities);
  const topCategories = (overview?.categoryBreakdown ?? []).slice(0, 3);
  const monthName = MONTHS_ES[currentMonth.getMonth()];
  const hasTransactions = transactions.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col px-5 pt-12">
        <div className="h-8 bg-zinc-100 rounded-xl w-40 mb-6 animate-pulse" />
        {[0, 1, 2].map((i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl mb-3 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Insights 💡</h1>
        <p className="text-sm text-zinc-500 mt-1">Análisis inteligente de tus finanzas</p>
      </div>

      {/* Resumen del mes */}
      <div className="px-5 mb-4">
        <Card>
          <CardContent className="p-4">
            {hasTransactions ? (
              <p className="text-sm text-zinc-600 leading-relaxed">
                En <strong>{monthName}</strong> llevas{" "}
                <strong className="text-rose-600">{formatCurrency(monthlyExpenses)}</strong>{" "}
                en gastos y{" "}
                <strong className="text-emerald-600">{formatCurrency(monthlyIncome)}</strong>{" "}
                en ingresos. Balance del mes:{" "}
                <strong className={monthlyBalance >= 0 ? "text-violet-600" : "text-rose-600"}>
                  {formatCurrency(monthlyBalance)}
                </strong>.
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Aún no hay movimientos en <strong>{monthName}</strong>. Registra tus gastos e ingresos para ver el análisis.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Situación financiera */}
      {accounts.length > 0 && (
        <div className="px-5 mb-4">
          <h2 className="text-base font-semibold text-zinc-700 mb-3">Tu situación actual</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium mb-1">Disponible</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(getAvailableLiquidity(accounts))}</p>
            </div>
            <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
              <p className="text-xs text-violet-600 font-medium mb-1">Ahorro protegido</p>
              <p className="text-lg font-bold text-violet-700">{formatCurrency(getProtectedSavings(accounts))}</p>
            </div>
            {totalLiabilities > 0 && (
              <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                <p className="text-xs text-rose-600 font-medium mb-1">Deudas</p>
                <p className="text-lg font-bold text-rose-700">{formatCurrency(totalLiabilities)}</p>
              </div>
            )}
            <div className={`rounded-2xl p-4 border ${netWorth >= 0 ? "bg-zinc-50 border-zinc-100" : "bg-rose-50 border-rose-100"}`}>
              <p className="text-xs text-zinc-500 font-medium mb-1">Balance real</p>
              <p className={`text-lg font-bold ${netWorth >= 0 ? "text-zinc-800" : "text-rose-700"}`}>
                {formatCurrency(netWorth)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alertas de deudas */}
      {liabilities.filter((l) => l.status === "active").length > 0 && (
        <div className="px-5 mb-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-700 mb-1">Alertas de deudas</h2>
          {totalLiabilities > 0 && (
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 flex items-start gap-3">
              <span className="text-xl">💳</span>
              <div>
                <p className="text-sm font-semibold text-rose-800">Tienes deudas activas</p>
                <p className="text-xs text-rose-600 mt-0.5">Total: {formatCurrency(totalLiabilities)}</p>
              </div>
            </div>
          )}
          {nextDue && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Próximo vencimiento</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {nextDue.name} — {formatCurrency(nextDue.current_balance)} vence el{" "}
                  {new Date(nextDue.due_date! + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long" })}
                </p>
              </div>
            </div>
          )}
          {netWorth < 0 && (
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-rose-800">Balance real negativo</p>
                <p className="text-xs text-rose-600 mt-0.5">Tus deudas superan tus activos. Considera reducir gastos.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top categorías del mes */}
      {topCategories.length > 0 ? (
        <div className="px-5 mb-6">
          <h2 className="text-base font-semibold text-zinc-700 mb-3">Top categorías del mes</h2>
          <div className="space-y-2">
            {topCategories.map((cat, i) => (
              <div key={cat.categoryId} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-zinc-100">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-500">
                  {i + 1}
                </div>
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-800">{cat.name}</p>
                  <p className="text-xs text-zinc-400">{cat.count} movimiento{cat.count !== 1 ? "s" : ""}</p>
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: cat.color }}>
                  {formatCurrency(cat.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !hasTransactions && (
          <div className="px-5 mb-6">
            <div className="bg-zinc-50 rounded-2xl p-8 text-center border border-zinc-100">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-sm font-medium text-zinc-700 mb-1">Sin movimientos suficientes</p>
              <p className="text-xs text-zinc-500">Cuando registres algunos movimientos, te mostraremos insights de ahorro y análisis por categorías.</p>
            </div>
          </div>
        )
      )}

      {/* Consejos de ahorro — siempre se muestran */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-zinc-700 mb-3">Consejos de ahorro</h2>
        <div className="space-y-3">
          {savingsTips.map((tip, i) => (
            <div key={i} className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tip.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-violet-800 mb-1">{tip.title}</p>
                  <p className="text-xs text-violet-600 leading-relaxed">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
