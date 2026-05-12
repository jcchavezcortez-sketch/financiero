"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import AccountCard from "@/components/shared/AccountCard";
import { mockAccounts } from "@/lib/mock-data";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

const addAccountSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  type: z.string().min(1, "Selecciona un tipo"),
  balance: z.string().refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 0,
    "Ingresa un saldo válido"
  ),
});

type AddAccountForm = z.infer<typeof addAccountSchema>;

export default function AccountsPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AddAccountForm>({
    resolver: zodResolver(addAccountSchema),
  });

  const totalBalance = mockAccounts.reduce((s, a) => s + a.balance, 0);

  const onSubmit = async (_data: AddAccountForm) => {
    await new Promise((r) => setTimeout(r, 500));
    setSubmitted(true);
    setTimeout(() => {
      setShowAdd(false);
      setSubmitted(false);
      reset();
    }, 1500);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-800">Mis cuentas</h1>
        <Button
          size="sm"
          onClick={() => setShowAdd(true)}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>

      {/* Total Balance */}
      <div className="px-5 mb-6">
        <div className="gradient-purple rounded-3xl p-5 text-white">
          <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-1">
            Total disponible
          </p>
          <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
          <p className="text-violet-300 text-sm mt-1">
            {mockAccounts.length} cuentas activas
          </p>
        </div>
      </div>

      {/* Account Cards */}
      <div className="px-5 space-y-3 mb-6">
        {mockAccounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>

      {/* Add Account Sheet */}
      <Sheet open={showAdd} onOpenChange={setShowAdd}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle>Agregar cuenta</SheetTitle>
          </SheetHeader>

          {submitted ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Cuenta agregada!</p>
              <p className="text-sm text-zinc-500 mt-1">
                Tu nueva cuenta ya está disponible
              </p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <Label>Nombre de la cuenta</Label>
                <Input
                  placeholder="Ej. BCP Ahorros, Efectivo, Yape..."
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-rose-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de cuenta</Label>
                <Select onValueChange={(v) => setValue("type", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-xs text-rose-500">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Saldo actual</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                    S/
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-10"
                    {...register("balance")}
                  />
                </div>
                {errors.balance && (
                  <p className="text-xs text-rose-500">{errors.balance.message}</p>
                )}
              </div>
            </div>
          )}

          {!submitted && (
            <SheetFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Agregar cuenta"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
