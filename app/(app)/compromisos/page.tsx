"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ChevronRight, CheckCircle2, SkipForward, Pencil, Power, AlertCircle, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn, formatCurrency } from "@/lib/utils";
import MonthSelector from "@/components/shared/MonthSelector";
import {
  getMonthlyCommitments,
  insertMonthlyCommitment,
  updateMonthlyCommitment,
  deleteOrDeactivateMonthlyCommitment,
  getCommitmentsWithStatus,
  markCommitmentAsPaid,
  markCommitmentAsSkipped,
  getFreeCashFlowSummary,
  toPeriodMonth,
  getAccounts,
  getLiabilities,
  getCategories,
} from "@/lib/supabase/queries";
import type { Database } from "@/types/database";
import type {
  CommitmentWithStatus,
  CommitmentType,
  FreeCashFlowSummary,
} from "@/types";
import { COMMITMENT_TYPE_META, DEBT_COMMITMENT_TYPES, SAVINGS_COMMITMENT_TYPES } from "@/types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMITMENT_TYPES = Object.entries(COMMITMENT_TYPE_META).map(([id, meta]) => ({
  id: id as CommitmentType,
  ...meta,
}));

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-50 border-amber-200",  text: "text-amber-700", label: "Pendiente" },
  overdue: { bg: "bg-rose-50 border-rose-200",    text: "text-rose-700",  label: "Vencido"   },
  paid:    { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Pagado" },
  skipped: { bg: "bg-zinc-50 border-zinc-200",    text: "text-zinc-500",  label: "Saltado"   },
};

// ── Schemas ───────────────────────────────────────────────────────────────────

const commitmentSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  commitment_type: z.string().min(1, "Tipo requerido"),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Monto debe ser mayor a 0"),
  due_day: z.string().optional().refine((v) => {
    if (!v || v === "") return true;
    const n = Number(v);
    return !isNaN(n) && n >= 1 && n <= 31;
  }, "Día entre 1 y 31"),
  category_id: z.string().optional(),
  suggested_account_id: z.string().optional(),
  liability_id: z.string().optional(),
  notes: z.string().optional(),
});

