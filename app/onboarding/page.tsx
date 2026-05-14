"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import { CURRENCIES } from "@/lib/constants";
import {
  upsertProfile,
  upsertUserSettings,
  seedDefaultCategories,
  insertAccount,
  insertLiability,
  insertFinancialSnapshot,
} from "@/lib/supabase/queries";
import { getFinancialOverview } from "@/lib/finance";
import type { Account, Liability } from "@/types";

const TOTAL_STEPS = 5;

const s1Schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(30),
  currency: z.string().min(1),
});
const s2Schema = z.object({
  availableBalance: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Monto inválido"),
});
const s3Schema = z.object({
  protectedSavings: z
    .string()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido")
    .optional(),
});
const s4Schema = z.object({
  cardDebt: z
    .string()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido")
    .optional(),
  cardName: z.string().optional(),
  personalDebt: z
    .string()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido")
    .optional(),
  personName: z.string().optional(),
});
const s5Schema = z.object({
  savingsGoal: z.string().optional(),
  payday: z.string().optional(),
});

type S1 = z.infer<typeof s1Schema>;
type S2 = z.infer<typeof s2Schema>;
type S3 = z.infer<typeof s3Schema>;
type S4 = z.infer<typeof s4Schema>;
type S5 = z.infer<typeof s5Schema>;

interface FormData {
  name: string;
  currency: string;
  availableBalance: string;
  protectedSavings: string;
  cardDebt: string;
  cardName: string;
  personalDebt: string;
  personName: string;
  savingsGoal: string;
  payday: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [fd, setFd] = useState<FormData>({
    name: "",
    currency: "PEN",
    availableBalance: "0",
    protectedSavings: "",
    cardDebt: "",
    cardName: "",
    personalDebt: "",
    personName: "",
    savingsGoal: "",
    payday: "",
  });

  const f1 = useForm<S1>({ resolver: zodResolver(s1Schema), defaultValues: { currency: "PEN" } });
  const f2 = useForm<S2>({ resolver: zodResolver(s2Schema) });
  const f3 = useForm<S3>({ resolver: zodResolver(s3Schema) });
  const f4 = useForm<S4>({ resolver: zodResolver(s4Schema) });
  const f5 = useForm<S5>({ resolver: zodResolver(s5Schema) });

  const pct = (step / TOTAL_STEPS) * 100;

  const go1 = f1.handleSubmit((d) => {
    setFd((p) => ({ ...p, name: d.name, currency: d.currency }));
    setStep(2);
  });
  const go2 = f2.handleSubmit((d) => {
    setFd((p) => ({ ...p, availableBalance: d.availableBalance }));
    setStep(3);
  });
  const go3 = f3.handleSubmit((d) => {
    setFd((p) => ({ ...p, protectedSavings: d.protectedSavings ?? "" }));
    setStep(4);
  });
  const go4 = f4.handleSubmit((d) => {
    setFd((p) => ({
      ...p,
      cardDebt: d.cardDebt ?? "",
      cardName: d.cardName ?? "",
      personalDebt: d.personalDebt ?? "",
      personName: d.personName ?? "",
    }));
    setStep(5);
  });

