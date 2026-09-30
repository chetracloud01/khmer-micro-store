"use client";

import { AlertCircle } from "lucide-react";
import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  /** Shown at the bottom right, e.g. "120 / 1000". */
  counter?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, counter, id, className, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            "w-full rounded-DEFAULT border border-border bg-bg px-3 py-2.5 text-base leading-relaxed text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand",
            error && "border-danger focus:ring-danger",
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        <div className="flex items-start justify-between gap-3">
          {error ? (
            <p id={`${inputId}-error`} className="flex items-center gap-1 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : (
            <span />
          )}
          {counter && <span className="shrink-0 text-xs tabular-nums text-muted">{counter}</span>}
        </div>
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
