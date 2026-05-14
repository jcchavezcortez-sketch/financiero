export const DEFAULT_CURRENCY = "PEN";
export const CURRENCY_SYMBOL = "S/";

export const EXPENSE_CATEGORIES = [
  { id: "alimentacion", name: "Alimentación", icon: "🍽️", color: "#F97316" },
  { id: "supermercado", name: "Supermercado", icon: "🛒", color: "#EAB308" },
  { id: "transporte", name: "Transporte", icon: "🚗", color: "#3B82F6" },
  { id: "entretenimiento", name: "Entretenimiento", icon: "🎬", color: "#A855F7" },
  { id: "salud", name: "Salud", icon: "💊", color: "#EF4444" },
  { id: "educacion", name: "Educación", icon: "📚", color: "#6366F1" },
  { id: "ropa", name: "Ropa", icon: "👗", color: "#EC4899" },
  { id: "hogar", name: "Hogar", icon: "🏠", color: "#14B8A6" },
  { id: "tecnologia", name: "Tecnología", icon: "💻", color: "#8B5CF6" },
  { id: "viajes", name: "Viajes", icon: "✈️", color: "#06B6D4" },
  { id: "deporte", name: "Deporte", icon: "🏋️", color: "#84CC16" },
  { id: "belleza", name: "Belleza", icon: "💅", color: "#F43F5E" },
  { id: "mascotas", name: "Mascotas", icon: "🐾", color: "#D97706" },
  { id: "regalos", name: "Regalos", icon: "🎁", color: "#7C3AED" },
  { id: "servicios", name: "Servicios", icon: "⚡", color: "#64748B" },
  { id: "otros_gastos", name: "Otros gastos", icon: "💸", color: "#9CA3AF" },
];

export const INCOME_CATEGORIES = [
  { id: "sueldo", name: "Sueldo", icon: "💼", color: "#10B981" },
  { id: "freelance", name: "Freelance", icon: "💻", color: "#6366F1" },
  { id: "inversiones", name: "Inversiones", icon: "📈", color: "#F59E0B" },
  { id: "transferencias", name: "Transferencias", icon: "💳", color: "#3B82F6" },
  { id: "alquiler", name: "Alquiler", icon: "🏘️", color: "#14B8A6" },
  { id: "otros_ingresos", name: "Otros ingresos", icon: "💰", color: "#84CC16" },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const ACCOUNT_TYPES = [
  { id: "debit",             name: "Débito / cuenta sueldo",      icon: "🏦", includeInAvailable: true,  includeInNetWorth: true  },
  { id: "savings",           name: "Ahorro disponible",           icon: "🐷", includeInAvailable: true,  includeInNetWorth: true  },
  { id: "protected_savings", name: "Ahorro protegido / no tocar", icon: "🔒", includeInAvailable: false, includeInNetWorth: true  },
  { id: "cash",              name: "Efectivo",                    icon: "💵", includeInAvailable: true,  includeInNetWorth: true  },
  { id: "wallet",            name: "Yape / Plin",                 icon: "📱", includeInAvailable: true,  includeInNetWorth: true  },
  { id: "credit_card",       name: "Tarjeta de crédito",          icon: "💳", includeInAvailable: false, includeInNetWorth: false },
  { id: "other",             name: "Otra cuenta",                 icon: "💼", includeInAvailable: true,  includeInNetWorth: true  },
];

export const LIABILITY_TYPES = [
  { id: "credit_card",   name: "Tarjeta de crédito", icon: "💳" },
  { id: "personal_debt", name: "Deuda a persona",    icon: "🤝" },
  { id: "loan",          name: "Préstamo",           icon: "🏦" },
  { id: "other",         name: "Otra deuda",         icon: "📋" },
];

export const CURRENCIES = [
  { code: "PEN", symbol: "S/", name: "Sol peruano" },
  { code: "USD", symbol: "$", name: "Dólar americano" },
  { code: "EUR", symbol: "€", name: "Euro" },
];

export const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
