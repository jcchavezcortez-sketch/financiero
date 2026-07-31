"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  getAccounts,
  insertAccount,
  deleteAccount,
  updateAccount,
  getLiabilities,
} from "@/lib/supabase/queries";
import {
  getAvailableLiquidity,
  getProtectedSavings,
  getTotalLiabilities,
  getNetWorth,
} from "@/lib/finance";
import type { Account, Liability } from "@/types";
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
});

const editAccountSchema = addAccountSchema;

type AddAccountForm = z.infer<typeof addAccountSchema>;
type EditAccountForm = z.infer<typeof editAccountSchema>;

export default function AccountsPage() {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [accountSubmitted, setAccountSubmitted] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);

  const accountForm = useForm<AddAccountForm>({
    resolver: zodResolver(addAccountSchema),
  });

  const editAccountForm = useForm<EditAccountForm>({
    resolver: zodResolver(editAccountSchema),
  });

  useEffect(() => {
    Promise.all([getAccounts(), getLiabilities("active")])
      .then(([accs, liabs]) => {
        setAccounts(accs);
        setLiabilities(liabs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const typedAccounts = accounts as unknown as Account[];
  const typedLiabilities = liabilities as unknown as Liability[];

  const liquidAvailable = getAvailableLiquidity(typedAccounts);
  const protectedSavings = getProtectedSavings(typedAccounts);
  const totalDebt = getTotalLiabilities(typedLiabilities);
  const netWorth = getNetWorth(typedAccounts, typedLiabilities);

  const onAddAccount = async (data: AddAccountForm) => {
    const accountType = ACCOUNT_TYPES.find((t) => t.id === data.type);
    setAccountError(null);
    try {
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
      const updated = await getAccounts();
      setAccounts(updated);
      setAccountSubmitted(true);
      setTimeout(() => {
        setShowAddAccount(false);
        setAccountSubmitted(false);
        accountForm.reset();
      }, 1500);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido al agregar cuenta";
      setAccountError(message);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    await deleteAccount(id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleEditAccount = async (data: EditAccountForm) => {
    if (!editingAccount) return;
    setAccountError(null);
    try {
      const newBalance = Number(data.balance);
      const accountType = ACCOUNT_TYPES.find((t) => t.id === data.type);
      const { error } = await updateAccount(editingAccount.id, {
        name: data.name,
        type: data.type,
        balance: newBalance,
        initial_balance: editingAccount.initial_balance + (newBalance - editingAccount.balance),
        icon: accountType?.icon ?? editingAccount.icon,
        include_in_available_balance: accountType?.includeInAvailable ?? true,
        include_in_net_worth: accountType?.includeInNetWorth ?? true,
        institution_name: data.institution_name || null,
      });
      if (error) throw new Error(error.message);
      const updated = await getAccounts();
      setAccounts(updated);
      setAccountSubmitted(true);
      setTimeout(() => {
        setEditingAccount(null);
        setAccountSubmitted(false);
        editAccountForm.reset();
      }, 1200);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido al actualizar la cuenta";
      setAccountError(message);
    }
  };

  const openEditAccount = (account: AccountRow) => {
    setEditingAccount(account);
    editAccountForm.reset({
      name: account.name,
      type: account.type,
      balance: String(account.balance),
      institution_name: account.institution_name ?? "",
    });
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Mis cuentas</h1>
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

      {/* Link a deudas */}
      <div className="px-5 mb-5">
        <Link href="/deudas">
          <div className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center justify-between hover:border-zinc-200 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <CreditCard className="size-5 text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">Tarjetas de crédito y deudas</p>
                <p className="text-xs text-zinc-400">Se gestionan en la sección Deudas</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-zinc-400" />
          </div>
        </Link>
      </div>

      {/* Cuentas */}
      <div className="px-5">
        <div className="flex justify-end mb-5">
          <Button onClick={() => setShowAddAccount(true)} className="gap-2">
            <Plus className="size-5" />
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
            {accounts.map((account) => {
              const accountType = ACCOUNT_TYPES.find((t) => t.id === account.type);
              const isExpanded = expandedAccount === account.id;
              return (
                <div
                  key={account.id}
                  className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1 h-12 rounded-full shrink-0"
                        style={{ backgroundColor: account.color }}
                      />
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0 text-2xl"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        {account.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-800 truncate">{account.name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">
                          {accountType?.name ?? account.type}
                          {account.institution_name ? ` · ${account.institution_name}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-base font-bold text-zinc-800">
                          {formatCurrency(account.balance, account.currency)}
                        </p>
                        <button
                          aria-label={isExpanded ? "Ocultar acciones" : "Ver acciones"}
                          onClick={() =>
                            setExpandedAccount(isExpanded ? null : account.id)
                          }
                          className="p-1 text-zinc-400 hover:text-zinc-600"
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-zinc-50 bg-zinc-50 px-4 py-3 grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditAccount(account)}
                        className="gap-1.5 text-xs"
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="gap-1.5 text-rose-500 border-rose-200 hover:bg-rose-50 text-xs"
                      >
                        <Trash2 className="size-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
              {accountError && (
                <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-600 font-medium">{accountError}</p>
                </div>
              )}
              <div className="px-6 py-4 space-y-4 overflow-y-auto">
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
                  <Label>Saldo actual</Label>
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

      {/* Dialog: Editar cuenta */}
      <Dialog
        open={!!editingAccount}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAccount(null);
            setAccountSubmitted(false);
            setAccountError(null);
            editAccountForm.reset();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
          </DialogHeader>

          {accountSubmitted ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Cuenta actualizada!</p>
            </div>
          ) : (
            <>
              {accountError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg mb-4">
                  <p className="text-sm text-rose-600 font-medium">{accountError}</p>
                </div>
              )}
              {editingAccount && (
                <div className="space-y-4 pb-2">
                  <div className="space-y-1.5">
                    <Label>Nombre</Label>
                    <Input {...editAccountForm.register("name")} />
                    {editAccountForm.formState.errors.name && (
                      <p className="text-xs text-rose-500">
                        {editAccountForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Tipo de cuenta</Label>
                    <Select
                      value={editAccountForm.watch("type")}
                      onValueChange={(v) =>
                        editAccountForm.setValue("type", v, { shouldValidate: true })
                      }
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
                    {editAccountForm.formState.errors.type && (
                      <p className="text-xs text-rose-500">
                        {editAccountForm.formState.errors.type.message}
                      </p>
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
                        {...editAccountForm.register("balance")}
                      />
                    </div>
                    {editAccountForm.formState.errors.balance && (
                      <p className="text-xs text-rose-500">
                        {editAccountForm.formState.errors.balance.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Banco / institución (opcional)</Label>
                    <Input {...editAccountForm.register("institution_name")} />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={editAccountForm.handleSubmit(handleEditAccount)}
                    disabled={editAccountForm.formState.isSubmitting}
                  >
                    {editAccountForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
