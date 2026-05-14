"use client";

import { useState, useEffect, useMemo } from "react";
import { Download, Search, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MonthSelector from "@/components/shared/MonthSelector";
import TransactionList from "@/components/shared/TransactionList";
import CategoryBadge from "@/components/shared/CategoryBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getTransactions, getAccounts, getCategories, deleteTransaction, type TransactionWithRefs } from "@/lib/supabase/queries";
import type { Transaction } from "@/types";

type TxDisplay = Transaction & { rawId: string };

function toDisplay(t: TransactionWithRefs): TxDisplay {
  return {
    rawId: t.id,
    id: t.id,
    type: t.type as "expense" | "income",
    amount: t.amount,
    description: t.description,
    merchant: t.merchant ?? undefined,
    category: t.category?.name ?? "Sin categoría",
    categoryId: t.category_id ?? "",
    accountId: t.account_id,
    accountName: t.account?.name ?? "",
    date: t.date,
    currency: t.currency,
  };
}

export default function TransactionsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [selectedTx, setSelectedTx] = useState<TxDisplay | null>(null);
  const [allTx, setAllTx] = useState<TransactionWithRefs[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; icon: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; icon: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTransactions({ month: currentMonth.getMonth(), year: currentMonth.getFullYear() }),
      getAccounts(),
      getCategories(),
    ]).then(([txs, accs, cats]) => {
      setAllTx(txs);
      setAccounts(accs.map((a) => ({ id: a.id, name: a.name, icon: a.icon })));
      setCategories(cats.map((c) => ({ id: c.id, name: c.name, icon: c.icon })));
    }).catch(console.error).finally(() => setLoading(false));
  }, [currentMonth]);

  const filtered = useMemo(() => {
    return allTx
      .filter((tx) => {
        const matchSearch =
          search === "" ||
          tx.description.toLowerCase().includes(search.toLowerCase()) ||
          (tx.merchant ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (tx.category?.name ?? "").toLowerCase().includes(search.toLowerCase());
        const matchCategory = categoryFilter === "all" || tx.category_id === categoryFilter;
        const matchAccount = accountFilter === "all" || tx.account_id === accountFilter;
        return matchSearch && matchCategory && matchAccount;
      })
      .map(toDisplay);
  }, [allTx, search, categoryFilter, accountFilter]);

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const handleExport = () => {
    const header = "fecha,descripcion,comercio,categoria,cuenta,tipo,monto\n";
    const rows = filtered
      .map((t) => `${t.date},"${t.description}","${t.merchant ?? ""}","${t.category}","${t.accountName}","${t.type === "expense" ? "gasto" : "ingreso"}",${t.amount}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movimientos-${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setAllTx((prev) => prev.filter((t) => t.id !== id));
    setSelectedTx(null);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-800">Movimientos</h1>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="size-3.5" />
          Exportar
        </Button>
      </div>

      {/* Month Selector */}
      <div className="px-5 mb-4">
        <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
      </div>

      {loading ? (
        <div className="px-5 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : allTx.length === 0 && search === "" && categoryFilter === "all" && accountFilter === "all" ? (
        /* Empty state — sin movimientos en este mes */
        <div className="px-5 flex flex-col items-center justify-center py-16 text-center">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg font-bold text-zinc-800 mb-2">Sin movimientos este mes</p>
          <p className="text-sm text-zinc-500 mb-6">
            Registra tus gastos e ingresos para empezar a entender tus finanzas
          </p>
          <Link href="/add">
            <Button className="gap-2">
              <Plus className="size-4" />
              Agregar primer movimiento
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="px-5 mb-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                placeholder="Buscar movimiento..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="px-5 mb-4 grid grid-cols-2 gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.icon} {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="px-5 mb-4">
            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  {filtered.length} movimiento{filtered.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-emerald-600 font-medium">+ {formatCurrency(totalIncome)}</span>
                  <span className="text-sm text-rose-600 font-medium">- {formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="bg-white rounded-2xl mx-5 mb-4 overflow-hidden shadow-sm border border-zinc-100">
            <TransactionList
              transactions={filtered}
              emptyMessage="No hay movimientos con estos filtros."
              onTransactionClick={(tx) => setSelectedTx(tx as TxDisplay)}
            />
          </div>
        </>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del movimiento</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-2xl">
                  {selectedTx.type === "expense" ? "💸" : "💰"}
                </div>
                <div>
                  <p className="font-semibold text-zinc-800">{selectedTx.description}</p>
                  <p className="text-sm text-zinc-500">{selectedTx.merchant}</p>
                </div>
              </div>

              <div className="text-center py-3">
                <p className={`text-3xl font-bold ${selectedTx.type === "expense" ? "text-rose-600" : "text-emerald-600"}`}>
                  {selectedTx.type === "expense" ? "- " : "+ "}{formatCurrency(selectedTx.amount)}
                </p>
              </div>

              <div className="space-y-2 bg-zinc-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Fecha</span>
                  <span className="font-medium text-zinc-800">{formatDate(selectedTx.date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Categoría</span>
                  <CategoryBadge category={selectedTx.category} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Cuenta</span>
                  <span className="font-medium text-zinc-800">{selectedTx.accountName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Tipo</span>
                  <span className={`font-medium ${selectedTx.type === "expense" ? "text-rose-600" : "text-emerald-600"}`}>
                    {selectedTx.type === "expense" ? "Gasto" : "Ingreso"}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={() => handleDelete(selectedTx.id)}
              >
                Eliminar movimiento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