const paySchema = z.object({
  paid_amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Monto mayor a 0"),
  paid_date: z.string().min(1, "Fecha requerida"),
  from_account_id: z.string().min(1, "Selecciona cuenta origen"),
  to_account_id: z.string().optional(),
  notes: z.string().optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-rose-500 mt-1">{msg}</p>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompromisosPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [commitments, setCommitments] = useState<CommitmentWithStatus[]>([]);
  const [cashFlow, setCashFlow] = useState<FreeCashFlowSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sheets
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CommitmentWithStatus | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [paying, setPaying] = useState<CommitmentWithStatus | null>(null);
  const [showSkip, setShowSkip] = useState(false);
  const [skipping, setSkipping] = useState<CommitmentWithStatus | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const periodMonth = toPeriodMonth(currentMonth);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cs, cf, accs, liabs, cats] = await Promise.all([
        getCommitmentsWithStatus(periodMonth),
        getFreeCashFlowSummary(periodMonth),
        getAccounts(),
        getLiabilities("active"),
        getCategories("expense"),
      ]);
      setCommitments(cs);
      setCashFlow(cf);
      setAccounts(accs);
      setLiabilities(liabs);
      setCategories(cats);
    } catch (e) {
      setError("Error al cargar datos");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [periodMonth]);

  useEffect(() => { load(); }, [load]);

  // ── Commitment form ──────────────────────────────────────────────────────────

  const form = useForm<z.infer<typeof commitmentSchema>>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: { name: "", commitment_type: "", amount: "", due_day: "", category_id: "no_category", suggested_account_id: "no_account", liability_id: "no_liability", notes: "" },
  });
  const watchType = form.watch("commitment_type") as CommitmentType;
  const isDebtType = DEBT_COMMITMENT_TYPES.has(watchType);
  const isSavingsType = SAVINGS_COMMITMENT_TYPES.has(watchType);
  const isRegularType = watchType && !isDebtType && !isSavingsType;

  function openAdd() {
    form.reset({ name: "", commitment_type: "", amount: "", due_day: "", category_id: "no_category", suggested_account_id: "no_account", liability_id: "no_liability", notes: "" });
    setEditing(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(c: CommitmentWithStatus) {
    form.reset({
      name: c.name,
      commitment_type: c.commitment_type,
      amount: String(c.amount),
      due_day: c.due_day != null ? String(c.due_day) : "",
      category_id: c.category_id ?? "no_category",
      suggested_account_id: c.suggested_account_id ?? "no_account",
      liability_id: c.liability_id ?? "no_liability",
      notes: c.notes ?? "",
    });
    setEditing(c);
    setFormError(null);
    setShowForm(true);
  }

  const onSaveCommitment = form.handleSubmit(async (data) => {
    setFormError(null);
    try {
      const payload = {
        name: data.name,
        commitment_type: data.commitment_type as CommitmentType,
        amount: Number(data.amount),
        due_day: data.due_day && data.due_day !== "" ? Number(data.due_day) : null,
        category_id: data.category_id && data.category_id !== "no_category" ? data.category_id : null,
        suggested_account_id: data.suggested_account_id && data.suggested_account_id !== "no_account" ? data.suggested_account_id : null,
        liability_id: data.liability_id && data.liability_id !== "no_liability" ? data.liability_id : null,
        notes: data.notes || null,
      };
      if (editing) {
        await updateMonthlyCommitment(editing.id, payload);
      } else {
        await insertMonthlyCommitment(payload);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al guardar");
    }
  });

  async function handleDeactivate(c: CommitmentWithStatus) {
    try {
      await deleteOrDeactivateMonthlyCommitment(c.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  }

  // ── Pay form ─────────────────────────────────────────────────────────────────

  const payForm = useForm<z.infer<typeof paySchema>>({
    resolver: zodResolver(paySchema),
    defaultValues: { paid_amount: "", paid_date: today, from_account_id: "", to_account_id: "no_savings", notes: "" },
  });
  const watchPayType = paying?.commitment_type;
  const payIsDebt = watchPayType && DEBT_COMMITMENT_TYPES.has(watchPayType);
  const payIsSavings = watchPayType && SAVINGS_COMMITMENT_TYPES.has(watchPayType);

  function openPay(c: CommitmentWithStatus) {
    payForm.reset({
      paid_amount: String(c.amount),
      paid_date: today,
      from_account_id: c.suggested_account_id ?? "",
      to_account_id: "no_savings",
      notes: "",
    });
    setPaying(c);
    setFormError(null);
    setShowPay(true);
  }

  const onPay = payForm.handleSubmit(async (data) => {
    setFormError(null);
    if (!paying) return;
    try {
      const liab = paying.liability_id
        ? liabilities.find((l) => l.id === paying.liability_id)
        : null;

      await markCommitmentAsPaid({
        commitmentId: paying.id,
        commitmentType: paying.commitment_type,
        commitmentName: paying.name,
        periodMonth,
        paidAmount: Number(data.paid_amount),
        paidDate: data.paid_date,
        fromAccountId: data.from_account_id,
        toAccountId: data.to_account_id && data.to_account_id !== "no_savings" ? data.to_account_id : undefined,
        liabilityId: paying.liability_id ?? undefined,
        liabilityCurrentBalance: liab?.current_balance ?? undefined,
        categoryId: paying.category_id ?? undefined,
        notes: data.notes || undefined,
      });
      setShowPay(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error al registrar pago");
    }
  });

  // ── Skip form ────────────────────────────────────────────────────────────────

  const [skipNote, setSkipNote] = useState("");
  const [skipLoading, setSkipLoading] = useState(false);

  function openSkip(c: CommitmentWithStatus) {
    setSkipping(c);
    setSkipNote("");
    setFormError(null);
    setShowSkip(true);
  }

  async function onSkip() {
    if (!skipping) return;
    setSkipLoading(true);
    setFormError(null);
    try {
      await markCommitmentAsSkipped({ commitmentId: skipping.id, periodMonth, notes: skipNote || undefined });
      setShowSkip(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error");
    } finally {
      setSkipLoading(false);
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Accounts usable as payment source (no credit cards)
  const payableAccounts = accounts.filter((a) => a.type !== "credit_card");
  // Savings destination accounts
  const savingsAccounts = accounts.filter((a) => !a.include_in_available_balance && a.type !== "credit_card");
  // Accounts for commitment form suggested_account (no credit cards)
  const suggestableAccounts = accounts.filter((a) => a.type !== "credit_card");

  const totalCommitted = commitments.reduce((s, c) => s + c.amount, 0);
  const totalPaid = commitments.filter((c) => c.displayStatus === "paid").reduce((s, c) => s + (c.log?.paid_amount ?? c.amount), 0);
  const totalPending = commitments.filter((c) => c.displayStatus === "pending" || c.displayStatus === "overdue").reduce((s, c) => s + c.amount, 0);
  const totalOverdue = commitments.filter((c) => c.displayStatus === "overdue").length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Compromisos</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Gastos fijos y pagos programados</p>
      </div>

      {/* Month selector */}
      <div className="px-5 mb-4">
        <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
      </div>

      {loading ? (
        <div className="px-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Free cash highlight */}
          {cashFlow && (
            <div className="px-5 mb-4">
              <div className="gradient-purple rounded-2xl p-4 text-white">
                <p className="text-violet-200 text-xs font-medium mb-1">Dinero libre estimado</p>
                <p className={cn("text-3xl font-bold", cashFlow.freeCashEstimated < 0 ? "text-rose-300" : "text-white")}>
                  {formatCurrency(cashFlow.freeCashEstimated)}
                </p>
                <p className="text-violet-200 text-xs mt-1">
                  Disponible {formatCurrency(cashFlow.availableBalance)} − Pendiente {formatCurrency(cashFlow.totalCommitmentsPending)}
                </p>
              </div>
            </div>
          )}

          {/* Summary row */}
          <div className="px-5 mb-4 grid grid-cols-3 gap-3">
            <div className="bg-zinc-50 rounded-2xl p-3 text-center border border-zinc-100">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Comprometido</p>
              <p className="text-sm font-bold text-zinc-700">{formatCurrency(totalCommitted)}</p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-3 text-center border border-emerald-100">
              <p className="text-[10px] text-emerald-600 uppercase tracking-wide mb-1">Pagado</p>
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
            </div>
            <div className={cn("rounded-2xl p-3 text-center border", totalOverdue > 0 ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100")}>
              <p className={cn("text-[10px] uppercase tracking-wide mb-1", totalOverdue > 0 ? "text-rose-600" : "text-amber-600")}>
                {totalOverdue > 0 ? `${totalOverdue} vencidos` : "Pendiente"}
              </p>
              <p className={cn("text-sm font-bold", totalOverdue > 0 ? "text-rose-700" : "text-amber-700")}>
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Commitment list */}
          <div className="px-5 mb-4">
            {commitments.length === 0 ? (
              <div className="bg-zinc-50 rounded-2xl p-10 text-center border border-zinc-100">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm font-semibold text-zinc-700 mb-1">
                  Aún no tienes gastos fijos registrados
                </p>
                <p className="text-xs text-zinc-400 mb-4">
                  Agrega alquiler, servicios, suscripciones y pagos mínimos.
                </p>
                <Button size="sm" onClick={openAdd}>Agregar compromiso</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {commitments.map((c) => {
                  const meta = COMMITMENT_TYPE_META[c.commitment_type];
                  const ss = STATUS_STYLES[c.displayStatus] ?? STATUS_STYLES.pending;
                  const liab = c.liability_id ? liabilities.find((l) => l.id === c.liability_id) : null;
                  return (
                    <div key={c.id} className={cn("rounded-2xl border p-4", ss.bg)}>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white text-xl shrink-0 border border-zinc-100">
                          {meta?.emoji ?? "📋"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-zinc-800">{c.name}</p>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium border", ss.bg, ss.text)}>
                              {ss.label}
                            </span>
                            {c.displayStatus === "overdue" && (
                              <AlertCircle className="size-3.5 text-rose-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {meta?.label ?? c.commitment_type}
                            {c.due_day != null && ` · vence día ${c.due_day}`}
                          </p>
                          {liab && (
                            <p className="text-xs text-zinc-400 mt-0.5">
                              Deuda actual: {formatCurrency(liab.current_balance)}
                            </p>
                          )}
                          {c.displayStatus === "paid" && c.log && (
                            <p className="text-xs text-emerald-600 mt-0.5">
                              Pagado {formatCurrency(c.log.paid_amount ?? c.amount)} el {c.log.paid_date}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-zinc-800">{formatCurrency(c.amount)}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      {(c.displayStatus === "pending" || c.displayStatus === "overdue") && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/60">
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs gap-1"
                            onClick={() => openPay(c)}
                          >
                            <Check className="size-3" />
                            Marcar pagado
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => openSkip(c)}
                          >
                            <SkipForward className="size-3" />
                            Saltar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                        </div>
                      )}
                      {(c.displayStatus === "paid" || c.displayStatus === "skipped") && (
                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/60">
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openEdit(c)}>
                            <Pencil className="size-3" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-zinc-400 gap-1"
                            onClick={() => handleDeactivate(c)}
                          >
                            <Power className="size-3" />
                            Desactivar
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add button */}
          {commitments.length > 0 && (
            <div className="px-5">
              <Button variant="outline" className="w-full gap-2" onClick={openAdd}>
                <Plus className="size-4" />
                Agregar compromiso
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Sheet: Add / Edit commitment ────────────────────────────────────── */}
      <Sheet open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) form.reset(); }}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle>{editing ? "Editar compromiso" : "Nuevo compromiso"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={onSaveCommitment} className="space-y-4 pb-6">
            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">{formError}</div>
            )}
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Ej. Alquiler, Netflix, Cuota BCP..." {...form.register("name")} />
              <FieldError msg={form.formState.errors.name?.message} />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select
                value={form.watch("commitment_type") || undefined}
                onValueChange={(v) => form.setValue("commitment_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {COMMITMENT_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={form.formState.errors.commitment_type?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto mensual *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input className="pl-8" type="number" step="0.01" min="0.01" placeholder="0.00" {...form.register("amount")} />
                </div>
                <FieldError msg={form.formState.errors.amount?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Día de vencimiento</Label>
                <Input type="number" min="1" max="31" placeholder="Ej. 5" {...form.register("due_day")} />
                <FieldError msg={form.formState.errors.due_day?.message} />
              </div>
            </div>

            {/* Liability selector (only for debt types) */}
            {isDebtType && (
              <div className="space-y-1.5">
                <Label>Deuda o tarjeta asociada *</Label>
                <Select
                  value={form.watch("liability_id") || "no_liability"}
                  onValueChange={(v) => form.setValue("liability_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona deuda o tarjeta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_liability">Sin asociar</SelectItem>
                    {liabilities.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} — {formatCurrency(l.current_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category (only for non-debt types) */}
            {isRegularType && (
              <div className="space-y-1.5">
                <Label>Categoría (opcional)</Label>
                <Select
                  value={form.watch("category_id") || "no_category"}
                  onValueChange={(v) => form.setValue("category_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_category">Sin categoría</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Suggested account (no credit cards) */}
            <div className="space-y-1.5">
              <Label>Cuenta sugerida de pago (opcional)</Label>
              <Select
                value={form.watch("suggested_account_id") || "no_account"}
                onValueChange={(v) => form.setValue("suggested_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin cuenta sugerida" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_account">Sin cuenta sugerida</SelectItem>
                  {suggestableAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.icon} {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea rows={2} placeholder="Detalles adicionales..." {...form.register("notes")} />
            </div>

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Mark as paid ──────────────────────────────────────────────── */}
      <Sheet open={showPay} onOpenChange={(o) => { setShowPay(o); if (!o) payForm.reset(); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Registrar pago</SheetTitle>
          </SheetHeader>
          {paying && (
            <div className="mb-4 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
              <p className="text-sm font-semibold text-zinc-700">{paying.name}</p>
              <p className="text-xs text-zinc-400">{COMMITMENT_TYPE_META[paying.commitment_type]?.label}</p>
              {payIsDebt && paying.liability_id && (
                <p className="text-xs text-zinc-500 mt-1">
                  Deuda actual: {formatCurrency(liabilities.find((l) => l.id === paying.liability_id)?.current_balance ?? 0)}
                </p>
              )}
            </div>
          )}
          <form onSubmit={onPay} className="space-y-4 pb-6">
            {formError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">{formError}</div>
            )}
            <div className="space-y-1.5">
              <Label>Monto pagado *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                <Input className="pl-8" type="number" step="0.01" min="0.01" {...payForm.register("paid_amount")} />
              </div>
              <FieldError msg={payForm.formState.errors.paid_amount?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha *</Label>
              <Input type="date" max={today} {...payForm.register("paid_date")} />
              <FieldError msg={payForm.formState.errors.paid_date?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>Cuenta origen *</Label>
              {payableAccounts.length === 0 ? (
                <p className="text-xs text-zinc-400">No tienes cuentas disponibles.</p>
              ) : (
                <Select
                  value={payForm.watch("from_account_id") || undefined}
                  onValueChange={(v) => payForm.setValue("from_account_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="¿Desde qué cuenta?" />
                  </SelectTrigger>
                  <SelectContent>
                    {payableAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.icon} {a.name} — S/ {a.balance.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FieldError msg={payForm.formState.errors.from_account_id?.message} />
            </div>

            {/* Savings destination — only for savings_target */}
            {payIsSavings && (
              <div className="space-y-1.5">
                <Label>Cuenta de ahorro destino *</Label>
                {savingsAccounts.length === 0 ? (
                  <p className="text-xs text-zinc-400">No hay cuentas de ahorro. Crea una en Cuentas.</p>
                ) : (
                  <Select
                    value={payForm.watch("to_account_id") || "no_savings"}
                    onValueChange={(v) => payForm.setValue("to_account_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="¿A qué cuenta de ahorro?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_savings">Sin cuenta destino</SelectItem>
                      {savingsAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.icon} {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Textarea rows={2} {...payForm.register("notes")} />
            </div>

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowPay(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={payForm.formState.isSubmitting}>
                {payForm.formState.isSubmitting ? "Registrando..." : "Registrar pago"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Skip ──────────────────────────────────────────────────────── */}
      <Sheet open={showSkip} onOpenChange={(o) => { setShowSkip(o); if (!o) setSkipNote(""); }}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Saltar este mes</SheetTitle>
          </SheetHeader>
          {skipping && (
            <div className="mb-4 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
              <p className="text-sm font-semibold text-zinc-700">{skipping.name}</p>
              <p className="text-xs text-zinc-400">{formatCurrency(skipping.amount)} · {COMMITMENT_TYPE_META[skipping.commitment_type]?.label}</p>
            </div>
          )}
          {formError && (
            <div className="mb-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">{formError}</div>
          )}
          <div className="space-y-3 pb-6">
            <div className="space-y-1.5">
              <Label>Motivo (opcional)</Label>
              <Textarea rows={2} placeholder="Ej. No aplica este mes..." value={skipNote} onChange={(e) => setSkipNote(e.target.value)} />
            </div>
            <SheetFooter>
              <Button variant="outline" className="flex-1" onClick={() => setShowSkip(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={onSkip} disabled={skipLoading}>
                {skipLoading ? "Guardando..." : "Saltar este mes"}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
