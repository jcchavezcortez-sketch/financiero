"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  getCategories,
  getCategoryBudgets,
  upsertCategoryBudget,
  deleteCategoryBudget,
  getCategoryBudgetSpending,
} from "@/lib/supabase/queries";
import type { Database } from "@/types/database";

type BudgetRow = Database["public"]["Tables"]["category_budgets"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

const budgetSchema = z.object({
  category_id: z.string().min(1, "Selecciona una categoría"),
  monthly_limit: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Monto válido requerido"),
  alert_threshold: z.string().optional(),
  notes: z.string().optional(),
});

type BudgetForm = z.infer<typeof budgetSchema>;

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [loading, setLoading] = useState(true);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [budgetSuccess, setBudgetSuccess] = useState(false);
  const [budgetSpending, setBudgetSpending] = useState<Record<string, any>>({});

  const budgetForm = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
  });

  useEffect(() => {
    Promise.all([getCategoryBudgets(), getCategories()])
      .then(([buds, cats]) => {
        setBudgets(buds);
        setCategories(cats);

        // Fetch spending for each budget
        buds.forEach((b) => {
          getCategoryBudgetSpending(b.category_id).then((spending) => {
            setBudgetSpending((prev) => ({ ...prev, [b.id]: spending }));
          });
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onAddBudget = async (data: BudgetForm) => {
    setBudgetError(null);
    try {
      await upsertCategoryBudget({
        category_id: data.category_id,
        monthly_limit: Number(data.monthly_limit),
        alert_threshold: data.alert_threshold ? Number(data.alert_threshold) : 80,
        notes: data.notes || null,
      });

      const updated = await getCategoryBudgets();
      setBudgets(updated);
      setBudgetSuccess(true);
      setTimeout(() => {
        setShowAddBudget(false);
        setBudgetSuccess(false);
        budgetForm.reset();
      }, 1500);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      setBudgetError(message);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      await deleteCategoryBudget(budgetId);
      setBudgets((prev) => prev.filter((b) => b.id !== budgetId));
    } catch (e) {
      console.error(e);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || categoryId;
  };

  const getCategoryIcon = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.icon || "📊";
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Presupuestos</h1>
        <p className="text-sm text-zinc-500 mt-1">Establece límites mensuales por categoría</p>
      </div>

      {/* Content */}
      <div className="px-5 pb-8">
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => setShowAddBudget(true)} className="gap-1.5">
            <Plus className="size-4" />
            Nuevo presupuesto
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-base font-semibold text-zinc-700 mb-1">
              No tienes presupuestos
            </p>
            <p className="text-sm text-zinc-500">
              Crea presupuestos para monitorear gastos por categoría
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map((budget) => {
              const spending = budgetSpending[budget.id];
              const percentage = spending?.percentage_used ?? 0;
              const isWarning = percentage >= (budget.alert_threshold || 80);
              const isOver = spending?.is_over_budget ?? false;

              return (
                <div
                  key={budget.id}
                  className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {getCategoryIcon(budget.category_id)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-zinc-800">
                          {getCategoryName(budget.category_id)}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Límite: {formatCurrency(budget.monthly_limit)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-rose-500"
                      onClick={() => handleDeleteBudget(budget.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-zinc-600 font-medium">
                        Gastado
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          isOver ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(spending?.current_spending || 0)} /{" "}
                        {formatCurrency(budget.monthly_limit)} ({Math.round(percentage)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isOver
                            ? "bg-rose-500"
                            : isWarning
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Alert */}
                  {isWarning && !isOver && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                      <AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
                      <span>Alcanzaste el {Math.round(budget.alert_threshold || 80)}% del presupuesto</span>
                    </div>
                  )}
                  {isOver && (
                    <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 p-2 rounded-lg">
                      <AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
                      <span>¡Superaste el presupuesto!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sheet: Agregar Presupuesto */}
      <Sheet
        open={showAddBudget}
        onOpenChange={(open) => {
          setShowAddBudget(open);
          if (!open) {
            setBudgetError(null);
            budgetForm.reset();
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle>Nuevo Presupuesto</SheetTitle>
          </SheetHeader>

          {budgetSuccess ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Presupuesto creado!</p>
              <p className="text-sm text-zinc-500 mt-1">Ya estamos monitoreando gastos</p>
            </div>
          ) : (
            <>
              {budgetError && (
                <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-600 font-medium">{budgetError}</p>
                </div>
              )}
              <div className="px-6 py-4 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  <Select
                    onValueChange={(v) => budgetForm.setValue("category_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => EXPENSE_CATEGORIES.some((ec) => ec.id === c.id))
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {budgetForm.formState.errors.category_id && (
                    <p className="text-xs text-rose-500">
                      {budgetForm.formState.errors.category_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Límite mensual</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                      S/
                    </span>
                    <Input
                      type="number"
                      placeholder="1000"
                      className="pl-10"
                      {...budgetForm.register("monthly_limit")}
                    />
                  </div>
                  {budgetForm.formState.errors.monthly_limit && (
                    <p className="text-xs text-rose-500">
                      {budgetForm.formState.errors.monthly_limit.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Alerta al alcanzar (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="80"
                    defaultValue="80"
                    {...budgetForm.register("alert_threshold")}
                  />
                  <p className="text-xs text-zinc-500">
                    Te notificaremos cuando llegues a este porcentaje
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Notas (opcional)</Label>
                  <Input placeholder="Ej. Incluye comidas fuera" {...budgetForm.register("notes")} />
                </div>
              </div>
              <SheetFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={budgetForm.handleSubmit(onAddBudget)}
                  disabled={budgetForm.formState.isSubmitting}
                >
                  {budgetForm.formState.isSubmitting ? "Guardando..." : "Crear presupuesto"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
