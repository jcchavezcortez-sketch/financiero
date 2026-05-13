"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, PlusCircle, Lightbulb, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Inicio" },
  { href: "/transactions", icon: List, label: "Movimientos" },
  { href: "/add", icon: PlusCircle, label: "Agregar", isAction: true },
  { href: "/insights", icon: Lightbulb, label: "Insights" },
  { href: "/settings", icon: Settings, label: "Config" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
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
      </div>
    </nav>
  );
}
