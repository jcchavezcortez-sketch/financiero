"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, CheckCircle, CreditCard, History, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getLiabilities,
  insertLiability,
  updateLiability,
  deleteLiability,
  registerLiabilityPayment,
  markLiabilityPaid,
  getLiabilityPayments,
  getAccounts,
} from "@/lib/supabase/queries";
import type { Liability, LiabilityPayment } from "@/types";

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const LIABILITY_TYPES = [
  { id: "credit_card", label: "Tarjeta de crédito" },
  { id: "personal_debt", label: "Deuda personal" },
  { id: "loan", label: "Préstamo" },
  { id: "other", label: "Otro" },
];

// ── Schemas ───────────────────────────────────────────────────────────────────

const liabilitySchema = z.object({
  liability_type: z.string().min(1, "Selecciona un tipo"),
  name: z.string().min(2, "Mínimo 2 caracteres"),
  original_amount: z
    .string()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) > 0), "Debe ser mayor a 0")
    .optional(),
  current_balance: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Debe ser 0 o mayor"),
  creditor_name: z.string().optional(),
  due_date: z.string().optional(),
  minimum_payment: z
    .string()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido")
    .optional(),
  notes: z.string().optional(),
});
type LiabilityForm = z.infer<typeof liabilitySchema>;

const paymentSchema = z.object({
  account_id: z.string().min(1, "Selecciona una cuenta"),
  amount: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Debe ser mayor a 0"),
  payment_date: z.string().min(1, "Ingresa la fecha"),
  notes: z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

type AccountOption = { id: string; name: string; icon: string; balance: number };

export default function DeudasPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payingLiability, setPayingLiability] = useState<Liability | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLiability, setHistoryLiability] = useState<Liability | null>(null);
  const [payments, setPayments] = useState<(LiabilityPayment & { account?: { name: string; icon: string } | null })[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [submitted, setSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const liabilityForm = useForm<LiabilityForm>({ resolver: zodResolver(liabilitySchema) });
  const paymentForm = useForm<PaymentForm>({ resolver: zodResolver(paymentSchema) });

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const [liabData, acctData] = await Promise.all([getLiabilities(), getAccounts()]);
    setLiabilities(liabData as unknown as Liability[]);
    setAccounts(acctData as unknown as AccountOption[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Add / Edit ────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingLiability(null);
    liabilityForm.reset({ liability_type: "", name: "", original_amount: "", current_balance: "", creditor_name: "", due_date: "", minimum_payment: "", notes: "" });
    setSubmitted(false);
    setShowAddEdit(true);
  }

  function openEdit(liability: Liability) {
    setEditingLiability(liability);
    liabilityForm.reset({
      liability_type: liability.liability_type,
      name: liability.name,
      original_amount: liability.original_amount != null ? String(liability.original_amount) : "",
      current_balance: String(liability.current_balance),
      creditor_name: liability.creditor_name ?? "",
      due_date: liability.due_date ?? "",
      minimum_payment: liability.minimum_payment != null ? String(liability.minimum_payment) : "",
      notes: liability.notes ?? "",
    });
    setSubmitted(false);
    setShowAddEdit(true);
  }

  const onSubmitLiability = async (data: LiabilityForm) => {
    if (!isSupabaseConfigured) return;
    const values = {
      liability_type: data.liability_type,
      name: data.name,
      original_amount: data.original_amount ? Number(data.original_amount) : null,
      current_balance: Number(data.current_balance),
      creditor_name: data.creditor_name || null,
      due_date: data.due_date || null,
      minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : null,
      notes: data.notes || null,
    };
    try {
      if (editingLiability) {
        await updateLiability(editingLiability.id, values);
      } else {
        await insertLiability(values);
      }
      setSubmitted(true);
      await load();
      setTimeout(() => { setShowAddEdit(false); setSubmitted(false); }, 1500);
    } catch { /* silently handle */ }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta deuda?")) return;
    await deleteLiability(id);
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
  }

  // ── Mark paid ─────────────────────────────────────────────────────────────

  async function handleMarkPaid(liability: Liability) {
    if (!confirm(`¿Marcar "${liability.name}" como pagada?`)) return;
    await markLiabilityPaid(liability.id);
    setLiabilities((prev) =>
      prev.map((l) => l.id === liability.id ? { ...l, current_balance: 0, status: "paid" } : l)
    );
  }

  // ── Payment ───────────────────────────────────────────────────────────────

  function openPayment(liability: Liability) {
    setPayingLiability(liability);
    setPaymentError(null);
    paymentForm.reset({
      account_id: "",
      amount: "",
      payment_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setSubmitted(false);
    setShowPayment(true);
  }

  const onSubmitPayment = async (data: PaymentForm) => {
    if (!isSupabaseConfigured || !payingLiability) return;
    setPaymentError(null);
    const amount = Number(data.amount);
    if (amount > payingLiability.current_balance) {
      setPaymentError(
        `El monto supera el saldo pendiente de ${formatCurrency(payingLiability.current_balance)}.`
      );
      return;
    }
    try {
      await registerLiabilityPayment({
        liability_id: payingLiability.id,
        liability_name: payingLiability.name,
        account_id: data.account_id,
        amount,
        payment_date: data.payment_date,
        notes: data.notes || null,
        current_balance: payingLiability.current_balance,
      });
      setSubmitted(true);
      await load();
      setTimeout(() => { setShowPayment(false); setSubmitted(false); }, 1800);
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : "Error al registrar el pago.");
    }
  };

  // ── History ───────────────────────────────────────────────────────────────

  async function openHistory(liability: Liability) {
    setHistoryLiability(liability);
    setShowHistory(true);
    const data = await getLiabilityPayments(liability.id);
    setPayments(data as unknown as typeof payments);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalPending = liabilities
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + l.current_balance, 0);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="px-5 pt-12 pb-4"><div className="h-8 bg-zinc-100 rounded-xl w-40 animate-pulse" /></div>
        <div className="px-5 mb-4"><div className="h-28 bg-zinc-100 rounded-3xl animate-pulse" /></div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="px-5 mb-3"><div className="h-36 bg-zinc-100 rounded-2xl animate-pulse" /></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-800">Mis deudas</h1>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="size-4" />
          Nueva
        </Button>
      </div>

      {/* Summary */}
      <div className="px-5 mb-5">
        <div className="gradient-purple rounded-3xl p-5 text-white">
          <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-1">
            Deuda pendiente total
          </p>
          <p className="text-3xl font-bold">{formatCurrency(totalPending)}</p>
          <p className="text-violet-300 text-sm mt-1">
            {liabilities.filter((l) => l.status === "active").length} deuda
            {liabilities.filter((l) => l.status === "active").length !== 1 ? "s" : ""} activa
            {liabilities.filter((l) => l.status === "active").length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="px-5 space-y-3 mb-8">
        {liabilities.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-zinc-500 text-sm">No tienes deudas registradas</p>
            <button onClick={openAdd} className="text-violet-600 text-sm font-medium mt-1">
              Agregar una →
            </button>
          </div>
        )}

        {liabilities.map((liability) => {
          const originalAmt = liability.original_amount ?? liability.current_balance;
          const paid = originalAmt - liability.current_balance;
          const pct = originalAmt > 0 ? Math.min(100, (paid / originalAmt) * 100) : 0;
          const isExpanded = expandedIds.has(liability.id);
          const typeLabel = LIABILITY_TYPES.find((t) => t.id === liability.liability_type)?.label ?? liability.liability_type;

          return (
            <div key={liability.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-zinc-800 truncate">{liability.name}</p>
                      <Badge
                        variant={liability.status === "paid" ? "secondary" : "default"}
                        className={
                          liability.status === "paid"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-violet-100 text-violet-700 hover:bg-violet-100"
                        }
                      >
                        {liability.status === "paid" ? "Pagada" : "Activa"}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {typeLabel}{liability.creditor_name ? ` · ${liability.creditor_name}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleExpand(liability.id)}
                    className="ml-2 p-1 text-zinc-400 hover:text-zinc-600"
                    aria-label="Expandir"
                  >
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Original</p>
                    <p className="text-sm font-semibold text-zinc-700">
                      {liability.original_amount != null ? formatCurrency(liability.original_amount) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Pagado</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(Math.max(0, paid))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Pendiente</p>
                    <p className="text-sm font-semibold text-rose-600">
                      {formatCurrency(liability.current_balance)}
                    </p>
                  </div>
                </div>

                {liability.original_amount != null && (
                  <>
                    <Progress value={pct} className="h-2 mb-1" />
                    <p className="text-[10px] text-zinc-400 text-right">{Math.round(pct)}% pagado</p>
                  </>
                )}

                {liability.due_date && (
                  <p className="text-xs text-zinc-400 mt-1">Vence: {formatDate(liability.due_date)}</p>
                )}
                {liability.minimum_payment != null && (
                  <p className="text-xs text-zinc-400">Cuota mínima: {formatCurrency(liability.minimum_payment)}</p>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-zinc-50 bg-zinc-50 px-4 py-3 grid grid-cols-2 gap-2">
                  {liability.status === "active" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openPayment(liability)}
                        className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                      >
                        <CreditCard className="size-3.5" />
                        Registrar pago
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkPaid(liability)}
                        className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs"
                      >
                        <CheckCircle className="size-3.5" />
                        Marcar pagada
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openHistory(liability)}
                    className="gap-1.5 text-xs"
                  >
                    <History className="size-3.5" />
                    Ver pagos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(liability)}
                    className="gap-1.5 text-xs"
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(liability.id)}
                    className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 text-xs col-span-2"
                  >
                    <Trash2 className="size-3.5" />
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Sheet ───────────────────────────────────────────────── */}
      <Sheet open={showAddEdit} onOpenChange={setShowAddEdit}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingLiability ? "Editar deuda" : "Nueva deuda"}</SheetTitle>
          </SheetHeader>

          {submitted ? (
            <div className="flex flex-col items-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">
                {editingLiability ? "Deuda actualizada" : "Deuda registrada"}
              </p>
            </div>
          ) : (
            <div className="px-1 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo de deuda</Label>
                <Select
                  defaultValue={editingLiability?.liability_type}
                  onValueChange={(v) => liabilityForm.setValue("liability_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIABILITY_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {liabilityForm.formState.errors.liability_type && (
                  <p className="text-xs text-rose-500">{liabilityForm.formState.errors.liability_type.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input placeholder="Ej. Tarjeta BCP, préstamo Juan..." {...liabilityForm.register("name")} />
                {liabilityForm.formState.errors.name && (
                  <p className="text-xs text-rose-500">{liabilityForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Acreedor (opcional)</Label>
                <Input placeholder="Ej. BCP, amigo Juan..." {...liabilityForm.register("creditor_name")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Monto original</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                    <Input type="number" placeholder="0.00" className="pl-9" {...liabilityForm.register("original_amount")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Saldo pendiente</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                    <Input type="number" placeholder="0.00" className="pl-9" {...liabilityForm.register("current_balance")} />
                  </div>
                  {liabilityForm.formState.errors.current_balance && (
                    <p className="text-xs text-rose-500">{liabilityForm.formState.errors.current_balance.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cuota mínima</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                    <Input type="number" placeholder="0.00" className="pl-9" {...liabilityForm.register("minimum_payment")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha de vencimiento</Label>
                  <Input type="date" {...liabilityForm.register("due_date")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notas (opcional)</Label>
                <Textarea placeholder="Tasa, condiciones..." {...liabilityForm.register("notes")} />
              </div>
            </div>
          )}

          {!submitted && (
            <SheetFooter className="px-1 pb-2">
              <Button
                className="w-full"
                size="lg"
                onClick={liabilityForm.handleSubmit(onSubmitLiability)}
                disabled={liabilityForm.formState.isSubmitting}
              >
                {liabilityForm.formState.isSubmitting
                  ? "Guardando..."
                  : editingLiability ? "Guardar cambios" : "Registrar deuda"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Payment Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={showPayment} onOpenChange={setShowPayment}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar pago</SheetTitle>
          </SheetHeader>

          {submitted ? (
            <div className="flex flex-col items-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Pago registrado!</p>
              <p className="text-sm text-zinc-500 mt-1">El saldo de la deuda fue actualizado</p>
            </div>
          ) : (
            <div className="px-1 py-4 space-y-4">
              {payingLiability && (
                <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide">Deuda</p>
                  <p className="font-semibold text-zinc-800">{payingLiability.name}</p>
                  <p className="text-sm text-rose-600">
                    Saldo pendiente: {formatCurrency(payingLiability.current_balance)}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Cuenta desde donde pagás</Label>
                <Select onValueChange={(v) => paymentForm.setValue("account_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.icon} {a.name} — {formatCurrency(a.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {paymentForm.formState.errors.account_id && (
                  <p className="text-xs text-rose-500">{paymentForm.formState.errors.account_id.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Monto pagado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-9" {...paymentForm.register("amount")} />
                </div>
                {paymentForm.formState.errors.amount && (
                  <p className="text-xs text-rose-500">{paymentForm.formState.errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Fecha de pago</Label>
                <Input type="date" {...paymentForm.register("payment_date")} />
                {paymentForm.formState.errors.payment_date && (
                  <p className="text-xs text-rose-500">{paymentForm.formState.errors.payment_date.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Nota (opcional)</Label>
                <Input placeholder="Cuota N°, referencia..." {...paymentForm.register("notes")} />
              </div>

              {paymentError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-sm text-rose-600">{paymentError}</p>
                </div>
              )}
            </div>
          )}

          {!submitted && (
            <SheetFooter className="px-1 pb-2">
              <Button
                className="w-full"
                size="lg"
                onClick={paymentForm.handleSubmit(onSubmitPayment)}
                disabled={paymentForm.formState.isSubmitting}
              >
                {paymentForm.formState.isSubmitting ? "Registrando..." : "Registrar pago"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ── History Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Historial de pagos</SheetTitle>
          </SheetHeader>
          {historyLiability && (
            <p className="px-1 text-sm text-zinc-500 mb-4">{historyLiability.name}</p>
          )}
          <div className="px-1 space-y-2 pb-6">
            {payments.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-zinc-500 text-sm">Sin pagos registrados aún</p>
              </div>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-zinc-50 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-zinc-400">
                      {formatDate(p.payment_date)}
                      {p.account && ` · ${p.account.icon} ${p.account.name}`}
                    </p>
                    {p.notes && <p className="text-xs text-zinc-400 mt-0.5">{p.notes}</p>}
                  </div>
                  <CheckCircle className="size-5 text-emerald-500" />
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
