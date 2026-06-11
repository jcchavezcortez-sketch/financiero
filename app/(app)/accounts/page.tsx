"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, CheckCircle, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AccountCard from "@/components/shared/AccountCard";
import { ACCOUNT_TYPES, LIABILITY_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  getAccounts,
  insertAccount,
  insertCreditCard,
  deleteAccount,
  getLiabilities,
  insertLiability,
  updateLiability,
  deleteLiability,
} from "@/lib/supabase/queries";
import {
  getAvailableLiquidity,
  getProtectedSavings,
  getTotalLiabilities,
  getNetWorth,
} from "@/lib/finance";
import type { Account, Liability } from "@/types";
import { CARD_NETWORKS } from "@/types";
import type { Database } from "@/types/database";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
type LiabilityRow = Database["public"]["Tables"]["liabilities"]["Row"];

const addAccountSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  type: z.string().min(1, "Selecciona un tipo"),
  balance: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Monto inválido"),
  institution_name: z.string().optional(),
  // Credit card fields (only used when type = credit_card)
  card_network: z.string().optional(),
  last_four_digits: z.string().optional(),
  credit_limit: z.string().optional(),
  statement_closing_day: z.string().optional(),
  payment_due_day: z.string().optional(),
  minimum_payment: z.string().optional(),
});

const addLiabilitySchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  liability_type: z.string().min(1, "Selecciona un tipo"),
  current_balance: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Monto inválido"),
  creditor_name: z.string().optional(),
  due_date: z.string().optional(),
  minimum_payment: z.string().optional(),
  notes: z.string().optional(),
});

type AddAccountForm = z.infer<typeof addAccountSchema>;
type AddLiabilityForm = z.infer<typeof addLiabilitySchema>;

function LiabilityTypeIcon({ type }: { type: string }) {
  const t = LIABILITY_TYPES.find((l) => l.id === type);
  return <span>{t?.icon ?? "📋"}</span>;
}

function LiabilityTypeName({ type }: { type: string }) {
  const t = LIABILITY_TYPES.find((l) => l.id === type);
  return <>{t?.name ?? type}</>;
}

