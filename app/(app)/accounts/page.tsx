"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountCard from "@/components/shared/AccountCard";
import { ACCOUNT_TYPES, LIABILITY_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  getAccounts, insertAccount,
  getLiabilities, insertLiability, updateLiability, deleteLiability,
} from "@/lib/supabase/queries";
import { getAvailableLiquidity, getProtectedSavings, getTotalLiabilities, getNetWorth } from "@/lib/finance";
import type { Database } from "@/types/database";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];

const addAccountSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  account_type: z.string().min(1, "Selecciona un tipo"),
  balance: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Monto inválido"),
  institution_name: z.string().optional(),
});

const addLiabilitySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  liability_type: z.string().min(1, "Selecciona un tipo"),
  creditor_name: z.string().optional(),
  current_balance: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Monto inválido"),
  due_date: z.string().optional(),
  minimum_payment: z.string().optional(),
  notes: z.string().optional(),
});

type AddAccountForm = z.infer<typeof addAccountSchema>;
type AddLiabilityForm = z.infer<typeof addLiabilitySchema>;

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);
  const [editingLiability, setEditingLiability] = useState<LiabilityRow | null>(null);
  const [accountSubmitted, setAccountSubmitted] = useState(false);
  const [liabilitySubmitted, setLiabilitySubmitted] = useState(false);

  const accForm = useForm<AddAccountForm>({ resolver: zodResolver(addAccountSchema) });
  const liabForm = useForm<AddLiabilityForm>({ resolver: zodResolver(addLiabilitySchema) });
  const editForm = useForm<AddLiabilityForm>({ resolver: zodResolver(addLiabilitySchema) });

  const loadData = async () => {
    const [accs, liabs] = await Promise.all([getAccounts(), getLiabilities()]);
    setAccounts(accs);
    setLiabilities(liabs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const availableLiquidity = getAvailableLiquidity(accounts);
  const protectedSavings = getProtectedSavings(accounts);
  const totalLiabilities = getTotalLiabilities(liabilities);
  const netWorth = getNetWorth(accounts, liabilities);

  const onAddAccount = accForm.handleSubmit(async (data) => {
    const typeInfo = ACCOUNT_TYPES.find((t) => t.id === data.account_type);
    await insertAccount({
      name: data.name,
      account_type: data.account_type,
      balance: Number(data.balance),
      include_in_available_balance: typeInfo?.includeInAvailable ?? true,
      include_in_net_worth: typeInfo?.includeInNetWorth ?? true,
      institution_name: data.institution_name || undefined,
    });
    await loadData();
    setAccountSubmitted(true);
    setTimeout(() => { setShowAddAccount(false); setAccountSubmitted(false); accForm.reset(); }, 1500);
  });

  const onAddLiability = liabForm.handleSubmit(async (data) => {
    await insertLiability({
      liability_type: data.liability_type,
      name: data.name,
      creditor_name: data.creditor_name || undefined,
      current_balance: Number(data.current_balance),
      due_date: data.due_date || undefined,
      minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : undefined,
      notes: data.notes || undefined,
    });
    await loadData();
    setLiabilitySubmitted(true);
    setTimeout(() => { setShowAddLiability(false); setLiabilitySubmitted(false); liabForm.reset(); }, 1500);
  });

  const onEditLiability = editForm.handleSubmit(async (data) => {
    if (!editingLiability) return;
    await updateLiability(editingLiability.id, {
      name: data.name,
      liability_type: data.liability_type,
      creditor_name: data.creditor_name || null,
      current_balance: Number(data.current_balance),
      due_date: data.due_date || null,
      minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : null,
      notes: data.notes || null,
    });
    await loadData();
    setEditingLiability(null);
  });

  const handleMarkPaid = async (id: string) => {
    await updateLiability(id, { status: "paid" });
    await loadData();
  };

  const handleDeleteLiability = async (id: string) => {
    await deleteLiability(id);
    await loadData();
  };

  const openEditLiability = (l: LiabilityRow) => {
    setEditingLiability(l);
    editForm.reset({
      name: l.name,
      liability_type: l.liability_type,
      creditor_name: l.creditor_name ?? "",
      current_balance: String(l.current_balance),
      due_date: l.due_date ?? "",
      minimum_payment: l.minimum_payment ? String(l.minimum_payment) : "",
      notes: l.notes ?? "",
    });
  };

  const activeLiabilities = liabilities.filter((l) => l.status === "active");
  const paidLiabilities = liabilities.filter((l) => l.status === "paid");

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Cuentas y deudas</h1>
      </div>

      {/* Balance real summary */}
      <div className="px-5 mb-5">
        <div className="gradient-purple rounded-3xl p-5 text-white">
          <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-1">Balance real</p>
          <p className="text-3xl font-bold">{formatCurrency(netWorth)}</p>
          <div className="flex gap-4 mt-2 text-xs text-violet-300">
            <span>💵 {formatCurrency(availableLiquidity)}</span>
            <span>🔒 {formatCurrency(protectedSavings)}</span>
            <span>💳 -{formatCurrency(totalLiabilities)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5">
        <Tabs defaultValue="accounts">
          <TabsList className="w-full mb-5">
            <TabsTrigger value="accounts" className="flex-1">🏦 Cuentas ({accounts.length})</TabsTrigger>
            <TabsTrigger value="debts" className="flex-1">💳 Deudas ({activeLiabilities.length})</TabsTrigger>
          </TabsList>

          {/* Tab: Cuentas */}
          <TabsContent value="accounts">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowAddAccount(true)} className="gap-1.5">
                <Plus className="size-4" />Agregar cuenta
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🏦</p>
                <p className="font-semibold text-zinc-800 mb-1">Sin cuentas aún</p>
                <p className="text-sm text-zinc-500 mb-4">Crea una cuenta para empezar a registrar movimientos</p>
                <Button size="sm" onClick={() => setShowAddAccount(true)}>Crear primera cuenta</Button>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {accounts.map((a) => <AccountCard key={a.id} account={a} />)}
              </div>
            )}
          </TabsContent>

          {/* Tab: Deudas */}
          <TabsContent value="debts">
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setShowAddLiability(true)} className="gap-1.5">
                <Plus className="size-4" />Agregar deuda
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : activeLiabilities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-semibold text-zinc-800 mb-1">Sin deudas activas</p>
                <p className="text-sm text-zinc-500">No tienes deudas registradas</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {activeLiabilities.map((l) => {
                  const typeInfo = LIABILITY_TYPES.find((t) => t.id === l.liability_type);
                  return (
                    <div key={l.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-xl shrink-0">
                            {typeInfo?.icon ?? "💳"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 truncate">{l.name}</p>
                            <p className="text-xs text-zinc-400">
                              {typeInfo?.name ?? l.liability_type}
                              {l.creditor_name && ` · ${l.creditor_name}`}
                            </p>
                            {l.due_date && (
                              <p className="text-xs text-amber-600 mt-0.5">
                                Vence: {new Date(l.due_date + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-rose-600">{formatCurrency(l.current_balance)}</p>
                          {l.minimum_payment && (
                            <p className="text-xs text-zinc-400">mín. {formatCurrency(l.minimum_payment)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={() => openEditLiability(l)}>
                          <Pencil className="size-3" />Editar
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleMarkPaid(l.id)}>
                          <Check className="size-3" />Pagada
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleDeleteLiability(l.id)}>
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Deudas pagadas */}
            {paidLiabilities.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Pagadas</p>
                <div className="space-y-2">
                  {paidLiabilities.map((l) => (
                    <div key={l.id} className="bg-zinc-50 rounded-xl border border-zinc-100 p-3 flex items-center gap-3 opacity-60">
                      <span className="text-lg">✅</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-600 truncate">{l.name}</p>
                      </div>
                      <p className="text-sm text-zinc-400 line-through">{formatCurrency(l.current_balance)}</p>
                      <Button size="sm" variant="ghost" className="text-xs text-rose-400 h-7 px-2" onClick={() => handleDeleteLiability(l.id)}>
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sheet: Agregar cuenta */}
      <Sheet open={showAddAccount} onOpenChange={setShowAddAccount}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader><SheetTitle>Agregar cuenta</SheetTitle></SheetHeader>
          {accountSubmitted ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Cuenta agregada!</p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <Label>Nombre de la cuenta</Label>
                <Input placeholder="Ej. BCP Sueldo, Yape, Efectivo..." {...accForm.register("name")} />
                {accForm.formState.errors.name && <p className="text-xs text-rose-500">{accForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de cuenta</Label>
                <Select onValueChange={(v) => accForm.setValue("account_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {accForm.formState.errors.account_type && <p className="text-xs text-rose-500">{accForm.formState.errors.account_type.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Saldo actual</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-10" {...accForm.register("balance")} />
                </div>
                {accForm.formState.errors.balance && <p className="text-xs text-rose-500">{accForm.formState.errors.balance.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Banco / Institución (opcional)</Label>
                <Input placeholder="Ej. BCP, Interbank, Yape..." {...accForm.register("institution_name")} />
              </div>
            </div>
          )}
          {!accountSubmitted && (
            <SheetFooter>
              <Button className="w-full" size="lg" onClick={onAddAccount} disabled={accForm.formState.isSubmitting}>
                {accForm.formState.isSubmitting ? "Guardando..." : "Agregar cuenta"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet: Agregar deuda */}
      <Sheet open={showAddLiability} onOpenChange={setShowAddLiability}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader><SheetTitle>Agregar deuda</SheetTitle></SheetHeader>
          {liabilitySubmitted ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Deuda registrada!</p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <Label>Nombre de la deuda</Label>
                <Input placeholder="Ej. Tarjeta Visa, Le debo a Juan..." {...liabForm.register("name")} />
                {liabForm.formState.errors.name && <p className="text-xs text-rose-500">{liabForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select onValueChange={(v) => liabForm.setValue("liability_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger>
                  <SelectContent>
                    {LIABILITY_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {liabForm.formState.errors.liability_type && <p className="text-xs text-rose-500">{liabForm.formState.errors.liability_type.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Acreedor / Persona (opcional)</Label>
                <Input placeholder="Ej. BCP, Juan Pérez..." {...liabForm.register("creditor_name")} />
              </div>
              <div className="space-y-1.5">
                <Label>Monto de la deuda</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-10" {...liabForm.register("current_balance")} />
                </div>
                {liabForm.formState.errors.current_balance && <p className="text-xs text-rose-500">{liabForm.formState.errors.current_balance.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de pago (opcional)</Label>
                <Input type="date" {...liabForm.register("due_date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Pago mínimo (opcional)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                  <Input type="number" placeholder="0.00" className="pl-10" {...liabForm.register("minimum_payment")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nota (opcional)</Label>
                <Input placeholder="Cualquier detalle..." {...liabForm.register("notes")} />
              </div>
            </div>
          )}
          {!liabilitySubmitted && (
            <SheetFooter>
              <Button className="w-full" size="lg" onClick={onAddLiability} disabled={liabForm.formState.isSubmitting}>
                {liabForm.formState.isSubmitting ? "Guardando..." : "Agregar deuda"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet: Editar deuda */}
      <Sheet open={!!editingLiability} onOpenChange={(open) => !open && setEditingLiability(null)}>
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader><SheetTitle>Editar deuda</SheetTitle></SheetHeader>
          <div className="px-6 py-4 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input {...editForm.register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select defaultValue={editingLiability?.liability_type} onValueChange={(v) => editForm.setValue("liability_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIABILITY_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monto actual</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                <Input type="number" className="pl-10" {...editForm.register("current_balance")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de pago (opcional)</Label>
              <Input type="date" {...editForm.register("due_date")} />
            </div>
            <div className="space-y-1.5">
              <Label>Nota (opcional)</Label>
              <Input {...editForm.register("notes")} />
            </div>
          </div>
          <SheetFooter>
            <Button className="w-full" size="lg" onClick={onEditLiability} disabled={editForm.formState.isSubmitting}>
              {editForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
