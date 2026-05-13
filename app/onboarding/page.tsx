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

const TOTAL_STEPS = 4;

const step1Schema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(30),
});

const step2Schema = z.object({
  balance: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Ingresa un monto válido",
  }),
  currency: z.string().min(1),
});

const step3Schema = z.object({
  savingsGoal: z.string().optional(),
});

const step4Schema = z.object({
  payday: z.string().refine((val) => {
    const n = Number(val);
    return !isNaN(n) && n >= 1 && n <= 31;
  }, "Ingresa un día válido (1-31)"),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;
type Step4 = z.infer<typeof step4Schema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    balance: "",
    currency: "PEN",
    savingsGoal: "",
    payday: "",
  });

  const step1Form = useForm<Step1>({ resolver: zodResolver(step1Schema) });
  const step2Form = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { currency: "PEN" },
  });
  const step3Form = useForm<Step3>({ resolver: zodResolver(step3Schema) });
  const step4Form = useForm<Step4>({ resolver: zodResolver(step4Schema) });

  const progressValue = (step / TOTAL_STEPS) * 100;

  const handleStep1 = step1Form.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, name: data.name }));
    setStep(2);
  });

  const handleStep2 = step2Form.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, balance: data.balance, currency: data.currency }));
    setStep(3);
  });

  const handleStep3 = step3Form.handleSubmit((data) => {
    setFormData((prev) => ({ ...prev, savingsGoal: data.savingsGoal ?? "" }));
    setStep(4);
  });

  const handleStep4 = step4Form.handleSubmit(async (data) => {
    setFormData((prev) => ({ ...prev, payday: data.payday }));
    await new Promise((r) => setTimeout(r, 600));
    router.push("/dashboard");
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-stone-50 flex flex-col p-6">
      {/* Progress */}
      <div className="w-full max-w-sm mx-auto mt-6 mb-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400">
            Paso {step} de {TOTAL_STEPS}
          </span>
          <span className="text-xs font-medium text-violet-600">
            {Math.round(progressValue)}% completado
          </span>
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto">
        {/* Step 1: Name */}
        {step === 1 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">👋</div>
              <h2 className="text-2xl font-bold text-zinc-800">
                ¡Hola! ¿Cómo te llamas?
              </h2>
              <p className="text-zinc-500 mt-2 text-sm">
                Personalizaremos la app para ti
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre</Label>
              <Input
                id="name"
                placeholder="Ej. Juani, María, Lucía..."
                autoFocus
                {...step1Form.register("name")}
              />
              {step1Form.formState.errors.name && (
                <p className="text-xs text-rose-500">
                  {step1Form.formState.errors.name.message}
                </p>
              )}
            </div>
            <Button className="w-full" size="lg" onClick={handleStep1}>
              Continuar →
            </Button>
          </div>
        )}

        {/* Step 2: Initial Balance */}
        {step === 2 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">💰</div>
              <h2 className="text-2xl font-bold text-zinc-800">
                ¿Cuál es tu saldo inicial?
              </h2>
              <p className="text-zinc-500 mt-2 text-sm">
                El total de dinero que tienes disponible ahora
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  defaultValue="PEN"
                  onValueChange={(val) => step2Form.setValue("currency", val)}
                >
                  <SelectTrigger id="currency">
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
              <div className="space-y-2">
                <Label htmlFor="balance">Saldo inicial</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                    S/
                  </span>
                  <Input
                    id="balance"
                    type="number"
                    placeholder="0.00"
                    className="pl-10"
                    {...step2Form.register("balance")}
                  />
                </div>
                {step2Form.formState.errors.balance && (
                  <p className="text-xs text-rose-500">
                    {step2Form.formState.errors.balance.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                ← Atrás
              </Button>
              <Button className="flex-1" size="lg" onClick={handleStep2}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Savings Goal */}
        {step === 3 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">🐷</div>
              <h2 className="text-2xl font-bold text-zinc-800">
                ¿Tienes una meta de ahorro?
              </h2>
              <p className="text-zinc-500 mt-2 text-sm">
                ¿Cuánto quieres ahorrar cada mes? (opcional)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="savingsGoal">Meta mensual de ahorro</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                  S/
                </span>
                <Input
                  id="savingsGoal"
                  type="number"
                  placeholder="Ej. 500"
                  className="pl-10"
                  {...step3Form.register("savingsGoal")}
                />
              </div>
              <p className="text-xs text-zinc-400">
                Puedes cambiar esto más adelante en Configuración
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                ← Atrás
              </Button>
              <Button className="flex-1" size="lg" onClick={handleStep3}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Payday */}
        {step === 4 && (
          <div className="w-full space-y-8 animate-slide-up">
            <div className="text-center">
              <div className="text-5xl mb-4">📅</div>
              <h2 className="text-2xl font-bold text-zinc-800">
                ¿Qué día recibes tu sueldo?
              </h2>
              <p className="text-zinc-500 mt-2 text-sm">
                Te ayudaremos a organizarte mejor alrededor de ese día
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payday">Día del mes</Label>
              <Input
                id="payday"
                type="number"
                placeholder="Ej. 15 o 30"
                min={1}
                max={31}
                {...step4Form.register("payday")}
              />
              {step4Form.formState.errors.payday && (
                <p className="text-xs text-rose-500">
                  {step4Form.formState.errors.payday.message}
                </p>
              )}
            </div>
            <div className="bg-violet-50 rounded-2xl p-4">
              <p className="text-sm text-violet-700 text-center font-medium">
                🎉 ¡Ya casi listo! Tu app está configurada.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                ← Atrás
              </Button>
              <Button
                className="flex-1"
                size="lg"
                onClick={handleStep4}
                disabled={step4Form.formState.isSubmitting}
              >
                {step4Form.formState.isSubmitting ? "Guardando..." : "¡Listo! 🚀"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
