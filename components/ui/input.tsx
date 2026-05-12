import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 shadow-sm transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
