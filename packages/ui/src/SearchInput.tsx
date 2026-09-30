"use client";

import { Search, X } from "lucide-react";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Shows a 44px clear button while there's text. The caller supplies the translated label. */
  onClear?: () => void;
  clearLabel?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, clearLabel, value, ...props }, ref) => {
    const showClear = !!onClear && !!clearLabel && typeof value === "string" && value.length > 0;
    return (
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" aria-hidden="true" />
        <input
          ref={ref}
          type="search"
          value={value}
          className={cn(
            // The browser's own clear "x" differs per browser; ours is the same everywhere.
            "min-h-touch w-full appearance-none rounded-full border border-border bg-border/10 pl-9 text-base text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand [&::-webkit-search-cancel-button]:hidden",
            showClear ? "pr-11" : "pr-3",
            className,
          )}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
