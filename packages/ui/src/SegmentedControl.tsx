"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";

export interface SegmentedControlOption {
  value: string;
  label: ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-border/10 p-1", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-touch shrink-0 rounded-full px-4 text-sm font-medium transition-colors",
            value === option.value ? "bg-brand text-on-brand" : "text-muted hover:text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
