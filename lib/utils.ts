import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "PEN"): string {
  if (currency === "PEN") {
    return `S/ ${Math.abs(amount).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d 'de' MMMM", { locale: es });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d MMM", { locale: es });
}

export function getMonthName(date: Date): string {
  return format(date, "MMMM yyyy", { locale: es });
}

export function getMonthNameShort(date: Date): string {
  return format(date, "MMM", { locale: es });
}

export function getCategoryIcon(categoryName: string): string {
  const icons: Record<string, string> = {
    "Alimentación": "🍽️",
    "Transporte": "🚗",
    "Entretenimiento": "🎬",
    "Salud": "💊",
    "Educación": "📚",
    "Ropa": "👗",
    "Hogar": "🏠",
    "Tecnología": "💻",
    "Viajes": "✈️",
    "Deporte": "🏋️",
    "Belleza": "💅",
    "Mascotas": "🐾",
    "Regalos": "🎁",
    "Servicios": "⚡",
    "Supermercado": "🛒",
    "Otros gastos": "💸",
    "Sueldo": "💼",
    "Freelance": "💻",
    "Inversiones": "📈",
    "Transferencias": "💳",
    "Otros ingresos": "💰",
    "Ahorro": "🐷",
  };
  return icons[categoryName] ?? "💰";
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
