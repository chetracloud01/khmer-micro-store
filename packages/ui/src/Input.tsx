"use client";

import { AlertCircle } from "lucide-react";
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Fixed prefix shown before the field, e.g. "+855" for phone numbers. */
  prefix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </label>
        <div className="flex items-stretch">
          {prefix && (
            <span className="flex shrink-0 items-center whitespace-nowrap rounded-l-DEFAULT border border-r-0 border-border bg-border/20 px-3 text-base text-muted">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "min-h-touch w-full border border-border bg-bg px-3 text-base text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand",
              prefix ? "rounded-r-DEFAULT" : "rounded-DEFAULT",
              error && "border-danger focus:ring-danger",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="flex items-center gap-1 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
