"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getMonthlySummary, getLiabilities } from "@/lib/supabase/queries";
import { getTotalLiabilities } from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import { MONTHS_ES } from "@/lib/constants";
import type { Liability } from "@/types";
import type { Database } from "@/types/database";

type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];

const savingsTips = [
  {
    emoji: "🛒",
    title: "Planifica tus compras del supermercado",
    description:
      "Hacer una lista antes de ir al supermercado puede reducir tus gastos hasta un 20%.",
  },
  {
    emoji: "☕",
    title: "El café en casa importa",
    description:
      "Hacer café en casa en vez de comprarlo puede ahorrarte S/ 80-120 al mes.",
  },
  {
    emoji: "📱",
    title: "Revisa tus suscripciones",
    description:
      "¿Usas todas tus apps de pago? Cancelar una puede liberar S/ 30-60 al mes.",
  },
];

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [currentMonth] = useState(new Date());
  const [prevMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  );

  const [curSummary, setCurSummary] = useState<{
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    categoryBreakdown: { categoryId: string; name: string; icon: string; color: string; total: number; count: number }[];
  } | null>(null);
  const [prevExpenses, setPrevExpenses] = useState(0);
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMonthlySummary(currentMonth.getMonth(), currentMonth.getFullYear()),
      getMonthlySummary(prevMonth.getMonth(), prevMonth.getFullYear()),
      getLiabilities("active"),
    ])
      .then(([cur, prev, liabs]) => {
        setCurSummary({
          totalIncome: cur.totalIncome,
          totalExpenses: cur.totalExpenses,
          balance: cur.balance,
          categoryBreakdown: cur.categoryBreakdown,
        });
        setPrevExpenses(prev.totalExpenses);
        setLiabilities(liabs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalLiabilities = getTotalLiabilities(liabilities as unknown as Liability[]);
  const hasEnoughData =
    !loading && curSummary && (curSummary.totalIncome > 0 || curSummary.totalExpenses > 0);

  const monthName = MONTHS_ES[currentMonth.getMonth()];
  const prevMonthName = MONTHS_ES[prevMonth.getMonth()];
  const diff = (curSummary?.totalExpenses ?? 0) - prevExpenses;
  const isMoreExpensive = diff > 0;

  const topCategories = curSummary?.categoryBreakdown.slice(0, 3) ?? [];

  // Dynamic insights from real data
  const dynamicInsights = [];
  if (totalLiabilities > 0) {
    dynamicInsights.push({
      id: "debt",
      type: "warning" as const,
      emoji: "⚠️",
      title: "Tienes deudas activas",
      message: `Tu deuda total es de ${formatCurrency(totalLiabilities)}. Recuerda registrar los pagos cuando los hagas.`,
    });

    const nextDue = (liabilities as LiabilityRow[])
      .filter((l) => l.due_date)
      .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))[0];
    if (nextDue) {
      dynamicInsights.push({
        id: "due",
        type: "alert" as const,
        emoji: "📅",
        title: "Próximo vencimiento",
        message: `"${nextDue.name}" vence el ${nextDue.due_date}. Monto: ${formatCurrency(nextDue.current_balance)}.`,
      });
    }
  }

  if (hasEnoughData && curSummary) {
    if (curSummary.balance > 0) {
      dynamicInsights.push({
        id: "positive",
        type: "success" as const,
        emoji: "🎉",
        title: "Balance positivo este mes",
        message: `Llevas ${formatCurrency(curSummary.balance)} de saldo positivo en ${monthName}. ¡Buen trabajo!`,
      });
    } else if (curSummary.balance < 0) {
      dynamicInsights.push({
        id: "negative",
        type: "warning" as const,
        emoji: "📉",
        title: "Gastos mayores que ingresos",
        message: `Este mes gastas ${formatCurrency(Math.abs(curSummary.balance))} más de lo que ingresas. Revisa tus categorías.`,
      });
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Insights 💡</h1>
        <p className="text-sm text-zinc-500 mt-1">Análisis de tus finanzas</p>
      </div>

      {loading ? (
        <div className="px-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !hasEnoughData ? (
        <div className="px-5">
          <div className="bg-zinc-50 rounded-2xl p-10 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-base font-semibold text-zinc-700 mb-2">
              Todavía no hay datos suficientes
            </p>
            <p className="text-sm text-zinc-500">
              Cuando registres algunos movimientos, te mostraremos insights de ahorro.
            </p>
          </div>

          {/* Mostrar deudas incluso sin transacciones */}
          {totalLiabilities > 0 && (
            <div className="mt-4 space-y-3">
              {dynamicInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`rounded-2xl p-4 border ${
                    insight.type === "warning"
                      ? "bg-amber-50 border-amber-200"
                      : insight.type === "alert"
                      ? "bg-rose-50 border-rose-200"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{insight.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 mb-0.5">
                        {insight.title}
                      </p>
                      <p className="text-xs text-zinc-600">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Consejos siempre visibles */}
          <div className="mt-6 space-y-3">
            <h2 className="text-base font-semibold text-zinc-700">Consejos de ahorro</h2>
            {savingsTips.map((tip, i) => (
              <div
                key={i}
                className="bg-violet-50 rounded-2xl p-4 border border-violet-100"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tip.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-violet-800 mb-1">{tip.title}</p>
                    <p className="text-xs text-violet-600 leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Resumen del mes */}
          <div className="px-5 mb-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-zinc-600 leading-relaxed">
                  En {monthName} llevas{" "}
                  <strong className="text-rose-600">
                    {formatCurrency(curSummary!.totalExpenses)}
                  </strong>{" "}
                  en gastos y{" "}
                  <strong className="text-emerald-600">
                    {formatCurrency(curSummary!.totalIncome)}
                  </strong>{" "}
                  en ingresos. Balance:{" "}
                  <strong
                    className={curSummary!.balance >= 0 ? "text-violet-600" : "text-rose-600"}
                  >
                    {formatCurrency(curSummary!.balance)}
                  </strong>
                  .
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Insights dinámicos */}
          {dynamicInsights.length > 0 && (
            <div className="px-5 mb-6 space-y-3">
              <h2 className="text-base font-semibold text-zinc-700 mb-1">
                Alertas y novedades
              </h2>
              {dynamicInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`rounded-2xl p-4 border ${
                    insight.type === "warning"
                      ? "bg-amber-50 border-amber-200"
                      : insight.type === "alert"
                      ? "bg-rose-50 border-rose-200"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{insight.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 mb-0.5">
                        {insight.title}
                      </p>
                      <p className="text-xs text-zinc-600">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Este mes vs mes anterior */}
          {(curSummary!.totalExpenses > 0 || prevExpenses > 0) && (
            <div className="px-5 mb-6">
              <h2 className="text-base font-semibold text-zinc-700 mb-3">
                Este mes vs. mes anterior
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-500 mb-1">{monthName}</p>
                    <p className="text-xl font-bold text-rose-600">
                      {formatCurrency(curSummary!.totalExpenses)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">en gastos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-500 mb-1">{prevMonthName}</p>
                    <p className="text-xl font-bold text-zinc-600">
                      {formatCurrency(prevExpenses)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">en gastos</p>
                  </CardContent>
                </Card>
              </div>
              {diff !== 0 && (
                <div
                  className={`mt-3 rounded-xl p-3 text-center text-sm font-medium ${
                    isMoreExpensive
                      ? "bg-rose-50 text-rose-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isMoreExpensive ? "📈" : "📉"}{" "}
                  {isMoreExpensive ? "Gastas" : "Ahorras"}{" "}
                  <strong>{formatCurrency(Math.abs(diff))}</strong>{" "}
                  {isMoreExpensive ? "más" : "menos"} que el mes pasado
                </div>
              )}
            </div>
          )}

          {/* Top categorías */}
          {topCategories.length > 0 && (
            <div className="px-5 mb-6">
              <h2 className="text-base font-semibold text-zinc-700 mb-3">
                Top categorías del mes
              </h2>
              <div className="space-y-2">
                {topCategories.map((cat, i) => (
                  <div
                    key={cat.categoryId}
                    className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-zinc-100"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-500">
                      {i + 1}
                    </div>
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-800">{cat.name}</p>
                      <p className="text-xs text-zinc-400">
                        {cat.count} movimiento{cat.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <p
                      className="text-sm font-bold shrink-0"
                      style={{ color: cat.color }}
                    >
                      {formatCurrency(cat.total)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consejos */}
          <div className="px-5 mb-6">
            <h2 className="text-base font-semibold text-zinc-700 mb-3">
              Consejos de ahorro
            </h2>
            <div className="space-y-3">
              {savingsTips.map((tip, i) => (
                <div
                  key={i}
                  className="bg-violet-50 rounded-2xl p-4 border border-violet-100"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tip.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-violet-800 mb-1">
                        {tip.title}
                      </p>
                      <p className="text-xs text-violet-600 leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
