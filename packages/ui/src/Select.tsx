"use client";

import { AlertCircle } from "lucide-react";
import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, id, className, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-fg">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "min-h-touch w-full rounded-DEFAULT border border-border bg-bg px-3 text-base text-fg focus:outline-none focus:ring-2 focus:ring-brand",
            error && "border-danger focus:ring-danger",
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="flex items-center gap-1 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