export default function AccountsPage() {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);
  const [editingLiability, setEditingLiability] = useState<LiabilityRow | null>(null);
  const [accountSubmitted, setAccountSubmitted] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [liabilitySubmitted, setLiabilitySubmitted] = useState(false);
  const [liabilityError, setLiabilityError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const accountForm = useForm<AddAccountForm>({
    resolver: zodResolver(addAccountSchema),
  });

  const watchedAccountType = accountForm.watch("type");

  const liabilityForm = useForm<AddLiabilityForm>({
    resolver: zodResolver(addLiabilitySchema),
  });

  useEffect(() => {
    Promise.all([getAccounts(), getLiabilities()])
      .then(([accs, liabs]) => {
        setAccounts(accs);
        setLiabilities(liabs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const typedAccounts = accounts as unknown as Account[];
  const typedLiabilities = liabilities as unknown as Liability[];
  const activeLiabilities = liabilities.filter((l) => l.status === "active");
  const paidLiabilities = liabilities.filter((l) => l.status === "paid");

  const liquidAvailable = getAvailableLiquidity(typedAccounts);
  const protectedSavings = getProtectedSavings(typedAccounts);
  const totalDebt = getTotalLiabilities(typedLiabilities);
  const netWorth = getNetWorth(typedAccounts, typedLiabilities);

  const onAddAccount = async (data: AddAccountForm) => {
    const accountType = ACCOUNT_TYPES.find((t) => t.id === data.type);
    try {
      if (data.type === "credit_card") {
        await insertCreditCard({
          name: data.name,
          institution_name: data.institution_name || null,
          card_network: data.card_network || null,
          last_four_digits: data.last_four_digits || null,
          credit_limit: data.credit_limit ? Number(data.credit_limit) : null,
          current_balance: Number(data.balance),
          statement_closing_day: data.statement_closing_day ? Number(data.statement_closing_day) : null,
          payment_due_day: data.payment_due_day ? Number(data.payment_due_day) : null,
          minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : null,
        });
      } else {
        await insertAccount({
          name: data.name,
          type: data.type,
          balance: Number(data.balance),
          initial_balance: Number(data.balance),
          icon: accountType?.icon ?? "🏦",
          color: "#7C3AED",
          include_in_available_balance: accountType?.includeInAvailable ?? true,
          include_in_net_worth: accountType?.includeInNetWorth ?? true,
          institution_name: data.institution_name || null,
        });
      }
      const updated = await getAccounts();
      setAccounts(updated);
      setAccountError(null);
      setAccountSubmitted(true);
      setTimeout(() => {
        setShowAddAccount(false);
        setAccountSubmitted(false);
        accountForm.reset();
      }, 1500);
    } catch (e) {
      console.error(e);
      setAccountError(e instanceof Error ? e.message : "No se pudo guardar la cuenta. Intenta de nuevo.");
    }
  };

  const onAddLiability = async (data: AddLiabilityForm) => {
    try {
      if (editingLiability) {
        await updateLiability(editingLiability.id, {
          liability_type: data.liability_type,
          name: data.name,
          creditor_name: data.creditor_name || null,
          current_balance: Number(data.current_balance),
          due_date: data.due_date || null,
          minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : null,
          notes: data.notes || null,
        });
      } else {
        await insertLiability({
          liability_type: data.liability_type,
          name: data.name,
          creditor_name: data.creditor_name || null,
          current_balance: Number(data.current_balance),
          due_date: data.due_date || null,
          minimum_payment: data.minimum_payment ? Number(data.minimum_payment) : null,
          notes: data.notes || null,
        });
      }
      const updated = await getLiabilities();
      setLiabilities(updated);
      setLiabilityError(null);
      setLiabilitySubmitted(true);
      setTimeout(() => {
        setShowAddLiability(false);
        setEditingLiability(null);
        setLiabilitySubmitted(false);
        liabilityForm.reset();
      }, 1500);
    } catch (e) {
      console.error(e);
      setLiabilityError(e instanceof Error ? e.message : "No se pudo guardar la deuda. Intenta de nuevo.");
    }
  };

  const handleMarkPaid = async (id: string) => {
    await updateLiability(id, { status: "paid" });
    const updated = await getLiabilities();
    setLiabilities(updated);
  };

  const handleDeleteLiability = async (id: string) => {
    await deleteLiability(id);
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDeleteAccount = async (id: string) => {
    await deleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const openEditLiability = (l: LiabilityRow) => {
    setEditingLiability(l);
    liabilityForm.reset({
      name: l.name,
      liability_type: l.liability_type,
      current_balance: String(l.current_balance),
      creditor_name: l.creditor_name ?? "",
      due_date: l.due_date ?? "",
      minimum_payment: l.minimum_payment ? String(l.minimum_payment) : "",
      notes: l.notes ?? "",
    });
    setShowAddLiability(true);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Mis finanzas</h1>
      </div>

      {/* Balance real */}
      <div className="px-5 mb-5">
        <div className="gradient-purple rounded-3xl p-5 text-white">
          <p className="text-violet-200 text-xs font-medium uppercase tracking-wide mb-1">
            Patrimonio neto
          </p>
          <p className={`text-3xl font-bold ${netWorth < 0 ? "text-rose-300" : ""}`}>
            {formatCurrency(netWorth)}
          </p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-violet-300 text-xs">Disponible</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(liquidAvailable)}</p>
            </div>
            <div>
              <p className="text-violet-300 text-xs">Protegido</p>
              <p className="text-white text-sm font-semibold">{formatCurrency(protectedSavings)}</p>
            </div>
            <div>
              <p className="text-violet-300 text-xs">Deudas</p>
              <p className="text-rose-300 text-sm font-semibold">- {formatCurrency(totalDebt)}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="accounts" className="px-5">
        <TabsList className="w-full mb-5">
          <TabsTrigger value="accounts" className="flex-1">
            🏦 Cuentas
          </TabsTrigger>
          <TabsTrigger value="debts" className="flex-1">
            💳 Deudas
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Cuentas ── */}
        <TabsContent value="accounts">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setShowAddAccount(true)} className="gap-1.5">
              <Plus className="size-4" />
              Agregar cuenta
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 bg-zinc-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🏦</p>
              <p className="text-base font-semibold text-zinc-700 mb-1">
                No tienes cuentas todavía
              </p>
              <p className="text-sm text-zinc-500 mb-4">
                Primero crea una cuenta para empezar a registrar movimientos.
              </p>
              <Button size="sm" onClick={() => setShowAddAccount(true)}>
                <Plus className="size-4 mr-1.5" />
                Agregar cuenta
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {accounts.map((account) => (
                <div key={account.id} className="relative group">
                  <AccountCard account={account as unknown as Account} />
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Deudas ── */}
        <TabsContent value="debts">
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              onClick={() => {
                setEditingLiability(null);
                liabilityForm.reset();
                setShowAddLiability(true);
              }}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Agregar deuda
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : activeLiabilities.length === 0 && paidLiabilities.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-base font-semibold text-zinc-700 mb-1">
                No tienes deudas registradas
              </p>
              <p className="text-sm text-zinc-500">
                ¡Excelente! Si tienes deudas puedes agregarlas para llevar el control.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {activeLiabilities.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Activas
                  </p>
                  {activeLiabilities.map((l) => (
                    <div
                      key={l.id}
                      className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-xl">
                            <LiabilityTypeIcon type={l.liability_type} />
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-800">{l.name}</p>
                            {l.creditor_name && (
                              <p className="text-xs text-zinc-500">{l.creditor_name}</p>
                            )}
                            <p className="text-xs text-zinc-400 mt-0.5">
                              <LiabilityTypeName type={l.liability_type} />
                              {l.due_date && ` · vence ${l.due_date}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-rose-600">
                          {formatCurrency(l.current_balance)}
                        </p>
                      </div>
                      {l.minimum_payment && (
                        <p className="text-xs text-zinc-400 mt-2">
                          Pago mínimo: {formatCurrency(l.minimum_payment)}
                        </p>
                      )}
                      {l.notes && (
                        <p className="text-xs text-zinc-400 mt-1 italic">{l.notes}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-xs"
                          onClick={() => openEditLiability(l)}
                        >
                          <Pencil className="size-3" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleMarkPaid(l.id)}
                        >
                          <CheckCircle className="size-3" />
                          Pagada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs text-rose-500 border-rose-200 hover:bg-rose-50"
                          onClick={() => handleDeleteLiability(l.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {paidLiabilities.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    Pagadas
                  </p>
                  {paidLiabilities.map((l) => (
                    <div
                      key={l.id}
                      className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            <LiabilityTypeIcon type={l.liability_type} />
                          </span>
                          <div>
                            <p className="font-medium text-zinc-600 line-through">{l.name}</p>
                            <p className="text-xs text-zinc-400">
                              <LiabilityTypeName type={l.liability_type} />
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-400 line-through">
                            {formatCurrency(l.current_balance)}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-zinc-400"
                            onClick={() => handleDeleteLiability(l.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet: Agregar cuenta */}
      <Sheet
        open={showAddAccount}
        onOpenChange={(open) => {
          setShowAddAccount(open);
          if (!open) {
            setAccountSubmitted(false);
            setAccountError(null);
            accountForm.reset();
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle>Agregar cuenta</SheetTitle>
          </SheetHeader>

          {accountSubmitted ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Cuenta agregada!</p>
              <p className="text-sm text-zinc-500 mt-1">Tu nueva cuenta ya está disponible</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 space-y-4 overflow-y-auto">
                {accountError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                    <p className="text-sm text-rose-600">{accountError}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input
                    placeholder="Ej. BCP Ahorros, Yape, Efectivo..."
                    {...accountForm.register("name")}
                  />
                  {accountForm.formState.errors.name && (
                    <p className="text-xs text-rose-500">
                      {accountForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo de cuenta</Label>
                  <Select
                    onValueChange={(v) => accountForm.setValue("type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.icon} {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {accountForm.formState.errors.type && (
                    <p className="text-xs text-rose-500">
                      {accountForm.formState.errors.type.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>{watchedAccountType === "credit_card" ? "Deuda actual" : "Saldo actual"}</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                      S/
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="pl-10"
                      {...accountForm.register("balance")}
                    />
                  </div>
                  {accountForm.formState.errors.balance && (
                    <p className="text-xs text-rose-500">
                      {accountForm.formState.errors.balance.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Banco / institución (opcional)</Label>
                  <Input
                    placeholder="Ej. BCP, Interbank, Yape..."
                    {...accountForm.register("institution_name")}
                  />
                </div>

                {watchedAccountType === "credit_card" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Red</Label>
                        <Select onValueChange={(v) => accountForm.setValue("card_network", v)}>
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
                      <div className="space-y-1.5">
                        <Label>Últimos 4 dígitos</Label>
                        <Input
                          placeholder="1234"
                          maxLength={4}
                          {...accountForm.register("last_four_digits")}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Línea de crédito</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                        <Input type="number" placeholder="5000" className="pl-10" {...accountForm.register("credit_limit")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Día de cierre</Label>
                        <Input type="number" min={1} max={31} placeholder="15" {...accountForm.register("statement_closing_day")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Día de pago</Label>
                        <Input type="number" min={1} max={31} placeholder="25" {...accountForm.register("payment_due_day")} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pago mínimo (opcional)</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">S/</span>
                        <Input type="number" placeholder="0.00" className="pl-10" {...accountForm.register("minimum_payment")} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <SheetFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={accountForm.handleSubmit(onAddAccount)}
                  disabled={accountForm.formState.isSubmitting}
                >
                  {accountForm.formState.isSubmitting ? "Guardando..." : "Agregar cuenta"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog: Agregar / Editar deuda */}
      <Dialog
        open={showAddLiability}
        onOpenChange={(open) => {
          setShowAddLiability(open);
          if (!open) {
            setEditingLiability(null);
            setLiabilitySubmitted(false);
            setLiabilityError(null);
            liabilityForm.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLiability ? "Editar deuda" : "Agregar deuda"}
            </DialogTitle>
          </DialogHeader>

          {liabilitySubmitted ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">
                {editingLiability ? "¡Deuda actualizada!" : "¡Deuda registrada!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {liabilityError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                  <p className="text-sm text-rose-600">{liabilityError}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Nombre de la deuda</Label>
                <Input
                  placeholder="Ej. Visa BCP, Deuda con Juan..."
                  {...liabilityForm.register("name")}
                />
                {liabilityForm.formState.errors.name && (
                  <p className="text-xs text-rose-500">
                    {liabilityForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  defaultValue={editingLiability?.liability_type}
                  onValueChange={(v) => liabilityForm.setValue("liability_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIABILITY_TYPES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.icon} {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {liabilityForm.formState.errors.liability_type && (
                  <p className="text-xs text-rose-500">
                    {liabilityForm.formState.errors.liability_type.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Monto actual de la deuda</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                    S/
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-10"
                    {...liabilityForm.register("current_balance")}
                  />
                </div>
                {liabilityForm.formState.errors.current_balance && (
                  <p className="text-xs text-rose-500">
                    {liabilityForm.formState.errors.current_balance.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Acreedor / persona (opcional)</Label>
                <Input
                  placeholder="Ej. BCP, Juan Pérez..."
                  {...liabilityForm.register("creditor_name")}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Fecha de pago (opcional)</Label>
                <Input type="date" {...liabilityForm.register("due_date")} />
              </div>

              <div className="space-y-1.5">
                <Label>Pago mínimo (opcional)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                    S/
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-10"
                    {...liabilityForm.register("minimum_payment")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Nota (opcional)</Label>
                <Input
                  placeholder="Cualquier detalle adicional..."
                  {...liabilityForm.register("notes")}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={liabilityForm.handleSubmit(onAddLiability)}
                disabled={liabilityForm.formState.isSubmitting}
              >
                {liabilityForm.formState.isSubmitting
                  ? "Guardando..."
                  : editingLiability
                  ? "Guardar cambios"
                  : "Agregar deuda"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
