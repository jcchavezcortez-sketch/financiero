"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, CheckCircle, Mic } from "lucide-react";
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
import { mockAccounts } from "@/lib/mock-data";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  getAccounts,
  getCategories,
  insertTransaction,
} from "@/lib/supabase/queries";
import type { Database } from "@/types/database";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const addSchema = z.object({
  amount: z
    .string()
    .min(1, "Ingresa un monto")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "El monto debe ser mayor a 0"),
  description: z.string().min(1, "Describe el movimiento"),
  date: z.string().min(1, "Selecciona una fecha"),
  accountId: z.string().min(1, "Selecciona una cuenta"),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  merchant: z.string().optional(),
  notes: z.string().optional(),
});

type AddForm = z.infer<typeof addSchema>;

export default function AddPage() {
  const router = useRouter();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [success, setSuccess] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; icon: string }>>([]);
  const [expenseCats, setExpenseCats] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);
  const [incomeCats, setIncomeCats] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      date: today,
      amount: "",
      description: "",
      accountId: "",
      categoryId: "",
    },
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAccounts(mockAccounts.map((a) => ({ id: a.id, name: a.name, icon: a.icon })));
      setExpenseCats(EXPENSE_CATEGORIES);
      setIncomeCats(INCOME_CATEGORIES);
      return;
    }
    Promise.all([
      getAccounts(),
      getCategories("expense"),
      getCategories("income"),
    ]).then(([accs, exp, inc]) => {
      setAccounts(accs.map((a) => ({ id: a.id, name: a.name, icon: a.icon })));
      setExpenseCats(exp.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })));
      setIncomeCats(inc.map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })));
    });
  }, []);

  const categories = type === "expense" ? expenseCats : incomeCats;
  const selectedCategory = watch("categoryId");
  const amountValue = watch("amount");

  const onSubmit = async (data: AddForm) => {
    if (!isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 600));
      setSuccess(true);
      return;
    }
    try {
      await insertTransaction({
        type,
        amount: Number(data.amount),
        description: data.description,
        merchant: data.merchant || undefined,
        category_id: data.categoryId,
        account_id: data.accountId,
        date: data.date,
        notes: data.notes || undefined,
        source: "manual",
      });
      setSuccess(true);
    } catch {
      // silently handle
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-stone-50">
        <div className="animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="size-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-800 mb-2">
            ¡Movimiento guardado!
          </h2>
          <p className="text-zinc-500 mb-8">
            Tu {type === "expense" ? "gasto" : "ingreso"} de{" "}
            <strong>S/ {amountValue}</strong> fue registrado exitosamente.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <Button
              className="w-full"
              onClick={() => {
                setSuccess(false);
                reset({ date: today, amount: "", description: "", accountId: "", categoryId: "" });
              }}
            >
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

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold text-zinc-800">Agregar movimiento</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/voice"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold hover:bg-violet-200 transition-colors"
          >
            <Mic className="size-3.5" />
            Por voz
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 transition-colors"
          >
            <X className="size-5 text-zinc-500" />
          </Link>
        </div>
      </div>

      {/* Type Toggle */}
      <div className="px-5 mb-5">
        <div className="flex bg-zinc-100 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => { setType("expense"); setValue("categoryId", ""); }}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              type === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-zinc-500"
            )}
          >
            💸 Gasto
          </button>
          <button
            type="button"
            onClick={() => { setType("income"); setValue("categoryId", ""); }}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              type === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500"
            )}
          >
            💰 Ingreso
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="px-5 mb-6">
        <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-zinc-100">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Monto</p>
          <div className="flex items-center justify-center gap-2">
            <span className={cn("text-3xl font-bold", type === "expense" ? "text-rose-500" : "text-emerald-500")}>
              S/
            </span>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              className={cn(
                "text-4xl font-bold bg-transparent border-none outline-none text-center w-40 placeholder:text-zinc-200",
                type === "expense" ? "text-rose-600" : "text-emerald-600"
              )}
              {...register("amount")}
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-rose-500 mt-2">{errors.amount.message}</p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="px-5 space-y-4 pb-8">
        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" max={today} {...register("date")} />
          {errors.date && <p className="text-xs text-rose-500">{errors.date.message}</p>}
        </div>

        {/* Account */}
        <div className="space-y-1.5">
          <Label>Cuenta</Label>
          <Select onValueChange={(v) => setValue("accountId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una cuenta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.accountId && <p className="text-xs text-rose-500">{errors.accountId.message}</p>}
        </div>

        {/* Category Grid */}
        <div className="space-y-2">
          <Label>Categoría</Label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setValue("categoryId", cat.id)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-150 text-center",
                  selectedCategory === cat.id
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
          {errors.categoryId && <p className="text-xs text-rose-500">{errors.categoryId.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            placeholder="Ej. Almuerzo en Wong, taxi a casa..."
            {...register("description")}
          />
          {errors.description && <p className="text-xs text-rose-500">{errors.description.message}</p>}
        </div>

        {/* Merchant */}
        <div className="space-y-1.5">
          <Label htmlFor="merchant">Comercio / Lugar (opcional)</Label>
          <Input
            id="merchant"
            placeholder="Ej. Plaza Vea, InDriver..."
            {...register("merchant")}
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            placeholder="Cualquier detalle adicional..."
            rows={2}
            {...register("notes")}
          />
        </div>

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
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
      </div>
    </div>
  );
}
