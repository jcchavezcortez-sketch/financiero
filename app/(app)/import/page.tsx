"use client";

import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const mockPreviewData = [
  { fecha: "15/05/2025", descripcion: "WONG - SUPERMERCADO", monto: "-320.00", tipo: "CARGO" },
  { fecha: "14/05/2025", descripcion: "NETFLIX.COM", monto: "-29.90", tipo: "CARGO" },
  { fecha: "13/05/2025", descripcion: "RAPPI DELIVERY", monto: "-12.00", tipo: "CARGO" },
  { fecha: "11/05/2025", descripcion: "TRANSFERENCIA RECIBIDA", monto: "+400.00", tipo: "ABONO" },
  { fecha: "10/05/2025", descripcion: "CINEMARK - CINE", monto: "-35.00", tipo: "CARGO" },
];

const columnOptions = [
  { value: "fecha", label: "Fecha" },
  { value: "descripcion", label: "Descripción" },
  { value: "monto", label: "Monto" },
  { value: "tipo", label: "Tipo" },
  { value: "ignorar", label: "Ignorar columna" },
];

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"upload" | "mapping" | "preview" | "done">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState({
    col0: "fecha",
    col1: "descripcion",
    col2: "monto",
    col3: "tipo",
  });

  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    setStage("mapping");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = () => {
    setStage("done");
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-zinc-800">
          Importar estado de cuenta
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Carga movimientos desde tu banco
        </p>
      </div>

      {/* Upload Stage */}
      {stage === "upload" && (
        <div className="px-5 space-y-5">
          {/* Drop Zone */}
          <button
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "w-full rounded-3xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-3 transition-all",
              isDragging
                ? "border-violet-400 bg-violet-50"
                : "border-zinc-200 bg-zinc-50 hover:border-violet-300 hover:bg-violet-50/30"
            )}
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Upload className="size-7 text-violet-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-zinc-700">
                Toca para cargar archivo
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                o arrastra y suelta aquí
              </p>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {/* Supported Formats */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              Formatos soportados
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <FileText className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700">CSV</p>
                  <p className="text-xs text-zinc-400">Exportado desde tu banco</p>
                </div>
                <CheckCircle className="size-4 text-emerald-500 ml-auto" />
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="size-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700">Excel (.xlsx, .xls)</p>
                  <p className="text-xs text-zinc-400">Formato de hoja de cálculo</p>
                </div>
                <CheckCircle className="size-4 text-emerald-500 ml-auto" />
              </div>
              <div className="flex items-center gap-2.5 opacity-50">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                  <FileText className="size-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700">PDF con clave</p>
                  <p className="text-xs text-zinc-400">Próximamente disponible</p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-auto font-medium">
                  Pronto
                </span>
              </div>
            </div>
          </div>

          {/* Demo button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setFileName("movimientos-bcp-mayo.csv");
              setStage("mapping");
            }}
          >
            Probar con archivo de ejemplo
          </Button>
        </div>
      )}

      {/* Mapping Stage */}
      {stage === "mapping" && (
        <div className="px-5 space-y-5">
          <div className="flex items-center gap-3 bg-emerald-50 rounded-2xl p-3">
            <FileText className="size-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-700 truncate">{fileName}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-700 mb-3">
              Mapea las columnas
            </p>
            <div className="space-y-3">
              {Object.entries(mapping).map(([key, value], i) => {
                const headers = ["Columna A", "Columna B", "Columna C", "Columna D"];
                const samples = ["15/05/2025", "WONG SUPERMERCADO", "-320.00", "CARGO"];
                return (
                  <div key={key} className="bg-white rounded-xl border border-zinc-100 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-semibold text-zinc-600">
                          {headers[i]}
                        </p>
                        <p className="text-xs text-zinc-400">{`"${samples[i]}"`}</p>
                      </div>
                    </div>
                    <Select
                      value={value}
                      onValueChange={(v) =>
                        setMapping((prev) => ({ ...prev, [key]: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columnOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>

          <Button className="w-full" onClick={() => setStage("preview")}>
            Previsualizar datos →
          </Button>
        </div>
      )}

      {/* Preview Stage */}
      {stage === "preview" && (
        <div className="px-5 space-y-5">
          <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-3">
            <AlertCircle className="size-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              Se detectaron <strong>2 posibles duplicados</strong>. Los hemos marcado para que los revises.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-700 mb-2">
              Primeros 5 registros
            </p>
            <div className="overflow-x-auto rounded-2xl border border-zinc-100">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-zinc-500 font-semibold">Fecha</th>
                    <th className="text-left px-3 py-2.5 text-zinc-500 font-semibold">Descripción</th>
                    <th className="text-right px-3 py-2.5 text-zinc-500 font-semibold">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 bg-white">
                  {mockPreviewData.map((row, i) => (
                    <tr key={i} className={i === 1 ? "bg-amber-50/50" : ""}>
                      <td className="px-3 py-2.5 text-zinc-600">{row.fecha}</td>
                      <td className="px-3 py-2.5 text-zinc-700 font-medium truncate max-w-[140px]">
                        {row.descripcion}
                        {i === 1 && (
                          <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            Dup
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-bold",
                          row.monto.startsWith("-")
                            ? "text-rose-600"
                            : "text-emerald-600"
                        )}
                      >
                        {row.monto.startsWith("-")
                          ? `S/ ${row.monto.slice(1)}`
                          : `S/ ${row.monto.slice(1)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400 mt-2 text-center">
              Mostrando 5 de 23 registros
            </p>
          </div>

          <Button className="w-full" size="lg" onClick={handleImport}>
            Importar 21 movimientos
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStage("mapping")}
          >
            Volver a ajustar
          </Button>
        </div>
      )}

      {/* Done Stage */}
      {stage === "done" && (
        <div className="px-5 flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle className="size-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">
            ¡Importación exitosa!
          </h2>
          <p className="text-sm text-zinc-500 mb-8">
            21 movimientos importados correctamente.
          </p>
          <Button className="w-full max-w-xs" onClick={() => setStage("upload")}>
            Importar otro archivo
          </Button>
        </div>
      )}
    </div>
  );
}
