"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, List, PlusCircle, CreditCard, CalendarClock, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard",     icon: Home,          label: "Inicio" },
  { href: "/transactions",  icon: List,          label: "Movimientos" },
  { href: "/add",           icon: PlusCircle,    label: "Agregar", isAction: true },
  { href: "/compromisos",   icon: CalendarClock, label: "Compromisos" },
  { href: "/deudas",        icon: CreditCard,    label: "Deudas" },
];

const moreItems = [
  { href: "/budgets",    label: "📊 Presupuestos" },
  { href: "/ingresos",   label: "💰 Ingresos" },
  { href: "/categories", label: "🏷️ Categorías" },
  { href: "/settings",   label: "⚙️ Configuración" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-100 safe-area-inset-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            if (item.isAction) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-6"
                  aria-label={item.label}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
                      isActive
                        ? "bg-violet-700 scale-105"
                        : "bg-violet-600 hover:bg-violet-700 active:scale-95"
                    )}
                  >
                    <Icon className="size-7 text-white" strokeWidth={2.5} />
                  </div>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 py-1 transition-all duration-150 active:scale-95"
                aria-label={item.label}
              >
                <Icon
                  className={cn(
                    "size-5 transition-colors",
                    isActive ? "text-violet-600" : "text-zinc-400"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-violet-600" : "text-zinc-400"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setShowMenu(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 py-1 transition-all duration-150 active:scale-95"
            aria-label="Más opciones"
          >
            <Menu className="size-5 text-zinc-400" strokeWidth={2} />
            <span className="text-[10px] font-medium text-zinc-400">Más</span>
          </button>
        </div>
      </nav>

      {/* More menu sheet */}
      <Sheet open={showMenu} onOpenChange={setShowMenu}>
        <SheetContent side="bottom" className="max-h-[50vh]">
          <SheetHeader>
            <SheetTitle>Más opciones</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMenu(false)}
              >
                <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                  <span className="text-2xl">{item.label.split(" ")[0]}</span>
                  <span className="text-xs">{item.label.split(" ").slice(1).join(" ")}</span>
                </Button>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
