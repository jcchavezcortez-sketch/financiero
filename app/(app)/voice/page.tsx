"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, CheckCircle, Edit2 } from "lucide-react";
import Link from "next/link";
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
import { cn, formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import type { TransactionType } from "@/types";

// ── Natural language parser ──────────────────────────────────────────────────

interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  date: string;
  description: string;
}

function getLastWeekday(targetDay: number): Date {
  const today = new Date();
  const diff = ((today.getDay() - targetDay + 7) % 7) || 7;
  const d = new Date(today);
  d.setDate(today.getDate() - diff);
  return d;
}

function parsePhrase(text: string): ParsedTransaction {
  const lower = text.toLowerCase();

  // Type
  const isIncome = /recib[ií]|gan[eé]|ingres[oó]|cobr[eé]|me pagaron/.test(lower);
  const type: TransactionType = isIncome ? "income" : "expense";

  // Amount — "25 soles", "S/ 25", "25"
  const amountMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:soles?|sol|pen|s\/)?/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 0;

  // Date
  let date = new Date();
  if (/ayer/.test(lower)) {
    date = new Date();
    date.setDate(date.getDate() - 1);
  } else if (/lunes/.test(lower)) date = getLastWeekday(1);
  else if (/martes/.test(lower)) date = getLastWeekday(2);
  else if (/mi[eé]rcoles/.test(lower)) date = getLastWeekday(3);
  else if (/jueves/.test(lower)) date = getLastWeekday(4);
  else if (/viernes/.test(lower)) date = getLastWeekday(5);
  else if (/s[aá]bado/.test(lower)) date = getLastWeekday(6);
  else if (/domingo/.test(lower)) date = getLastWeekday(0);

  // Category rules (first match wins)
  const rules: Array<{ re: RegExp; id: string; name: string; icon: string }> = [
    { re: /taxi|uber|indriver|cabify|bus|metro|pasaje|micro|custer|moto|transporte/, id: "transporte", name: "Transporte", icon: "🚗" },
    { re: /almuerzo|desayuno|cena|restaurant|pollo|pizza|sushi|delivery|rappi|pedidos|menú|menu|comida/, id: "alimentacion", name: "Alimentación", icon: "🍽️" },
    { re: /supermercado|wong|plaza vea|metro|vivanda|tottus|mercado|bodega|plazavea/, id: "supermercado", name: "Supermercado", icon: "🛒" },
    { re: /luz|agua|internet|teléfono|telefono|gas|enel|sedapal|recibo|servicio/, id: "servicios", name: "Servicios", icon: "⚡" },
    { re: /ropa|camisa|pantalón|pantalon|zapatos|zapatillas|vestido|blusa|ripley|saga|zara/, id: "ropa", name: "Ropa", icon: "👗" },
    { re: /netflix|spotify|disney|hbo|amazon|prime|suscripci[oó]n/, id: "entretenimiento", name: "Entretenimiento", icon: "🎬" },
    { re: /cine|cinemark|cineplanet|teatro|concierto/, id: "entretenimiento", name: "Entretenimiento", icon: "🎬" },
    { re: /doctor|m[eé]dico|cl[ií]nica|farmacia|mifarma|salud|pastilla|medicina/, id: "salud", name: "Salud", icon: "💊" },
    { re: /sal[oó]n|peluquer[ií]a|manicure|belleza|spa|uñas/, id: "belleza", name: "Belleza", icon: "💅" },
    { re: /alquiler|renta|departamento|cuarto/, id: "hogar", name: "Hogar", icon: "🏠" },
    { re: /freelance|proyecto|cliente/, id: "freelance", name: "Freelance", icon: "💻" },
    { re: /sueldo|salario|quincena/, id: "sueldo", name: "Sueldo", icon: "💼" },
    { re: /regalo|cumplea[ñn]os/, id: "regalos", name: "Regalos", icon: "🎁" },
    { re: /mascota|veterinario|perro|gato/, id: "mascotas", name: "Mascotas", icon: "🐾" },
    { re: /viaje|vuelo|hotel|hostal/, id: "viajes", name: "Viajes", icon: "✈️" },
    { re: /curso|libro|estudio|universidad|universidad/, id: "educacion", name: "Educación", icon: "📚" },
  ];

  let categoryId = type === "income" ? "otros_ingresos" : "otros_gastos";
  let categoryName = type === "income" ? "Otros ingresos" : "Otros gastos";
  let categoryIcon = type === "income" ? "💰" : "💸";

  for (const rule of rules) {
    if (rule.re.test(lower)) {
      categoryId = rule.id;
      categoryName = rule.name;
      categoryIcon = rule.icon;
      break;
    }
  }

  return {
    type,
    amount,
    categoryId,
    categoryName,
    categoryIcon,
    date: date.toISOString().split("T")[0],
    description: text.trim(),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

const EXAMPLE_PHRASES = [
  "Gasté 25 soles en taxi ayer",
  "Gasté 45 soles en comida hoy",
  "Pagué 80 soles de luz",
  "Recibí 200 soles por freelance",
  "Gasté 120 soles en ropa el sábado",
];

type Status = "idle" | "recording" | "processing" | "confirm" | "saved";

export default function VoicePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [editing, setEditing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
    const w = window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      return;
    }
    const rec = new SpeechRecognitionCtor();
    rec.lang = "es-PE";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setStatus("processing");
      setTimeout(() => {
        setParsed(parsePhrase(text));
        setStatus("confirm");
      }, 600);
    };
    rec.onerror = () => setStatus("idle");
    rec.onend = () => {
      if (status === "recording") setStatus("idle");
    };
    recognitionRef.current = rec;
  }, [status]);

  const handleMicPress = useCallback(() => {
    if (status === "idle") {
      try {
        recognitionRef.current?.start();
        setStatus("recording");
      } catch {
        setStatus("idle");
      }
    } else if (status === "recording") {
      recognitionRef.current?.stop();
      setStatus("processing");
    }
  }, [status]);

  const handleTextAnalyze = () => {
    if (!textInput.trim()) return;
    setStatus("processing");
    setTimeout(() => {
      setParsed(parsePhrase(textInput));
      setStatus("confirm");
    }, 600);
  };

  const handleConfirm = () => {
    setStatus("saved");
    setTimeout(() => {
      setStatus("idle");
      setTextInput("");
      setTranscript("");
      setParsed(null);
      setEditing(false);
    }, 2500);
  };

  const handleCancel = () => {
    setStatus("idle");
    setParsed(null);
    setTranscript("");
    setEditing(false);
  };

  // ── Saved state ───────────────────────────────────────────────────────────
  if (status === "saved") {
    return (
      <div className="flex flex-col min-h-[80vh] items-center justify-center px-5 text-center animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="size-10 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-zinc-800 mb-1">¡Movimiento guardado!</h2>
        {parsed && (
          <p className="text-sm text-zinc-500">
            {parsed.type === "expense" ? "- " : "+ "}
            {formatCurrency(parsed.amount)} · {parsed.categoryName}
          </p>
        )}
      </div>
    );
  }

  // ── Confirm state ─────────────────────────────────────────────────────────
  if (status === "confirm" && parsed) {
    const allCategories = parsed.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    return (
      <div className="flex flex-col px-5 pt-12 pb-8 animate-slide-up">
        <h1 className="text-2xl font-bold text-zinc-800 mb-1">¿Es esto correcto?</h1>
        <p className="text-sm text-zinc-500 mb-6">
          {transcript || textInput || "Frase detectada"}
        </p>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4 mb-6">
          {/* Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Tipo</span>
            <span className={cn("text-sm font-semibold", parsed.type === "expense" ? "text-rose-600" : "text-emerald-600")}>
              {parsed.type === "expense" ? "💸 Gasto" : "💰 Ingreso"}
            </span>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Monto</span>
            {editing ? (
              <Input
                type="number"
                className="w-32 text-right"
                value={parsed.amount}
                onChange={(e) => setParsed({ ...parsed, amount: parseFloat(e.target.value) || 0 })}
              />
            ) : (
              <span className={cn("text-xl font-bold", parsed.type === "expense" ? "text-rose-600" : "text-emerald-600")}>
                {formatCurrency(parsed.amount)}
              </span>
            )}
          </div>

          {/* Category */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Categoría</span>
            {editing ? (
              <Select
                value={parsed.categoryId}
                onValueChange={(v) => {
                  const cat = allCategories.find((c) => c.id === v);
                  if (cat) setParsed({ ...parsed, categoryId: cat.id, categoryName: cat.name, categoryIcon: cat.icon });
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-semibold text-zinc-800">
                {parsed.categoryIcon} {parsed.categoryName}
              </span>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Fecha</span>
            {editing ? (
              <Input
                type="date"
                className="w-40"
                value={parsed.date}
                onChange={(e) => setParsed({ ...parsed, date: e.target.value })}
              />
            ) : (
              <span className="text-sm font-semibold text-zinc-800">
                {new Date(parsed.date + "T12:00:00").toLocaleDateString("es-PE", {
                  day: "numeric", month: "long",
                })}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm text-zinc-500 shrink-0">Descripción</span>
            {editing ? (
              <Input
                className="text-right"
                value={parsed.description}
                onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
              />
            ) : (
              <span className="text-sm font-semibold text-zinc-800 text-right leading-snug">
                {parsed.description}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Button className="w-full" size="lg" onClick={handleConfirm}>
            Confirmar movimiento
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setEditing((e) => !e)}
          >
            <Edit2 className="size-4" />
            {editing ? "Dejar de editar" : "Editar"}
          </Button>
          <Button variant="ghost" className="w-full text-zinc-500" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ── Idle / recording / processing ─────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Agregar por voz</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Di tu gasto en voz alta o escríbelo
        </p>
      </div>

      {/* Mic button */}
      <div className="flex flex-col items-center px-5 mb-8">
        {speechSupported ? (
          <>
            <button
              onClick={handleMicPress}
              disabled={status === "processing"}
              className={cn(
                "relative flex items-center justify-center w-28 h-28 rounded-full shadow-xl transition-all duration-300",
                status === "recording"
                  ? "bg-rose-500 scale-110 shadow-rose-300"
                  : status === "processing"
                  ? "bg-zinc-300 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-700 active:scale-95 shadow-violet-200"
              )}
            >
              {status === "recording" && (
                <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-25" />
              )}
              {status === "recording" ? (
                <MicOff className="size-12 text-white" />
              ) : (
                <Mic className="size-12 text-white" />
              )}
            </button>

            <p className={cn(
              "mt-4 text-sm font-medium text-center transition-colors",
              status === "recording" ? "text-rose-600" : "text-zinc-500"
            )}>
              {status === "idle" && "Toca el micrófono y habla"}
              {status === "recording" && "Escuchando… toca para detener"}
              {status === "processing" && "Analizando…"}
            </p>

            {status === "processing" && (
              <div className="flex gap-1.5 mt-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
            <p className="text-sm text-amber-700 font-medium">
              Tu navegador no soporta reconocimiento de voz
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Usa el campo de texto para escribir tu gasto
            </p>
          </div>
        )}
      </div>

      {/* Text fallback */}
      {status === "idle" && (
        <>
          <div className="px-5 mb-5">
            <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
              {speechSupported ? "O escríbelo aquí" : "Escribe tu movimiento"}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder='Ej. "Gasté 25 soles en taxi ayer"'
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextAnalyze()}
              />
              <Button onClick={handleTextAnalyze} disabled={!textInput.trim()}>
                Analizar
              </Button>
            </div>
          </div>

          {/* Example phrases (tappable) */}
          <div className="px-5 mb-6">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Frases de ejemplo — toca una para probar
            </p>
            <div className="space-y-2">
              {EXAMPLE_PHRASES.map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTextInput(phrase);
                    setTimeout(() => {
                      setParsed(parsePhrase(phrase));
                      setStatus("confirm");
                    }, 200);
                  }}
                  className="w-full text-left bg-zinc-50 rounded-xl px-4 py-2.5 border border-zinc-100 hover:border-violet-200 hover:bg-violet-50 active:scale-[0.98] transition-all"
                >
                  <p className="text-sm text-zinc-600">
                    <span className="text-violet-400 mr-1">💬</span>
                    {`"${phrase}"`}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 mb-6">
            <Link href="/add">
              <Button variant="outline" className="w-full">
                Prefiero ingresar manualmente
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
