"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, CheckCircle, CreditCard, History, Pencil,
  ChevronDown, ChevronUp, ShoppingBag,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getLiabilities, insertLiability, updateLiability, deleteLiability,
  registerLiabilityPayment, markLiabilityPaid, getLiabilityPayments, getAccounts,
  getCreditCards, insertCreditCard, updateCreditCard, deleteCreditCard,
  createCreditCardPurchase, getCategories,
} from "@/lib/supabase/queries";
import type { Liability, LiabilityPayment, CreditCardWithLiability } from "@/types";
import { CARD_NETWORKS } from "@/types";
import type { Database } from "@/types/database";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

// ── Schemas ───────────────────────────────────────────────────────────────────

const creditCardSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  institution_name: z.string().optional(),
  card_network: z.string().optional(),
  last_four_digits: z.string().length(4, "Deben ser exactamente 4 dígitos").regex(/^\d{4}$/, "Solo números").optional().or(z.literal("")),
  credit_limit: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido").optional(),
  current_balance: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Debe ser 0 o mayor"),
  statement_closing_day: z.string().refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 31), "Día inválido").optional(),
  payment_due_day: z.string().refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 31), "Día inválido").optional(),
  minimum_payment: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido").optional(),
  notes: z.string().optional(),
});
type CreditCardForm = z.infer<typeof creditCardSchema>;

const liabilitySchema = z.object({
  liability_type: z.string().min(1, "Selecciona un tipo"),
  name: z.string().min(2, "Mínimo 2 caracteres"),
  original_amount: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) > 0), "Debe ser mayor a 0").optional(),
  current_balance: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Debe ser 0 o mayor"),
  creditor_name: z.string().optional(),
  due_date: z.string().optional(),
  minimum_payment: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido").optional(),
  notes: z.string().optional(),
});
type LiabilityForm = z.infer<typeof liabilitySchema>;

