"use client";

import { Card, CardContent } from "@/components/ui/card";
import InsightCard from "@/components/shared/InsightCard";
import {
  mockInsights,
  mockMonthlySummary,
  mockPreviousMonthSummary,
  mockCategorySummaries,
} from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

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
  const diff = mockMonthlySummary.totalExpenses - mockPreviousMonthSummary.totalExpenses;
  const isMoreExpensive = diff > 0;
  const topCategories = mockCategorySummaries.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">
          Insights 💡
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Análisis inteligente de tus finanzas
        </p>
      </div>

      {/* Month Summary */}
      <div className="px-5 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-600 leading-relaxed">
              Este mes ({mockMonthlySummary.month}) llevás{" "}
              <strong className="text-rose-600">
                {formatCurrency(mockMonthlySummary.totalExpenses)}
              </strong>{" "}
              en gastos y{" "}
              <strong className="text-emerald-600">
                {formatCurrency(mockMonthlySummary.totalIncome)}
              </strong>{" "}
              en ingresos. Tu balance positivo es de{" "}
              <strong className="text-violet-600">
                {formatCurrency(mockMonthlySummary.balance)}
              </strong>
              . 🎉
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="px-5 mb-6 space-y-3">
        <h2 className="text-base font-semibold text-zinc-700 mb-1">
          Alertas y novedades
        </h2>
        {mockInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* This month vs last month */}
      <div className="px-5 mb-6">
        <h2 className="text-base font-semibold text-zinc-700 mb-3">
          Este mes vs. mes anterior
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">
                {mockMonthlySummary.month}
              </p>
              <p className="text-xl font-bold text-rose-600">
                {formatCurrency(mockMonthlySummary.totalExpenses)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                en gastos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-zinc-500 mb-1">
                {mockPreviousMonthSummary.month}
              </p>
              <p className="text-xl font-bold text-zinc-600">
                {formatCurrency(mockPreviousMonthSummary.totalExpenses)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                en gastos
              </p>
            </CardContent>
          </Card>
        </div>
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
      </div>

      {/* Top Categories */}
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
              <span className="text-xl">{cat.categoryIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800">
                  {cat.categoryName}
                </p>
                <p className="text-xs text-zinc-400">
                  {cat.transactionCount} movimiento
                  {cat.transactionCount !== 1 ? "s" : ""}
                </p>
              </div>
              <p
                className="text-sm font-bold shrink-0"
                style={{ color: cat.categoryColor }}
              >
                {formatCurrency(cat.total)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Tips */}
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
    </div>
  );
}
