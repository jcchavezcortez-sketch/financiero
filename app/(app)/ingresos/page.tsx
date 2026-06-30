"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Clock } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MonthSelector from "@/components/shared/MonthSelector";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getMonthlyIncomeSources,
  upsertMonthlyIncomeSource,
  deleteMonthlyIncomeSource,
  getMonthlyIncomeLogs,
  markIncomeAsReceived,
  getMonthlyIncomeSummary,
} from "@/lib/supabase/queries";
import type { Database } from "@/types/database";

type IncomeSourceRow = Database["public"]["Tables"]["monthly_income_sources"]["Row"];
type IncomeLogRow = Database["public"]["Tables"]["monthly_income_logs"]["Row"];

const INCOME_TYPES = [
  { id: "salary", name: "Sueldo" },
  { id: "freelance", name: "Freelance" },
  { id: "investment", name: "Inversiones" },
  { id: "transfer", name: "Transferencia" },
  { id: "rental", name: "Alquiler" },
  { id: "other", name: "Otro" },
];

const incomeSourceSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Monto inválido"),
  source_type: z.string().min(1, "Selecciona tipo"),
  expected_day: z.string().optional(),
  notes: z.string().optional(),
});

type IncomeSourceForm = z.infer<typeof incomeSourceSchema>;