const paymentSchema = z.object({
  account_id: z.string().min(1, "Selecciona una cuenta"),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Debe ser mayor a 0"),
  payment_date: z.string().min(1, "Ingresa la fecha"),
  notes: z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentSchema>;

const purchaseSchema = z.object({
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Debe ser mayor a 0"),
  description: z.string().min(1, "Agrega una descripción"),
  category_id: z.string().min(1, "Selecciona una categoría"),
  date: z.string().min(1, "Selecciona fecha"),
  notes: z.string().optional(),
});
type PurchaseForm = z.infer<typeof purchaseSchema>;

// ── Component ─────────────────────────────────────────────────────────────────

type AccountOption = { id: string; name: string; icon: string; balance: number };

const NETWORK_COLORS: Record<string, string> = {
  Visa: "bg-blue-100 text-blue-700",
  Mastercard: "bg-red-100 text-red-700",
  Amex: "bg-green-100 text-green-700",
  Diners: "bg-purple-100 text-purple-700",
  Otra: "bg-zinc-100 text-zinc-600",
};

export default function DeudasPage() {
  const today = new Date().toISOString().split("T")[0];

  // ── State ─────────────────────────────────────────────────────────────────
  const [creditCards, setCreditCards] = useState<CreditCardWithLiability[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // credit card sheets
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardWithLiability | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchasingCard, setPurchasingCard] = useState<CreditCardWithLiability | null>(null);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [payingCard, setPayingCard] = useState<CreditCardWithLiability | null>(null);
  const [showCardHistory, setShowCardHistory] = useState(false);
  const [historyCard, setHistoryCard] = useState<CreditCardWithLiability | null>(null);
  const [cardPayments, setCardPayments] = useState<(LiabilityPayment & { account?: { name: string; icon: string } | null })[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // other liabilities sheets
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
  const [cardFormError, setCardFormError] = useState<string | null>(null);

  const cardForm = useForm<CreditCardForm>({ resolver: zodResolver(creditCardSchema) });
  const liabilityForm = useForm<LiabilityForm>({ resolver: zodResolver(liabilitySchema) });
  const paymentForm = useForm<PaymentForm>({ resolver: zodResolver(paymentSchema) });
  const cardPaymentForm = useForm<PaymentForm>({ resolver: zodResolver(paymentSchema) });
  const purchaseForm = useForm<PurchaseForm>({ resolver: zodResolver(purchaseSchema) });

  // ── Load data ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const [cards, liabsData, acctData, catsData] = await Promise.all([
      getCreditCards(),
      getLiabilities(),
      getAccounts(),
      getCategories("expense"),
    ]);
    setCreditCards(cards);
    setLiabilities((liabsData as unknown as Liability[]).filter((l) => l.liability_type !== "credit_card"));
    setAccounts(acctData.filter((a) => a.type !== "credit_card") as unknown as AccountOption[]);
    setCategories(catsData);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalCardDebt = creditCards.reduce((s, c) => s + c.current_balance, 0);
  const totalOtherDebt = liabilities.filter((l) => l.status === "active").reduce((s, l) => s + l.current_balance, 0);
  const totalPending = totalCardDebt + totalOtherDebt;

  const personalDebts = liabilities.filter((l) => l.liability_type === "personal_debt");
  const loans = liabilities.filter((l) => l.liability_type === "loan");
  const otherDebts = liabilities.filter((l) => l.liability_type === "other");

  // ── Credit card handlers ──────────────────────────────────────────────────

  function openAddCard() {
    setEditingCard(null);
    cardForm.reset({ name: "", institution_name: "", card_network: "", last_four_digits: "", credit_limit: "", current_balance: "0", statement_closing_day: "", payment_due_day: "", minimum_payment: "", notes: "" });
    setSubmitted(false);
    setCardFormError(null);
    setShowCardForm(true);
  }

  function openEditCard(card: CreditCardWithLiability) {
    setEditingCard(card);
    cardForm.reset({
      name: card.name,
      institution_name: card.institution_name ?? "",
      card_network: card.card_network ?? "",
      last_four_digits: card.last_four_digits ?? "",
      credit_limit: card.credit_limit != null ? String(card.credit_limit) : "",
      current_balance: String(card.current_balance),
      statement_closing_day: card.statement_closing_day != null ? String(card.statement_closing_day) : "",
      payment_due_day: card.payment_due_day != null ? String(card.payment_due_day) : "",
      minimum_payment: card.minimum_payment != null ? String(card.minimum_payment) : "",
      notes: card.notes ?? "",
    });
    setSubmitted(false);
    setCardFormError(null);
    setShowCardForm(true);
  }

  const onSubmitCard = async (data: CreditCardForm) => {
    setSubmitted(false);
    setCardFormError(null);
    try {
      if (editingCard) {
        await updateCreditCard(editingCard.account_id, editingCard.liability_id, {
          name: data.name,
          institution_name: data.institution_name || null,
          card_network: data.card_network || null,
          last_four_digits: data.last_four_digits || null,
          credit_limit: data.credit_limit ? Number(data.credit_limit) : null,
          statement_closing_day: data.statement_closing_day ? Number(data.statement_closing_day) : null,
          payment_due_day: data.payment_due_day ? Number(data.payment_due_day) : null,
          minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : null,
          notes: data.notes || null,
        });
      } else {
        await insertCreditCard({
          name: data.name,
          institution_name: data.institution_name || null,
          card_network: data.card_network || null,
          last_four_digits: data.last_four_digits || null,
          credit_limit: data.credit_limit ? Number(data.credit_limit) : null,
          current_balance: Number(data.current_balance),
          statement_closing_day: data.statement_closing_day ? Number(data.statement_closing_day) : null,
          payment_due_day: data.payment_due_day ? Number(data.payment_due_day) : null,
          minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : null,
          notes: data.notes || null,
        });
      }
      setSubmitted(true);
      await load();
      setTimeout(() => { setShowCardForm(false); setSubmitted(false); }, 1500);
    } catch (e) {
      setCardFormError(e instanceof Error ? e.message : "Error al guardar la tarjeta");
    }
  };

  async function handleDeleteCard(card: CreditCardWithLiability) {
    const msg = card.current_balance > 0
      ? `Esta tarjeta tiene deuda de ${formatCurrency(card.current_balance)}. ¿Desactivarla de todas formas?`
      : `¿Eliminar/desactivar la tarjeta "${card.name}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteCreditCard(card.account_id, card.liability_id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al eliminar la tarjeta.");
    }
  }

  // ── Purchase handlers ─────────────────────────────────────────────────────

  function openPurchase(card: CreditCardWithLiability) {
    setPurchasingCard(card);
    purchaseForm.reset({ amount: "", description: "", category_id: "", date: today, notes: "" });
    setPaymentError(null);
    setSubmitted(false);
    setShowPurchase(true);
  }

  const onSubmitPurchase = async (data: PurchaseForm) => {
    if (!purchasingCard?.liability_id) return;
    setPaymentError(null);
    const amount = Number(data.amount);
    const available = purchasingCard.credit_limit != null
      ? purchasingCard.credit_limit - purchasingCard.current_balance
      : null;
    if (available != null && amount > available) {
      setPaymentError(`Supera la línea disponible de ${formatCurrency(available)}.`);
      return;
    }
    try {
      await createCreditCardPurchase({
        liability_id: purchasingCard.liability_id,
        liability_name: purchasingCard.name,
        credit_card_account_id: purchasingCard.account_id,
        amount,
        description: data.description,
        category_id: data.category_id,
        date: data.date,
        notes: data.notes || undefined,
      });
      setSubmitted(true);
      await load();
      setTimeout(() => { setShowPurchase(false); setSubmitted(false); }, 1800);
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : "Error al registrar la compra.");
    }
  };

  // ── Card payment handlers ─────────────────────────────────────────────────

  function openCardPayment(card: CreditCardWithLiability) {
    setPayingCard(card);
    cardPaymentForm.reset({ account_id: "", amount: "", payment_date: today, notes: "" });
    setPaymentError(null);
    setSubmitted(false);
    setShowCardPayment(true);
  }

  const onSubmitCardPayment = async (data: PaymentForm) => {
    if (!payingCard?.liability_id) return;
    setPaymentError(null);
    const amount = Number(data.amount);
    if (amount > payingCard.current_balance) {
      setPaymentError(`El monto supera la deuda de ${formatCurrency(payingCard.current_balance)}.`);
      return;
    }
    try {
      await registerLiabilityPayment({
        liability_id: payingCard.liability_id,
        liability_name: payingCard.name,
        account_id: data.account_id,
        amount,
        payment_date: data.payment_date,
        notes: data.notes || null,
        current_balance: payingCard.current_balance,
      });
      setSubmitted(true);
      await load();
      setTimeout(() => { setShowCardPayment(false); setSubmitted(false); }, 1800);
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : "Error al registrar el pago.");
    }
  };

  async function openCardHistory(card: CreditCardWithLiability) {
    setHistoryCard(card);
    setShowCardHistory(true);
    if (card.liability_id) {
      const data = await getLiabilityPayments(card.liability_id);
      setCardPayments(data as unknown as typeof cardPayments);
    } else {
      setCardPayments([]);
    }
  }

  function toggleExpandCard(id: string) {
    setExpandedCards((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── Other liability handlers ──────────────────────────────────────────────

  function openAdd(type?: string) {
    setEditingLiability(null);
    liabilityForm.reset({ liability_type: type ?? "", name: "", original_amount: "", current_balance: "", creditor_name: "", due_date: "", minimum_payment: "", notes: "" });
    setSubmitted(false);
    setShowAddEdit(true);
  }

  function openEdit(l: Liability) {
    setEditingLiability(l);
    liabilityForm.reset({
      liability_type: l.liability_type, name: l.name,
      original_amount: l.original_amount != null ? String(l.original_amount) : "",
      current_balance: String(l.current_balance),
      creditor_name: l.creditor_name ?? "", due_date: l.due_date ?? "",
      minimum_payment: l.minimum_payment != null ? String(l.minimum_payment) : "",
      notes: l.notes ?? "",
    });
    setSubmitted(false);
    setShowAddEdit(true);
  }

  const onSubmitLiability = async (data: LiabilityForm) => {
    const values = {
      liability_type: data.liability_type, name: data.name,
      original_amount: data.original_amount ? Number(data.original_amount) : null,
      current_balance: Number(data.current_balance),
      creditor_name: data.creditor_name || null, due_date: data.due_date || null,
      minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : null,
      notes: data.notes || null,
    };
    try {
      if (editingLiability) await updateLiability(editingLiability.id, values);
      else await insertLiability(values);
      setSubmitted(true);
      await load();
      setTimeout(() => { setShowAddEdit(false); setSubmitted(false); }, 1500);
    } catch { /* silent */ }
  };

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta deuda?")) return;
    await deleteLiability(id);
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleMarkPaid(l: Liability) {
    if (!confirm(`¿Marcar "${l.name}" como pagada?`)) return;
    await markLiabilityPaid(l.id);
    setLiabilities((prev) => prev.map((x) => x.id === l.id ? { ...x, current_balance: 0, status: "paid" } : x));
  }

  function openPayment(l: Liability) {
    setPayingLiability(l);
    setPaymentError(null);
    paymentForm.reset({ account_id: "", amount: "", payment_date: today, notes: "" });
    setSubmitted(false);
    setShowPayment(true);
  }

  const onSubmitPayment = async (data: PaymentForm) => {
    if (!payingLiability) return;
    setPaymentError(null);
    const amount = Number(data.amount);
    if (amount > payingLiability.current_balance) {
      setPaymentError(`El monto supera el saldo pendiente de ${formatCurrency(payingLiability.current_balance)}.`);
      return;
    }
    try {
      await registerLiabilityPayment({
        liability_id: payingLiability.id, liability_name: payingLiability.name,
        account_id: data.account_id, amount,
        payment_date: data.payment_date, notes: data.notes || null,
        current_balance: payingLiability.current_balance,
      });
      setSubmitted(true);
      await load();
      setTimeout(() => { setShowPayment(false); setSubmitted(false); }, 1800);
    } catch (e: unknown) {
      setPaymentError(e instanceof Error ? e.message : "Error al registrar el pago.");
    }
  };

  async function openHistory(l: Liability) {
    setHistoryLiability(l);
    setShowHistory(true);
    const data = await getLiabilityPayments(l.id);
    setPayments(data as unknown as typeof payments);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="px-5 pt-12 pb-4"><div className="h-8 bg-zinc-100 rounded-xl w-40 animate-pulse" /></div>
        <div className="px-5 mb-4"><div className="h-28 bg-zinc-100 rounded-3xl animate-pulse" /></div>
        {[0, 1, 2].map((i) => <div key={i} className="px-5 mb-3"><div className="h-36 bg-zinc-100 rounded-2xl animate-pulse" /></div>)}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Mis deudas</h1>
      </div>

      {/* Summary */}
      <div className="px-5 mb-5">
        <div className="gradient-purple rounded-3xl p-5 text-white">
          <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-1">Deuda total pendiente</p>
          <p className="text-3xl font-bold">{formatCurrency(totalPending)}</p>
          <div className="flex gap-4 mt-2">
            <div>
              <p className="text-violet-300 text-xs">Tarjetas</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(totalCardDebt)}</p>
            </div>
            <div>
              <p className="text-violet-300 text-xs">Otras deudas</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(totalOtherDebt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tarjetas" className="px-5">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="tarjetas" className="flex-1 text-xs">💳 Tarjetas</TabsTrigger>
          <TabsTrigger value="personas" className="flex-1 text-xs">🤝 Personas</TabsTrigger>
          <TabsTrigger value="prestamos" className="flex-1 text-xs">🏦 Préstamos</TabsTrigger>
          <TabsTrigger value="otras" className="flex-1 text-xs">📋 Otras</TabsTrigger>
        </TabsList>

        {/* ── Tab: Tarjetas ── */}
        <TabsContent value="tarjetas">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openAddCard} className="gap-1.5">
              <Plus className="size-4" />
              Nueva tarjeta
            </Button>
          </div>

          {creditCards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">💳</p>
              <p className="text-zinc-500 text-sm font-medium">No tienes tarjetas registradas</p>
              <button onClick={openAddCard} className="text-violet-600 text-sm font-medium mt-1">Agregar una →</button>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {creditCards.map((card) => {
                const available = card.credit_limit != null ? card.credit_limit - card.current_balance : null;
                const usePct = card.credit_limit && card.credit_limit > 0 ? Math.min(100, (card.current_balance / card.credit_limit) * 100) : null;
                const isExpanded = expandedCards.has(card.account_id);
                const hasDebt = card.current_balance > 0;

                return (
                  <div key={card.account_id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-semibold text-zinc-800">{card.name}</p>
                            {card.card_network && (
                              <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", NETWORK_COLORS[card.card_network] ?? "bg-zinc-100 text-zinc-600")}>
                                {card.card_network}
                              </span>
                            )}
                            <Badge
                              className={hasDebt
                                ? "bg-rose-100 text-rose-700 hover:bg-rose-100 text-[10px]"
                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]"}
                            >
                              {hasDebt ? "Activa" : "Sin deuda"}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-400">
                            {card.institution_name && `${card.institution_name} · `}
                            {card.last_four_digits && `•••• ${card.last_four_digits}`}
                          </p>
                        </div>
                        <button onClick={() => toggleExpandCard(card.account_id)} className="ml-2 p-1 text-zinc-400 hover:text-zinc-600">
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Deuda</p>
                          <p className={cn("text-sm font-bold", hasDebt ? "text-rose-600" : "text-emerald-600")}>
                            {formatCurrency(card.current_balance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Límite</p>
                          <p className="text-sm font-semibold text-zinc-700">
                            {card.credit_limit != null ? formatCurrency(card.credit_limit) : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Disponible</p>
                          <p className={cn("text-sm font-semibold", available != null && available < 0 ? "text-rose-500" : "text-emerald-600")}>
                            {available != null ? formatCurrency(Math.max(0, available)) : "—"}
                          </p>
                        </div>
                      </div>

                      {usePct != null && (
                        <>
                          <Progress value={usePct} className={cn("h-2 mb-1", usePct > 80 ? "[&>div]:bg-rose-500" : usePct > 50 ? "[&>div]:bg-amber-400" : "[&>div]:bg-emerald-500")} />
                          <p className="text-[10px] text-zinc-400 text-right">{Math.round(usePct)}% de línea usado</p>
                        </>
                      )}

                      <div className="flex gap-3 mt-2 text-xs text-zinc-400">
                        {card.payment_due_day && <span>📅 Pago: día {card.payment_due_day}</span>}
                        {card.statement_closing_day && <span>📋 Cierre: día {card.statement_closing_day}</span>}
                        {card.minimum_payment && <span>Mín: {formatCurrency(card.minimum_payment)}</span>}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-zinc-50 bg-zinc-50 px-4 py-3 grid grid-cols-2 gap-2">
                        <Button size="sm" onClick={() => openPurchase(card)}
                          className="gap-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs">
                          <ShoppingBag className="size-3.5" />Registrar compra
                        </Button>
                        {hasDebt && (
                          <Button size="sm" onClick={() => openCardPayment(card)}
                            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs">
                            <CreditCard className="size-3.5" />Registrar pago
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openCardHistory(card)} className="gap-1.5 text-xs">
                          <History className="size-3.5" />Ver pagos
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditCard(card)} className="gap-1.5 text-xs">
                          <Pencil className="size-3.5" />Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteCard(card)}
                          className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 text-xs col-span-2">
                          <Trash2 className="size-3.5" />Eliminar / desactivar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Personas ── */}
        <TabsContent value="personas">
          <LiabilityTab
            items={personalDebts}
            allItems={liabilities}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            onAdd={() => openAdd("personal_debt")}
            onEdit={openEdit}
            onDelete={handleDelete}
            onMarkPaid={handleMarkPaid}
            onPayment={openPayment}
            onHistory={openHistory}
            emptyText="No tienes deudas personales registradas"
            addLabel="Nueva deuda personal"
          />
        </TabsContent>

        {/* ── Tab: Préstamos ── */}
        <TabsContent value="prestamos">
          <LiabilityTab
            items={loans}
            allItems={liabilities}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            onAdd={() => openAdd("loan")}
            onEdit={openEdit}
            onDelete={handleDelete}
            onMarkPaid={handleMarkPaid}
            onPayment={openPayment}
            onHistory={openHistory}
            emptyText="No tienes préstamos registrados"
            addLabel="Nuevo préstamo"
          />
        </TabsContent>

        {/* ── Tab: Otras ── */}
        <TabsContent value="otras">
          <LiabilityTab
            items={otherDebts}
            allItems={liabilities}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            onAdd={() => openAdd("other")}
            onEdit={openEdit}
            onDelete={handleDelete}
            onMarkPaid={handleMarkPaid}
            onPayment={openPayment}
            onHistory={openHistory}
            emptyText="No tienes otras deudas registradas"
            addLabel="Nueva deuda"
          />
        </TabsContent>
      </Tabs>

      {/* ── Sheet: Tarjeta (add/edit) ──────────────────────────────────────── */}
      <Sheet open={showCardForm} onOpenChange={(open) => { setShowCardForm(open); if (!open) setCardFormError(null); }}>
        <SheetContent side="bottom" className="max-h-[95vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingCard ? "Editar tarjeta" : "Nueva tarjeta de crédito"}</SheetTitle>
          </SheetHeader>
          {submitted ? (
            <div className="flex flex-col items-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">{editingCard ? "Tarjeta actualizada" : "Tarjeta registrada"}</p>
            </div>
          ) : (
            <div className="px-1 py-4 space-y-4">
              {cardFormError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                  {cardFormError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Nombre de tarjeta *</Label>
                <Input placeholder="Ej. Visa BCP, Interbank MC..." {...cardForm.register("name")} />
                {cardForm.formState.errors.name && <p className="text-xs text-rose-500">{cardForm.formState.errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Banco / institución</Label>
                  <Input placeholder="Ej. BCP, Interbank..." {...cardForm.register("institution_name")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Red</Label>
                  <Select defaultValue={editingCard?.card_network ?? undefined} onValueChange={(v) => cardForm.setValue("card_network", v)}>
                    <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
                    <SelectContent>
                      {CARD_NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Últimos 4 dígitos</Label>
                  <Input placeholder="1234" maxLength={4} {...cardForm.register("last_four_digits")} />
                  {cardForm.formState.errors.last_four_digits && <p className="text-xs text-rose-500">{cardForm.formState.errors.last_four_digits.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Línea de crédito</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                    <Input type="number" placeholder="5000" className="pl-9" {...cardForm.register("credit_limit")} />
                  </div>
                </div>
              </div>
              {!editingCard && (
                <div className="space-y-1.5">
                  <Label>Deuda actual *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                    <Input type="number" placeholder="0.00" className="pl-9" {...cardForm.register("current_balance")} />
                  </div>
                  {cardForm.formState.errors.current_balance && <p className="text-xs text-rose-500">{cardForm.formState.errors.current_balance.message}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Día de cierre</Label>
                  <Input type="number" min={1} max={31} placeholder="15" {...cardForm.register("statement_closing_day")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Día de pago</Label>
                  <Input type="number" min={1} max={31} placeholder="25" {...cardForm.register("payment_due_day")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Pago mínimo (opcional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-9" {...cardForm.register("minimum_payment")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notas (opcional)</Label>
                <Textarea placeholder="Tasa, beneficios..." {...cardForm.register("notes")} />
              </div>
            </div>
          )}
          {!submitted && (
            <SheetFooter className="px-1 pb-2">
              <Button className="w-full" size="lg" onClick={cardForm.handleSubmit(onSubmitCard)} disabled={cardForm.formState.isSubmitting}>
                {cardForm.formState.isSubmitting ? "Guardando..." : editingCard ? "Guardar cambios" : "Registrar tarjeta"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Compra con tarjeta ─────────────────────────────────────── */}
      <Sheet open={showPurchase} onOpenChange={setShowPurchase}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar compra con tarjeta</SheetTitle>
          </SheetHeader>
          {submitted ? (
            <div className="flex flex-col items-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Compra registrada!</p>
              <p className="text-sm text-zinc-500 mt-1">La deuda de la tarjeta fue actualizada</p>
            </div>
          ) : (
            <div className="px-1 py-4 space-y-4">
              {purchasingCard && (
                <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide">Tarjeta</p>
                  <p className="font-semibold text-zinc-800">{purchasingCard.name}</p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-rose-600">Deuda actual: {formatCurrency(purchasingCard.current_balance)}</span>
                    {purchasingCard.credit_limit != null && (
                      <span className="text-emerald-600">Disponible: {formatCurrency(Math.max(0, purchasingCard.credit_limit - purchasingCard.current_balance))}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Monto *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-9" {...purchaseForm.register("amount")} />
                </div>
                {purchaseForm.formState.errors.amount && <p className="text-xs text-rose-500">{purchaseForm.formState.errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Descripción *</Label>
                <Input placeholder="Ej. Ropa en Ripley, Netflix..." {...purchaseForm.register("description")} />
                {purchaseForm.formState.errors.description && <p className="text-xs text-rose-500">{purchaseForm.formState.errors.description.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select onValueChange={(v) => purchaseForm.setValue("category_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {purchaseForm.formState.errors.category_id && <p className="text-xs text-rose-500">{purchaseForm.formState.errors.category_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" {...purchaseForm.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Notas (opcional)</Label>
                <Input placeholder="Referencia, cuotas..." {...purchaseForm.register("notes")} />
              </div>
              {paymentError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3"><p className="text-sm text-rose-600">{paymentError}</p></div>}
            </div>
          )}
          {!submitted && (
            <SheetFooter className="px-1 pb-2">
              <Button className="w-full" size="lg" onClick={purchaseForm.handleSubmit(onSubmitPurchase)} disabled={purchaseForm.formState.isSubmitting}>
                {purchaseForm.formState.isSubmitting ? "Registrando..." : "Registrar compra"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Pago de tarjeta ────────────────────────────────────────── */}
      <Sheet open={showCardPayment} onOpenChange={setShowCardPayment}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Pagar tarjeta</SheetTitle></SheetHeader>
          {submitted ? (
            <div className="flex flex-col items-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Pago registrado!</p>
              <p className="text-sm text-zinc-500 mt-1">La deuda de la tarjeta fue reducida</p>
            </div>
          ) : (
            <div className="px-1 py-4 space-y-4">
              {payingCard && (
                <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide">Tarjeta</p>
                  <p className="font-semibold text-zinc-800">{payingCard.name}</p>
                  <p className="text-sm text-rose-600">Deuda pendiente: {formatCurrency(payingCard.current_balance)}</p>
                  {payingCard.minimum_payment && <p className="text-xs text-zinc-400">Pago mínimo: {formatCurrency(payingCard.minimum_payment)}</p>}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Cuenta desde donde pagás</Label>
                <Select onValueChange={(v) => cardPaymentForm.setValue("account_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.icon} {a.name} — {formatCurrency(a.balance)}</SelectItem>)}
                  </SelectContent>
                </Select>
                {cardPaymentForm.formState.errors.account_id && <p className="text-xs text-rose-500">{cardPaymentForm.formState.errors.account_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Monto a pagar</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-9" {...cardPaymentForm.register("amount")} />
                </div>
                {cardPaymentForm.formState.errors.amount && <p className="text-xs text-rose-500">{cardPaymentForm.formState.errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de pago</Label>
                <Input type="date" {...cardPaymentForm.register("payment_date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Nota (opcional)</Label>
                <Input placeholder="Cuota N°, referencia..." {...cardPaymentForm.register("notes")} />
              </div>
              {paymentError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3"><p className="text-sm text-rose-600">{paymentError}</p></div>}
            </div>
          )}
          {!submitted && (
            <SheetFooter className="px-1 pb-2">
              <Button className="w-full" size="lg" onClick={cardPaymentForm.handleSubmit(onSubmitCardPayment)} disabled={cardPaymentForm.formState.isSubmitting}>
                {cardPaymentForm.formState.isSubmitting ? "Registrando..." : "Registrar pago"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Historial de tarjeta ───────────────────────────────────── */}
      <Sheet open={showCardHistory} onOpenChange={setShowCardHistory}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Historial de pagos</SheetTitle></SheetHeader>
          {historyCard && <p className="px-1 text-sm text-zinc-500 mb-4">{historyCard.name}</p>}
          <div className="px-1 space-y-2 pb-6">
            {cardPayments.length === 0 ? (
              <div className="text-center py-10"><p className="text-3xl mb-2">📭</p><p className="text-zinc-500 text-sm">Sin pagos registrados aún</p></div>
            ) : (
              cardPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-zinc-50 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-zinc-400">{formatDate(p.payment_date)}{p.account && ` · ${p.account.icon} ${p.account.name}`}</p>
                    {p.notes && <p className="text-xs text-zinc-400 mt-0.5">{p.notes}</p>}
                  </div>
                  <CheckCircle className="size-5 text-emerald-500" />
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Add/Edit other liability ──────────────────────────────── */}
      <Sheet open={showAddEdit} onOpenChange={setShowAddEdit}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader><SheetTitle>{editingLiability ? "Editar deuda" : "Nueva deuda"}</SheetTitle></SheetHeader>
          {submitted ? (
            <div className="flex flex-col items-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">{editingLiability ? "Deuda actualizada" : "Deuda registrada"}</p>
            </div>
          ) : (
            <div className="px-1 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo de deuda</Label>
                <Select defaultValue={editingLiability?.liability_type ?? liabilityForm.getValues("liability_type")} onValueChange={(v) => liabilityForm.setValue("liability_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal_debt">🤝 Deuda a persona</SelectItem>
                    <SelectItem value="loan">🏦 Préstamo</SelectItem>
                    <SelectItem value="other">📋 Otra</SelectItem>
                  </SelectContent>
                </Select>
                {liabilityForm.formState.errors.liability_type && <p className="text-xs text-rose-500">{liabilityForm.formState.errors.liability_type.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input placeholder="Ej. Préstamo Juan, deuda banco..." {...liabilityForm.register("name")} />
                {liabilityForm.formState.errors.name && <p className="text-xs text-rose-500">{liabilityForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Acreedor (opcional)</Label>
                <Input placeholder="Ej. Juan Pérez, BCP..." {...liabilityForm.register("creditor_name")} />
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
                  {liabilityForm.formState.errors.current_balance && <p className="text-xs text-rose-500">{liabilityForm.formState.errors.current_balance.message}</p>}
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
              <Button className="w-full" size="lg" onClick={liabilityForm.handleSubmit(onSubmitLiability)} disabled={liabilityForm.formState.isSubmitting}>
                {liabilityForm.formState.isSubmitting ? "Guardando..." : editingLiability ? "Guardar cambios" : "Registrar deuda"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Pago de otra deuda ─────────────────────────────────────── */}
      <Sheet open={showPayment} onOpenChange={setShowPayment}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Registrar pago</SheetTitle></SheetHeader>
          {submitted ? (
            <div className="flex flex-col items-center py-10">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Pago registrado!</p>
            </div>
          ) : (
            <div className="px-1 py-4 space-y-4">
              {payingLiability && (
                <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
                  <p className="text-xs text-zinc-400 uppercase tracking-wide">Deuda</p>
                  <p className="font-semibold text-zinc-800">{payingLiability.name}</p>
                  <p className="text-sm text-rose-600">Saldo pendiente: {formatCurrency(payingLiability.current_balance)}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Cuenta desde donde pagás</Label>
                <Select onValueChange={(v) => paymentForm.setValue("account_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.icon} {a.name} — {formatCurrency(a.balance)}</SelectItem>)}
                  </SelectContent>
                </Select>
                {paymentForm.formState.errors.account_id && <p className="text-xs text-rose-500">{paymentForm.formState.errors.account_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Monto pagado</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-9" {...paymentForm.register("amount")} />
                </div>
                {paymentForm.formState.errors.amount && <p className="text-xs text-rose-500">{paymentForm.formState.errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de pago</Label>
                <Input type="date" {...paymentForm.register("payment_date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Nota (opcional)</Label>
                <Input placeholder="Cuota N°, referencia..." {...paymentForm.register("notes")} />
              </div>
              {paymentError && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3"><p className="text-sm text-rose-600">{paymentError}</p></div>}
            </div>
          )}
          {!submitted && (
            <SheetFooter className="px-1 pb-2">
              <Button className="w-full" size="lg" onClick={paymentForm.handleSubmit(onSubmitPayment)} disabled={paymentForm.formState.isSubmitting}>
                {paymentForm.formState.isSubmitting ? "Registrando..." : "Registrar pago"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet: Historial otra deuda ───────────────────────────────────── */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Historial de pagos</SheetTitle></SheetHeader>
          {historyLiability && <p className="px-1 text-sm text-zinc-500 mb-4">{historyLiability.name}</p>}
          <div className="px-1 space-y-2 pb-6">
            {payments.length === 0 ? (
              <div className="text-center py-10"><p className="text-3xl mb-2">📭</p><p className="text-zinc-500 text-sm">Sin pagos registrados aún</p></div>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-zinc-50 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-zinc-400">{formatDate(p.payment_date)}{p.account && ` · ${p.account.icon} ${p.account.name}`}</p>
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

// ── LiabilityTab (reusable for Personas / Préstamos / Otras) ─────────────────

function LiabilityTab({
  items, expandedIds, toggleExpand, onAdd, onEdit, onDelete, onMarkPaid, onPayment, onHistory, emptyText, addLabel,
}: {
  items: Liability[];
  allItems: Liability[];
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  onAdd: () => void;
  onEdit: (l: Liability) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (l: Liability) => void;
  onPayment: (l: Liability) => void;
  onHistory: (l: Liability) => void;
  emptyText: string;
  addLabel: string;
}) {
  const active = items.filter((l) => l.status === "active");
  const paid = items.filter((l) => l.status === "paid");

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="size-4" />{addLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-zinc-500 text-sm">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {active.map((l) => {
            const originalAmt = l.original_amount ?? l.current_balance;
            const paid_amt = originalAmt - l.current_balance;
            const pct = originalAmt > 0 ? Math.min(100, (paid_amt / originalAmt) * 100) : 0;
            const isExpanded = expandedIds.has(l.id);

            return (
              <div key={l.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-800">{l.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {l.creditor_name ? `${l.creditor_name}` : ""}
                        {l.due_date ? ` · Vence ${formatDate(l.due_date)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-bold text-rose-600">{formatCurrency(l.current_balance)}</p>
                      <button onClick={() => toggleExpand(l.id)} className="p-1 text-zinc-400 hover:text-zinc-600">
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </button>
                    </div>
                  </div>
                  {l.original_amount != null && (
                    <>
                      <Progress value={pct} className="h-1.5 mb-1" />
                      <p className="text-[10px] text-zinc-400 text-right">{Math.round(pct)}% pagado</p>
                    </>
                  )}
                  {l.minimum_payment != null && (
                    <p className="text-xs text-zinc-400 mt-1">Cuota mínima: {formatCurrency(l.minimum_payment)}</p>
                  )}
                </div>
                {isExpanded && (
                  <div className="border-t border-zinc-50 bg-zinc-50 px-4 py-3 grid grid-cols-2 gap-2">
                    <Button size="sm" onClick={() => onPayment(l)} className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs">
                      <CreditCard className="size-3.5" />Registrar pago
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onMarkPaid(l)} className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs">
                      <CheckCircle className="size-3.5" />Marcar pagada
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onHistory(l)} className="gap-1.5 text-xs">
                      <History className="size-3.5" />Ver pagos
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onEdit(l)} className="gap-1.5 text-xs">
                      <Pencil className="size-3.5" />Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDelete(l.id)} className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 text-xs col-span-2">
                      <Trash2 className="size-3.5" />Eliminar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {paid.length > 0 && (
            <>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mt-4">Pagadas</p>
              {paid.map((l) => (
                <div key={l.id} className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-zinc-600 line-through">{l.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400 line-through">{formatCurrency(l.current_balance)}</span>
                      <button onClick={() => onDelete(l.id)} className="p-1 text-zinc-300 hover:text-rose-400">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}
