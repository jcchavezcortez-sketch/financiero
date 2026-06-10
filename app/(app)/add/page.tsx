"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, CheckCircle } from "lucide-react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";
import {
  getAccounts,
  getCategories,
  getLiabilities,
  getCreditCards,
  insertCreditCard,
  createIncome,
  createExpense,
  createTransfer,
  registerLiabilityPayment,
  createCreditCardPurchase,
  createBalanceAdjustment,
  createSavingsAllocation,
} from "@/lib/supabase/queries";
import type { Database } from "@/types/database";
import type { MovementType, CreditCardWithLiability } from "@/types";
import { CARD_NETWORKS } from "@/types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];

// ── Movement type definitions ─────────────────────────────────────────────────

const MOVEMENT_TYPES: { id: MovementType; label: string; emoji: string; desc: string }[] = [
  { id: "expense",              label: "Gasto",             emoji: "💸", desc: "Consumo real" },
  { id: "income",               label: "Ingreso",           emoji: "💰", desc: "Sueldo, cobros" },
  { id: "transfer",             label: "Transferencia",     emoji: "↔️",  desc: "Entre cuentas" },
  { id: "debt_payment",         label: "Pago de deuda",     emoji: "💳", desc: "Abono a deuda" },
  { id: "credit_card_purchase", label: "Compra c/ tarjeta", emoji: "🛍️", desc: "Cargo a tarjeta" },
  { id: "balance_adjustment",   label: "Ajuste saldo",      emoji: "⚖️",  desc: "Corrección" },
  { id: "savings_allocation",   label: "Ahorro protegido",  emoji: "🐷", desc: "Separar ahorro" },
];

// ── Schemas ───────────────────────────────────────────────────────────────────

const positiveAmount = z
  .string()
  .min(1, "Ingresa un monto")
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Debe ser mayor a 0");

const incomeSchema = z.object({
  amount: positiveAmount,
  account_id: z.string().min(1, "Selecciona una cuenta"),
  category_id: z.string().optional(),
  description: z.string().min(1, "Agrega una descripción"),
  date: z.string().min(1, "Selecciona fecha"),
  notes: z.string().optional(),
});

const expenseSchema = z.object({
  amount: positiveAmount,
  account_id: z.string().min(1, "Selecciona una cuenta"),
  category_id: z.string().optional(),
  description: z.string().min(1, "Agrega una descripción"),
  merchant: z.string().optional(),
  date: z.string().min(1, "Selecciona fecha"),
  notes: z.string().optional(),
});

const transferSchema = z
  .object({
    amount: positiveAmount,
    from_account_id: z.string().min(1, "Selecciona cuenta origen"),
    to_account_id: z.string().min(1, "Selecciona cuenta destino"),
    description: z.string().optional(),
    date: z.string().min(1, "Selecciona fecha"),
    notes: z.string().optional(),
  })
  .refine((d) => d.from_account_id !== d.to_account_id, {
    message: "Las cuentas deben ser distintas",
    path: ["to_account_id"],
  });

const debtPaymentSchema = z.object({
  amount: positiveAmount,
  liability_id: z.string().min(1, "Selecciona la deuda"),
  account_id: z.string().min(1, "Selecciona la cuenta"),
  payment_date: z.string().min(1, "Selecciona fecha"),
  notes: z.string().optional(),
});

const creditCardSchema = z.object({
  amount: positiveAmount,
  liability_id: z.string().min(1, "Selecciona la tarjeta"),
  description: z.string().min(1, "Agrega una descripción"),
  category_id: z.string().optional(),
  date: z.string().min(1, "Selecciona fecha"),
  notes: z.string().optional(),
});

const adjustmentSchema = z.object({
  account_id: z.string().min(1, "Selecciona una cuenta"),
  new_balance: z
    .string()
    .min(1, "Ingresa el saldo correcto")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Debe ser 0 o mayor"),
  date: z.string().min(1, "Selecciona fecha"),
  notes: z.string().optional(),
});

const savingsSchema = z
  .object({
    amount: positiveAmount,
    from_account_id: z.string().min(1, "Selecciona cuenta origen"),
    to_account_id: z.string().min(1, "Selecciona cuenta de ahorro"),
    date: z.string().min(1, "Selecciona fecha"),
    notes: z.string().optional(),
  })
  .refine((d) => d.from_account_id !== d.to_account_id, {
    message: "Las cuentas deben ser distintas",
    path: ["to_account_id"],
  });

const newCardSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  institution_name: z.string().optional(),
  card_network: z.string().optional(),
  last_four_digits: z.string().optional(),
  credit_limit: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido").optional(),
  current_balance: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Debe ser 0 o mayor"),
  statement_closing_day: z.string().optional(),
  payment_due_day: z.string().optional(),
  minimum_payment: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido").optional(),
});

// ── Shared field components ───────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-rose-500 mt-1">{msg}</p>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRegister = (name: any, options?: any) => any;

function AmountField({
  register,
  error,
  accent = "text-rose-600",
}: {
  register: AnyRegister;
  error?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-zinc-100 mb-5">
      <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Monto</p>
      <div className="flex items-center justify-center gap-2">
        <span className={cn("text-3xl font-bold", accent)}>S/</span>
        <input
          type="number"
          placeholder="0.00"
          step="0.01"
          min="0"
          className={cn(
            "text-4xl font-bold bg-transparent border-none outline-none text-center w-40 placeholder:text-zinc-200",
            accent
          )}
          {...register("amount")}
        />
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function AccountSelect({
  accounts,
  value,
  onChange,
  error,
  placeholder = "Selecciona una cuenta",
}: {
  accounts: AccountRow[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.icon} {a.name}{" "}
              <span className="text-zinc-400 text-xs">
                (S/ {a.balance.toFixed(2)})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError msg={error} />
    </div>
  );
}

function CategoryGrid({
  categories,
  selected,
  onSelect,
  error,
}: {
  categories: CategoryRow[];
  selected: string;
  onSelect: (id: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>Categoría (opcional)</Label>
      <div className="grid grid-cols-4 gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(selected === cat.id ? "" : cat.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-150 text-center",
              selected === cat.id
                ? "border-violet-500 bg-violet-50"
                : "border-zinc-100 bg-white hover:border-zinc-200"
            )}
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="text-[10px] text-zinc-600 leading-tight">
              {cat.name.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function DateField({
  register,
  error,
  today,
  name = "date",
}: {
  register: AnyRegister;
  error?: string;
  today: string;
  name?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Fecha</Label>
      <Input type="date" max={today} {...register(name)} />
      <FieldError msg={error} />
    </div>
  );
}

// ── Sub-forms (one per movement type) ────────────────────────────────────────

type SharedProps = {
  accounts: AccountRow[];
  categories: { expense: CategoryRow[]; income: CategoryRow[] };
  liabilities: LiabilityRow[];
  creditCards: CreditCardWithLiability[];
  today: string;
  onSuccess: (emoji: string, label: string, amount: string) => void;
  onAddCard?: () => void;
};

function IncomeForm({ accounts, categories, today, onSuccess }: SharedProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof incomeSchema>>({
      resolver: zodResolver(incomeSchema),
      defaultValues: { date: today, amount: "", description: "", account_id: "", category_id: "", notes: "" },
    });

  const categoryId = watch("category_id") ?? "";
  const accountId = watch("account_id") ?? "";
  const amount = watch("amount");

  const onSubmit = async (data: z.infer<typeof incomeSchema>) => {
    await createIncome({
      account_id: data.account_id,
      amount: Number(data.amount),
      description: data.description,
      category_id: data.category_id || undefined,
      date: data.date,
      notes: data.notes || undefined,
    });
    onSuccess("💰", "Ingreso", data.amount);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AmountField register={register} error={errors.amount?.message} accent="text-emerald-600" />
      <div className="px-5 space-y-4 pb-8">
        <DateField register={register} error={errors.date?.message} today={today} />
        <div className="space-y-1.5">
          <Label>Cuenta</Label>
          <AccountSelect
            accounts={accounts}
            value={accountId}
            onChange={(v) => setValue("account_id", v)}
            error={errors.account_id?.message}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input placeholder="Ej. Sueldo de mayo, pago de cliente..." {...register("description")} />
          <FieldError msg={errors.description?.message} />
        </div>
        <CategoryGrid
          categories={categories.income}
          selected={categoryId}
          onSelect={(id) => setValue("category_id", id)}
          error={errors.category_id?.message}
        />
        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Textarea rows={2} placeholder="Detalles adicionales..." {...register("notes")} />
        </div>
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}

function ExpenseForm({ accounts, categories, today, onSuccess }: SharedProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof expenseSchema>>({
      resolver: zodResolver(expenseSchema),
      defaultValues: { date: today, amount: "", description: "", account_id: "", category_id: "", merchant: "", notes: "" },
    });

  const categoryId = watch("category_id") ?? "";
  const accountId = watch("account_id") ?? "";

  const onSubmit = async (data: z.infer<typeof expenseSchema>) => {
    await createExpense({
      account_id: data.account_id,
      amount: Number(data.amount),
      description: data.description,
      category_id: data.category_id || undefined,
      merchant: data.merchant || undefined,
      date: data.date,
      notes: data.notes || undefined,
    });
    onSuccess("💸", "Gasto", data.amount);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AmountField register={register} error={errors.amount?.message} accent="text-rose-600" />
      <div className="px-5 space-y-4 pb-8">
        <DateField register={register} error={errors.date?.message} today={today} />
        <div className="space-y-1.5">
          <Label>Cuenta</Label>
          <AccountSelect
            accounts={accounts}
            value={accountId}
            onChange={(v) => setValue("account_id", v)}
            error={errors.account_id?.message}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input placeholder="Ej. Almuerzo, taxi, mercado..." {...register("description")} />
          <FieldError msg={errors.description?.message} />
        </div>
        <CategoryGrid
          categories={categories.expense}
          selected={categoryId}
          onSelect={(id) => setValue("category_id", id)}
          error={errors.category_id?.message}
        />
        <div className="space-y-1.5">
          <Label>Comercio / Lugar (opcional)</Label>
          <Input placeholder="Ej. Plaza Vea, InDriver..." {...register("merchant")} />
        </div>
        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Textarea rows={2} placeholder="Detalles adicionales..." {...register("notes")} />
        </div>
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}

function TransferForm({ accounts, today, onSuccess }: SharedProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof transferSchema>>({
      resolver: zodResolver(transferSchema),
      defaultValues: { date: today, amount: "", from_account_id: "", to_account_id: "", description: "", notes: "" },
    });

  const fromId = watch("from_account_id") ?? "";
  const toId = watch("to_account_id") ?? "";

  // Credit cards cannot be source or destination of a regular transfer
  const transferableAccounts = accounts.filter((a) => a.type !== "credit_card");
  const destAccounts = transferableAccounts.filter((a) => a.id !== fromId);

  const onSubmit = async (data: z.infer<typeof transferSchema>) => {
    await createTransfer({
      from_account_id: data.from_account_id,
      to_account_id: data.to_account_id,
      amount: Number(data.amount),
      description: data.description || undefined,
      date: data.date,
      notes: data.notes || undefined,
    });
    onSuccess("↔️", "Transferencia", data.amount);
  };

  if (transferableAccounts.length < 2) {
    return (
      <div className="px-5 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">↔️</p>
          <p className="text-sm font-semibold text-amber-800 mb-1">No hay cuentas disponibles</p>
          <p className="text-sm text-amber-700">
            Necesitas al menos dos cuentas activas para hacer una transferencia.
          </p>
          <Link href="/accounts">
            <Button size="sm" variant="outline" className="mt-4">
              Crear otra cuenta
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AmountField register={register} error={errors.amount?.message} accent="text-indigo-600" />
      <div className="px-5 space-y-4 pb-8">
        <DateField register={register} error={errors.date?.message} today={today} />
        <div className="space-y-1.5">
          <Label>Cuenta origen</Label>
          <AccountSelect
            accounts={transferableAccounts}
            value={fromId}
            onChange={(v) => setValue("from_account_id", v)}
            error={errors.from_account_id?.message}
            placeholder="¿Desde dónde?"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cuenta destino</Label>
          {fromId && destAccounts.length === 0 ? (
            <p className="text-xs text-zinc-400 py-2">
              No hay otra cuenta disponible como destino.{" "}
              <Link href="/accounts" className="text-violet-600 underline">Crear cuenta</Link>
            </p>
          ) : (
            <AccountSelect
              accounts={destAccounts}
              value={toId}
              onChange={(v) => setValue("to_account_id", v)}
              error={errors.to_account_id?.message}
              placeholder="¿Hacia dónde?"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Descripción (opcional)</Label>
          <Input placeholder="Ej. Transferencia mensual..." {...register("description")} />
        </div>
        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Textarea rows={2} {...register("notes")} />
        </div>
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}

function DebtPaymentForm({ accounts, liabilities, today, onSuccess }: SharedProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof debtPaymentSchema>>({
      resolver: zodResolver(debtPaymentSchema),
      defaultValues: { payment_date: today, amount: "", liability_id: "", account_id: "", notes: "" },
    });

  const liabilityId = watch("liability_id") ?? "";
  const accountId = watch("account_id") ?? "";
  const activeDebts = liabilities.filter((l) => l.status === "active");
  const selectedLiab = activeDebts.find((l) => l.id === liabilityId);

  const onSubmit = async (data: z.infer<typeof debtPaymentSchema>) => {
    if (!selectedLiab) throw new Error("Deuda no encontrada");
    await registerLiabilityPayment({
      liability_id: data.liability_id,
      liability_name: selectedLiab.name,
      account_id: data.account_id,
      amount: Number(data.amount),
      payment_date: data.payment_date,
      notes: data.notes || null,
      current_balance: selectedLiab.current_balance,
    });
    onSuccess("💳", "Pago de deuda", data.amount);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AmountField register={register} error={errors.amount?.message} accent="text-amber-600" />
      <div className="px-5 space-y-4 pb-8">
        <DateField register={register} error={errors.payment_date?.message} today={today} name="payment_date" />
        <div className="space-y-1.5">
          <Label>Deuda a pagar</Label>
          <Select value={liabilityId} onValueChange={(v) => setValue("liability_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona la deuda" />
            </SelectTrigger>
            <SelectContent>
              {activeDebts.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}{" "}
                  <span className="text-zinc-400 text-xs">
                    (S/ {l.current_balance.toFixed(2)})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError msg={errors.liability_id?.message} />
          {selectedLiab?.minimum_payment && (
            <p className="text-xs text-zinc-400">
              Pago mínimo: S/ {selectedLiab.minimum_payment.toFixed(2)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Pagar desde</Label>
          <AccountSelect
            accounts={accounts}
            value={accountId}
            onChange={(v) => setValue("account_id", v)}
            error={errors.account_id?.message}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Textarea rows={2} {...register("notes")} />
        </div>
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}

function CreditCardForm({ categories, creditCards, today, onSuccess, onAddCard }: SharedProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof creditCardSchema>>({
      resolver: zodResolver(creditCardSchema),
      defaultValues: { date: today, amount: "", liability_id: "", description: "", category_id: "", notes: "" },
    });

  const liabilityId = watch("liability_id") ?? "";
  const categoryId = watch("category_id") ?? "";

  // Only cards that have a liability record (liability_id must be non-null/non-empty)
  const cardsWithLiability = creditCards.filter((c) => !!c.liability_id);
  const selectedCard = cardsWithLiability.find((c) => c.liability_id === liabilityId);
  const available = selectedCard?.credit_limit != null
    ? selectedCard.credit_limit - selectedCard.current_balance
    : null;

  const onSubmit = async (data: z.infer<typeof creditCardSchema>) => {
    if (!selectedCard?.liability_id) throw new Error("Tarjeta no encontrada");
    await createCreditCardPurchase({
      liability_id: data.liability_id,
      liability_name: selectedCard.name,
      credit_card_account_id: selectedCard.account_id,
      amount: Number(data.amount),
      description: data.description,
      category_id: data.category_id || undefined,
      date: data.date,
      notes: data.notes || undefined,
    });
    onSuccess("🛍️", "Compra con tarjeta", data.amount);
  };

  if (cardsWithLiability.length === 0) {
    return (
      <div className="px-5 py-8">
        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">💳</p>
          <p className="text-sm font-semibold text-pink-800 mb-1">No tienes tarjetas de crédito</p>
          <p className="text-sm text-pink-700 mb-4">
            Agrega una tarjeta para registrar compras con crédito.
          </p>
          <Button size="sm" variant="outline" onClick={() => onAddCard?.()}>
            Agregar tarjeta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AmountField register={register} error={errors.amount?.message} accent="text-pink-600" />
      <div className="px-5 space-y-4 pb-8">
        <DateField register={register} error={errors.date?.message} today={today} />
        <div className="space-y-1.5">
          <Label>Tarjeta de crédito</Label>
          <Select value={liabilityId} onValueChange={(v) => setValue("liability_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona la tarjeta" />
            </SelectTrigger>
            <SelectContent>
              {cardsWithLiability.map((c) => (
                <SelectItem key={c.account_id} value={c.liability_id!}>
                  💳 {c.name}
                  {c.card_network ? ` (${c.card_network})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError msg={errors.liability_id?.message} />
          <button
            type="button"
            onClick={() => onAddCard?.()}
            className="text-xs text-violet-600 underline"
          >
            + Agregar otra tarjeta
          </button>
          {selectedCard && (
            <div className="bg-zinc-50 rounded-xl p-3 text-xs text-zinc-500 space-y-0.5">
              <p>Deuda actual: <span className="font-semibold text-rose-600">S/ {selectedCard.current_balance.toFixed(2)}</span></p>
              {available != null && (
                <p>Disponible: <span className="font-semibold text-emerald-600">S/ {Math.max(0, available).toFixed(2)}</span></p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input placeholder="Ej. Netflix, ropa en Saga..." {...register("description")} />
          <FieldError msg={errors.description?.message} />
        </div>
        <CategoryGrid
          categories={categories.expense}
          selected={categoryId}
          onSelect={(id) => setValue("category_id", id)}
        />
        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Textarea rows={2} {...register("notes")} />
        </div>
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}

function AdjustmentForm({ accounts, today, onSuccess }: SharedProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof adjustmentSchema>>({
      resolver: zodResolver(adjustmentSchema),
      defaultValues: { date: today, account_id: "", new_balance: "", notes: "" },
    });

  const accountId = watch("account_id") ?? "";
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const onSubmit = async (data: z.infer<typeof adjustmentSchema>) => {
    await createBalanceAdjustment({
      account_id: data.account_id,
      new_balance: Number(data.new_balance),
      date: data.date,
      notes: data.notes || undefined,
    });
    onSuccess("⚖️", "Ajuste de saldo", data.new_balance);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="px-5 space-y-4 pt-4 pb-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Úsalo solo para corregir el saldo de una cuenta cuando no coincide con la realidad. No afecta ingresos ni gastos del mes.
        </div>
        <DateField register={register} error={errors.date?.message} today={today} />
        <div className="space-y-1.5">
          <Label>Cuenta a corregir</Label>
          <AccountSelect
            accounts={accounts}
            value={accountId}
            onChange={(v) => setValue("account_id", v)}
            error={errors.account_id?.message}
          />
          {selectedAccount && (
            <p className="text-xs text-zinc-400">
              Saldo actual: S/ {selectedAccount.balance.toFixed(2)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Saldo correcto</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">S/</span>
            <Input className="pl-9" type="number" step="0.01" min="0" placeholder="0.00" {...register("new_balance")} />
          </div>
          <FieldError msg={errors.new_balance?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>Motivo (opcional)</Label>
          <Textarea rows={2} placeholder="Ej. Corrección después de conciliar..." {...register("notes")} />
        </div>
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}

function SavingsForm({ accounts, today, onSuccess }: SharedProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof savingsSchema>>({
      resolver: zodResolver(savingsSchema),
      defaultValues: { date: today, amount: "", from_account_id: "", to_account_id: "", notes: "" },
    });

  const fromId = watch("from_account_id") ?? "";
  const toId = watch("to_account_id") ?? "";

  // Origin: liquid accounts only (exclude credit cards and savings accounts)
  const liquidAccounts = accounts.filter((a) => a.include_in_available_balance && a.type !== "credit_card");
  // Destination: savings/protected accounts only (exclude credit cards)
  const savingsAccounts = accounts.filter((a) => !a.include_in_available_balance && a.type !== "credit_card");

  const onSubmit = async (data: z.infer<typeof savingsSchema>) => {
    await createSavingsAllocation({
      from_account_id: data.from_account_id,
      to_account_id: data.to_account_id,
      amount: Number(data.amount),
      date: data.date,
      notes: data.notes || undefined,
    });
    onSuccess("🐷", "Ahorro protegido", data.amount);
  };

  if (savingsAccounts.length === 0) {
    return (
      <div className="px-5 py-8">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">🐷</p>
          <p className="text-sm font-semibold text-teal-800 mb-1">No hay cuentas de ahorro</p>
          <p className="text-sm text-teal-700 mb-4">
            Crea una cuenta de ahorro protegido para poder separar dinero.
          </p>
          <Link href="/accounts">
            <Button size="sm" variant="outline">Crear cuenta de ahorro</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <AmountField register={register} error={errors.amount?.message} accent="text-teal-600" />
      <div className="px-5 space-y-4 pb-8">
        <DateField register={register} error={errors.date?.message} today={today} />
        <div className="space-y-1.5">
          <Label>Cuenta de liquidez (origen)</Label>
          <AccountSelect
            accounts={liquidAccounts}
            value={fromId}
            onChange={(v) => setValue("from_account_id", v)}
            error={errors.from_account_id?.message}
            placeholder="¿Desde dónde separas?"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cuenta de ahorro (destino)</Label>
          <AccountSelect
            accounts={savingsAccounts.filter((a) => a.id !== fromId)}
            value={toId}
            onChange={(v) => setValue("to_account_id", v)}
            error={errors.to_account_id?.message}
            placeholder="¿A dónde va el ahorro?"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Textarea rows={2} placeholder="Ej. Fondo de emergencia..." {...register("notes")} />
        </div>
        <SubmitButton isSubmitting={isSubmitting} />
      </div>
    </form>
  );
}

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
      {isSubmitting ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Guardando...
        </span>
      ) : (
        "Guardar movimiento"
      )}
    </Button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AddPage() {
  const router = useRouter();
  const [movementType, setMovementType] = useState<MovementType>("expense");
  const [success, setSuccess] = useState<{ emoji: string; label: string; amount: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [expenseCats, setExpenseCats] = useState<CategoryRow[]>([]);
  const [incomeCats, setIncomeCats] = useState<CategoryRow[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardWithLiability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCardSheet, setShowAddCardSheet] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);

  const newCardForm = useForm<z.infer<typeof newCardSchema>>({
    resolver: zodResolver(newCardSchema),
    defaultValues: {
      name: "",
      institution_name: "",
      card_network: undefined,
      last_four_digits: "",
      credit_limit: "",
      current_balance: "0",
      statement_closing_day: "",
      payment_due_day: "",
      minimum_payment: "",
    },
  });

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      getAccounts(),
      getCategories("expense"),
      getCategories("income"),
      getLiabilities(),
      getCreditCards(),
    ])
      .then(([accs, exp, inc, liabs, cards]) => {
        setAccounts(accs);
        setExpenseCats(exp);
        setIncomeCats(inc);
        setLiabilities(liabs);
        setCreditCards(cards);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSuccess = (emoji: string, label: string, amount: string) => {
    setSubmitError(null);
    setSuccess({ emoji, label, amount });
  };

  const handleError = (e: unknown) => {
    setSubmitError(e instanceof Error ? e.message : "Ocurrió un error al guardar");
  };

  const reloadCreditCards = async () => {
    const cards = await getCreditCards();
    setCreditCards(cards);
  };

  const handleSaveNewCard = async (data: z.infer<typeof newCardSchema>) => {
    setAddCardError(null);
    try {
      await insertCreditCard({
        name: data.name,
        institution_name: data.institution_name || undefined,
        card_network: data.card_network || undefined,
        last_four_digits: data.last_four_digits || undefined,
        credit_limit: data.credit_limit ? Number(data.credit_limit) : undefined,
        current_balance: Number(data.current_balance),
        statement_closing_day: data.statement_closing_day ? Number(data.statement_closing_day) : undefined,
        payment_due_day: data.payment_due_day ? Number(data.payment_due_day) : undefined,
        minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : undefined,
      });
      await reloadCreditCards();
      setShowAddCardSheet(false);
      newCardForm.reset();
    } catch (e) {
      setAddCardError(e instanceof Error ? e.message : "Error al guardar la tarjeta");
    }
  };

  const sharedProps: SharedProps = {
    accounts,
    categories: { expense: expenseCats, income: incomeCats },
    liabilities,
    creditCards,
    today,
    onSuccess: handleSuccess,
    onAddCard: () => setShowAddCardSheet(true),
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-stone-50">
        <div className="animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="size-10 text-emerald-500" />
          </div>
          <div className="text-4xl mb-3">{success.emoji}</div>
          <h2 className="text-2xl font-bold text-zinc-800 mb-2">¡Guardado!</h2>
          <p className="text-zinc-500 mb-8">
            {success.label} de <strong>S/ {success.amount}</strong> registrado exitosamente.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <Button className="w-full" onClick={() => setSuccess(null)}>
              Agregar otro
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
              Ir al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && accounts.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-stone-50">
        <div className="text-4xl mb-4">🏦</div>
        <h2 className="text-xl font-bold text-zinc-800 mb-2">Primero crea una cuenta</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Necesitas al menos una cuenta para registrar movimientos.
        </p>
        <Link href="/accounts">
          <Button>Ir a Cuentas</Button>
        </Link>
      </div>
    );
  }

  const currentMeta = MOVEMENT_TYPES.find((m) => m.id === movementType)!;

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold text-zinc-800">Agregar movimiento</h1>
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 transition-colors"
        >
          <X className="size-5 text-zinc-500" />
        </Link>
      </div>

      {/* Movement type selector */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-2 gap-2">
          {MOVEMENT_TYPES.map((mt) => (
            <button
              key={mt.id}
              type="button"
              onClick={() => {
                setMovementType(mt.id);
                setSubmitError(null);
              }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all duration-150",
                movementType === mt.id
                  ? "border-violet-500 bg-violet-50"
                  : "border-zinc-100 bg-white hover:border-zinc-200"
              )}
            >
              <span className="text-2xl">{mt.emoji}</span>
              <div>
                <p className={cn("text-sm font-semibold", movementType === mt.id ? "text-violet-700" : "text-zinc-700")}>
                  {mt.label}
                </p>
                <p className="text-xs text-zinc-400">{mt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="mx-5 mb-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
          {submitError}
        </div>
      )}

      {/* Form area — remount on type change via key prop */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div key={movementType}>
          {movementType === "income" && <IncomeForm {...sharedProps} />}
          {movementType === "expense" && <ExpenseForm {...sharedProps} />}
          {movementType === "transfer" && <TransferForm {...sharedProps} />}
          {movementType === "debt_payment" && <DebtPaymentForm {...sharedProps} />}
          {movementType === "credit_card_purchase" && <CreditCardForm {...sharedProps} />}
          {movementType === "balance_adjustment" && <AdjustmentForm {...sharedProps} />}
          {movementType === "savings_allocation" && <SavingsForm {...sharedProps} />}
        </div>
      )}

      {/* Mini sheet: add new credit card */}
      <Sheet open={showAddCardSheet} onOpenChange={(open) => { setShowAddCardSheet(open); if (!open) { newCardForm.reset(); setAddCardError(null); } }}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Nueva tarjeta de crédito</SheetTitle>
          </SheetHeader>
          <form onSubmit={newCardForm.handleSubmit(handleSaveNewCard)} className="space-y-4 pb-6">
            {addCardError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                {addCardError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nombre de la tarjeta *</Label>
              <Input placeholder="Ej. Visa BCP" {...newCardForm.register("name")} />
              <FieldError msg={newCardForm.formState.errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>Banco / Institución</Label>
              <Input placeholder="Ej. BCP, Interbank..." {...newCardForm.register("institution_name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Red de la tarjeta</Label>
              <Select
                defaultValue={undefined}
                onValueChange={(v) => newCardForm.setValue("card_network", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin especificar" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_NETWORKS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Últimos 4 dígitos</Label>
                <Input placeholder="1234" maxLength={4} {...newCardForm.register("last_four_digits")} />
              </div>
              <div className="space-y-1.5">
                <Label>Deuda actual *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input className="pl-8" type="number" step="0.01" min="0" placeholder="0.00" {...newCardForm.register("current_balance")} />
                </div>
                <FieldError msg={newCardForm.formState.errors.current_balance?.message} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Límite de crédito</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                <Input className="pl-8" type="number" step="0.01" min="0" placeholder="0.00" {...newCardForm.register("credit_limit")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Día cierre</Label>
                <Input type="number" min="1" max="31" placeholder="Ej. 15" {...newCardForm.register("statement_closing_day")} />
              </div>
              <div className="space-y-1.5">
                <Label>Día vencimiento</Label>
                <Input type="number" min="1" max="31" placeholder="Ej. 5" {...newCardForm.register("payment_due_day")} />
              </div>
            </div>
            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setShowAddCardSheet(false); newCardForm.reset(); setAddCardError(null); }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={newCardForm.formState.isSubmitting}>
                {newCardForm.formState.isSubmitting ? "Guardando..." : "Guardar tarjeta"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