  const go5 = f5.handleSubmit(async (d) => {
    setSaving(true);
    const data = { ...fd, savingsGoal: d.savingsGoal ?? "", payday: d.payday ?? "" };

    try {
      await upsertProfile({
        name: data.name,
        currency: data.currency,
        payday: data.payday ? Number(data.payday) : null,
      });
      await upsertUserSettings({
        savings_goal: data.savingsGoal ? Number(data.savingsGoal) : null,
      });
      await seedDefaultCategories();

      const createdAccounts: Account[] = [];
      const createdLiabilities: Liability[] = [];

      // Cuenta de liquidez disponible
      if (Number(data.availableBalance) > 0) {
        await insertAccount({
          name: "Dinero disponible",
          type: "debit",
          balance: Number(data.availableBalance),
          initial_balance: Number(data.availableBalance),
          currency: data.currency,
          icon: "🏦",
          color: "#7C3AED",
          include_in_available_balance: true,
          include_in_net_worth: true,
        });
        createdAccounts.push({
          id: "tmp",
          name: "Dinero disponible",
          type: "debit",
          balance: Number(data.availableBalance),
          initial_balance: Number(data.availableBalance),
          currency: data.currency,
          color: "#7C3AED",
          icon: "🏦",
          include_in_available_balance: true,
          include_in_net_worth: true,
        });
      }

      // Ahorro protegido
      if (Number(data.protectedSavings) > 0) {
        await insertAccount({
          name: "Ahorro protegido",
          type: "protected_savings",
          balance: Number(data.protectedSavings),
          initial_balance: Number(data.protectedSavings),
          currency: data.currency,
          icon: "🔒",
          color: "#10B981",
          include_in_available_balance: false,
          include_in_net_worth: true,
        });
        createdAccounts.push({
          id: "tmp2",
          name: "Ahorro protegido",
          type: "protected_savings",
          balance: Number(data.protectedSavings),
          initial_balance: Number(data.protectedSavings),
          currency: data.currency,
          color: "#10B981",
          icon: "🔒",
          include_in_available_balance: false,
          include_in_net_worth: true,
        });
      }

      // Deuda tarjeta de crédito
      if (Number(data.cardDebt) > 0) {
        await insertLiability({
          liability_type: "credit_card",
          name: data.cardName || "Tarjeta de crédito",
          current_balance: Number(data.cardDebt),
        });
        createdLiabilities.push({
          id: "tmp",
          liability_type: "credit_card",
          name: data.cardName || "Tarjeta de crédito",
          current_balance: Number(data.cardDebt),
          status: "active",
          created_at: new Date().toISOString(),
        });
      }

      // Deuda a persona
      if (Number(data.personalDebt) > 0) {
        await insertLiability({
          liability_type: "personal_debt",
          name: data.personName ? `Deuda con ${data.personName}` : "Deuda a persona",
          creditor_name: data.personName || null,
          current_balance: Number(data.personalDebt),
        });
        createdLiabilities.push({
          id: "tmp2",
          liability_type: "personal_debt",
          name: data.personName ? `Deuda con ${data.personName}` : "Deuda a persona",
          creditor_name: data.personName || null,
          current_balance: Number(data.personalDebt),
          status: "active",
          created_at: new Date().toISOString(),
        });
      }

      // Guardar snapshot inicial
      if (createdAccounts.length > 0 || createdLiabilities.length > 0) {
        const overview = getFinancialOverview(createdAccounts, createdLiabilities);
        await insertFinancialSnapshot({
          liquid_available_amount: overview.liquidAvailable,
          protected_savings_amount: overview.protectedSavings,
          total_liabilities_amount: overview.totalLiabilities,
          net_worth_amount: overview.netWorth,
          notes: "Foto financiera inicial",
        });
      }
    } catch {
      // Continue even if Supabase calls fail (env not configured)
    }

    router.push("/dashboard");
    router.refresh();
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-stone-50 flex flex-col p-6">
      <div className="w-full max-w-sm mx-auto mt-6 mb-10">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-zinc-400">
            Paso {step} de {TOTAL_STEPS}
          </span>
          <span className="text-xs font-medium text-violet-600">
            {Math.round(pct)}%
          </span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto">
        {/* Step 1: Nombre + moneda */}
        {step === 1 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-2xl font-bold text-zinc-800">¡Hola! ¿Cómo te llamas?</h2>
              <p className="text-zinc-500 mt-2 text-sm">Personalizaremos la app para ti</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tu nombre</Label>
                <Input
                  placeholder="Ej. Juani, María, Lucía..."
                  autoFocus
                  {...f1.register("name")}
                />
                {f1.formState.errors.name && (
                  <p className="text-xs text-rose-500">{f1.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select
                  defaultValue="PEN"
                  onValueChange={(v) => f1.setValue("currency", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={go1}>
              Continuar →
            </Button>
          </div>
        )}

        {/* Step 2: Dinero disponible */}
        {step === 2 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">💳</div>
              <h2 className="text-2xl font-bold text-zinc-800">
                ¿Cuánto tienes disponible?
              </h2>
              <p className="text-zinc-500 mt-2 text-sm">
                El dinero en tu cuenta, Yape, efectivo, etc.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Total disponible para usar</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                  S/
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-10"
                  autoFocus
                  {...f2.register("availableBalance")}
                />
              </div>
              {f2.formState.errors.availableBalance && (
                <p className="text-xs text-rose-500">
                  {f2.formState.errors.availableBalance.message}
                </p>
              )}
              <p className="text-xs text-zinc-400">
                Incluye todo lo que puedes gastar: cuenta bancaria, Yape, Plin, efectivo.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                ← Atrás
              </Button>
              <Button className="flex-1" size="lg" onClick={go2}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Ahorro protegido */}
        {step === 3 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-zinc-800">
                ¿Tienes ahorros que no quieres tocar?
              </h2>
              <p className="text-zinc-500 mt-2 text-sm">
                Opcional — no contarán como dinero disponible
              </p>
            </div>
            <div className="space-y-2">
              <Label>Ahorro protegido (opcional)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                  S/
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className="pl-10"
                  autoFocus
                  {...f3.register("protectedSavings")}
                />
              </div>
              {f3.formState.errors.protectedSavings && (
                <p className="text-xs text-rose-500">
                  {String(f3.formState.errors.protectedSavings.message)}
                </p>
              )}
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-700">
                  💡 Este monto cuenta para tu patrimonio neto pero{" "}
                  <strong>no</strong> aparece como dinero disponible para gastar.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                ← Atrás
              </Button>
              <Button className="flex-1" size="lg" onClick={go3}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Deudas */}
        {step === 4 && (
          <div className="w-full space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">💳</div>
              <h2 className="text-2xl font-bold text-zinc-800">¿Tienes deudas?</h2>
              <p className="text-zinc-500 mt-2 text-sm">
                Opcional — restan de tu balance real
              </p>
            </div>

            <div className="space-y-3 bg-white rounded-2xl p-4 border border-zinc-100">
              <p className="text-sm font-semibold text-zinc-700">Tarjeta de crédito</p>
              <div className="space-y-2">
                <Input
                  placeholder="Nombre de la tarjeta (ej. Visa BCP)"
                  {...f4.register("cardName")}
                />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                    S/
                  </span>
                  <Input
                    type="number"
                    placeholder="Deuda actual (0 si no tienes)"
                    className="pl-10"
                    {...f4.register("cardDebt")}
                  />
                </div>
                {f4.formState.errors.cardDebt && (
                  <p className="text-xs text-rose-500">
                    {String(f4.formState.errors.cardDebt.message)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 bg-white rounded-2xl p-4 border border-zinc-100">
              <p className="text-sm font-semibold text-zinc-700">Deuda a persona</p>
              <div className="space-y-2">
                <Input
                  placeholder="¿A quién le debes? (opcional)"
                  {...f4.register("personName")}
                />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                    S/
                  </span>
                  <Input
                    type="number"
                    placeholder="Monto (0 si no tienes)"
                    className="pl-10"
                    {...f4.register("personalDebt")}
                  />
                </div>
                {f4.formState.errors.personalDebt && (
                  <p className="text-xs text-rose-500">
                    {String(f4.formState.errors.personalDebt.message)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                ← Atrás
              </Button>
              <Button className="flex-1" size="lg" onClick={go4}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Meta + día de pago */}
        {step === 5 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-zinc-800">Casi listo</h2>
              <p className="text-zinc-500 mt-2 text-sm">Un par de datos más (opcionales)</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Meta de ahorro mensual (opcional)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                    S/
                  </span>
                  <Input
                    type="number"
                    placeholder="Ej. 500"
                    className="pl-10"
                    {...f5.register("savingsGoal")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Día que recibes tu sueldo (opcional)</Label>
                <Input
                  type="number"
                  placeholder="Ej. 15 o 30"
                  min={1}
                  max={31}
                  {...f5.register("payday")}
                />
              </div>
            </div>
            <div className="bg-violet-50 rounded-2xl p-4">
              <p className="text-sm text-violet-700 text-center font-medium">
                🎉 ¡Todo listo para empezar!
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(4)}>
                ← Atrás
              </Button>
              <Button
                className="flex-1"
                size="lg"
                onClick={go5}
                disabled={saving}
              >
                {saving ? "Guardando..." : "¡Empezar! 🚀"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
