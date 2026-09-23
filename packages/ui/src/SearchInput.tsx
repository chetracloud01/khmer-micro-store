"use client";

import { Search } from "lucide-react";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" aria-hidden="true" />
        <input
          ref={ref}
          type="search"
          className={cn(
            "min-h-touch w-full rounded-full border border-border bg-border/10 pl-9 pr-3 text-base text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
