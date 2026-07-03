"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import {
  getMonthlyCommitments,
  insertMonthlyCommitment,
  updateMonthlyCommitment,
  deleteOrDeactivateMonthlyCommitment,
  getCategories,
} from "@/lib/supabase/queries";
import type { Database } from "@/types/database";

type MonthlyCommitmentRow = Database["public"]["Tables"]["monthly_commitments"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

const fixedExpenseSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Monto inválido"),
  notes: z.string().optional(),
});

type FixedExpenseForm = z.infer<typeof fixedExpenseSchema>;

export default function GastosFijosPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MonthlyCommitmentRow | null>(null);
  const [expenses, setExpenses] = useState<MonthlyCommitmentRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FixedExpenseForm>({
    resolver: zodResolver(fixedExpenseSchema),
  });

  useEffect(() => {
    Promise.all([getMonthlyCommitments(), getCategories("expense")])
      .then(([commitments, cats]) => {
        const fixedExpenseTypes = ["rent", "utility", "subscription", "other"];
        const fixedExpenses = commitments.filter(
          (c) => fixedExpenseTypes.includes(c.commitment_type as string) && c.is_active
        );
        setExpenses(fixedExpenses);
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalFixed = expenses.reduce((sum, e) => sum + e.amount, 0);

  const onSave = async (data: FixedExpenseForm) => {
    setError(null);
    try {
      if (editingId) {
        await updateMonthlyCommitment(editingId, {
          amount: Number(data.amount),
          notes: data.notes || null,
        });
      } else {
        await insertMonthlyCommitment({
          commitment_type: "other",
          name: data.name,
          amount: Number(data.amount),
          notes: data.notes || null,
        });
      }
      const updated = await getMonthlyCommitments();
      const fixedExpenseTypes = ["rent", "utility", "subscription", "other"];
      const fixedExpenses = updated.filter(
        (c) => fixedExpenseTypes.includes(c.commitment_type as string) && c.is_active
      );
      setExpenses(fixedExpenses);
      setSubmitted(true);
      setTimeout(() => {
        setShowAdd(false);
        setEditingId(null);
        setSubmitted(false);
        form.reset();
      }, 1500);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al guardar";
      setError(message);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOrDeactivateMonthlyCommitment(deleteTarget.id);
      setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setShowDelete(false);
      setDeleteTarget(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al eliminar";
      setError(message);
    }
  };

  const openEdit = (expense: MonthlyCommitmentRow) => {
    setEditingId(expense.id);
    form.reset({
      name: expense.name,
      amount: String(expense.amount),
      notes: expense.notes ?? "",
    });
    setShowAdd(true);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Gastos fijos</h1>
        <p className="text-sm text-zinc-500 mt-1">Gastos mensuales recurrentes</p>
      </div>

      {/* Total Summary */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-to-r from-orange-50 to-rose-50 rounded-2xl border border-orange-200 p-4">
          <p className="text-sm text-orange-600 font-medium">Total de gastos fijos</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">
            {formatCurrency(totalFixed)}
          </p>
          <p className="text-xs text-orange-500 mt-1">
            Se deducirán mensualmente de tu presupuesto
          </p>
        </div>
      </div>

      {/* Add Button */}
      <div className="px-5 mb-5 flex justify-end">
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="size-4" />
          Agregar gasto fijo
        </Button>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="px-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="px-5 text-center py-10">
          <p className="text-4xl mb-3">💸</p>
          <p className="text-base font-semibold text-zinc-700 mb-1">
            No tienes gastos fijos registrados
          </p>
          <p className="text-sm text-zinc-500 mb-4">
            Agrega tus gastos recurrentes para llevar un mejor control
          </p>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="size-4 mr-1.5" />
            Crear primero
          </Button>
        </div>
      ) : (
        <div className="px-5 space-y-2 mb-6">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center justify-between group hover:border-zinc-200 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-800">{expense.name}</p>
                {expense.notes && (
                  <p className="text-xs text-zinc-400 mt-0.5">{expense.notes}</p>
                )}
                <p className="text-xs text-zinc-400 mt-1">Cada mes</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-zinc-800 text-right min-w-24">
                  {formatCurrency(expense.amount)}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(expense)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-zinc-400 hover:text-blue-500"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(expense);
                      setShowDelete(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sheet: Add/Edit Expense */}
      <Sheet
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) {
            setEditingId(null);
            setSubmitted(false);
            setError(null);
            form.reset();
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle>
              {editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}
            </SheetTitle>
          </SheetHeader>

          {submitted ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">
                {editingId ? "¡Actualizado!" : "¡Agregado!"}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {editingId ? "Gasto actualizado" : "Nuevo gasto fijo registrado"}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-600 font-medium">{error}</p>
                </div>
              )}
              <div className="px-6 py-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>Concepto</Label>
                  <Input
                    placeholder="Ej. Luz, Internet, Teléfono, Seguro..."
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-rose-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Monto mensual</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                      S/
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="pl-10"
                      {...form.register("amount")}
                    />
                  </div>
                  {form.formState.errors.amount && (
                    <p className="text-xs text-rose-500">
                      {form.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Notas (opcional)</Label>
                  <Input
                    placeholder="Detalles adicionales..."
                    {...form.register("notes")}
                  />
                </div>
              </div>
              <SheetFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={form.handleSubmit(onSave)}
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? "Guardando..."
                    : editingId
                    ? "Actualizar"
                    : "Agregar gasto"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog: Delete Confirmation */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar gasto fijo</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar "{deleteTarget?.name}"?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDelete(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={onDelete}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
