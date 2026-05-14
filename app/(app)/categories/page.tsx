"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { getCategories, getTransactions, seedDefaultCategories } from "@/lib/supabase/queries";
import type { TransactionWithRefs } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";

interface CategoryDetail {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
  count: number;
}

function CategoryGrid({
  categories,
  type,
  transactions,
  onSelect,
}: {
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  type: "expense" | "income";
  transactions: TransactionWithRefs[];
  onSelect: (detail: CategoryDetail) => void;
}) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-3xl mb-2">📂</p>
        <p className="text-sm text-zinc-500">No hay categorías disponibles</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((cat) => {
        const catTxs = transactions.filter(
          (t) => t.category_id === cat.id && t.type === type
        );
        const total = catTxs.reduce((s, t) => s + t.amount, 0);
        return (
          <button
            key={cat.id}
            onClick={() =>
              onSelect({
                categoryId: cat.id,
                categoryName: cat.name,
                categoryIcon: cat.icon,
                categoryColor: cat.color,
                total,
                count: catTxs.length,
              })
            }
            className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm text-left hover:shadow-md active:scale-[0.97] transition-all"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-3"
              style={{ backgroundColor: `${cat.color}20` }}
            >
              {cat.icon}
            </div>
            <p className="text-sm font-semibold text-zinc-800 mb-0.5">{cat.name}</p>
            {total > 0 ? (
              <p className="text-sm font-bold" style={{ color: cat.color }}>
                {formatCurrency(total)}
              </p>
            ) : (
              <p className="text-xs text-zinc-400">Sin movimientos</p>
            )}
            {catTxs.length > 0 && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {catTxs.length} movimiento{catTxs.length !== 1 ? "s" : ""}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryDetail | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<
    Array<{ id: string; name: string; icon: string; color: string }>
  >([]);
  const [incomeCategories, setIncomeCategories] = useState<
    Array<{ id: string; name: string; icon: string; color: string }>
  >([]);
  const [transactions, setTransactions] = useState<TransactionWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadData = () => {
    setLoading(true);
    const now = new Date();
    Promise.all([
      getCategories("expense"),
      getCategories("income"),
      getTransactions({ month: now.getMonth(), year: now.getFullYear() }),
    ])
      .then(([exp, inc, txs]) => {
        setExpenseCategories(
          exp.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))
        );
        setIncomeCategories(
          inc.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))
        );
        setTransactions(txs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedCategories = async () => {
    setSeeding(true);
    try {
      await seedDefaultCategories();
      loadData();
    } finally {
      setSeeding(false);
    }
  };

  const getDetailTransactions = () => {
    if (!selectedCategory) return [];
    return transactions
      .filter((t) => t.category_id === selectedCategory.categoryId)
      .slice(0, 3);
  };

  const hasNoCategories =
    !loading && expenseCategories.length === 0 && incomeCategories.length === 0;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Categorías</h1>
      </div>

      {hasNoCategories ? (
        <div className="px-5 text-center py-16">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-base font-semibold text-zinc-700 mb-2">
            No tienes categorías todavía
          </p>
          <p className="text-sm text-zinc-500 mb-5">
            Carga las categorías base para comenzar a organizar tus gastos e ingresos.
          </p>
          <Button onClick={handleSeedCategories} disabled={seeding}>
            {seeding ? "Cargando categorías..." : "Cargar categorías base"}
          </Button>
        </div>
      ) : (
        <div className="px-5">
          <Tabs defaultValue="expenses">
            <TabsList className="w-full mb-5">
              <TabsTrigger value="expenses" className="flex-1">
                💸 Gastos
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1">
                💰 Ingresos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expenses">
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-28 bg-zinc-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <CategoryGrid
                  categories={expenseCategories}
                  type="expense"
                  transactions={transactions}
                  onSelect={setSelectedCategory}
                />
              )}
            </TabsContent>

            <TabsContent value="income">
              {loading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 bg-zinc-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <CategoryGrid
                  categories={incomeCategories}
                  type="income"
                  transactions={transactions}
                  onSelect={setSelectedCategory}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Category Detail Dialog */}
      <Dialog
        open={!!selectedCategory}
        onOpenChange={(open) => !open && setSelectedCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de categoría</DialogTitle>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: `${selectedCategory.categoryColor}20` }}
                >
                  {selectedCategory.categoryIcon}
                </div>
                <div>
                  <p className="text-lg font-bold text-zinc-800">
                    {selectedCategory.categoryName}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {selectedCategory.count} movimiento
                    {selectedCategory.count !== 1 ? "s" : ""} este mes
                  </p>
                </div>
              </div>

              <div
                className="rounded-2xl p-5 text-center"
                style={{ backgroundColor: `${selectedCategory.categoryColor}10` }}
              >
                <p className="text-xs text-zinc-500 mb-1">Total este mes</p>
                <p
                  className="text-3xl font-bold"
                  style={{ color: selectedCategory.categoryColor }}
                >
                  {selectedCategory.total > 0
                    ? formatCurrency(selectedCategory.total)
                    : "S/ 0.00"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-700">Movimientos recientes</p>
                {getDetailTransactions().map((tx) => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center py-2 border-b border-zinc-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{tx.description}</p>
                      <p className="text-xs text-zinc-400">{tx.date}</p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        tx.type === "expense" ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {tx.type === "expense" ? "- " : "+ "}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
                {getDetailTransactions().length === 0 && (
                  <p className="text-sm text-zinc-400 text-center py-3">
                    Sin movimientos en esta categoría este mes
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
