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
import { upsertProfile, upsertUserSettings, seedDefaultCategories, insertAccount } from "@/lib/supabase/queries";

const TOTAL_STEPS = 4;
const s1Schema = z.object({ name: z.string().min(2, "Mínimo 2 caracteres").max(30) });
const s2Schema = z.object({ balance: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Monto inválido"), currency: z.string() });
const s3Schema = z.object({ savingsGoal: z.string().optional() });
const s4Schema = z.object({ payday: z.string().optional() });

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [fd, setFd] = useState({ name: "", balance: "0", currency: "PEN", savingsGoal: "", payday: "" });

  const f1 = useForm<z.infer<typeof s1Schema>>({ resolver: zodResolver(s1Schema) });
  const f2 = useForm<z.infer<typeof s2Schema>>({ resolver: zodResolver(s2Schema), defaultValues: { currency: "PEN" } });
  const f3 = useForm<z.infer<typeof s3Schema>>({ resolver: zodResolver(s3Schema) });
  const f4 = useForm<z.infer<typeof s4Schema>>({ resolver: zodResolver(s4Schema) });

  const pct = (step / TOTAL_STEPS) * 100;

  const go1 = f1.handleSubmit((d) => { setFd((p) => ({ ...p, name: d.name })); setStep(2); });
  const go2 = f2.handleSubmit((d) => { setFd((p) => ({ ...p, balance: d.balance, currency: d.currency })); setStep(3); });
  const go3 = f3.handleSubmit((d) => { setFd((p) => ({ ...p, savingsGoal: d.savingsGoal ?? "" })); setStep(4); });
  const go4 = f4.handleSubmit(async (d) => {
    setSaving(true);
    const data = { ...fd, payday: d.payday ?? "" };
    try {
      await upsertProfile({ name: data.name, currency: data.currency, payday: data.payday ? Number(data.payday) : null });
      await upsertUserSettings({ savings_goal: data.savingsGoal ? Number(data.savingsGoal) : null });
      await seedDefaultCategories();
      if (Number(data.balance) > 0) {
        await insertAccount({ name: "Mi cuenta principal", type: "checking", balance: Number(data.balance), currency: data.currency, icon: "🏦", color: "#7C3AED" });
      }
    } catch { /* Supabase not configured yet — skip */ }
    router.push("/dashboard");
    router.refresh();
  });

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
        {step === 1 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center"><div className="text-5xl mb-4">👋</div>
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
        {step === 2 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center"><div className="text-5xl mb-4">💰</div>
              <h2 className="text-2xl font-bold text-zinc-800">¿Cuál es tu saldo inicial?</h2>
              <p className="text-zinc-500 mt-2 text-sm">El total que tienes disponible ahora</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select defaultValue="PEN" onValueChange={(v) => f2.setValue("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saldo inicial</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-10" {...f2.register("balance")} />
                </div>
                {f2.formState.errors.balance && <p className="text-xs text-rose-500">{f2.formState.errors.balance.message}</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Atrás</Button>
              <Button className="flex-1" size="lg" onClick={go2}>Continuar →</Button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center"><div className="text-5xl mb-4">🐷</div>
              <h2 className="text-2xl font-bold text-zinc-800">¿Meta de ahorro mensual?</h2>
              <p className="text-zinc-500 mt-2 text-sm">Opcional — puedes cambiarlo después</p>
            </div>
            <div className="space-y-2">
              <Label>Meta mensual</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                <Input type="number" placeholder="Ej. 500" className="pl-10" {...f3.register("savingsGoal")} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Atrás</Button>
              <Button className="flex-1" size="lg" onClick={go3}>Continuar →</Button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center"><div className="text-5xl mb-4">📅</div>
              <h2 className="text-2xl font-bold text-zinc-800">¿Qué día recibes tu sueldo?</h2>
              <p className="text-zinc-500 mt-2 text-sm">Opcional — te ayudamos a organizarte</p>
            </div>
            <div className="space-y-2">
              <Label>Día del mes (1-31)</Label>
              <Input type="number" placeholder="Ej. 15 o 30" min={1} max={31} {...f4.register("payday")} />
            </div>
            <div className="bg-violet-50 rounded-2xl p-4"><p className="text-sm text-violet-700 text-center font-medium">🎉 ¡Ya casi listo!</p></div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>← Atrás</Button>
              <Button className="flex-1" size="lg" onClick={go4} disabled={saving}>{saving ? "Guardando..." : "¡Listo! 🚀"}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
