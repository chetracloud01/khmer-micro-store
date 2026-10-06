"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export const buttonVariants = cva(
  "inline-flex min-h-touch items-center justify-center gap-2 rounded-DEFAULT px-6 text-base font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-on-brand hover:bg-brand/90",
        secondary: "border border-border bg-bg text-fg hover:bg-border/30",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", fullWidth: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, fullWidth, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, fullWidth }), className)}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
