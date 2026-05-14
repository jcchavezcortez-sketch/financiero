"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  getAvailableLiquidity,
  getProtectedSavings,
  getTotalLiabilities,
  getNetWorth,
} from "@/lib/finance";

const TOTAL_STEPS = 5;

const s1Schema = z.object({ name: z.string().min(2, "Mínimo 2 caracteres").max(30) });
const s2Schema = z.object({
  currency: z.string(),
  liquid: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Monto inválido"),
});
const s3Schema = z.object({
  protected: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido"),
  cardDebt: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido"),
  personDebt: z.string().refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= 0), "Monto inválido"),
});
const s4Schema = z.object({ savingsGoal: z.string().optional() });
const s5Schema = z.object({ payday: z.string().optional() });

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [fd, setFd] = useState({
    name: "",
    currency: "PEN",
    liquid: "0",
    protected: "",
    cardDebt: "",
    personDebt: "",
    savingsGoal: "",
    payday: "",
  });

  const f1 = useForm<z.infer<typeof s1Schema>>({ resolver: zodResolver(s1Schema) });
  const f2 = useForm<z.infer<typeof s2Schema>>({ resolver: zodResolver(s2Schema), defaultValues: { currency: "PEN", liquid: "" } });
  const f3 = useForm<z.infer<typeof s3Schema>>({ resolver: zodResolver(s3Schema), defaultValues: { protected: "", cardDebt: "", personDebt: "" } });
  const f4 = useForm<z.infer<typeof s4Schema>>({ resolver: zodResolver(s4Schema) });
  const f5 = useForm<z.infer<typeof s5Schema>>({ resolver: zodResolver(s5Schema) });

  const pct = (step / TOTAL_STEPS) * 100;

  const go1 = f1.handleSubmit((d) => { setFd((p) => ({ ...p, name: d.name })); setStep(2); });
  const go2 = f2.handleSubmit((d) => { setFd((p) => ({ ...p, currency: d.currency, liquid: d.liquid })); setStep(3); });
  const go3 = f3.handleSubmit((d) => { setFd((p) => ({ ...p, protected: d.protected, cardDebt: d.cardDebt, personDebt: d.personDebt })); setStep(4); });
  const go4 = f4.handleSubmit((d) => { setFd((p) => ({ ...p, savingsGoal: d.savingsGoal ?? "" })); setStep(5); });

  const go5 = f5.handleSubmit(async (d) => {
    setSaving(true);
    const data = { ...fd, payday: d.payday ?? "" };
    try {
      await upsertProfile({ name: data.name, currency: data.currency, payday: data.payday ? Number(data.payday) : null });
      await upsertUserSettings({ savings_goal: data.savingsGoal ? Number(data.savingsGoal) : null });
      await seedDefaultCategories();

      const liquidAmt = Number(data.liquid) || 0;
      const protectedAmt = Number(data.protected) || 0;
      const cardDebtAmt = Number(data.cardDebt) || 0;
      const personDebtAmt = Number(data.personDebt) || 0;

      if (liquidAmt > 0) {
        await insertAccount({
          name: "Dinero disponible",
          account_type: "debit",
          balance: liquidAmt,
          currency: data.currency,
          icon: "💵",
          color: "#10B981",
          include_in_available_balance: true,
          include_in_net_worth: true,
        });
      }

      if (protectedAmt > 0) {
        await insertAccount({
          name: "Ahorros protegidos",
          account_type: "protected_savings",
          balance: protectedAmt,
          currency: data.currency,
          icon: "🔒",
          color: "#7C3AED",
          include_in_available_balance: false,
          include_in_net_worth: true,
        });
      }

      if (cardDebtAmt > 0) {
        await insertLiability({
          liability_type: "credit_card",
          name: "Deuda tarjeta de crédito",
          current_balance: cardDebtAmt,
        });
      }

      if (personDebtAmt > 0) {
        await insertLiability({
          liability_type: "personal_debt",
          name: "Deuda a persona",
          current_balance: personDebtAmt,
        });
      }

      // Snapshot inicial
      const netWorth = liquidAmt + protectedAmt - cardDebtAmt - personDebtAmt;
      await insertFinancialSnapshot({
        liquid_available_amount: liquidAmt,
        protected_savings_amount: protectedAmt,
        total_liabilities_amount: cardDebtAmt + personDebtAmt,
        net_worth_amount: netWorth,
        notes: "Foto financiera inicial del onboarding",
      });
    } catch {
      // Supabase not configured — skip silently
    }
    router.push("/dashboard");
    router.refresh();
  });

  const liquidVal = Number(fd.liquid) || 0;
  const protectedVal = Number(fd.protected) || 0;
  const cardVal = Number(fd.cardDebt) || 0;
  const personVal = Number(fd.personDebt) || 0;
  const previewNetWorth = liquidVal + protectedVal - cardVal - personVal;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-stone-50 flex flex-col p-6">
      <div className="w-full max-w-sm mx-auto mt-6 mb-10">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-zinc-400">Paso {step} de {TOTAL_STEPS}</span>
          <span className="text-xs font-medium text-violet-600">{Math.round(pct)}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto">

        {/* Paso 1: Nombre */}
        {step === 1 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-2xl font-bold text-zinc-800">¡Hola! ¿Cómo te llamas?</h2>
              <p className="text-zinc-500 mt-2 text-sm">Personalizaremos la app para ti</p>
            </div>
            <div className="space-y-2">
              <Label>Tu nombre</Label>
              <Input placeholder="Ej. Juani, María, Lucía..." autoFocus {...f1.register("name")} />
              {f1.formState.errors.name && <p className="text-xs text-rose-500">{f1.formState.errors.name.message}</p>}
            </div>
            <Button className="w-full" size="lg" onClick={go1}>Continuar →</Button>
          </div>
        )}

        {/* Paso 2: Liquidez */}
        {step === 2 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">💵</div>
              <h2 className="text-2xl font-bold text-zinc-800">¿Cuánto tienes disponible?</h2>
              <p className="text-zinc-500 mt-2 text-sm">El dinero que puedes usar ahora mismo</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select defaultValue="PEN" onValueChange={(v) => f2.setValue("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dinero disponible para usar</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-10" {...f2.register("liquid")} />
                </div>
                {f2.formState.errors.liquid && <p className="text-xs text-rose-500">{f2.formState.errors.liquid.message}</p>}
                <p className="text-xs text-zinc-400">Incluye cuentas de débito, Yape, Plin, efectivo</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Atrás</Button>
              <Button className="flex-1" size="lg" onClick={go2}>Continuar →</Button>
            </div>
          </div>
        )}

        {/* Paso 3: Ahorros + deudas */}
        {step === 3 && (
          <div className="w-full space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-zinc-800">Foto financiera</h2>
              <p className="text-zinc-500 mt-2 text-sm">Todo es opcional — puedes completarlo después</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>🔒 Ahorros que no quieres tocar</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-10" {...f3.register("protected")} />
                </div>
                {f3.formState.errors.protected && <p className="text-xs text-rose-500">{f3.formState.errors.protected.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>💳 Deuda de tarjeta de crédito</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-10" {...f3.register("cardDebt")} />
                </div>
                {f3.formState.errors.cardDebt && <p className="text-xs text-rose-500">{f3.formState.errors.cardDebt.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>🤝 Le debo a alguien</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-10" {...f3.register("personDebt")} />
                </div>
                {f3.formState.errors.personDebt && <p className="text-xs text-rose-500">{f3.formState.errors.personDebt.message}</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Atrás</Button>
              <Button className="flex-1" size="lg" onClick={go3}>Continuar →</Button>
            </div>
          </div>
        )}

        {/* Paso 4: Meta de ahorro */}
        {step === 4 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">🐷</div>
              <h2 className="text-2xl font-bold text-zinc-800">¿Meta de ahorro mensual?</h2>
              <p className="text-zinc-500 mt-2 text-sm">Opcional — puedes cambiarlo después</p>
            </div>
            <div className="space-y-2">
              <Label>Meta mensual</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                <Input type="number" placeholder="Ej. 500" className="pl-10" {...f4.register("savingsGoal")} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>← Atrás</Button>
              <Button className="flex-1" size="lg" onClick={go4}>Continuar →</Button>
            </div>
          </div>
        )}

        {/* Paso 5: Payday + resumen */}
        {step === 5 && (
          <div className="w-full space-y-6 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">📅</div>
              <h2 className="text-2xl font-bold text-zinc-800">¿Qué día recibes tu sueldo?</h2>
              <p className="text-zinc-500 mt-2 text-sm">Opcional — para ayudarte a organizarte</p>
            </div>
            <div className="space-y-2">
              <Label>Día del mes (1-31)</Label>
              <Input type="number" placeholder="Ej. 15 o 30" min={1} max={31} {...f5.register("payday")} />
            </div>

            {/* Preview foto financiera */}
            <div className="bg-violet-50 rounded-2xl p-4 space-y-2 border border-violet-100">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-3">Tu foto financiera</p>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">💵 Disponible para usar</span>
                <span className="font-semibold text-emerald-700">S/ {liquidVal.toFixed(2)}</span>
              </div>
              {protectedVal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">🔒 Ahorros protegidos</span>
                  <span className="font-semibold text-violet-700">S/ {protectedVal.toFixed(2)}</span>
                </div>
              )}
              {(cardVal > 0 || personVal > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">💳 Deudas</span>
                  <span className="font-semibold text-rose-600">- S/ {(cardVal + personVal).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-violet-200 pt-2 flex justify-between text-sm font-bold">
                <span className="text-zinc-700">Balance real</span>
                <span className={previewNetWorth >= 0 ? "text-emerald-700" : "text-rose-600"}>
                  S/ {previewNetWorth.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(4)}>← Atrás</Button>
              <Button className="flex-1" size="lg" onClick={go5} disabled={saving}>
                {saving ? "Guardando..." : "¡Listo! 🚀"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
