"use client";

import { useState } from "react";
import { Mic, MicOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const examplePhrases = [
  "Gasté 25 soles en taxi",
  "Compré almuerzo por 18 soles en el restaurante",
  "Pagué 30 soles de Spotify",
  "Recibí 400 soles de freelance",
  "Gasté 85 soles en supermercado",
];

const mockParsedResult = {
  description: "Taxi a la oficina",
  amount: "25.00",
  category: "Transporte",
  categoryIcon: "🚗",
  type: "expense" as const,
};

export default function VoicePage() {
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "result">("idle");
  const [textInput, setTextInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [parsedResult, setParsedResult] = useState(mockParsedResult);

  const handleMicPress = () => {
    if (status === "idle") {
      setStatus("recording");
      setTimeout(() => {
        setStatus("processing");
        setTimeout(() => {
          setStatus("result");
        }, 1000);
      }, 2000);
    } else if (status === "recording") {
      setStatus("processing");
      setTimeout(() => {
        setStatus("result");
      }, 1000);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    setStatus("processing");
    setTimeout(() => {
      setParsedResult({
        description: textInput,
        amount: "25.00",
        category: "Otros gastos",
        categoryIcon: "💸",
        type: "expense",
      });
      setStatus("result");
    }, 800);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      setStatus("idle");
      setConfirmed(false);
      setTextInput("");
    }, 2000);
  };

  const statusText = {
    idle: "Toca el micrófono y di tu gasto",
    recording: "Escuchando... (toca de nuevo para detener)",
    processing: "Procesando...",
    result: "¿Es esto correcto?",
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Agregar por voz</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Registra gastos hablando o escribiendo
        </p>
      </div>

      {/* Microphone */}
      <div className="flex flex-col items-center px-5 mb-8">
        <button
          onClick={handleMicPress}
          disabled={status === "processing"}
          className={cn(
            "relative flex items-center justify-center w-28 h-28 rounded-full shadow-xl transition-all duration-300",
            status === "recording"
              ? "bg-rose-500 scale-110 shadow-rose-200"
              : status === "processing"
              ? "bg-zinc-400 cursor-not-allowed"
              : "bg-violet-600 hover:bg-violet-700 active:scale-95 hover:shadow-violet-200"
          )}
        >
          {status === "recording" && (
            <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-30" />
          )}
          {status === "recording" ? (
            <MicOff className="size-12 text-white" />
          ) : (
            <Mic className="size-12 text-white" />
          )}
        </button>

        <p
          className={cn(
            "mt-4 text-sm text-center font-medium transition-colors",
            status === "recording"
              ? "text-rose-600"
              : status === "processing"
              ? "text-zinc-400"
              : "text-zinc-600"
          )}
        >
          {statusText[status]}
        </p>

        {status === "processing" && (
          <div className="flex gap-1.5 mt-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Parsed Result */}
      {status === "result" && !confirmed && (
        <div className="px-5 mb-6 animate-slide-up">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
              Resultado detectado
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{parsedResult.categoryIcon}</span>
                <div>
                  <p className="font-semibold text-zinc-800">
                    {parsedResult.description}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {parsedResult.category} •{" "}
                    {parsedResult.type === "expense" ? "Gasto" : "Ingreso"}
                  </p>
                </div>
                <p className="ml-auto text-lg font-bold text-rose-600">
                  S/ {parsedResult.amount}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStatus("idle")}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed */}
      {confirmed && (
        <div className="px-5 mb-6 text-center animate-slide-up">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="size-7 text-emerald-500" />
          </div>
          <p className="font-semibold text-zinc-800">¡Movimiento guardado!</p>
        </div>
      )}

      {/* Example Phrases */}
      {status === "idle" && (
        <div className="px-5 mb-6">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Frases de ejemplo
          </p>
          <div className="space-y-2">
            {examplePhrases.map((phrase, i) => (
              <div
                key={i}
                className="bg-zinc-50 rounded-xl px-4 py-2.5 border border-zinc-100"
              >
                <p className="text-sm text-zinc-600">
                  <span className="text-violet-400 mr-1">💬</span>
                  {`"${phrase}"`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Input Fallback */}
      {status === "idle" && (
        <div className="px-5 mb-6">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            O escríbelo aquí
          </p>
          <div className="flex gap-2">
            <Input
              placeholder='Ej. "Taxi 20 soles"'
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            />
            <Button onClick={handleTextSubmit} disabled={!textInput.trim()}>
              Analizar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
