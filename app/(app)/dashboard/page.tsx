"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import MonthSelector from "@/components/shared/MonthSelector";
import TransactionItem from "@/components/shared/TransactionItem";
import InsightCard from "@/components/shared/InsightCard";
import {
  mockUser,
  mockMonthlySummary,
  mockTransactions,
  mockInsights,
  mockDailySpending,
  mockCategorySummaries,
  mockAccounts,
} from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 4, 1)); // May 2025

  const totalBalance = mockAccounts.reduce((sum, a) => sum + a.balance, 0);
  const savingsProgress = (mockMonthlySummary.savingsAchieved / mockMonthlySummary.savingsGoal) * 100;
  const recentTransactions = mockTransactions.slice(0, 5);
  const topCategories = mockCategorySummaries.slice(0, 4);
  const maxCategoryAmount = Math.max(...topCategories.map((c) => c.total));

  const firstName = mockUser.name;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-sm">Buenos días</p>
            <h1 className="text-2xl font-bold text-zinc-800">
              Hola, {firstName} 👋
            </h1>
          </div>
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-violet-100 text-violet-700 font-semibold text-lg">
            {firstName[0]}
          </div>
        </div>
      </div>

      {/* Month Selector */}
      <div className="px-5 mb-4">
        <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
      </div>

      {/* Total Balance Card */}
      <div className="px-5 mb-4">
        <div className="gradient-purple rounded-3xl p-6 text-white shadow-lg shadow-violet-200">
          <p className="text-violet-200 text-sm font-medium mb-1">
            Total disponible
          </p>
          <p className="text-4xl font-bold mb-1">
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-violet-300 text-sm">
            En {mockAccounts.length} cuentas
          </p>
        </div>
      </div>

      {/* Summary Row */}
      <div className="px-5 mb-4 grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-emerald-600 font-medium mb-1">Ingresos</p>
          <p className="text-sm font-bold text-emerald-700">
            {formatCurrency(mockMonthlySummary.totalIncome)}
          </p>
        </div>
        <div className="bg-rose-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-rose-600 font-medium mb-1">Gastos</p>
          <p className="text-sm font-bold text-rose-700">
            {formatCurrency(mockMonthlySummary.totalExpenses)}
          </p>
        </div>
        <div className="bg-violet-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-violet-600 font-medium mb-1">Balance</p>
          <p className="text-sm font-bold text-violet-700">
            {formatCurrency(mockMonthlySummary.balance)}
          </p>
        </div>
      </div>

      {/* Savings Goal */}
      <div className="px-5 mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🐷</span>
                <span className="text-sm font-semibold text-zinc-700">
                  Meta de ahorro
                </span>
              </div>
              <span className="text-xs font-bold text-violet-600">
                {Math.round(savingsProgress)}%
              </span>
            </div>
            <Progress
              value={savingsProgress}
              className="h-2 mb-2"
              indicatorClassName="bg-violet-500"
            />
            <p className="text-xs text-zinc-500">
              {formatCurrency(mockMonthlySummary.savingsAchieved)} de{" "}
              {formatCurrency(mockMonthlySummary.savingsGoal)} — Faltan{" "}
              {formatCurrency(
                mockMonthlySummary.savingsGoal - mockMonthlySummary.savingsAchieved
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <div className="px-5 mb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span>📊</span>
              <span>En qué gastas más</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {topCategories.map((cat) => (
                <div key={cat.categoryId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.categoryIcon}</span>
                      <span className="text-sm text-zinc-700">
                        {cat.categoryName}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-800">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(cat.total / maxCategoryAmount) * 100}%`,
                        backgroundColor: cat.categoryColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Spending Chart */}
      <div className="px-5 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <span>📈</span>
              <span>Gastos últimos 7 días</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart
                data={mockDailySpending}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Gasto",
                  ]}
                  labelStyle={{ color: "#27272a", fontWeight: 600 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #f4f4f5",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    padding: "8px 12px",
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {mockDailySpending.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === mockDailySpending.length - 1
                          ? "#7c3aed"
                          : "#ddd6fe"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-zinc-800">
            Últimos movimientos
          </h2>
          <Link
            href="/transactions"
            className="flex items-center gap-0.5 text-sm text-violet-600 font-medium"
          >
            Ver todos
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <Card className="overflow-hidden">
          <div className="divide-y divide-zinc-50">
            {recentTransactions.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        </Card>
      </div>

      {/* Insight */}
      <div className="px-5 mb-6">
        <InsightCard insight={mockInsights[1]} />
      </div>
    </div>
  );
}
