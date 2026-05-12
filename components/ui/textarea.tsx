import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 shadow-sm transition-colors resize-none",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