export default function IncomesPage() {
  const [sources, setSources] = useState<IncomeSourceRow[]>([]);
  const [logs, setLogs] = useState<IncomeLogRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddSource, setShowAddSource] = useState(false);
  const [showMarkReceived, setShowMarkReceived] = useState(false);
  const [selectedLog, setSelectedLog] = useState<IncomeLogRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [incomeSuccess, setIncomeSuccess] = useState(false);

  const sourceForm = useForm<IncomeSourceForm>({
    resolver: zodResolver(incomeSourceSchema),
  });

  useEffect(() => {
    Promise.all([
      getMonthlyIncomeSources(),
      getMonthlyIncomeLogs(selectedMonth.toISOString().split("T")[0]),
      getMonthlyIncomeSummary(),
    ])
      .then(([srcs, lgs, summ]) => {
        setSources(srcs);
        setLogs(lgs);
        setSummary(summ);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedMonth]);

  const onAddSource = async (data: IncomeSourceForm) => {
    setIncomeError(null);
    try {
      await upsertMonthlyIncomeSource({
        name: data.name,
        amount: Number(data.amount),
        source_type: data.source_type,
        expected_day: data.expected_day ? Number(data.expected_day) : undefined,
        notes: data.notes || null,
      });

      const updated = await getMonthlyIncomeSources();
      setSources(updated);
      setIncomeSuccess(true);
      setTimeout(() => {
        setShowAddSource(false);
        setIncomeSuccess(false);
        sourceForm.reset();
      }, 1500);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      setIncomeError(message);
    }
  };

  const handleMarkReceived = async (amount: number, date: string) => {
    if (!selectedLog) return;
    try {
      await markIncomeAsReceived(selectedLog.id, amount, date);
      const updated = await getMonthlyIncomeLogs(
        selectedMonth.toISOString().split("T")[0]
      );
      setLogs(updated);
      setShowMarkReceived(false);
      setSelectedLog(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await deleteMonthlyIncomeSource(sourceId);
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
    } catch (e) {
      console.error(e);
    }
  };

  const getSourceIcon = (type: string) => {
    const icons: Record<string, string> = {
      salary: "💼",
      freelance: "💻",
      investment: "📈",
      transfer: "💳",
      rental: "🏘️",
      other: "💰",
    };
    return icons[type] || "💰";
  };

  const getSourceName = (type: string) => {
    return INCOME_TYPES.find((t) => t.id === type)?.name || type;
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-zinc-800">Ingresos</h1>
        <p className="text-sm text-zinc-500 mt-1">Tracking de ingresos esperados y recibidos</p>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="px-5 mb-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-emerald-700 uppercase tracking-wide font-semibold mb-1">
                  Esperado
                </p>
                <p className="text-lg font-bold text-emerald-900">
                  {formatCurrency(summary.expected_total)}
                </p>
              </div>
              <div>
                <p className="text-xs text-emerald-700 uppercase tracking-wide font-semibold mb-1">
                  Recibido
                </p>
                <p className="text-lg font-bold text-emerald-900">
                  {formatCurrency(summary.received_total)}
                </p>
              </div>
              <div>
                <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold mb-1">
                  Pendiente
                </p>
                <p className="text-lg font-bold text-amber-900">
                  {formatCurrency(summary.pending_total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mes Selector */}
      <div className="px-5 mb-5">
        <MonthSelector currentMonth={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Content */}
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-700">Fuentes de ingresos</h2>
          <Button size="sm" onClick={() => setShowAddSource(true)} className="gap-1.5">
            <Plus className="size-4" />
            Nueva fuente
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 bg-zinc-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-base font-semibold text-zinc-700 mb-1">
              No tienes fuentes de ingresos
            </p>
            <p className="text-sm text-zinc-500">
              Añade fuentes de ingresos para monitorear tus entradas
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {sources.map((source) => {
              const log = logs.find((l) => l.income_source_id === source.id);
              const isReceived = log?.status === "received";

              return (
                <div
                  key={source.id}
                  className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl">{getSourceIcon(source.source_type)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-zinc-800">{source.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {getSourceName(source.source_type)}
                          {source.expected_day && ` · Día ${source.expected_day}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(source.amount)}
                      </p>
                      {isReceived && (
                        <p className="text-xs text-emerald-600 font-semibold mt-1">
                          ✓ Recibido
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Log Status */}
                  {log && (
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      {isReceived ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="size-4" />
                          <span className="text-xs font-medium">
                            Recibido {log.received_date && `el ${formatDate(log.received_date)}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-amber-600">
                            <Clock className="size-4" />
                            <span className="text-xs font-medium">Pendiente</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowMarkReceived(true);
                            }}
                          >
                            Marcar recibido
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-rose-500 flex-shrink-0"
                      onClick={() => handleDeleteSource(source.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sheet: Agregar Fuente */}
      <Sheet
        open={showAddSource}
        onOpenChange={(open) => {
          setShowAddSource(open);
          if (!open) {
            setIncomeError(null);
            sourceForm.reset();
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[90vh]">
          <SheetHeader>
            <SheetTitle>Nueva Fuente de Ingreso</SheetTitle>
          </SheetHeader>

          {incomeSuccess ? (
            <div className="flex flex-col items-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-zinc-800">¡Fuente agregada!</p>
              <p className="text-sm text-zinc-500 mt-1">Ya estamos monitoreando</p>
            </div>
          ) : (
            <>
              {incomeError && (
                <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-600 font-medium">{incomeError}</p>
                </div>
              )}
              <div className="px-6 py-4 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input
                    placeholder="Ej. Sueldo principal"
                    {...sourceForm.register("name")}
                  />
                  {sourceForm.formState.errors.name && (
                    <p className="text-xs text-rose-500">
                      {sourceForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    onValueChange={(v) => sourceForm.setValue("source_type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {getSourceIcon(t.id)} {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sourceForm.formState.errors.source_type && (
                    <p className="text-xs text-rose-500">
                      {sourceForm.formState.errors.source_type.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Monto mensual</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                      S/
                    </span>
                    <Input
                      type="number"
                      placeholder="3000"
                      className="pl-10"
                      {...sourceForm.register("amount")}
                    />
                  </div>
                  {sourceForm.formState.errors.amount && (
                    <p className="text-xs text-rose-500">
                      {sourceForm.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Día esperado (opcional)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="15"
                    {...sourceForm.register("expected_day")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Notas (opcional)</Label>
                  <Input placeholder="Ej. Incluye bonos" {...sourceForm.register("notes")} />
                </div>
              </div>
              <SheetFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={sourceForm.handleSubmit(onAddSource)}
                  disabled={sourceForm.formState.isSubmitting}
                >
                  {sourceForm.formState.isSubmitting ? "Guardando..." : "Crear fuente"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog: Marcar Recibido */}
      <Dialog open={showMarkReceived} onOpenChange={setShowMarkReceived}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar ingreso como recibido</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm">Monto recibido</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-sm">
                    S/
                  </span>
                  <Input
                    type="number"
                    id="amount-input"
                    placeholder="0"
                    defaultValue={selectedLog.income_source_id}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Fecha de recepción</Label>
                <Input
                  type="date"
                  id="date-input"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="mt-1.5"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const source = sources.find((s) => s.id === selectedLog?.income_source_id);
                  const amount = Number(
                    (document.getElementById("amount-input") as HTMLInputElement)?.value
                  ) || (source?.amount ?? 0);
                  const date = (document.getElementById("date-input") as HTMLInputElement)?.value;
                  if (amount > 0 && date) {
                    handleMarkReceived(amount, date);
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
