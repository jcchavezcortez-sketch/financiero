import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-violet-600 text-white shadow-md hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
        destructive:
          "bg-rose-500 text-white shadow-sm hover:bg-rose-600 focus-visible:ring-rose-500",
        outline:
          "border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 focus-visible:ring-zinc-300",
        secondary:
          "bg-zinc-100 text-zinc-800 shadow-sm hover:bg-zinc-200 focus-visible:ring-zinc-300",
        ghost: "text-zinc-700 hover:bg-zinc-100 focus-visible:ring-zinc-300",
        link: "text-violet-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
