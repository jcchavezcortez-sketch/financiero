"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths } from "date-fns";
import { getMonthName, cn } from "@/lib/utils";

interface MonthSelectorProps {
  currentMonth: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export default function MonthSelector({
  currentMonth,
  onChange,
  className,
}: MonthSelectorProps) {
  const handlePrev = () => onChange(subMonths(currentMonth, 1));
  const handleNext = () => {
    const next = addMonths(currentMonth, 1);
    const now = new Date();
    if (next <= now) onChange(next);
  };

  const isCurrentMonth =
    currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <button
        onClick={handlePrev}
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
        aria-label="Mes anterior"
      >
        <ChevronLeft className="size-5 text-zinc-600" />
      </button>

      <span className="text-base font-semibold text-zinc-800 capitalize min-w-[140px] text-center">
        {getMonthName(currentMonth)}
      </span>

      <button
        onClick={handleNext}
        disabled={isCurrentMonth}
        className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-zinc-100 active:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Mes siguiente"
      >
        <ChevronRight className="size-5 text-zinc-600" />
      </button>
    </div>
  );
}
